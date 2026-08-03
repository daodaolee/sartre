export type RuntimeEndpointBinding = {
  readonly humanUserId: string;
  readonly workspaceId: string;
  readonly endpointId: string;
  readonly credentialRef: string;
  readonly version: number;
};

export interface RuntimeSecureStorePort {
  put(reference: string, secret: string): Promise<void>;
  read(reference: string): Promise<string | null>;
  delete(reference: string): Promise<void>;
}

export interface RuntimeEndpointBindingStorePort {
  load(): Promise<RuntimeEndpointBinding | null>;
  save(binding: RuntimeEndpointBinding): Promise<void>;
  clear(): Promise<void>;
}

export type RuntimeEndpointIdentityErrorCode =
  | "active_runtime_work"
  | "endpoint_binding_missing"
  | "endpoint_secure_store_unavailable"
  | "second_human_not_supported"
  | "state_conflict";

export class RuntimeEndpointIdentityError extends Error {
  constructor(readonly code: RuntimeEndpointIdentityErrorCode) {
    super(code);
    this.name = "RuntimeEndpointIdentityError";
  }
}

type PairInput = {
  readonly humanUserId: string;
  readonly workspaceId: string;
  readonly endpointId: string;
  readonly credential: string;
  readonly version: number;
};

type RotateInput = {
  readonly humanUserId: string;
  readonly workspaceId: string;
  readonly endpointId: string;
  readonly replacementCredential: string;
  readonly expectedVersion: number;
};

function credentialReference(endpointId: string, version: number): string {
  return `endpoint:${endpointId}:v${version}`;
}

function requireSecret(value: string): void {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(value)) {
    throw new RuntimeEndpointIdentityError("state_conflict");
  }
}

export class RuntimeEndpointIdentityManager {
  constructor(
    private readonly secureStore: RuntimeSecureStorePort,
    private readonly bindingStore: RuntimeEndpointBindingStorePort,
    private readonly hasActiveRuntimeWork: () => Promise<boolean>,
  ) {}

  async status(): Promise<RuntimeEndpointBinding | null> {
    return this.bindingStore.load();
  }

  async pair(input: PairInput): Promise<RuntimeEndpointBinding> {
    requireSecret(input.credential);
    const current = await this.bindingStore.load();
    if (current?.humanUserId !== undefined && current.humanUserId !== input.humanUserId) {
      throw new RuntimeEndpointIdentityError("second_human_not_supported");
    }
    if (current) throw new RuntimeEndpointIdentityError("state_conflict");
    const binding: RuntimeEndpointBinding = {
      humanUserId: input.humanUserId,
      workspaceId: input.workspaceId,
      endpointId: input.endpointId,
      credentialRef: credentialReference(input.endpointId, input.version),
      version: input.version,
    };
    await this.secureStore.put(binding.credentialRef, input.credential);
    try {
      await this.bindingStore.save(binding);
      return binding;
    } catch (error) {
      await this.secureStore.delete(binding.credentialRef);
      throw error;
    }
  }

  async withCredential<Result>(
    operation: (input: {
      readonly workspaceId: string;
      readonly endpointId: string;
      readonly credential: string;
    }) => Promise<Result>,
  ): Promise<Result> {
    const binding = await this.requireBinding();
    const credential = await this.secureStore.read(binding.credentialRef);
    if (!credential) throw new RuntimeEndpointIdentityError("endpoint_secure_store_unavailable");
    requireSecret(credential);
    return operation({
      workspaceId: binding.workspaceId,
      endpointId: binding.endpointId,
      credential,
    });
  }

  async rotate(
    input: RotateInput,
    updateHub: (replacementCredential: string) => Promise<{ readonly version: number }>,
  ): Promise<RuntimeEndpointBinding> {
    requireSecret(input.replacementCredential);
    const current = await this.requireOwnedBinding(input);
    if (current.version !== input.expectedVersion) {
      throw new RuntimeEndpointIdentityError("state_conflict");
    }
    const replacementRef = credentialReference(input.endpointId, input.expectedVersion + 1);
    await this.secureStore.put(replacementRef, input.replacementCredential);
    let remote: { readonly version: number };
    try {
      remote = await updateHub(input.replacementCredential);
    } catch (error) {
      await this.secureStore.delete(replacementRef);
      throw error;
    }
    if (remote.version !== input.expectedVersion + 1) {
      await this.secureStore.delete(replacementRef);
      throw new RuntimeEndpointIdentityError("state_conflict");
    }
    const replacement: RuntimeEndpointBinding = {
      ...current,
      credentialRef: replacementRef,
      version: remote.version,
    };
    // Once Hub accepts the new hash, preserve the replacement even if local state promotion fails.
    // This is fail-closed and recoverable; deleting it here would permanently strand the Endpoint.
    await this.bindingStore.save(replacement);
    await this.secureStore.delete(current.credentialRef);
    return replacement;
  }

  async reset(
    humanUserId: string,
    revokeHub: (binding: RuntimeEndpointBinding) => Promise<void>,
  ): Promise<void> {
    if (await this.hasActiveRuntimeWork()) {
      throw new RuntimeEndpointIdentityError("active_runtime_work");
    }
    const binding = await this.requireOwnedBinding({ humanUserId });
    await revokeHub(binding);
    await this.secureStore.delete(binding.credentialRef);
    await this.bindingStore.clear();
  }

  private async requireBinding(): Promise<RuntimeEndpointBinding> {
    const binding = await this.bindingStore.load();
    if (!binding) throw new RuntimeEndpointIdentityError("endpoint_binding_missing");
    return binding;
  }

  private async requireOwnedBinding(input: {
    readonly humanUserId: string;
    readonly workspaceId?: string;
    readonly endpointId?: string;
  }): Promise<RuntimeEndpointBinding> {
    const binding = await this.requireBinding();
    if (binding.humanUserId !== input.humanUserId) {
      throw new RuntimeEndpointIdentityError("second_human_not_supported");
    }
    if (
      (input.workspaceId !== undefined && binding.workspaceId !== input.workspaceId) ||
      (input.endpointId !== undefined && binding.endpointId !== input.endpointId)
    ) {
      throw new RuntimeEndpointIdentityError("state_conflict");
    }
    return binding;
  }
}
