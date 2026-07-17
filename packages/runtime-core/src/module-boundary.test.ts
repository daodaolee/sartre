import { describe, expect, it } from "vitest";
import { moduleBoundary } from "./index.js";

describe("runtime-core module shell", () => {
  it("declares its repository boundary", () => {
    expect(moduleBoundary).toBe("runtime-core");
  });
});
