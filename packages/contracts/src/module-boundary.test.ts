import { describe, expect, it } from "vitest";
import { moduleBoundary } from "./index.js";

describe("contracts module shell", () => {
  it("declares its repository boundary", () => {
    expect(moduleBoundary).toBe("contracts");
  });
});
