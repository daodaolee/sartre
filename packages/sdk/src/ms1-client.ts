import {
  EndpointAuthSessionSchema,
  EndpointCredentialExchangeCommandSchema,
  EndpointCredentialRotateCommandSchema,
  EndpointPairingCompleteCommandSchema,
  EndpointPairingIntentCreateCommandSchema,
  EndpointPairingIntentSummarySchema,
  EndpointPairingResultSchema,
  EndpointRevokeCommandSchema,
  EndpointSummarySchema,
  HumanAuthSessionSchema,
  HumanRefreshCommandSchema,
  HumanSessionInventorySchema,
  InvitationAcceptCommandSchema,
  InvitationCreateCommandSchema,
  InvitationRevokeCommandSchema,
  InvitationSummarySchema,
  MembershipRemoveCommandSchema,
  MembershipRoleChangeCommandSchema,
  MembershipSummarySchema,
  ProblemDetailsSchema,
  ProjectAccessGrantCommandSchema,
  ProjectAccessSummarySchema,
  ProjectCreateCommandSchema,
  ProjectSummarySchema,
  WorkspaceCreateCommandSchema,
  WorkspaceSummarySchema,
  CompanyEmailLoginCommandSchema,
  type CompanyEmailLoginCommand,
  type EndpointAuthSession,
  type EndpointCredentialExchangeCommand,
  type EndpointCredentialRotateCommand,
  type EndpointPairingCompleteCommand,
  type EndpointPairingIntentCreateCommand,
  type EndpointPairingIntentSummary,
  type EndpointPairingResult,
  type EndpointRevokeCommand,
  type EndpointSummary,
  type ErrorCode,
  type HumanAuthSession,
  type HumanRefreshCommand,
  type HumanSessionInventory,
  type InvitationAcceptCommand,
  type InvitationCreateCommand,
  type InvitationRevokeCommand,
  type InvitationSummary,
  type MembershipRemoveCommand,
  type MembershipRoleChangeCommand,
  type MembershipSummary,
  type ProjectAccessGrantCommand,
  type ProjectAccessSummary,
  type ProjectCreateCommand,
  type ProjectSummary,
  type WorkspaceCreateCommand,
  type WorkspaceSummary,
} from "@sartre/contracts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const TOKEN = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/u;
const AUTHORIZATION_SCHEME = ["Bea", "rer"].join("");

type Parser<Output> = { readonly parse: (value: unknown) => Output };

export interface Ms1ClientOptions {
  readonly hubBaseUrl: string;
  readonly timeoutMs: number;
  readonly fetcher?: typeof fetch;
}

export class Ms1ClientError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly status: number,
  ) {
    super(code);
    this.name = "Ms1ClientError";
  }
}

export interface Ms1Client {
  loginCompanyEmail(command: CompanyEmailLoginCommand): Promise<HumanAuthSession>;
  refresh(command: HumanRefreshCommand): Promise<HumanAuthSession>;
  listSessions(accessToken: string): Promise<HumanSessionInventory>;
  logout(accessToken: string): Promise<void>;
  createWorkspace(command: WorkspaceCreateCommand, accessToken: string): Promise<WorkspaceSummary>;
  getWorkspace(workspaceId: string, accessToken: string): Promise<WorkspaceSummary>;
  createInvitation(
    workspaceId: string,
    command: InvitationCreateCommand,
    accessToken: string,
  ): Promise<InvitationSummary>;
  acceptInvitation(
    workspaceId: string,
    command: InvitationAcceptCommand,
    accessToken: string,
  ): Promise<InvitationSummary>;
  revokeInvitation(
    workspaceId: string,
    command: InvitationRevokeCommand,
    accessToken: string,
  ): Promise<InvitationSummary>;
  listMembers(workspaceId: string, accessToken: string): Promise<readonly MembershipSummary[]>;
  changeMembershipRole(
    workspaceId: string,
    command: MembershipRoleChangeCommand,
    accessToken: string,
  ): Promise<MembershipSummary>;
  removeMembership(
    workspaceId: string,
    command: MembershipRemoveCommand,
    accessToken: string,
  ): Promise<MembershipSummary>;
  createProject(
    workspaceId: string,
    command: ProjectCreateCommand,
    accessToken: string,
  ): Promise<ProjectSummary>;
  listProjects(workspaceId: string, accessToken: string): Promise<readonly ProjectSummary[]>;
  grantProjectAccess(
    workspaceId: string,
    command: ProjectAccessGrantCommand,
    accessToken: string,
  ): Promise<ProjectAccessSummary>;
  createEndpointPairingIntent(
    workspaceId: string,
    command: EndpointPairingIntentCreateCommand,
    accessToken: string,
  ): Promise<EndpointPairingIntentSummary>;
  completeEndpointPairing(
    workspaceId: string,
    command: EndpointPairingCompleteCommand,
  ): Promise<EndpointPairingResult>;
  exchangeEndpointCredential(
    workspaceId: string,
    command: EndpointCredentialExchangeCommand,
  ): Promise<EndpointAuthSession>;
  getEndpointStatus(workspaceId: string, endpointToken: string): Promise<EndpointSummary>;
  rotateEndpointCredential(
    workspaceId: string,
    command: EndpointCredentialRotateCommand,
    accessToken: string,
  ): Promise<EndpointSummary>;
  revokeEndpoint(
    workspaceId: string,
    command: EndpointRevokeCommand,
    accessToken: string,
  ): Promise<EndpointSummary>;
}

