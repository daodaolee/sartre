import { DomainInvariantError } from "./errors";

export type Artifact = {
  id: string;
  name: string;
  kind: string;
  storageUrl: string;
  checksum: string;
};

export type HandoffPackInput = {
  entryArtifactName: string;
  artifacts: Artifact[];
};

export class HandoffPack {
  private constructor(
    readonly entryArtifactName: string,
    readonly artifacts: readonly Artifact[],
  ) {}

  static create(input: HandoffPackInput): HandoffPack {
    if (!input.entryArtifactName.trim()) {
      throw new DomainInvariantError(
        "HandoffPack entry artifact name is required",
      );
    }

    if (input.artifacts.length === 0) {
      throw new DomainInvariantError(
        "HandoffPack requires at least one artifact",
      );
    }

    const entry = input.artifacts.find(
      (artifact) => artifact.name === input.entryArtifactName,
    );
    if (!entry) {
      throw new DomainInvariantError(
        "HandoffPack entry artifact must exist in artifacts",
      );
    }

    return new HandoffPack(
      input.entryArtifactName,
      Object.freeze([...input.artifacts]),
    );
  }

  get entry(): Artifact {
    const entry = this.artifacts.find(
      (artifact) => artifact.name === this.entryArtifactName,
    );
    if (!entry) {
      throw new DomainInvariantError("HandoffPack entry artifact is missing");
    }
    return entry;
  }
}
