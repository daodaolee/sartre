import type { SystemHealthBridge } from "../../shared/system-health-contract.js";

declare global {
  interface Window {
    readonly systemHealth: SystemHealthBridge;
  }
}
