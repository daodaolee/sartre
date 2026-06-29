import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RoleCapabilitiesModule } from "./role-capabilities.module";

describe("Role Capabilities API", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [RoleCapabilitiesModule],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("serves installed role capability packs and chat mention candidates", async () => {
    await request(app.getHttpServer())
      .get("/role-capabilities?tenant_id=local-demo")
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          schema_version: "1.0",
          tenant_id: "local-demo",
        });
        expect(body.packs.map((pack: { id: string }) => pack.id)).toEqual([
          "bff-marketing-bff-capability-pack",
          "frontend-marketing-ai-aws-capability-pack",
          "qa-falcocut-capability-pack",
          "vcm-hot-template-admin-capability-pack",
        ]);
        expect(body.mentions).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              mention: "@qa.ui-regression-execution",
              kind: "skill",
              sourceProjectId: "ai-native-qa",
            }),
            expect.objectContaining({
              mention: "@dev.frontend.build-qa",
              kind: "command",
              sourceProjectId: "marketing-ai-aws",
            }),
          ]),
        );
      });
  });
});
