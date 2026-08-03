import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";

import { _electron as electron, expect, test } from "@playwright/test";

const ELECTRON_EXECUTABLE = createRequire(import.meta.url)("electron") as string;
const PACKAGED_ELECTRON_EXECUTABLE = resolve(
  "apps/electron-app/release/mac-arm64/Sartre.app/Contents/MacOS/Sartre",
);
const PACKAGED_TARGET = process.env.SARTRE_MS1_E2E_TARGET === "packaged";
const USER_ID = "10000000-0000-4000-8000-000000000001";
const SESSION_ID = "20000000-0000-4000-8000-000000000001";
const MEMBERSHIP_ID = "30000000-0000-4000-8000-000000000001";
const LONG_MEMBER_NAME = "负责基础设施与超长中文名称兼容性验证的工作区管理员";

type HubFixture = {
  readonly origin: string;
  readonly stop: () => Promise<void>;
};

function session() {
  const segment = () => randomBytes(24).toString("base64url");
  return {
    userId: USER_ID,
    sessionId: SESSION_ID,
    accessToken: `${segment()}.${segment()}.${segment()}`,
    accessExpiresAt: new Date(Date.now() + 5 * 60_000).toISOString(),
    refreshToken: randomBytes(32).toString("base64url"),
  };
}

async function jsonBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let length = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    length += value.length;
    if (length > 8_192) throw new Error("request_too_large");
    chunks.push(value);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as Record<string, unknown>;
}

function send(response: ServerResponse, status: number, value?: unknown): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json");
  response.end(value === undefined ? undefined : JSON.stringify(value));
}

