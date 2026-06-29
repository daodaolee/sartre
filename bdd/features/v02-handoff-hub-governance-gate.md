# BDD Feature: v02-handoff-hub-governance-gate

## Feature: v0.2 Handoff Hub governance gate

Sartre should keep role-collaboration development inside the current OpenSpec constraint chain: OpenSpec defines capability intent, BDD defines behavior, acceptance defines delivery gates, PLAN_LEDGER records recovery state, and harness runs real verification.

Latest regression evidence: `reports/v0.2-handoff-hub-governance-gate/regression/latest.md`

## Evidence Matrix

| 场景 | 当前证据等级 | 证据 | 备注 |
| --- | --- | --- | --- |
| 场景 1: OpenSpec change 完整 | `STRUCTURAL_CHECK` | `openspec/changes/v02-handoff-hub-governance-gate/**`; `pnpm exec openspec status --change v02-handoff-hub-governance-gate` | 证明治理结构存在，不直接证明业务逻辑 |
| 场景 2: BDD 和 acceptance 存在 | `STRUCTURAL_CHECK` | `bdd/features/v02-handoff-hub-governance-gate.md`; `acceptance/checklists/v02-handoff-hub-governance-gate.md` | 证明行为期望和验收门禁已登记 |
| 场景 3: PostgreSQL 17 默认可用 | `REAL_TEST` | `zsh -lc 'which psql && psql --version && psql "$SARTRE_HUB_DATABASE_URL" -c "select 1 as ok;"'` | 证明本机 login shell 使用 PostgreSQL 17 且 dev DB 可连 |
| 场景 4: 服务端基础闭环仍通过 | `REAL_TEST` | `pnpm run domain:test`; `pnpm run contracts:test`; `pnpm --filter @sartre/sdk test`; `pnpm run hub:test`; `pnpm run hub:demo:local` | 覆盖 domain/contracts/sdk/hub 和 Dev -> QA -> Dev smoke |
| 场景 5: 架构边界仍通过 | `REAL_TEST` | `pnpm run architecture:check` | 证明 domain/client/server 边界未被打破 |
| 场景 6: v0.2 scoped lint/build 通过 | `REAL_TEST` | `pnpm run lint:v0.2`; package scoped build commands | 不把 current non-candidate build 纳入当前 gate |
| 场景 7: non-candidate issue is honestly scoped | `STRUCTURAL_CHECK` | current final checkpoint | full repo lint/build/diff 遗留只作为 non-candidate issue |
| 场景 8: secret scan 不泄露真实密钥 | `REAL_TEST` | secret grep command in `harness:regression` | 命中检查命令文本本身不算泄露 |

## Scenarios

### 场景 1: OpenSpec change 完整

**Given** v0.2 Handoff Hub 进入新主线
**When** 创建 `v02-handoff-hub-governance-gate` change
**Then** OpenSpec 应包含 proposal、design、specs、tasks
**And** `openspec status` 应显示 4/4 artifacts complete

### 场景 2: BDD 和 acceptance 存在

**Given** Goal 9.2 是非 trivial 目标
**When** 开始实现或收口该目标
**Then** 仓库应存在对应 BDD feature
**And** 仓库应存在对应 acceptance checklist

### 场景 3: PostgreSQL 17 默认可用

**Given** 用户要求默认使用 PostgreSQL 17 而不是 18
**When** 新 login shell 执行 `psql`
**Then** `which psql` 应指向 `/Library/PostgreSQL/17/bin/psql`
**And** `psql --version` 应显示 PostgreSQL 17.x
**And** `SARTRE_HUB_DATABASE_URL` 应能 `select 1`

### 场景 4: 服务端基础闭环仍通过

**Given** Handoff Hub 服务端基础闭环已经实现
**When** v0.2 governance regression 运行
**Then** domain、contracts、sdk、hub-api 测试应通过
**And** local demo 应证明 `pending_delivery -> delivered -> acknowledged`
**And** demo 应回传 `qa-report.md`

### 场景 5: 架构边界仍通过

**Given** v0.2 要保持服务端、Web、Connector、Electron 后续边界隔离
**When** 架构检查运行
**Then** `packages/domain` 不应依赖 Nest、PostgreSQL、HTTP 或文件系统
**And** `apps/web-console` 与 `apps/connector-cli` 不应 import `apps/hub-api/src/**`

### 场景 6: v0.2 scoped lint/build 通过

**Given** non-candidate legacy content does not belong to this goal
**When** v0.2 scoped lint/build 运行
**Then** v0.2 服务端、共享包、Web/Connector 边界骨架应通过检查
**And** non-candidate issues should not be mislabeled as current candidate failures

### 场景 7: non-candidate issue is honestly scoped

**Given** full repo `pnpm run lint`、`pnpm run build` 或 `git diff --check` 可能仍受 current candidate boundary 影响
**When** closeout 记录验证结果
**Then** 报告必须列出 full repo blocker
**And** 报告必须说明它是否属于当前 v0.2 scoped gate

### 场景 8: secret scan 不泄露真实密钥

**Given** repo 内有 goal/checkpoint 记录 secret grep 命令文本
**When** secret scan 运行
**Then** 真实 token、password、secret 不应出现在命中结果中
**And** 命中 grep 命令文本本身时应在报告中说明
