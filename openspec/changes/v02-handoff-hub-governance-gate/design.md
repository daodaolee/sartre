# Design: v02-handoff-hub-governance-gate

## Context

当前仓库已有完整约束链：

- OpenSpec change 描述需求与能力。
- `bdd/features/*.md` 描述 Given / When / Then 行为期望。
- `acceptance/checklists/*.md` 描述交付门禁。
- `reports/<change>/checkpoints/PLAN_LEDGER.md` 描述跨会话恢复索引。
- `workflow/harness-sop.md` 定义证据等级，禁止把未执行检查写成通过。

Handoff Hub 服务端基础闭环已经完成了代码与真实验证，但它是在新主线快速落地过程中完成的，需要用 OpenSpec / BDD / acceptance 管理链补齐治理。

## Goals / Non-Goals

**Goals:**

- 为 v0.2 Handoff Hub 新增 OpenSpec capability：`handoff-governance-gate`。
- 为 v0.2 服务端基础闭环新增 BDD feature，并标注当前真实证据等级。
- 为 v0.2 服务端基础闭环新增 acceptance checklist，后续目标必须按清单收口。
- 让 `CHANGE_NAME=v02-handoff-hub-governance-gate pnpm harness:regression` 能真实执行 v0.2 scoped 回归。
- 明确 full repo gate 与 scoped gate 的边界，避免非候选路径问题污染新主线判断。

**Non-Goals:**

- 不新增 Handoff Hub 业务功能。
- 不清理非候选路径的所有 lint/build 遗留问题。
- 不实现 Web Console 页面。
- 不实现 Connector 自动调用 Codex / Claude / MCP。
- 不提交、不推送、不发布。

## Decisions

### 1. 先补 governance gate，再推进 UI/Connector

选择：先补 OpenSpec / BDD / acceptance / harness / ledger。

理由：v0.2 后续会跨服务端、Web Console、Connector、Electron shell。如果没有同一条证据链，后续每个目标都会靠聊天上下文和 checkpoint 记忆推进，容易漂移。

替代方案：直接开始 Web Console。放弃原因：UI 会依赖服务端契约和状态语义，没有 BDD/acceptance 时容易把“看起来能展示”误当成“业务闭环可验证”。

### 2. 使用 scoped regression，不把非候选遗留作为当前失败

选择：新增或扩展 harness 分支，只在 `CHANGE_NAME=v02-handoff-hub-governance-gate` 时执行 v0.2 相关路径。

理由：全量 `pnpm run lint`、`pnpm run build`、`git diff --check` 可能触及非候选路径。目标是让当前 gate 可重复，而不是混入非候选清理。

替代方案：一次性修全仓 gate。放弃原因：范围会扩大到非候选路径，不符合 KISS，也会干扰当前主线。

### 3. BDD 记录为行为事实，真实检查由 harness 执行

选择：BDD 文件描述 Dev -> QA -> Dev、离线补发、ack、artifact、架构边界、上下文隔离等场景；harness 执行能失败的命令证明这些场景。

理由：BDD 不是测试替代品。根据 `workflow/harness-sop.md`，场景必须在有可执行测试或脚本时才能升级为 `REAL_TEST`。

替代方案：只在 closeout 写命令列表。放弃原因：closeout 是结果记录，不是长期行为契约；后续目标无法复用。

### 4. Secret scan 保留为脚本门禁，但接受命中命令文本本身

选择：harness 中执行 secret grep，并把只命中 goal/checkpoint 中的 grep 命令本身视为通过。

理由：当前 repo 中存在用于记录检查命令的文本。它不是真实密钥泄露，但需要在报告里明确说明。

## Risks / Trade-offs

- Governance 文件增加 → 维护成本上升。缓解：只补当前 v0.2 最小闭环，不凭空生成未来 Web/Electron 大量规格。
- Scoped gate 可能掩盖全仓问题 → 在 checkpoint 中明确 full repo gate 的 non-candidate blocker，并把全仓 cleanup 留给单独 goal。
- BDD evidence 状态可能夸大 → 每个场景必须绑定具体命令或标记 `STRUCTURAL_CHECK` / `MANUAL_REQUIRED` / `SKIPPED`。

## Migration Plan

1. 创建 OpenSpec change 和 capability spec。
2. 新增 BDD feature 与 acceptance checklist。
3. 更新 `scripts/harness-regression.sh`，增加 v0.2 governance gate 分支。
4. 新增 Goal 9.2 与 checkpoint ledger。
5. 执行真实验证：
   - OpenSpec validate
   - BDD/acceptance 文件存在性检查
   - PostgreSQL 17 连接
   - domain/contracts/sdk/hub tests
   - architecture check
   - v0.2 lint/build/demo
   - secret scan
   - scoped diff check
6. 更新 checkpoint 和 ledger。

回滚策略：

- 删除 `openspec/changes/v02-handoff-hub-governance-gate/**`、对应 BDD/acceptance/report/goal 文档。
- 回滚 `scripts/harness-regression.sh` 中的 v0.2 change 分支。

## Open Questions

- full repo gate 的 non-candidate cleanup 是否作为单独 goal 推进。
- Web Console 的下一目标是否先做只读 dashboard，还是先做 Agent Setup Wizard。
