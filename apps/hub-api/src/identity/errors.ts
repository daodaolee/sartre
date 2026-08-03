import type { ErrorCode } from "@sartre/contracts";

const STATUS_BY_CODE = {
  authentication_failed: 401,
  dependency_unavailable: 503,
  oauth_callback_invalid: 401,
  rate_limited: 429,
  refresh_token_reused: 401,
  unauthenticated: 401,
  validation_failed: 400,
} as const satisfies Partial<Record<ErrorCode, number>>;

export type HumanAuthErrorCode = keyof typeof STATUS_BY_CODE;

export class HumanAuthError extends Error {
  readonly status: number;

  constructor(readonly code: HumanAuthErrorCode) {
    super(code);
    this.name = "HumanAuthError";
    this.status = STATUS_BY_CODE[code];
  }
}

export function asHumanAuthError(error: unknown): HumanAuthError {
  return error instanceof HumanAuthError ? error : new HumanAuthError("dependency_unavailable");
}
