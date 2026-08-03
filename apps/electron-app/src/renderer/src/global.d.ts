import type { SystemHealthBridge } from "../../shared/system-health-contract.js";
import type { SartreDesktopBridge } from "../../shared/ms1-desktop-contract.js";

declare global {
  interface Window {
    readonly systemHealth: SystemHealthBridge;
    readonly sartre: SartreDesktopBridge;
  }
}
