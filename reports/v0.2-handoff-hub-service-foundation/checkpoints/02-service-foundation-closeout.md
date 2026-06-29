# Checkpoint: 02 Service Foundation Closeout

- 时间：2026-06-22
- change-name：`v0.2-handoff-hub-service-foundation`
- VCS revision：`jj @ change_id = nutvrrluxonz`，working copy commit id 会随未提交文件编辑继续变化
- 范围：Goal 9.1，NestJS + PostgreSQL Handoff Hub 服务端基础闭环
- 结果：`SERVICE_FOUNDATION_READY`

## 范围

本 checkpoint 收口 v0.2 新主线第一步：

- 服务端优先：`apps/hub-api`
- 共享领域模型：`packages/domain`
- 网络契约：`packages/contracts`
- 客户端边界 SDK：`packages/sdk`
- 后续客户端边界骨架：`apps/connector-cli`、`apps/web-console`
- PostgreSQL 17 本地隔离开发库：`/tmp/sartre-hub-pg17`，端口 `55432`

不在本 checkpoint 内处理：

- v0.1 Tauri/Rust historical baseline
- PRD SOP / spine 推导
- Feishu / Figma / GitLab 真实集成
- Electron 打包
- 完整 Web Console UI

## 关键变更文件

- `package.json`
- `.env.example`
- `scripts/postgres17-dev.sh`
- `scripts/architecture-check.ts`
- `plan/00-master-plan.md`
- `plan/v0.2-handoff-hub-service-foundation-goal.md`
- `spec/HandoffHubArchitectureSpec.md`
- `spec/AgentConnectorUXSpec.md`
- `spec/ArchitectureFitnessSpec.md`
- `spec/UISpec.md`
- `apps/hub-api/**`
- `apps/connector-cli/**`
- `apps/web-console/**`
- `packages/domain/**`
- `packages/contracts/**`
- `packages/sdk/**`

额外本机环境配置：

- `~/.zshrc` 已有 `SARTRE_POSTGRES17` 配置块。
- `~/.zprofile` 新增同名配置块，确保 macOS login shell 默认使用 PostgreSQL 17。

## PostgreSQL 17 配置证据

已确认 login shell 默认走 PostgreSQL 17：

```text
zsh -lc 'printf "%s\n" "$SARTRE_PG_BIN"; which psql; psql --version; printf "%s\n" "$SARTRE_HUB_DATABASE_URL"; psql "$SARTRE_HUB_DATABASE_URL" -c "select 1 as ok;"'

/Library/PostgreSQL/17/bin
/Library/PostgreSQL/17/bin/psql
psql (PostgreSQL) 17.10
postgresql://xy@localhost:55432/sartre_hub
 ok
----
  1
(1 row)
```

开发库状态：

```text
pnpm run pg:dev:status
localhost:55432 - accepting connections
```

说明：

- 不使用 PostgreSQL 18。
- 不使用系统 `localhost:5432` 作为本 goal 默认库，因为该实例要求密码。
- 本 goal 使用隔离库 `postgresql://xy@localhost:55432/sartre_hub`。
- 全局 shell 只设置 `SARTRE_HUB_DATABASE_URL`，未设置通用 `DATABASE_URL`，避免污染其他项目。

## 验证命令

### REAL_TEST / 通过

```text
pnpm run pg:dev:status
PASS: localhost:55432 - accepting connections
```

```text
pnpm run domain:test
PASS: 3 test files, 7 tests
```

```text
pnpm run contracts:test
PASS: 1 test file, 2 tests
```

```text
pnpm --filter @sartre/sdk test
PASS: 1 test file, 1 test
```

```text
pnpm run hub:test
PASS: 2 test files, 2 tests
```

```text
pnpm run test
PASS: root recursive tests, including desktop, domain, contracts, sdk, hub-api
```

```text
pnpm run hub:build
PASS
```

