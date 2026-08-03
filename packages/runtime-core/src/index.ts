import { HealthSnapshotSchema, type HealthSnapshot, type HealthStatus } from "@sartre/contracts";

export const moduleBoundary = "runtime-core" as const;

export {
  RuntimeEndpointIdentityError,
  RuntimeEndpointIdentityManager,
} from "./identity/runtime-endpoint-identity.js";
export type {
  RuntimeEndpointBinding,
  RuntimeEndpointBindingStorePort,
  RuntimeEndpointIdentityErrorCode,
  RuntimeSecureStorePort,
} from "./identity/runtime-endpoint-identity.js";

export function createProcessHealthSnapshot(options: {
  service: string;
  status: HealthStatus;
  version: string;
  commitSha: string;
  dependencies?: HealthSnapshot["dependencies"];
  errorCode?: HealthSnapshot["errorCode"];
}): HealthSnapshot {
  return HealthSnapshotSchema.parse({
    service: options.service,
    status: options.status,
    version: options.version,
    commitSha: options.commitSha,
    checkedAt: new Date().toISOString(),
    dependencies: options.dependencies ?? [],
    ...(options.errorCode ? { errorCode: options.errorCode } : {}),
  });
}
