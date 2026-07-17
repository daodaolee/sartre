import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "foundation",
      include: ["**/*.test.ts", "**/*.test.tsx"],
      exclude: ["**/node_modules/**", "**/dist/**", "**/out/**"],
    },
  },
]);