```text
pnpm --filter @sartre/domain build
PASS

pnpm --filter @sartre/contracts build
PASS

pnpm --filter @sartre/sdk build
PASS

pnpm --filter @sartre/hub-api build
PASS

pnpm --filter @sartre/connector-cli build
PASS

pnpm --filter @sartre/web-console build
PASS
```

```text
pnpm run architecture:check
PASS: architecture check passed
```

```text
pnpm run lint:v0.2
PASS: Checked 43 files. No fixes applied.
```

```text
git diff --check -- <v0.2 scoped paths>
PASS
```

### 双身份闭环证据

```text
pnpm run hub:demo:local

{
  "initial_delivery_status": "pending_delivery",
  "redelivery_status": "delivered",
  "acknowledged_status": "acknowledged",
  "artifacts": [
    "qa-report.md"
  ]
}
```

该脚本证明：

- QA endpoint 离线时，任务停留在 `pending_delivery`。
- QA endpoint 重新上线后，服务端补发任务，状态变为 `delivered`。
- QA ack 后，状态变为 `acknowledged`。
- QA 可以回传 `qa-report.md` artifact。

## 已知非 v0.2 阻塞项

以下命令按原 goal 要求执行过，但失败点属于 historical baseline，不作为 v0.2 服务端 gate：

```text
pnpm run lint
FAIL: docs/samples/spine-derivation/*.json formatting
```

```text
pnpm run build
FAIL: apps/desktop/src/App.test.tsx(231,5): TS2349 This expression is not callable. Type 'never' has no call signatures.
```

```text
git diff --check
WARN: historical docs whitespace
- docs/19-prd-sop-and-checker.md:13 trailing whitespace
- docs/archive/pre-contract-pivot/00-domain-model.md:253 blank line at EOF
- docs/samples/prd-template/PRD写作模板.md:138 blank line at EOF
```

处理原则：

- 本 goal 不修改 `apps/desktop/**`。
- 本 goal 不重排旧 PRD/spine JSON 样例。
- 若后续要恢复全仓质量门禁，应开单独 cleanup goal。

## Secret 检查

执行：

```text
/usr/bin/grep -RInE 'DATABASE_URL=.*(password|pwd|secret)|PRIVATE-TOKEN: [A-Za-z0-9]|api[_-]?key *=|secret *=|token *= *[A-Za-z0-9_-]{12,}' README.md plan spec reports apps packages scripts package.json --exclude=.env 2>/dev/null || true
```

结果：

- 仅命中 `plan/v0.2-handoff-hub-service-foundation-goal.md` 与本 closeout 中记录的 grep 命令本身。
- 未发现 repo 内真实 token、password、secret。

## 架构结论

- `packages/domain` 保持纯 TypeScript 领域模型，不依赖 Nest、PostgreSQL、HTTP、SSE、文件系统。
- `apps/hub-api` 承担组装根、应用编排、HTTP/SSE 接口、PostgreSQL 基础设施。
- `packages/contracts` 固定可网络传输的 envelope 和 schema version。
- `HandoffPack` 内容保持岗位自由包装，不把 `repo / branch / commit_range` 固化到底层 schema。
- `packages/sdk` 是后续 Web Console / Connector / Electron shell 的公共客户端边界。
- `apps/web-console` 与 `apps/connector-cli` 目前只是边界骨架，不 import `apps/hub-api` 内部实现。

## 恢复说明

如果后续发现服务端投递语义有误，从以下位置恢复检查：

1. `packages/domain/src/handoff/`：领域聚合、状态机、不变量。
2. `packages/contracts/src/index.ts`：网络契约和 `schema_version`。
3. `apps/hub-api/src/modules/handoff/application/handoff-application.service.ts`：应用编排。
4. `apps/hub-api/src/modules/handoff/infrastructure/postgres/`：表结构和仓储。
5. `apps/hub-api/src/modules/handoff/infrastructure/sse/`：在线推送。
6. `apps/hub-api/src/scripts/local-demo.ts`：双身份闭环 smoke。

后续 Web Console / Connector 应只通过 `packages/sdk` 和 `packages/contracts` 接入，不应直接 import `apps/hub-api/src/**`。