async function startHubFixture(): Promise<HubFixture> {
  let workspaceId = "40000000-0000-4000-8000-000000000001";
  let workspaceName = "默认工作区";
  const projects: Array<{
    projectId: string;
    name: string;
    status: "active";
    accessRole: "editor";
    version: number;
  }> = [];
  const server = createServer((request, response) => {
    void (async () => {
      const method = request.method ?? "GET";
      const path = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      if (method === "POST" && (path === "/v1/auth/email/login" || path === "/v1/auth/refresh")) {
        await jsonBody(request);
        send(response, 200, session());
        return;
      }
      if (method === "POST" && path === "/v1/auth/logout") {
        send(response, 204);
        return;
      }
      if (method === "POST" && path === "/v1/workspaces") {
        const body = await jsonBody(request);
        workspaceId = String(body.workspaceId);
        workspaceName = String(body.name);
        send(response, 201, {
          workspaceId,
          name: workspaceName,
          status: "active",
          role: "owner",
          version: 0,
        });
        return;
      }
      if (method === "GET" && path === `/v1/workspaces/${workspaceId}`) {
        send(response, 200, {
          workspaceId,
          name: workspaceName,
          status: "active",
          role: "owner",
          version: 0,
        });
        return;
      }
      if (method === "GET" && path === `/v1/workspaces/${workspaceId}/members`) {
        send(response, 200, [
          {
            membershipId: MEMBERSHIP_ID,
            userId: USER_ID,
            displayName: LONG_MEMBER_NAME,
            role: "owner",
            status: "active",
            version: 0,
          },
        ]);
        return;
      }
      if (method === "GET" && path === `/v1/workspaces/${workspaceId}/projects`) {
        send(response, 200, projects);
        return;
      }
      if (method === "POST" && path === `/v1/workspaces/${workspaceId}/projects`) {
        const body = await jsonBody(request);
        const project = {
          projectId: String(body.projectId),
          name: String(body.name),
          status: "active" as const,
          accessRole: "editor" as const,
          version: 0,
        };
        projects.push(project);
        send(response, 201, project);
        return;
      }
      if (method === "POST" && path === `/v1/workspaces/${workspaceId}/invitations`) {
        const body = await jsonBody(request);
        send(response, 201, {
          workspaceId,
          invitationId: body.invitationId,
          invitedEmail: body.invitedEmail,
          role: body.role,
          status: "pending",
          expiresAt: body.expiresAt,
          version: 0,
        });
        return;
      }
      send(response, 404, {
        type: "about:blank",
        title: "Request failed",
        status: 404,
        code: "resource_not_found",
        message: "Access denied",
        requestId: "50000000-0000-4000-8000-000000000001",
        correlationId: "60000000-0000-4000-8000-000000000001",
      });
    })().catch(() => send(response, 500));
  });
  await new Promise<void>((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("hub_fixture_address_invalid");
  return {
    origin: `http://127.0.0.1:${address.port}`,
    stop: () =>
      new Promise((resolveClose, reject) =>
        server.close((error) => (error ? reject(error) : resolveClose())),
      ),
  };
}

test("keeps MS1 credentials behind Main while the desktop flow survives required sizes", async () => {
  const hub = await startHubFixture();
  const userData = await mkdtemp(join(tmpdir(), "sartre-ms1-electron-"));
  const application = await electron.launch({
    executablePath: PACKAGED_TARGET ? PACKAGED_ELECTRON_EXECUTABLE : ELECTRON_EXECUTABLE,
    args: [
      ...(PACKAGED_TARGET ? [] : [resolve("apps/electron-app")]),
      `--user-data-dir=${userData}`,
    ],
    env: {
      PATH: "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin",
      SARTRE_HUB_BASE_URL: hub.origin,
      SARTRE_HEALTH_TIMEOUT_MS: "500",
    },
    timeout: 15_000,
  });

  try {
    const page = await application.firstWindow();
    await expect(page.getByRole("heading", { name: "登录本机工作台" })).toBeVisible();
    await page.bringToFront();
    const emailInput = page.getByLabel("公司邮箱");
    if (!(await emailInput.evaluate((element) => element === document.activeElement))) {
      await page.keyboard.press("Tab");
    }
    await expect(emailInput).toBeFocused();
    await page.screenshot({ path: "/tmp/sartre-ms1-login.png" });

    const password = `runtime-${randomBytes(12).toString("base64url")}`;
    await page.getByLabel("公司邮箱").fill("owner@example.com");
    await page.getByLabel("密码").fill(password);
    await page.getByRole("button", { name: "登录", exact: true }).click();
    await expect(page.getByRole("heading", { name: "开始使用工作区" })).toBeVisible();

    const workspaceName = "研发质量与超长中文布局验证工作区".repeat(3);
    await page.getByLabel("工作区名称").fill(workspaceName);
    await page.getByRole("button", { name: "创建并打开" }).click();
    await expect(page.getByRole("heading", { name: workspaceName })).toBeVisible();

    await page.getByRole("button", { name: "成员与邀请" }).click();
    await expect(page.getByText(LONG_MEMBER_NAME, { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "项目权限" }).click();
    await page.getByLabel("项目名称").fill("Sartre 主流程项目");
    await page.getByRole("button", { name: "创建项目", exact: true }).click();
    await expect(page.getByText("Sartre 主流程项目")).toBeVisible();

    await page.getByRole("button", { name: "本机 Endpoint" }).click();
    await expect(page.getByRole("button", { name: "配对本机 Runtime" })).toBeDisabled();
    await expect(page.getByText("authenticated local IPC", { exact: false })).toBeVisible();

    for (const viewport of [
      { width: 1_440, height: 900 },
      { width: 1_280, height: 720 },
      { width: 860, height: 560 },
    ]) {
      await page.setViewportSize(viewport);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      if (viewport.width === 860) {
        await page.screenshot({ path: "/tmp/sartre-ms1-minimum.png" });
      }
    }
    await page.setViewportSize({ width: 1_280, height: 720 });
    await page.screenshot({ path: "/tmp/sartre-ms1-workspace.png" });

    const rendererBoundary = await page.evaluate(() => {
      const global = window as Window & {
        ipcRenderer?: unknown;
        process?: unknown;
        require?: unknown;
      };
      return {
        apiKeys: Object.keys(window.sartre).sort(),
        authKeys: Object.keys(window.sartre.auth).sort(),
        workspaceKeys: Object.keys(window.sartre.workspaces).sort(),
        hasRawIpc: global.ipcRenderer !== undefined,
        hasProcess: global.process !== undefined,
        hasRequire: global.require !== undefined,
        body: document.body.innerText,
        location: window.location.href,
        opened: window.open("https://example.com"),
      };
    });
    expect(rendererBoundary).toMatchObject({
      apiKeys: ["auth", "workspaces"],
      authKeys: ["getState", "login", "logout", "recover", "subscribe"],
      hasRawIpc: false,
      hasProcess: false,
      hasRequire: false,
      opened: null,
    });
    expect(rendererBoundary.location).toMatch(/^file:/u);
    expect(rendererBoundary.body).not.toContain(password);
    expect(rendererBoundary.body).not.toContain("accessToken");
    expect(rendererBoundary.body).not.toContain("refreshToken");
    expect(rendererBoundary.body).not.toContain("credential");
  } finally {
    await application.close();
    await hub.stop();
    await rm(userData, { recursive: true, force: true });
  }
});
