# 测试策略

本文件定义当前 Sartre TypeScript monorepo 的测试与证据要求。

## 1. 核心原则

- 测试先行：有行为变化先补测试。
- 证据先行：没有真实执行输出，不得宣称通过。
- 分层测试：领域单元、契约测试、服务端 e2e、Web 组件/操作测试、端到端 smoke。

## 2. 测试层级

| 层级 | 对象 | 工具 |
| --- | --- | --- |
| 单元 | `packages/domain`, `packages/connector-core` 纯逻辑 | Vitest |
| 契约 | `packages/contracts`, `packages/sdk` | Vitest |
| 服务端集成 | `apps/hub-api` + PostgreSQL repository/application/controller | Vitest + Supertest |
| Web 操作 | `apps/web-console` 组件与操作函数 | Vitest |
| Connector | CLI profile / inbox / execution adapter | Vitest |
| 端到端 smoke | Hub + Web operation + Connector fake execution | `pnpm run web:smoke:hub` |
| 回归门禁 | 当前首版候选 | `CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression` |

## 3. 必测场景

任何影响核心链路的改动必须覆盖：

- 正常路径。
- 非法状态转换。
- 输入 schema 校验。
- Hub repository 持久化/重放。
- Web 当前 endpoint 视角。
- Connector inbox/replay。
- 执行器成功和失败写回。
- conversation ledger / context projection。
- secret scan。

## 4. UI 验证

默认用 Vitest 覆盖可确定的组件和操作逻辑。需要真实浏览器检查时，用 Playwright 或 in-app browser 做一次性验收。

必须真实检查的 UI 行为：

- 首屏工作区可用，不是静态展示。
- Dev/QA 角色切换后面板刷新。
- Agent 页面只展示当前角色的 Agent。
- Hooks/Skills/Models/Settings 菜单可打开。
- 创建任务支持标题、富文本描述、`@` 能力 mention、目标岗位/Agent。
- 任务详情只在选择任务后展示时间线、conversation、执行和回传入口。
- message、tooltip、popover、modal 不遮挡关键操作。

## 5. 证据等级

遵循 `workflow/harness-sop.md`：

- `REAL_TEST`：命令真实执行并通过。
- `STRUCTURAL_CHECK`：文件/规范/静态结构检查通过。
- `MANUAL_REQUIRED`：需要用户人工验收。
- `SKIPPED`：明确说明跳过原因。

不得把 `SKIPPED` 或未执行的命令写成 `PASS`。

## 6. 当前推荐命令

```bash
pnpm --filter @sartre/domain test
pnpm --filter @sartre/contracts test
pnpm --filter @sartre/sdk test
pnpm --filter @sartre/connector-core test
pnpm --filter @sartre/connector-cli test
pnpm --filter @sartre/hub-api test
pnpm --filter @sartre/web-console test
pnpm run web:smoke:hub
pnpm run lint:lane-a
pnpm run architecture:check
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
```

## 7. 完成自检

- [ ] 相关测试已真实执行。
- [ ] 回归报告写入 `reports/<change>/regression/`。
- [ ] evidence gate 对当前候选通过。
