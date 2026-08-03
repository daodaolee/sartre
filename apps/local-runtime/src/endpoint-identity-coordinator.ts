import type { RuntimeEndpointBinding, RuntimeEndpointIdentityManager } from "@sartre/runtime-core";

export type LocalEndpointStatus = {
  readonly paired: boolean;
  readonly endpointId: string | null;
  readonly workspaceId: string | null;
  readonly version: number | null;
};

export class LocalRuntimeEndpointCoordinator {
  constructor(private readonly identity: RuntimeEndpointIdentityManager) {}

  async status(): Promise<LocalEndpointStatus> {
    const binding = await this.identity.status();
    return this.publicStatus(binding);
  }

  async acceptPairing(input: {
    readonly humanUserId: string;
    readonly workspaceId: string;
    readonly endpointId: string;
    readonly credential: string;
    readonly version: number;
  }): Promise<LocalEndpointStatus> {
    const binding = await this.identity.pair(input);
    return this.publicStatus(binding);
  }

  async probe<Result>(
    exchangeAndProbe: (input: {
      readonly workspaceId: string;
      readonly endpointId: string;
      readonly credential: string;
    }) => Promise<Result>,
  ): Promise<Result> {
    return this.identity.withCredential(exchangeAndProbe);
  }

  async reset(
    humanUserId: string,
    revoke: (binding: RuntimeEndpointBinding) => Promise<void>,
  ): Promise<void> {
    await this.identity.reset(humanUserId, revoke);
  }

  private publicStatus(binding: RuntimeEndpointBinding | null): LocalEndpointStatus {
    return binding
      ? {
          paired: true,
          endpointId: binding.endpointId,
          workspaceId: binding.workspaceId,
          version: binding.version,
        }
      : { paired: false, endpointId: null, workspaceId: null, version: null };
  }
}
