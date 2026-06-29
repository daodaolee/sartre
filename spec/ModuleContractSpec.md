# 模块契约规范（项目宪法）

> 本文件是 Sartre 的**项目宪法**之一。模块之间通过"契约"交互，而非通过了解对方实现。契约是 [EngineeringPrinciples](./EngineeringPrinciples.md) 中 OCP/LSP/DIP 能落地的前提，也是 [DDDSpec](./DDDSpec.md) 限界上下文的边界协议。
>
> **强制约束。** 本文件定义契约的构成、错误分类标准、版本演进规则。错误分类被 [harness-sop](../workflow/harness-sop.md) 的证据判定与各模块测试共同引用。

## 1. 契约的构成

一个模块对外的契约 = **接口 + 数据结构 + 错误类型 + 行为保证 + 能力声明**。五者缺一不可。

```
┌─────────────────────────────────────────────────────────────┐
│                      模块契约 = 5 要素                       │
├─────────────────────────────────────────────────────────────┤
│ 1. 接口 (interface)    能调用哪些方法，签名是什么            │
│ 2. 数据结构 (schema)   输入输出的形状 (请求/响应/事件)       │
│ 3. 错误类型            可能失败的分类，调用方据此决策        │
│ 4. 行为保证            前置条件/后置条件/不变量              │
│ 5. 能力声明            该实现支持/不支持什么 (差异显式化)    │
└─────────────────────────────────────────────────────────────┘
```

在 Sartre 中，跨边界的数据结构（2）统一定义在 `packages/contracts`，用 zod schema 表达并导出推断类型；领域不变量（4）由 `packages/domain` 的聚合根强制。

## 2. 接口契约

- 用 TypeScript `interface` / port 定义，方法签名稳定
- 异步统一返回 `Promise`，流式用 SSE / `AsyncIterable`
- 不在接口暴露内部实现类型；输入输出用 `packages/contracts` 的公开 schema 推断类型
- 可选能力拆成独立 interface（ISP，见 [EngineeringPrinciples](./EngineeringPrinciples.md)）

```typescript
/** 执行器适配器契约。所有实现必须满足本接口的行为保证。 */
interface ExecutorAdapter {
  /**
   * 执行一次交接投递。
   * 前置: delivery 处于 accepted 状态
   * 后置: 返回 report_ready 结果，或返回已分类的 ExecutorError
   * 保证: 不抛未分类异常；超时由实现内部处理并转为 ExecutorError(kind="Timeout")
   */
  execute(delivery: DeliveryRecord): Promise<ExecutionResult>;

  /** 能力声明，调用方据此决定是否使用某特性。 */
  capabilities(): ExecutorCapabilities;

  /** 健康检查，连接/恢复阶段调用，失败则降级。 */
  healthCheck(): Promise<EndpointHealthStatus>;
}
```

> 当前已落地的可插拔执行策略：`manual_confirm`（默认，人工确认放行）、`fake`（确定性测试 executor）、`codex_cli`（真实执行器边界）。

## 3. 数据结构契约

- 跨边界输入输出结构定义在 `packages/contracts`，用 zod schema，版本化
- 字段语义在 schema 描述或注释中说明，尤其单位、可空、取值范围
- 跨进程/网络传输的结构必须可序列化，并通过 contract 校验后才进入领域层

```typescript
// packages/contracts: 用 zod 定义跨边界结构，运行时校验 + 类型推断
export const createHandoffRequestSchema = z.object({
  tenantId: z.string().min(1),
  from: handoffPartySchema,            // 发起方岗位/端点
  to: handoffPartySchema,              // 目标方岗位/端点
  title: z.string().min(1),
  pack: handoffPackSchema,             // Envelope 固定，pack 内容自由
});
export type CreateHandoffRequest = z.infer<typeof createHandoffRequestSchema>;
```

## 4. 错误分类标准（全项目统一）

错误**必须分类**，因为调用方的决策依赖分类。这是 LSP 的关键——所有实现用同一套错误语义。本表与 [HandoffHubArchitectureSpec](./HandoffHubArchitectureSpec.md) 第 6 节一致。

| 错误类 | 含义 | 调用方应对 | 可重试 |
|-------|------|-----------|-------|
| `Timeout` | 超时 | 重试或降级 | ✓ 有限次 |
| `Unavailable` | 依赖不可用（CLI 没装/服务挂/端点离线） | 降级或进入 pending_delivery | ✗ 当次 |
| `InvalidInput` | 输入不合法 | 修正输入，不重试 | ✗ |
| `Unsupported` | 能力不支持 | 换实现或换路径 | ✗ |
| `NeedUserAction` | 需用户介入（如鉴权过期、待人工放行） | 暂停，提示用户 | 用户处理后 |
| `Internal` | 实现内部错误 | 记录，上报，降级 | 视情况 |

