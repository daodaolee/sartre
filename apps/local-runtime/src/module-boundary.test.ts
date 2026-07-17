import { describe, expect, it } from "vitest";
import { moduleBoundary } from "./index.js";

describe("local-runtime module shell", () => {
  it("declares its repository boundary", () => {
    expect(moduleBoundary).toBe("local-runtime");
  });
});
