# Domain-Driven Design 核心规范（项目宪法）

> 本文件是 Sartre 的**项目宪法**之一。方法论复用自 marketing-bff-server / superagentai 的 `spec/DDDSpec.md`，术语已对齐 Sartre「岗位 Agent 协同交接」领域。
>
> 本项目领域复杂（TaskHandoff / Delivery / HandoffPack / Conversation / RoleCapabilityPack），正是 DDD 的用武之地：用统一语言把复杂领域讲清楚，比任何技术抽象都重要。

本项目遵循 DDD 三条核心原则。

> 📍 本文件是 DDD 的**规则**（怎么做）；项目的**领域模型实例**（统一语言术语表、子域、限界上下文、核心不变量、领域事件）在 [docs/00-domain-model](../docs/00-domain-model.md)。两者配合：本文给方法，docs/00 给具体领域。**术语以 docs/00 为权威，本表与之同步。**

## 1. 通用语言（Ubiquitous Language）

**目标：消除业务术语与代码命名之间的鸿沟。代码即文档。**

### 规则

- 代码中的命名（类、方法、变量、模块）必须与领域术语保持一致
- **严禁进行技术性"翻译"或抽象**
- 方法名表达**业务意图**，不写 CRUD 式命名

本项目的领域术语表（代码必须沿用，不得另造同义词；权威定义见 [docs/00-domain-model](../docs/00-domain-model.md)）：

| 领域术语 | 含义 | 禁止的技术翻译 |
|---------|------|--------------|
| TaskHandoff | 一次岗位协同任务的业务意图与交接入口（核心聚合根） | ❌ Task / Message / Job |
| HandoffPack | 给目标 Agent 可读的交接上下文，Envelope 固定、pack 内容自由 | ❌ Payload / Bundle / Data |
| Delivery | TaskHandoff 投递给某 AgentEndpoint 后的状态事实 | ❌ Message / Queue / Record |
| AgentEndpoint | 某岗位下可接收和执行任务的本地端点 | ❌ Client / Node / Worker |
| RoleCapabilityPack | 从真实业务仓抽出的岗位能力集合 | ❌ Config / Plugin / Toolset |
| Conversation | 平台自己的 canonical 会话事实 | ❌ Session / ChatLog |
| ContextProjection | 把 canonical conversation 投影成某 provider 可消费的上下文 | ❌ Adapter / Transformer |
| ModelRun | 一次执行器或模型调用的审计记录 | ❌ Job / Invocation / Call |
| AuditEvent | 已发生的业务事实，用于恢复、诊断与时间线 | ❌ Log / History / Record |

```
✅ handoff.deliverTo(endpoint)   delivery.acknowledge()   conversation.appendMessage()
❌ taskService.sendMessage()     queue.markDone()         chatLog.save()
```

- 当领域概念演化时，代码必须同步重构以反映新的语言模型
- 术语表变更需在 [docs/00-domain-model](../docs/00-domain-model.md) 与本表同步，并视为契约级变更（见 [ModuleContractSpec](./ModuleContractSpec.md)）

### 实践检验

> 阅读代码应能直接理解领域逻辑，不需要额外解释。

## 2. 限界上下文（Bounded Context）

**目标：定义清晰的模型边界，防止概念混淆。**

### 规则

1. **显式边界**：每个上下文有清晰的物理代码边界（package / 模块 / 目录）
2. **跨上下文交互**：必须通过防腐层（ACL）或明确接口（contract + DTO），严禁直接引用其他上下文的内部对象
3. **上下文内无歧义**：同一上下文内，通用语言必须唯一且无歧义

```
✅ 通过 contract / 领域事件 / DTO 跨上下文通信
❌ 直接 import 另一个 package/app 的内部实现或 repository
```

> 与 [EngineeringPrinciples](./EngineeringPrinciples.md) 的 DIP、[ArchitectureConstraints](./ArchitectureConstraints.md) 的依赖方向铁律一致。第三方（飞书 / Figma / GitLab / PRD 上游）数据必须经 ACL 隔离，不得把某岗位专用字段固化进核心 delivery schema。

### 本项目的限界上下文（对应 docs/00 核心子域与 master-plan 模块划分）

```
Sartre (TypeScript monorepo)
├── 交接事实源        ← TaskHandoff / Delivery / Artifact / AuditEvent 一致性
│                       (packages/domain + apps/hub-api，M01/M04)
├── 角色能力上下文    ← RoleCapabilityPack 作为可引用对象
│                       (.agents/capabilities + connector-core，M06/M08)
├── Conversation Ledger ← canonical history + ContextProjection + ModelRun
│                       (apps/hub-api conversation 模块，M04)
└── 支撑子域          ← Hub API / Web Console / Local Connector / Execution Adapter
                        (M03/M05/M07)
```

跨上下文只经各自的契约通信（见 [ModuleContractSpec](./ModuleContractSpec.md)）；`packages/contracts` 是跨边界 DTO/schema 的唯一来源。

## 3. 聚合与充血模型（Aggregates & Rich Domain Model）

**目标：拒绝贫血模型，让实体封装业务逻辑。**

### 规则

1. **拒绝贫血模型**：类型不能只有数据和 getter/setter，必须包含业务逻辑和验证
2. **聚合根是修改入口**：外部只能持有聚合根引用，不能直接操作内部实体
3. **聚合根保证不变量**：任何状态变更后，聚合根必须确保业务规则依然成立
4. **事务边界**：一个事务只修改一个聚合实例；跨聚合用领域事件实现最终一致性

```typescript
// ✅ 充血模型：业务逻辑在聚合内，不变量被保护，状态只走显式状态机
class Delivery {
  /** 目标端点确认收到。聚合根保证：未 acknowledged 不得视为已收到。 */
  acknowledge(actor: Actor, eventId: string): DomainEvent {
    if (this.status !== "delivered") {
      throw new IllegalTransitionError(this.status, "acknowledged");
    }
    this.status = "acknowledged";
    return this.emit("delivery.acknowledged", { actor, eventId });
  }
}

// ❌ 贫血模型：逻辑散落在 service 里，不变量无保护
class DeliveryService {
  ack(delivery: Delivery) {
    delivery.status = "acknowledged"; // 绕过状态机，破坏不变量
  }
}
```

> 本项目的关键不变量举例（完整清单见 [docs/00-domain-model](../docs/00-domain-model.md) 不变量章节）：Delivery 状态只能通过领域状态机转换；未 acknowledged 的 Delivery 不得视为接收方已处理；离线端点再上线必须能按 cursor 补发；人工放行策略可配置且默认 `manual_confirm`。这些必须在聚合根内强制，并由测试覆盖（见 [StateMachineSpec](./StateMachineSpec.md)）。

## 快速检查清单

在写代码前问自己：

- [ ] 这个命名是领域术语还是技术术语？（对照上方术语表与 docs/00）
- [ ] 这个方法名描述的是业务意图还是数据操作？
- [ ] 这个类型是否跨越了上下文边界？是否走 contract？
- [ ] 这个实体是否只有数据，没有行为？
- [ ] 关键领域不变量是否在聚合根内强制、并有测试？
