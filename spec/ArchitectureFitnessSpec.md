# 架构适配检查规范（项目宪法补充）

> 本文件定义 Handoff Hub 新主线的架构检查项。规范必须最终落成自动化 checker；在 checker 完成前，closeout 必须人工记录这些检查结果。

## 1. 分层检查

必须检查：

- `packages/domain` 不依赖 Nest、HTTP、DB、文件系统。
- `apps/hub-api` 的 controller 不包含领域状态转换。
- `application` 只依赖 `domain` 与 `ports`。
- `infrastructure` 不向外暴露数据库 row 类型。
- `apps/web-console` 与 `apps/connector-cli` 不 import `apps/hub-api` 内部文件。

## 2. 状态机检查

必须检查：

- 不使用 `isDelivered`、`isRunning`、`hasError` 等布尔组合表达核心状态。
- `TaskHandoffStatus` 和 `DeliveryStatus` 是枚举或联合类型。
- 转换集中在 `transition` 函数。
- 非法转换返回分类错误。
- 状态转换测试覆盖所有合法转换。

## 3. 契约检查

必须检查：

- 网络 DTO 有 `schema_version`。
- Envelope 字段稳定。
- HandoffPack 内容不强制 Dev -> QA 专属字段。
- 所有 adapter / endpoint 有 capabilities。
- 错误映射到统一分类。

## 4. 测试检查

必须检查：

- 领域测试先于实现。
- 状态机测试先 Red 后 Green。
- 离线补投有测试。
- SSE 推送有集成测试或脚本证据。
- Artifact 回传有测试。

## 5. UI 检查

必须检查：

- 使用语义 token。
- light/dark 都可用。
- Agent 创建流程包含健康检查。
- 失败状态显示真实原因。
- 页面信息密度适合工作台重复操作。

## 6. Secret 检查

必须检查：

- 不提交 `.env`。
- 不在报告、计划、README 中写入真实 token / password。
- 错误日志不打印完整数据库连接串。

## 7. 目标

后续应提供：

```bash
pnpm run architecture:check
```

在该脚本完成前，Goal closeout 必须手动记录上述检查项是否通过。
