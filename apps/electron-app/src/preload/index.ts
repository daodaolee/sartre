import { contextBridge, ipcRenderer } from "electron";

import {
  SYSTEM_HEALTH_GET_CHANNEL,
  SYSTEM_HEALTH_UPDATE_CHANNEL,
  SystemHealthResultSchema,
  type SystemHealthBridge,
  type SystemHealthResult,
} from "../shared/system-health-contract.js";

const systemHealth: SystemHealthBridge = Object.freeze({
  getSnapshot: async () =>
    SystemHealthResultSchema.parse(await ipcRenderer.invoke(SYSTEM_HEALTH_GET_CHANNEL)),
  subscribe: (listener: (result: SystemHealthResult) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, value: unknown): void => {
      listener(SystemHealthResultSchema.parse(value));
    };
    ipcRenderer.on(SYSTEM_HEALTH_UPDATE_CHANNEL, handler);
    return () => ipcRenderer.removeListener(SYSTEM_HEALTH_UPDATE_CHANNEL, handler);
  },
});

contextBridge.exposeInMainWorld("systemHealth", systemHealth);
