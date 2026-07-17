import { describe, expect, it } from "vitest";
import { moduleBoundary } from "./index.js";

describe("sdk module shell", () => {
  it("declares its repository boundary", () => {
    expect(moduleBoundary).toBe("sdk");
  });
});
