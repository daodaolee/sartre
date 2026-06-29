# BDD Feature: local-connector-mvp

## Feature: Local Connector MVP

Sartre should let a local role endpoint receive Handoff Hub deliveries into a file-based inbox that Codex, Claude, command, MCP, plugin, hook, subagent, or manual workflows can read, then send ack and report artifacts back to the Hub.

## Evidence Matrix

| 场景 | 当前证据等级 | 证据 | 备注 |
| --- | --- | --- | --- |
| 场景 1: 显示本地 profile | `REAL_TEST` | `pnpm --filter @sartre/connector-cli test` | profile rendering test passed |
| 场景 2: 离线 QA 连接后收到 pending handoff | `REAL_TEST` | `CHANGE_NAME=local-connector-mvp pnpm harness:regression` -> `Local connector demo` | `initial_delivery_status: pending_delivery`; `inbox_entry` written |
| 场景 3: SSE listen once 写入 inbox | `REAL_TEST` | `CHANGE_NAME=local-connector-mvp pnpm harness:regression` -> `Local connector demo` | `sse_delivery_status: delivered`; `sse_inbox_entry` written |
| 场景 4: inbox 文件 agent-readable | `REAL_TEST` | `pnpm --filter @sartre/connector-cli test` | `handoff.md` includes title, delivery, ack, report |
| 场景 5: ack 回传 | `REAL_TEST` | `CHANGE_NAME=local-connector-mvp pnpm harness:regression` -> `Local connector demo` | `acknowledged_status: acknowledged` |
| 场景 6: report artifact 回传 | `REAL_TEST` | `CHANGE_NAME=local-connector-mvp pnpm harness:regression` -> `Local connector demo` | artifacts include `qa-report.md` |
| 场景 7: connector 不 import hub internals | `REAL_TEST` | `pnpm run architecture:check` | architecture check passed |

## Scenarios

### 场景 1: 显示本地 profile

**Given** 本地租户为 `local-demo`
**When** 用户运行 `connector profile qa`
**Then** CLI 应输出 `qa_user`、`qa`、`qa_codex_local` 和 Hub base URL

### 场景 2: 离线 QA 连接后收到 pending handoff

**Given** QA endpoint 离线
**And** Dev 创建一个发给 QA 的 handoff
**When** QA 运行 `connector connect qa`
**Then** connector 应写入 `.sartre/inbox/<handoff-id>/handoff.md`
**And** 应写入 `pack.json` 与 `delivery.json`

### 场景 3: SSE listen once 写入 inbox

**Given** QA endpoint 在线并运行 `connector listen qa --once`
**When** Dev 创建一个发给 QA 的 handoff
**Then** connector 应收到 SSE delivery event
**And** connector 应拉取 handoff 详情并写入 inbox 后退出

### 场景 4: inbox 文件 agent-readable

**Given** connector 已写入本地 inbox
**When** Codex 或人工打开 `handoff.md`
**Then** 文件应包含标题、from/to、delivery id、summary、ack 命令和 report 命令

### 场景 5: ack 回传

**Given** inbox 中存在一个 delivery
**When** 用户运行 `connector ack <delivery-id>`
**Then** Hub 中该 delivery 应变为 `acknowledged`

### 场景 6: report artifact 回传

**Given** QA 产出了 `qa-report.md`
**When** 用户运行 `connector report <handoff-id> qa-report.md`
**Then** Hub 应记录 artifact `qa-report.md`

### 场景 7: connector 不 import hub internals

**Given** Connector 是本地客户端
**When** 架构检查运行
**Then** `apps/connector-cli` 不应 import `apps/hub-api/src/**`
