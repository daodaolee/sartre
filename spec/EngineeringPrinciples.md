# 工程原则

## 1. 单一事实源

一个业务事实只能有一个 canonical owner。UI、Steward、Inbox、搜索和报告都是投影，不允许各自维护状态。

## 2. Fail Closed

身份不明、Workspace Scope 缺失、权限未知、Baseline 冲突、Lease 无效、Context P0 冲突或依赖不可用时，写操作必须拒绝或暂停。

## 3. Human 与 Agent 分离

Human Actor 负责目标、范围、权限和验收确认；Endpoint/Agent Actor 负责执行和上报。Endpoint Token 不能调用人工确认接口。

## 4. 事务与幂等

成功响应对应的 State、DomainEvent 和 OutboxEvent 必须同事务提交。可重试 Command 必须携带 idempotencyKey 和 expectedVersion。

## 5. 租户优先

所有 tenant-owned 数据、缓存、对象、事件、队列和日志维度都必须显式包含 workspaceId。应用授权与 PostgreSQL RLS 同时生效。

## 6. 证据优先

不得用文件存在、接口 200、测试被跳过或报告文字代替真实验证。未执行、SKIPPED 和 MANUAL_REQUIRED 不能写成 PASS。

## 7. 简洁与可替换

只引入服务核心目标的抽象。首版使用 PostgreSQL 事件表和 LISTEN/NOTIFY，不因预想规模提前引入复杂消息平台。

## 8. 无静默失败

禁止空 catch、`.catch(() => {})`、随机 usage 和失败后返回成功。允许降级的能力必须有明确状态、Metric、retry 和用户可见结果。

## 9. 模块可理解

每个模块必须说明职责、输入、输出、依赖和失败方式。无法在不读内部实现时理解合同，说明边界仍不清晰。
