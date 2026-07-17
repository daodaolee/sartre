import { describe, expect, it } from "vitest";
import { moduleBoundary } from "./index.js";

describe("hub-api module shell", () => {
  it("declares its repository boundary", () => {
    expect(moduleBoundary).toBe("hub-api");
  });
});
