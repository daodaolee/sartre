import {
  DesktopAuthStateSchema,
  Ms1ClientError,
  type DesktopAuthState,
  type DesktopLoginCommand,
  type ErrorCode,
  type Ms1Client,
} from "@sartre/sdk";

import {
  ProtectedSessionStoreError,
  type RefreshTokenStore,
} from "./safe-storage-session-store.js";

type PublicSession = Extract<DesktopAuthState, { status: "authenticated" }>;
type Listener = (state: DesktopAuthState) => void;

type AccessSession = {
  readonly accessToken: string;
  readonly publicState: PublicSession;
};

function errorCode(error: unknown): ErrorCode {
  if (error instanceof Ms1ClientError) return error.code;
  if (error instanceof ProtectedSessionStoreError) return "dependency_unavailable";
  return "dependency_unavailable";
}

export class HumanSessionManager {
  private access: AccessSession | undefined;
  private state: DesktopAuthState = { status: "signed_out" };
  private refreshInFlight: Promise<void> | undefined;
  private readonly listeners = new Set<Listener>();

  constructor(
    private readonly client: Pick<Ms1Client, "loginCompanyEmail" | "logout" | "refresh">,
    private readonly refreshTokens: RefreshTokenStore,
  ) {}

  getState(): DesktopAuthState {
    return DesktopAuthStateSchema.parse(this.state);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async restore(): Promise<DesktopAuthState> {
    this.setState({ status: "restoring" });
    try {
      const refreshToken = await this.refreshTokens.read();
      if (!refreshToken) {
        this.access = undefined;
        this.setState({ status: "signed_out" });
        return this.getState();
      }
      await this.install(await this.client.refresh({ refreshToken }));
    } catch (error) {
      this.access = undefined;
      if (error instanceof Ms1ClientError && error.status === 401) {
        await this.refreshTokens.clear().catch(() => undefined);
      }
      this.setState({ status: "recovery_required", errorCode: errorCode(error) });
    }
    return this.getState();
  }

  async login(command: DesktopLoginCommand): Promise<DesktopAuthState> {
    try {
      await this.install(await this.client.loginCompanyEmail(command));
    } catch (error) {
      this.access = undefined;
      this.setState({ status: "recovery_required", errorCode: errorCode(error) });
    }
    return this.getState();
  }

  async logout(): Promise<DesktopAuthState> {
    const accessToken = this.access?.accessToken;
    this.access = undefined;
    await this.refreshTokens.clear().catch(() => undefined);
    this.setState({ status: "signed_out" });
    if (accessToken) await this.client.logout(accessToken).catch(() => undefined);
    return this.getState();
  }

  async recover(): Promise<DesktopAuthState> {
    this.access = undefined;
    try {
      await this.refreshTokens.clear();
      this.setState({ status: "signed_out" });
    } catch (error) {
      this.setState({ status: "recovery_required", errorCode: errorCode(error) });
    }
    return this.getState();
  }

  async authorized<Output>(operation: (accessToken: string) => Promise<Output>): Promise<Output> {
    const firstToken = this.requireAccessToken();
    try {
      return await operation(firstToken);
    } catch (error) {
      if (!(error instanceof Ms1ClientError) || error.status !== 401) throw error;
      await this.refreshAfterUnauthorized(firstToken);
      return operation(this.requireAccessToken());
    }
  }

  private async refreshAfterUnauthorized(failedToken: string): Promise<void> {
    if (this.access?.accessToken !== failedToken) return;
    this.refreshInFlight ??= this.rotate().finally(() => {
      this.refreshInFlight = undefined;
    });
    await this.refreshInFlight;
  }

  private async rotate(): Promise<void> {
    try {
      const refreshToken = await this.refreshTokens.read();
      if (!refreshToken) throw new Ms1ClientError("unauthenticated", 401);
      await this.install(await this.client.refresh({ refreshToken }));
    } catch (error) {
      this.access = undefined;
      if (error instanceof Ms1ClientError && error.status === 401) {
        await this.refreshTokens.clear().catch(() => undefined);
      }
      this.setState({ status: "recovery_required", errorCode: errorCode(error) });
      throw error;
    }
  }

  private async install(session: Awaited<ReturnType<Ms1Client["refresh"]>>): Promise<void> {
    await this.refreshTokens.write(session.refreshToken);
    const publicState = DesktopAuthStateSchema.parse({
      status: "authenticated",
      userId: session.userId,
      sessionId: session.sessionId,
      accessExpiresAt: session.accessExpiresAt,
    });
    if (publicState.status !== "authenticated") throw new Error("session_state_invalid");
    this.access = { accessToken: session.accessToken, publicState };
    this.setState(publicState);
  }

  private requireAccessToken(): string {
    if (!this.access || this.state.status !== "authenticated") {
      throw new Ms1ClientError("unauthenticated", 401);
    }
    return this.access.accessToken;
  }

  private setState(state: DesktopAuthState): void {
    this.state = DesktopAuthStateSchema.parse(state);
    for (const listener of this.listeners) listener(this.getState());
  }
}
