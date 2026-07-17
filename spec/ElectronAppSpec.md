# Electron App 架构规范

## 1. 进程与信任边界

```text
Renderer（React，无 Node）
  <-> Preload（contextBridge 白名单）
  <-> Main（Human auth、SDK、SSE、Runtime 管理、Updater）
  <-> Local Runtime（独立 companion daemon）
  <-> Hub API
```

Renderer 是不可信展示层。Refresh Token、Endpoint Credential、本地绝对路径、credential value、原始命令执行和文件系统能力不得进入 Renderer。

## 2. Main Process 职责

- 创建和保护 BrowserWindow。
- 维护 Human Session、Access Token 刷新和 Hub SDK。
- 订阅 SSE、保存 lastEventId 并向 Renderer 转发经过 schema 校验的事件。
- 发现、启动、配对、更新和停止 Local Runtime。
- 调用系统文件选择器、safeStorage、通知和更新器。
- 执行 IPC 授权、Zod 验证和 Result 映射。

Main 不实现 Requirement、Workstream、Execution 或 Lease 状态机。

## 3. BrowserWindow 红线

```ts
webPreferences: {
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  nodeIntegration: false,
  preload: preloadPath
}
```

- 拒绝任意 `window.open` 和非 allowlist 导航。
- 外部链接使用 `shell.openExternal` 前验证 `https:` 和 hostname policy。
- 生产包禁止 `ELECTRON_RENDERER_URL`、远程 renderer 和自动 DevTools。
- 启用严格 CSP，禁止 unsafe-eval 和任意远程脚本。
- permissionRequestHandler 默认拒绝未声明权限。

## 4. IPC

Preload 只暴露具名 API：

```text
auth
workspaces
requirements
sessions
agents
runtime
executions
files
settings
providerProfiles
usage
updates
events
```

禁止暴露 raw ipcRenderer、send/invoke/on 通配方法。每个 handler 入参使用 contracts Zod schema，返回统一 Result。Main 从当前 Human Session 派生 actor，不接受 Renderer 提交的 userId 作为身份。

Main -> Renderer 事件必须有类型、workspaceId、cursor 和 payload schema。订阅 API 返回 unsubscribe；窗口销毁时清理 listener，禁止重复注册。

## 5. Hub 与状态管理

Electron 只通过 `packages/sdk` 访问 Hub。Zustand 只保存窗口、导航、抽屉、草稿和临时选择等 UI state；Requirement、Session、Workstream、Execution、Lease、AttentionItem 和权限来自 Hub Query/SSE 投影。

允许 optimistic UI 时必须携带 idempotencyKey，并明确显示 pending/failed。前端不能自行将业务状态改成 confirmed、done 或 released。

本地缓存只支持离线查看，必须显示 stale 和最后同步时间。Hub 不可用时禁止写操作和新的 Agent 写工具。

## 6. Token 与本地数据

- Refresh Token 使用 OS credential store 或 safeStorage 保护，Renderer 不可读。
- Access Token 只在 Main 内存。
- Endpoint Credential 交由 Runtime 安全存储，Main 不写入 electron-store 明文。
- Codex 公司网关 API Key 交由 Runtime/OS credential store 保存；Renderer 只能提交一次性录入/轮换请求并读取脱敏状态，不能回读明文。
- 用户偏好可以进入 electron-store，但不能覆盖 Workspace Policy。
- 日志禁止 Token、credential、消息正文、本地路径和命令输出。

## 7. 生命周期

启动顺序：

```text
验证生产配置
-> 初始化安全日志与 crash reporting
-> 恢复 Human Session
-> 启动/发现 Runtime
-> 连接 Hub 并检查版本
-> 加载 Workspace 与 Inbox
-> 使用 lastEventId 订阅 SSE
-> 显示主窗口
```

Runtime 离线不阻止用户读取和参与对齐；接受可写岗位任务或确认写 Plan 时才进入 Runtime/Project Binding 门禁。

关闭窗口不等于结束 Execution。退出应用时显示仍在运行的 Agent/Lease，允许取消退出、保留 Runtime 后台运行或安全停止；行为必须由用户设置和 Workspace Policy 决定。

## 8. Local Runtime IPC

Main 与 Runtime 使用仅本机可访问、带随机 session secret 的 IPC。连接必须验证 Runtime version、endpointId 和 challenge；禁止监听公共网络地址。

Main 只能调用 Runtime 的 health、pair、binding、execution-control 和 diagnostics 白名单。Runtime 文件/命令 API 不直接暴露给 Renderer。

ProviderProfile IPC 只允许 create/rotate/test/revoke/status，test 返回网关可达性、认证状态、model 可用性和稳定 errorCode，不返回 API Key、原始响应头或内部网关详情。

## 9. 打包与更新

- 首个生产 Release 只支持 Apple Silicon arm64、最低 macOS 14，必须完成正式签名和 notarization；Intel Mac、Windows/Linux 不进入第一版构建、签名、安装和兼容矩阵。
- 生产 Artifact 记录 hash、SBOM、签名和 releaseVersion。
- 使用内部更新源，先小范围试用再放量。
- Hub、Electron、Runtime 交换 min/max compatible version。
- 不兼容时停止更新或提示升级，不能在未知合同下继续写入。

## 10. 验证

- Main/Preload/IPC 使用 Vitest 和 contract test。
- Playwright Electron 使用真实打包配置验证登录、导航、抽屉、Session、Execution 和恢复。
- 安全测试覆盖 navigation、window.open、CSP、permission、Token 隔离和 remote renderer 拒绝。
- Release Gate 使用签名 macOS 安装包执行 fresh install、upgrade、uninstall 和 Runtime 配对。
