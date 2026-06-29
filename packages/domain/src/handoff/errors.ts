export class DomainInvariantError extends Error {
  readonly category = "InvalidInput" as const;

  constructor(message: string) {
    super(message);
    this.name = "DomainInvariantError";
  }
}

export class IllegalTransitionError extends Error {
  readonly category = "InvalidInput" as const;

  constructor(message: string) {
    super(message);
    this.name = "IllegalTransitionError";
  }
}
