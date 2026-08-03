export interface SecureWindowOptions {
  readonly width: number;
  readonly height: number;
  readonly minWidth: number;
  readonly minHeight: number;
  readonly show: boolean;
  readonly backgroundColor: string;
  readonly webPreferences: {
    readonly contextIsolation: true;
    readonly sandbox: true;
    readonly webSecurity: true;
    readonly nodeIntegration: false;
    readonly preload: string;
  };
}

export function createSecureWindowOptions(preloadPath: string): SecureWindowOptions {
  return {
    width: 1_280,
    height: 800,
    minWidth: 860,
    minHeight: 560,
    show: false,
    backgroundColor: "#090909",
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      nodeIntegration: false,
      preload: preloadPath,
    },
  };
}