function normalizedHubBaseUrl(value: string): string {
  const url = new URL(value);
  const loopback = url.protocol === "http:" && url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !loopback) ||
    url.pathname !== "/" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Ms1ClientError("validation_failed", 400);
  }
  return url.origin;
}

function requireUuid(value: string): string {
  if (!UUID.test(value)) throw new Ms1ClientError("validation_failed", 400);
  return value;
}

function authorization(accessToken: string): string {
  if (accessToken.length > 8_192 || !TOKEN.test(accessToken)) {
    throw new Ms1ClientError("unauthenticated", 401);
  }
  return `${AUTHORIZATION_SCHEME} ${accessToken}`;
}

async function responseError(response: Response): Promise<Ms1ClientError> {
  try {
    const problem = ProblemDetailsSchema.parse(await response.json());
    return new Ms1ClientError(problem.code, problem.status);
  } catch {
    return new Ms1ClientError(
      response.status === 401
        ? "unauthenticated"
        : response.status === 403
          ? "forbidden"
          : response.status === 404
            ? "resource_not_found"
            : "dependency_unavailable",
      response.status,
    );
  }
}

export function createMs1Client(options: Ms1ClientOptions): Ms1Client {
  const origin = normalizedHubBaseUrl(options.hubBaseUrl);
  if (
    !Number.isInteger(options.timeoutMs) ||
    options.timeoutMs < 50 ||
    options.timeoutMs > 30_000
  ) {
    throw new Ms1ClientError("validation_failed", 400);
  }
  const fetcher = options.fetcher ?? fetch;

  const request = async <Output>(input: {
    readonly path: string;
    readonly method?: "GET" | "PATCH" | "POST" | "PUT";
    readonly body?: unknown;
    readonly accessToken?: string;
    readonly parser: Parser<Output>;
  }): Promise<Output> => {
    let response: Response;
    try {
      response = await fetcher(`${origin}${input.path}`, {
        method: input.method ?? "GET",
        headers: {
          ...(input.body === undefined ? {} : { "content-type": "application/json" }),
          ...(input.accessToken === undefined
            ? {}
            : { authorization: authorization(input.accessToken) }),
        },
        ...(input.body === undefined ? {} : { body: JSON.stringify(input.body) }),
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Ms1ClientError) throw error;
      throw new Ms1ClientError("dependency_unavailable", 503);
    }
    if (!response.ok) throw await responseError(response);
    try {
      return input.parser.parse(await response.json());
    } catch {
      throw new Ms1ClientError("degraded", 503);
    }
  };

  const requestVoid = async (path: string, accessToken: string): Promise<void> => {
    let response: Response;
    try {
      response = await fetcher(`${origin}${path}`, {
        method: "POST",
        headers: { authorization: authorization(accessToken) },
        signal: AbortSignal.timeout(options.timeoutMs),
      });
    } catch (error) {
      if (error instanceof Ms1ClientError) throw error;
      throw new Ms1ClientError("dependency_unavailable", 503);
    }
    if (!response.ok) throw await responseError(response);
  };

  const arrayOf = <Output>(parser: Parser<Output>): Parser<readonly Output[]> => ({
    parse: (value) => {
      if (!Array.isArray(value)) throw new Error("response_array_invalid");
      return value.map((item) => parser.parse(item));
    },
  });

  return {
    loginCompanyEmail: (command) =>
      request({
        path: "/v1/auth/email/login",
        method: "POST",
        body: CompanyEmailLoginCommandSchema.parse(command),
        parser: HumanAuthSessionSchema,
      }),
    refresh: (command) =>
      request({
        path: "/v1/auth/refresh",
        method: "POST",
        body: HumanRefreshCommandSchema.parse(command),
        parser: HumanAuthSessionSchema,
      }),
    listSessions: (accessToken) =>
      request({ path: "/v1/auth/sessions", accessToken, parser: HumanSessionInventorySchema }),
    logout: (accessToken) => requestVoid("/v1/auth/logout", accessToken),
    createWorkspace: (command, accessToken) =>
      request({
        path: "/v1/workspaces",
        method: "POST",
        body: WorkspaceCreateCommandSchema.parse(command),
        accessToken,
        parser: WorkspaceSummarySchema,
      }),
    getWorkspace: (workspaceId, accessToken) =>
      request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}`,
        accessToken,
        parser: WorkspaceSummarySchema,
      }),
    createInvitation: (workspaceId, command, accessToken) =>
      request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/invitations`,
        method: "POST",
        body: InvitationCreateCommandSchema.parse(command),
        accessToken,
        parser: InvitationSummarySchema,
      }),
    acceptInvitation: (workspaceId, command, accessToken) => {
      const parsed = InvitationAcceptCommandSchema.parse(command);
      return request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/invitations/${parsed.invitationId}/accept`,
        method: "POST",
        body: parsed,
        accessToken,
        parser: InvitationSummarySchema,
      });
    },
    revokeInvitation: (workspaceId, command, accessToken) => {
      const parsed = InvitationRevokeCommandSchema.parse(command);
      return request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/invitations/${parsed.invitationId}/revoke`,
        method: "POST",
        body: parsed,
        accessToken,
        parser: InvitationSummarySchema,
      });
    },
    listMembers: (workspaceId, accessToken) =>
      request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/members`,
        accessToken,
        parser: arrayOf(MembershipSummarySchema),
      }),
    changeMembershipRole: (workspaceId, command, accessToken) => {
      const parsed = MembershipRoleChangeCommandSchema.parse(command);
      return request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/members/${parsed.membershipId}/role`,
        method: "PATCH",
        body: parsed,
        accessToken,
        parser: MembershipSummarySchema,
      });
    },
    removeMembership: (workspaceId, command, accessToken) => {
      const parsed = MembershipRemoveCommandSchema.parse(command);
      return request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/members/${parsed.membershipId}/remove`,
        method: "POST",
        body: parsed,
        accessToken,
        parser: MembershipSummarySchema,
      });
    },
    createProject: (workspaceId, command, accessToken) =>
      request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/projects`,
        method: "POST",
        body: ProjectCreateCommandSchema.parse(command),
        accessToken,
        parser: ProjectSummarySchema,
      }),
    listProjects: (workspaceId, accessToken) =>
      request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/projects`,
        accessToken,
        parser: arrayOf(ProjectSummarySchema),
      }),
    grantProjectAccess: (workspaceId, command, accessToken) => {
      const parsed = ProjectAccessGrantCommandSchema.parse(command);
      return request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/projects/${parsed.projectId}/access/${parsed.userId}`,
        method: "PUT",
        body: parsed,
        accessToken,
        parser: ProjectAccessSummarySchema,
      });
    },
    createEndpointPairingIntent: (workspaceId, command, accessToken) =>
      request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/endpoint-pairing-intents`,
        method: "POST",
        body: EndpointPairingIntentCreateCommandSchema.parse(command),
        accessToken,
        parser: EndpointPairingIntentSummarySchema,
      }),
    completeEndpointPairing: (workspaceId, command) =>
      request({
        path: `/v1/endpoint-workspaces/${requireUuid(workspaceId)}/pairing/complete`,
        method: "POST",
        body: EndpointPairingCompleteCommandSchema.parse(command),
        parser: EndpointPairingResultSchema,
      }),
    exchangeEndpointCredential: (workspaceId, command) =>
      request({
        path: `/v1/endpoint-workspaces/${requireUuid(workspaceId)}/auth/token`,
        method: "POST",
        body: EndpointCredentialExchangeCommandSchema.parse(command),
        parser: EndpointAuthSessionSchema,
      }),
    getEndpointStatus: (workspaceId, endpointToken) =>
      request({
        path: `/v1/endpoint-workspaces/${requireUuid(workspaceId)}/me`,
        accessToken: endpointToken,
        parser: EndpointSummarySchema,
      }),
    rotateEndpointCredential: (workspaceId, command, accessToken) => {
      const parsed = EndpointCredentialRotateCommandSchema.parse(command);
      return request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/endpoints/${parsed.endpointId}/rotate`,
        method: "POST",
        body: parsed,
        accessToken,
        parser: EndpointSummarySchema,
      });
    },
    revokeEndpoint: (workspaceId, command, accessToken) => {
      const parsed = EndpointRevokeCommandSchema.parse(command);
      return request({
        path: `/v1/workspaces/${requireUuid(workspaceId)}/endpoints/${parsed.endpointId}/revoke`,
        method: "POST",
        body: parsed,
        accessToken,
        parser: EndpointSummarySchema,
      });
    },
  };
}
