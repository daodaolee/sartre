# ADR-0003：Sartre 自持协同事实源，不硬依赖 superagentai

- 状态：已接受，2026-06-26 清理后修订
- 相关：`docs/00-domain-model.md`、`docs/01-architecture-overview.md`

## 背景

早期讨论曾把 superagentai 作为 LLM 接入和聊天实现参考。当前产品方向已经收敛为内部岗位协同工具，需要平台自己保存任务、状态、审计和 conversation ledger。

## 决策

Sartre 自持以下事实源：

- TaskHandoff / Delivery / Artifact / AuditEvent
- AgentEndpoint / RoleCapabilityPack
- Conversation / Message / ModelRun / ContextProjection

superagentai 仅作为 LLM 接入设计参考，不成为运行时硬依赖。

## 理由

1. 岗位协同的核心事实必须在 Sartre 内，否则无法诊断和恢复。
2. 多 LLM 切换时，canonical history 必须留在平台层，而不是 provider session。
3. 本地首版要能只依赖 Hub + Web Console + Connector 跑通。

## 影响

- Hub API 和 PostgreSQL 是当前事实源。
- Codex 先作为 executor adapter 接入。
- 后续 Claude 或其他 provider 只增加 adapter/projection，不迁移 canonical history。
