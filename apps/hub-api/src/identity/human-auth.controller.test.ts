import { readFile } from "node:fs/promises";

import { HttpException } from "@nestjs/common";
import { ProblemDetailsSchema } from "@sartre/contracts";
import { describe, expect, it, vi } from "vitest";

import { HumanAuthController } from "./human-auth.controller.js";
import { HumanAuthError } from "./errors.js";
import type { HumanAuthService } from "./human-auth.service.js";

const REQUEST_ID = "10000000-0000-4000-8000-000000000001";
const CORRELATION_ID = "20000000-0000-4000-8000-000000000001";
const REQUEST = { ip: "127.0.0.1", headers: { "x-sartre-client-fingerprint": "desktop-test" } };

function fakeService(overrides: Partial<Record<keyof HumanAuthService, unknown>> = {}) {
  return {
    requestEmailVerification: vi.fn(),
    registerCompanyEmail: vi.fn(),
    loginCompanyEmail: vi.fn(),
    refresh: vi.fn(),
    authenticate: vi.fn(),
    logoutCurrent: vi.fn(),
    logoutAll: vi.fn(),
    listSessions: vi.fn(),
    ...overrides,
  } as unknown as HumanAuthService;
}

async function caught(operation: () => Promise<unknown>): Promise<HttpException> {
  const error = await operation().catch((reason: unknown) => reason);
  expect(error).toBeInstanceOf(HttpException);
  return error as HttpException;
}

describe("Human auth HTTP boundary", () => {
  it("rejects caller-reported identity before invoking the application service", async () => {
    const loginCompanyEmail = vi.fn();
    const controller = new HumanAuthController(fakeService({ loginCompanyEmail }));
    const error = await caught(() =>
      controller.loginCompanyEmail(
        {
          email: "human@example.com",
          password: "correct horse battery staple",
          userId: "30000000-0000-4000-8000-000000000001",
        },
        REQUEST,
        REQUEST_ID,
        CORRELATION_ID,
      ),
    );

    expect(error.getStatus()).toBe(400);
    expect(ProblemDetailsSchema.parse(error.getResponse())).toMatchObject({
      code: "validation_failed",
      requestId: REQUEST_ID,
      correlationId: CORRELATION_ID,
    });
    expect(loginCompanyEmail).not.toHaveBeenCalled();
  });

  it("returns the same minimal response for missing identity and wrong password", async () => {
    for (const internalReason of ["missing_identity", "password_mismatch"]) {
      const loginCompanyEmail = vi.fn(async () => {
        void internalReason;
        throw new HumanAuthError("authentication_failed");
      });
      const controller = new HumanAuthController(fakeService({ loginCompanyEmail }));
      const error = await caught(() =>
        controller.loginCompanyEmail(
          { email: "human@example.com", password: "wrong password value" },
          REQUEST,
          REQUEST_ID,
          CORRELATION_ID,
        ),
      );

      expect(error.getStatus()).toBe(401);
      expect(error.getResponse()).toEqual({
        type: "about:blank",
        title: "Request failed",
        status: 401,
        code: "authentication_failed",
        message: "Authentication failed",
        requestId: REQUEST_ID,
        correlationId: CORRELATION_ID,
      });
      expect(JSON.stringify(error)).not.toContain(internalReason);
    }
  });

  it("redacts unknown mail/database failures as dependency_unavailable", async () => {
    const controller = new HumanAuthController(
      fakeService({
        requestEmailVerification: vi.fn(async () => {
          throw new Error("raw mail response and database relation details");
        }),
      }),
    );
    const error = await caught(() =>
      controller.requestEmailVerification(
        { email: "human@example.com" },
        REQUEST,
        REQUEST_ID,
        CORRELATION_ID,
      ),
    );

    expect(error.getStatus()).toBe(503);
    expect(error.getResponse()).toMatchObject({
      code: "dependency_unavailable",
      message: "Dependency unavailable",
    });
    expect(JSON.stringify(error)).not.toMatch(/raw mail|database relation/iu);
  });

  it("rejects unsupported authorization schemes for session inventory", async () => {
    const controller = new HumanAuthController(fakeService());
    const error = await caught(() =>
      controller.listSessions("Basic unsupported", REQUEST_ID, CORRELATION_ID),
    );
    expect(error.getResponse()).toMatchObject({ code: "unauthenticated", status: 401 });
  });

  it("contains no logging path for auth request or response values", async () => {
    const source = await readFile(new URL("./human-auth.controller.ts", import.meta.url), "utf8");
    expect(source).not.toMatch(/console\.|Logger|JSON\.stringify/gu);
    expect(source).not.toMatch(/authorizationUrl.*log|refreshToken.*log|password.*log/giu);
  });
});
