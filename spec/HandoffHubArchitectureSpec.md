# Handoff Hub 架构规范（项目宪法补充）

> 本文件定义 v0.2 Handoff Hub 的服务端架构约束。它补充 `ProgramSpec`、`DDDSpec`、`EngineeringPrinciples`、`ModuleContractSpec` 与 `StateMachineSpec`，不覆盖这些上层宪法。

## 1. 核心定位

Sartre Handoff Hub 是岗位 Agent 交接事实源，不是 LLM 执行平台、IM、项目管理系统或云 A2A 平台。

必须解决：

- 谁发起交接
- 发给谁
- 交接包入口在哪里
- 是否已投递
- 是否已确认收到
- 是否已开始处理
- 是否已有结果 artifact
- 过程是否可审计

不负责：

- 替用户选择模型
- 托管每个人的 Codex / Claude 会话
- 保存个人 GitLab token
- 远程控制别人的电脑
- 规定所有岗位的业务 payload 结构

## 2. 领域模型

### 2.1 TaskHandoff

`TaskHandoff` 是核心聚合根，表示岗位之间的一次交接。

不变量：

- 必须有 `tenant_id`。
- 必须有 `from` 与 `to`。
- 必须有 `title`。
- 必须引用一个 `HandoffPack`。
- 状态变化只能通过显式状态机完成。

### 2.2 HandoffPack

`HandoffPack` 表示给目标 Agent 可读的交接包。

不变量：

- 必须包含一个 entry artifact，例如 `handoff.md` 或 `instruction.md`。
- entry artifact 必须是 agent-readable。
- pack 内容自由，不得强制所有场景使用 `repo / branch / commit_range`。

### 2.3 Delivery

`Delivery` 表示某个 `TaskHandoff` 对某个 `AgentEndpoint` 的投递状态。

不变量：

- `acknowledged` 之前不得视为目标已收到。
- 离线目标必须进入 `pending_delivery`。
- 重新上线后必须可通过 cursor / last event id 补发。
- 投递采用 at-least-once，客户端必须按 event id 幂等。

### 2.4 AgentEndpoint

`AgentEndpoint` 表示某个用户/岗位注册出的接收端。

它只声明：

- 用户和岗位
- endpoint id
- 能力列表
- 在线状态
- 执行模式：`manual_confirm` / `mock` / 后续 adapter

它不绑定具体 LLM 模型。

### 2.5 Artifact

`Artifact` 表示报告、日志、截图、测试结果、交接说明等产物索引。

服务端只强制 metadata：

- name
- kind
- storage url / local path
- checksum
- owner
- event id

服务端不解析所有岗位业务内容。

## 3. NestJS 分层规则

服务端必须采用端口适配架构。

```text
domain       领域模型、聚合、状态机、领域错误
application  use case、策略编排、事务边界
ports        repository、publisher、store 抽象
infrastructure Postgres、SSE、文件存储等实现
interfaces   HTTP、stream controller、DTO 校验
```

强制规则：

- `domain` 不得 import `@nestjs/*`。
- `domain` 不得 import `pg`、Prisma、TypeORM、HTTP、SSE、文件系统。
- `application` 只能依赖 `domain` 与 `ports`。
- `interfaces` 不写业务逻辑，只做输入解析、鉴权入口、调用 use case。
- `infrastructure` 实现 ports，不向上泄漏数据库模型。
- 跨 app 共享类型放 `packages/contracts`，领域规则放 `packages/domain`。

## 4. 状态机

`TaskHandoff` 与 `Delivery` 必须使用显式状态机。

最小状态：

```text
draft
created
stored
pending_delivery
delivered
acknowledged
accepted
running
report_ready
closed
failed
expired
```

状态转换必须：

- 由纯函数完成
- 非法转换显式报错
- 输出副作用指令，由 application 层执行
- 每个合法转换有测试
- 抽样非法转换有测试

## 5. 可靠投递

服务端必须先持久化，再推送。

MVP 使用：

```text
REST + SSE + PostgreSQL
```

推荐实现：

- `POST /handoffs` 创建交接
- `GET /events/stream` 建立 SSE
- `POST /deliveries/:id/ack` 确认收到
- `POST /handoffs/:id/accept` 开始处理
- `POST /handoffs/:id/artifacts` 回传产物
- `POST /handoffs/:id/complete` 完成

离线场景必须测试：

```text
目标 endpoint 离线
  -> Delivery.pending_delivery
目标 endpoint 重新连接并提供 cursor
  -> 服务端补发未 ack 任务
```

## 6. 错误分类

所有错误必须映射到统一类别：

- `InvalidInput`
- `Unavailable`
- `Timeout`
- `Unsupported`
- `NeedUserAction`
- `Internal`

错误消息不得包含 token、password、secret、完整连接串或环境变量明文。

## 7. 完成自检

- [ ] 领域层无 Nest / DB / HTTP 依赖
- [ ] 状态机无散落布尔状态
- [ ] Envelope 固定，Pack 内容自由
- [ ] Delivery 支持在线推送与离线补发
- [ ] at-least-once 投递有幂等测试
- [ ] Artifact 只要求 metadata，不绑定业务结构
- [ ] 服务端可被 Web Console、Connector、Electron 通过 contract / SDK 使用
