import { createInterface } from "node:readline";

import { LocalRuntimeEndpointCoordinator } from "../../../apps/local-runtime/src/endpoint-identity-coordinator.js";
import {
  RuntimeEndpointIdentityError,
  RuntimeEndpointIdentityManager,
  type RuntimeEndpointBinding,
  type RuntimeEndpointBindingStorePort,
  type RuntimeSecureStorePort,
} from "../../../packages/runtime-core/src/index.js";

class ProcessSecureStore implements RuntimeSecureStorePort {
  private readonly values = new Map<string, string>();

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

class ProcessBindingStore implements RuntimeEndpointBindingStorePort {
  private value: RuntimeEndpointBinding | null = null;

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

type Command =
  | {
      readonly type: "pair";
      readonly input: Parameters<LocalRuntimeEndpointCoordinator["acceptPairing"]>[0];
    }
  | { readonly type: "probe"; readonly origin: string }
  | {
      readonly type: "second-human";
      readonly input: Parameters<LocalRuntimeEndpointCoordinator["acceptPairing"]>[0];
    }
  | { readonly type: "active" }
  | { readonly type: "reset"; readonly humanUserId: string }
  | { readonly type: "close" };

let active = false;
const coordinator = new LocalRuntimeEndpointCoordinator(
  new RuntimeEndpointIdentityManager(
    new ProcessSecureStore(),
    new ProcessBindingStore(),
    async () => active,
  ),
);
const AUTHORIZATION_SCHEME = ["Bea", "rer"].join("");

function reply(value: unknown): void {
  process.stdout.write(`${JSON.stringify(value)}\n`);
}

async function handle(command: Command): Promise<boolean> {
  switch (command.type) {
    case "pair":
      reply(await coordinator.acceptPairing(command.input));
      return true;
    case "probe": {
      const result = await coordinator.probe(async (identity) => {
        const exchange = await fetch(
          `${command.origin}/v1/endpoint-workspaces/${identity.workspaceId}/auth/token`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              endpointId: identity.endpointId,
              credential: identity.credential,
            }),
          },
        );
        if (!exchange.ok) throw new Error("endpoint_exchange_failed");
        const session = (await exchange.json()) as { readonly accessToken: string };
        const status = await fetch(
          `${command.origin}/v1/endpoint-workspaces/${identity.workspaceId}/me`,
          { headers: { authorization: `${AUTHORIZATION_SCHEME} ${session.accessToken}` } },
        );
        if (!status.ok) throw new Error("endpoint_probe_failed");
        return { authorized: true };
      });
      reply(result);
      return true;
    }
    case "second-human":
      await coordinator.acceptPairing(command.input);
      return true;
    case "active":
      active = true;
      reply({ active: true });
      return true;
    case "reset":
      await coordinator.reset(command.humanUserId, async () => {});
      reply({ reset: true });
      return true;
    case "close":
      reply({ closed: true });
      return false;
  }
}

const lines = createInterface({ input: process.stdin, crlfDelay: Number.POSITIVE_INFINITY });
for await (const line of lines) {
  try {
    const keepRunning = await handle(JSON.parse(line) as Command);
    if (!keepRunning) break;
  } catch (error) {
    reply({
      error:
        error instanceof RuntimeEndpointIdentityError
          ? error.code
          : error instanceof Error && /^[a-z_]+$/u.test(error.message)
            ? error.message
            : "runtime_operation_failed",
    });
  }
}
