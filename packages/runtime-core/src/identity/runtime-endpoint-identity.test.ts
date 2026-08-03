import { describe, expect, it } from "vitest";

import {
  RuntimeEndpointIdentityError,
  RuntimeEndpointIdentityManager,
  type RuntimeEndpointBinding,
  type RuntimeEndpointBindingStorePort,
  type RuntimeSecureStorePort,
} from "./runtime-endpoint-identity.js";

const CREDENTIAL_A = "a".repeat(43);
const CREDENTIAL_B = "b".repeat(43);

class MemorySecureStore implements RuntimeSecureStorePort {
  readonly values = new Map<string, string>();

  async put(reference: string, secret: string): Promise<void> {
    this.values.set(reference, secret);
  }

  async read(reference: string): Promise<string | null> {
    return this.values.get(reference) ?? null;
  }

  async delete(reference: string): Promise<void> {
    this.values.delete(reference);
  }
}

class MemoryBindingStore implements RuntimeEndpointBindingStorePort {
  value: RuntimeEndpointBinding | null = null;

  async load(): Promise<RuntimeEndpointBinding | null> {
    return this.value;
  }

  async save(binding: RuntimeEndpointBinding): Promise<void> {
    this.value = binding;
  }

  async clear(): Promise<void> {
    this.value = null;
  }
}

function manager(active = false) {
  const secure = new MemorySecureStore();
  const bindings = new MemoryBindingStore();
  return {
    secure,
    bindings,
    identity: new RuntimeEndpointIdentityManager(secure, bindings, async () => active),
  };
}

const PAIRING = {
  humanUserId: "10000000-0000-4000-8000-000000000001",
  workspaceId: "20000000-0000-4000-8000-000000000001",
  endpointId: "30000000-0000-4000-8000-000000000001",
  credential: CREDENTIAL_A,
  version: 0,
} as const;

describe("Runtime Endpoint identity", () => {
  it("persists only a credential reference and scopes secret use to an internal callback", async () => {
    const runtime = manager();
    const binding = await runtime.identity.pair(PAIRING);
    expect(binding).not.toHaveProperty("credential");
    expect(JSON.stringify(runtime.bindings.value)).not.toContain(CREDENTIAL_A);
    await expect(
      runtime.identity.withCredential(async (input) => ({
        endpointId: input.endpointId,
        credentialLength: input.credential.length,
      })),
    ).resolves.toEqual({ endpointId: PAIRING.endpointId, credentialLength: 43 });
  });

  it("rejects a second Human on the same data root", async () => {
    const runtime = manager();
    await runtime.identity.pair(PAIRING);
    await expect(
      runtime.identity.pair({
        ...PAIRING,
        humanUserId: "10000000-0000-4000-8000-000000000002",
        endpointId: "30000000-0000-4000-8000-000000000002",
      }),
    ).rejects.toMatchObject({ code: "second_human_not_supported" });
  });

  it("rotates without leaving the old credential and rolls back a failed remote update", async () => {
    const runtime = manager();
    await runtime.identity.pair(PAIRING);
    await expect(
      runtime.identity.rotate(
        { ...PAIRING, replacementCredential: CREDENTIAL_B, expectedVersion: 0 },
        async () => {
          throw new Error("remote_failed");
        },
      ),
    ).rejects.toThrow("remote_failed");
    expect(runtime.secure.values.size).toBe(1);
    const rotated = await runtime.identity.rotate(
      { ...PAIRING, replacementCredential: CREDENTIAL_B, expectedVersion: 0 },
      async () => ({ version: 1 }),
    );
    expect(rotated.version).toBe(1);
    expect(runtime.secure.values.size).toBe(1);
    expect([...runtime.secure.values.values()]).toEqual([CREDENTIAL_B]);
  });

  it("blocks reset while runtime work is active and clears after remote revoke", async () => {
    const blocked = manager(true);
    await blocked.identity.pair(PAIRING);
    await expect(
      blocked.identity.reset(PAIRING.humanUserId, async () => {}),
    ).rejects.toBeInstanceOf(RuntimeEndpointIdentityError);
    expect(blocked.bindings.value).not.toBeNull();

    const idle = manager();
    await idle.identity.pair(PAIRING);
    let revoked = false;
    await idle.identity.reset(PAIRING.humanUserId, async () => {
      revoked = true;
    });
    expect(revoked).toBe(true);
    expect(idle.bindings.value).toBeNull();
    expect(idle.secure.values.size).toBe(0);
  });
});
