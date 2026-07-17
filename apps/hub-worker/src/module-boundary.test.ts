import { describe, expect, it } from "vitest";
import { moduleBoundary } from "./index.js";

describe("hub-worker module shell", () => {
  it("declares its repository boundary", () => {
    expect(moduleBoundary).toBe("hub-worker");
  });
});