**约束**：
- 每个 contract 定义自己的错误类型，但**必须映射到上述语义类别**
- 错误携带上下文（发生在哪、原因），但**绝不含 token / password / secret / 完整连接串明文**
- 错误转换遵循依赖方向的分层转换规则（见 [EngineeringPrinciples](./EngineeringPrinciples.md)）
- 领域非法状态转换用 `IllegalTransitionError`，领域不变量违反用 `DomainInvariantError`（见 `packages/domain`）

## 5. 行为保证（契约的"软"部分）

每个接口方法在文档注释中声明：

| 保证类型 | 说明 | 示例 |
|---------|------|------|
| 前置条件 | 调用方须满足 | `delivery 处于 accepted` |
| 后置条件 | 实现须保证 | `成功则产出 report_ready` |
| 不变量 | 调用前后恒真 | `不修改入参` |
| 异常安全 | 失败时的状态 | `失败不留半写状态` |
| 幂等性 | 重复调用是否安全 | `按 event id 幂等` |

测试必须覆盖这些保证（见 [TestStrategy](./TestStrategy.md) 必测场景）。投递采用 at-least-once，消费方必须按 event id 幂等。

## 6. 能力声明（差异显式化）

不同实现能力有差异（fake executor 不调真实模型、codex_cli 需本地 CLI、某端点离线不可执行）。差异**必须通过 capabilities 显式暴露**，不允许运行时意外报错（违反 LSP）。

```typescript
interface ExecutorCapabilities {
  kind: "manual_confirm" | "fake" | "codex_cli";
  requiresUserConfirmation: boolean;   // manual_confirm 为 true
  writesReportArtifact: boolean;
  canRunOffline: boolean;
}
```

调用方决策流程：
```
需要无人值守执行?
   │
   ├─ 是 → 检查 caps.requiresUserConfirmation → true → 换策略/提示用户（不调用后失败）
   └─ 否 → 直接用
```

## 7. 本项目核心契约清单

契约统一在 `packages/contracts` 定义 schema，在 `packages/domain` 强制不变量，由各 app 实现与消费。模块编号对应 [plan/00-master-plan](../plan/00-master-plan.md)。

| 契约 | 定义模块 | 实现者 | 消费者 |
|-------------|---------|-------|-------|
| TaskHandoff / Delivery 状态机 | M01 domain | M04 hub-api | M05 web-console / M06 connector |
| Hub HTTP/SSE schema | M02 contracts | M04 hub-api | M03 sdk |
| Hub Client (SDK) | M03 sdk | M03 sdk | M05 web-console / M06 connector |
| RepositoryPort / EventStore | M04 hub-api ports | infrastructure(PostgreSQL) | M04 application |
| ExecutorAdapter | M06 connector-core | manual_confirm / fake / codex_cli | M06 connector |
| RoleCapabilityPack | M08 `.agents/capabilities` | 真实业务仓抽取 | M06 connector / M05 web-console |
| Conversation Ledger / ContextProjection | M04 hub-api | hub-api | provider adapter |

每个契约的运行时形状以 `packages/contracts` 导出的 schema 为准；任何新增 provider adapter 必须把 canonical history 留在平台层（见 [docs/00-domain-model](../docs/00-domain-model.md) 不变量 9）。

## 8. 契约版本演进

契约是模块间的"公共边界"，变更影响面大，规则严格：

| 变更类型 | 规则 |
|---------|------|
| 新增可选方法/字段 | ✓ 向后兼容，可直接加 |
| 新增必选方法/字段 | ⚠️ 破坏性，需 ADR + 同步更新所有实现与消费者 |
| 修改方法签名 | ⚠️ 破坏性，需 ADR |
| 修改错误语义 | ⚠️ 破坏性，需 ADR（调用方决策依赖它） |
| 删除方法/字段 | ⚠️ 破坏性，需 ADR + 废弃期 |
| schema 结构变更 | ⚠️ 必须考虑迁移与事件重放兼容 |

**破坏性变更必须**：① 写 ADR 说明原因 ② 列出受影响的实现和消费者 ③ 同步更新 ④ 更新相关测试。

> 禁止：把 PRD、repo、branch、commit range 等岗位专用字段固化为全局 delivery schema（见 [plan/00-master-plan](../plan/00-master-plan.md) 范围纪律）。

## 9. 契约自检清单（审计引用）

- [ ] 五要素齐全（接口/结构/错误/行为保证/能力声明）
- [ ] 跨边界结构定义在 `packages/contracts` 并经 zod 校验
- [ ] 错误已分类并映射到统一语义
- [ ] 错误不含密钥明文
- [ ] 能力差异通过 capabilities 暴露，无运行时意外报错
- [ ] 行为保证有文档注释且有对应测试
- [ ] at-least-once 投递有幂等测试
- [ ] 破坏性变更有 ADR
