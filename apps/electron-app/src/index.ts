export const moduleBoundary = "electron-app" as const;

export { readHealthEnvironment } from "./main/health/health-environment.js";
export { createHealthMonitor } from "./main/health/health-monitor.js";
export {
  assertCheckedInElectronPackagingPolicy,
  assertPackagedElectronApplicationInventory,
  normalizeMacPackageArguments,
  validateElectronAsarInventory,
  validateElectronPackagingPolicy,
} from "./main/packaging-policy.js";
export { createSecureWindowOptions } from "./main/secure-window.js";
