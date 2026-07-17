import { describe, expect, it } from "vitest";
import { moduleBoundary } from "./index.js";

describe("electron-app module shell", () => {
  it("declares its repository boundary", () => {
    expect(moduleBoundary).toBe("electron-app");
  });
});
