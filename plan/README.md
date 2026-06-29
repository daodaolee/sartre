# Plan

本目录记录 Sartre 当前主线的实施计划。当前主线是岗位协同本地首版。

## 入口

- 总纲：`plan/00-master-plan.md`
- 执行协议：`plan/ai-execution-protocol.md`
- 当前验证候选：`lane-a-service-baseline`
- 当前回归命令：`CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression`

## 当前计划粒度

当前计划按能力切片组织：

- Hub 服务端事实源
- Delivery 状态机与审计
- Local Connector
- Web Console 操作面
- Agent setup / health / reconnect
- Role capability packages
- Provider registry
- Conversation ledger
- Codex executor adapter
- 端到端 handoff loop

## 冲突裁决

`spec/` 项目宪法 > `workflow/` 证据规则 > 当前 plan > `docs/` 描述性设计。
