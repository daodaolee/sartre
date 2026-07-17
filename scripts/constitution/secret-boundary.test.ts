import { describe, expect, it } from "vitest";
import { scanTextForSecrets } from "./secret-boundary.js";

describe("secret boundary", () => {
  it("rejects a Codex API key literal", () => {
    const fakeCredential = `uk-${"sa"}-${"a".repeat(64)}`;
    const violations = scanTextForSecrets("fixture.ts", `const key = "${fakeCredential}";`);

    expect(violations).toEqual([
      {
        ruleId: "secret-pattern",
        path: "fixture.ts",
      },
    ]);
  });

  it("rejects files under the local secret directory", () => {
    const violations = scanTextForSecrets(".local-secrets/development.env", "SAFE=value");

    expect(violations).toEqual([
      {
        ruleId: "forbidden-path",
        path: ".local-secrets/development.env",
      },
    ]);
  });

  it("accepts a Keychain reference name without a credential value", () => {
    expect(scanTextForSecrets("provider.ts", 'const ref = "dev.sartre.codex.test-1";')).toEqual([]);
  });
});
