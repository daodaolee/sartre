export type DomainErrorCode =
  | "forbidden"
  | "invariant_failed"
  | "state_conflict"
  | "unauthenticated"
  | "version_conflict";

export class DomainInvariantError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DomainInvariantError";
  }
}

export function requireDomain(
  condition: unknown,
  code: DomainErrorCode,
  message: string,
): asserts condition {
  if (!condition) throw new DomainInvariantError(code, message);
}
