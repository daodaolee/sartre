# 架构约束

本文件是当前 Sartre TypeScript monorepo 的宏观架构约束。

## 1. 依赖方向

```text
apps/web-console
apps/connector-cli
        |
        v
packages/sdk
        |
        v
packages/contracts
        |
        v
packages/domain

apps/hub-api
        |
        v
packages/domain + packages/contracts
```

强制规则：

- `packages/domain` 不依赖 app、Nest、DB、HTTP、React、Connector。
- `packages/contracts` 不依赖任何 app 内部路径。
- `packages/sdk` 不 import `apps/hub-api/src/**`。
- `apps/web-console` 不 import `apps/hub-api/src/**`。
- `apps/connector-cli` 不 import `apps/hub-api/src/**`。
- 跨包共享类型必须进入 `packages/contracts`。
- 领域规则必须进入 `packages/domain`，不能散落在 Controller 或 React 组件里。

## 2. Hub API 分层

`apps/hub-api` 必须采用端口适配结构：

```text
interfaces/http
interfaces/stream
application
ports
infrastructure/postgres
infrastructure/sse
```

强制规则：

- Controller 只做输入解析、错误映射和调用 application service。
- Application service 负责 use case 编排和事务边界。
- Repository 接口放 ports。
- PostgreSQL 细节留在 infrastructure。
- 数据库模型不得泄漏到 Web Console 或 Connector。

## 3. Web Console 边界

Web Console 负责用户操作和投影展示。

允许：

- 使用 SDK 调用 Hub。
- 使用 contracts schema 解析响应。
- 按当前 endpoint 计算 UI 视角。
- 展示 message、tooltip、popover、modal。

禁止：

- 直接访问数据库。
- 直接 import Hub repository / service。
- 在 UI 层重写 Delivery 状态机。
- 把岗位业务 payload 固化为全局表单结构。

## 4. Connector 边界

Connector 负责本地端点恢复、执行和回写。

允许：

- 维护本地 inbox / replay cursor。
- 做 health probe。
- 调用 fake executor / Codex executor / manual prompt。
- 生成 report artifact 并通过 SDK 回写 Hub。

禁止：

- 绕过 Hub 直接改服务端数据库。
- 无人工确认执行高风险写操作。
- 伪造已经通过的执行结果。
- 把 provider-specific session 当作 canonical conversation。

## 5. Role capability 边界

岗位能力包来自真实业务仓，但在 Sartre 内只以 manifest 形式存在。

强制规则：

- 能力包可以声明 agent、skill、command、hook、constraints。
- 能力包不能复制业务仓源代码。
- 能力引用可以进入任务和聊天上下文。
- 能力执行必须通过 Connector 或后续明确 adapter。

## 6. 密钥与配置

- `.env` 不入仓，`.env.example` 可以提供无密钥模板。
- 报告、日志、审计事件不得出现 secret/token/password 明文。
- OSS/COS 等外部存储必须通过可配置 provider，密钥不能写进前端 bundle。

## 7. 架构自检

- [ ] Domain 无 app/framework/db/http 依赖。
- [ ] Web/Connector 通过 SDK 访问 Hub。
- [ ] Delivery 状态机只在 domain/application 边界执行。
- [ ] Conversation ledger 是 canonical history。
- [ ] Provider projection 可重建，不是唯一事实源。
- [ ] Secret scan 无明文密钥。
- [ ] `pnpm run architecture:check` 通过。
