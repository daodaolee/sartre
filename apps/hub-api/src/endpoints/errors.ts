import type { ErrorCode } from "@sartre/contracts";

const STATUS_BY_CODE = {
  dependency_unavailable: 503,
  endpoint_credential_invalid: 401,
  forbidden: 403,
  idempotency_conflict: 409,
  resource_not_found: 404,
  state_conflict: 409,
  unauthenticated: 401,
  validation_failed: 400,
  version_conflict: 409,
} as const satisfies Partial<Record<ErrorCode, number>>;

export type EndpointAuthErrorCode = keyof typeof STATUS_BY_CODE;

export class EndpointAuthError extends Error {
  readonly status: number;

  constructor(readonly code: EndpointAuthErrorCode) {
    super(code);
    this.name = "EndpointAuthError";
    this.status = STATUS_BY_CODE[code];
  }
}

export function asEndpointAuthError(error: unknown): EndpointAuthError {
  return error instanceof EndpointAuthError
    ? error
    : new EndpointAuthError("dependency_unavailable");
}
