# CLAUDE.md

> 本文件为 Claude Code / AI 编码助手提供精简入口。完整协作指引见 `AGENTS.md`。

## 当前项目

Sartre 是岗位协同工具。当前首版围绕：

- NestJS Handoff Hub
- PostgreSQL 事实源
- Web Console
- Local Connector
- Codex executor adapter
- role capability packages
- provider-neutral conversation ledger

## 必读顺序

1. `README.md`
2. `docs/00-domain-model.md`
3. `docs/01-architecture-overview.md`
4. `spec/`
5. `workflow/`
6. `plan/00-master-plan.md`
7. 当前代码

## 常用验证

```bash
pnpm run web:smoke:hub
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
pnpm run architecture:check
```

## 协作约定

- 中文沟通。
- 不把未执行的验证写成已通过。
- 默认不 commit / push。
- 代码边界遵循 `packages/domain -> contracts/sdk -> apps` 的 monorepo 分层。
