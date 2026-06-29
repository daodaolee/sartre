export type WebConsoleRoute =
  | "/inbox"
  | "/handoffs/:id"
  | "/agents"
  | "/agents/new"
  | "/agents/:id/health"
  | "/settings/connectors";

export const webConsoleRoutes: WebConsoleRoute[] = [
  "/inbox",
  "/handoffs/:id",
  "/agents",
  "/agents/new",
  "/agents/:id/health",
  "/settings/connectors",
];
