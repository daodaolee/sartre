export type WorkspaceErrorCode =
  | "dependency_unavailable"
  | "resource_not_found"
  | "state_conflict"
  | "validation_failed";

const STATUS: Readonly<Record<WorkspaceErrorCode, number>> = {
  dependency_unavailable: 503,
  resource_not_found: 404,
  state_conflict: 409,
  validation_failed: 400,
};

export class WorkspaceError extends Error {
  readonly status: number;

  constructor(readonly code: WorkspaceErrorCode) {
    super(code);
    this.name = "WorkspaceError";
    this.status = STATUS[code];
  }
}

export function asWorkspaceError(error: unknown): WorkspaceError {
  return error instanceof WorkspaceError ? error : new WorkspaceError("dependency_unavailable");
}
