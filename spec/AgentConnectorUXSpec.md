# Agent Connector UX 规范（项目宪法补充）

> 本文件定义岗位人员创建和运行本地 Agent Connector 的体验规则。目标是让非平台开发者也能创建高可用 AgentEndpoint，而不被 MCP、hook、plugin、command、subagent 等技术细节淹没。

## 1. 核心原则

- 用户选择岗位和意图，系统映射到技术配置。
- 默认 `manual_confirm`，禁止默认自动执行高风险操作。
- 每个 AgentEndpoint 必须可健康检查、可诊断、可暂停、可重连。
- Connector 负责把 Handoff Hub 的事件转换为本地 Agent 可消费上下文。
- Connector 不替代 Codex / Claude / MCP / command，只负责连接、提示、确认、回传。

## 2. Agent 创建向导

Web Console / Electron 后续必须提供强引导 wizard：

1. **选择岗位**
   - developer
   - qa
   - product
   - design
   - ops
   - custom

2. **选择执行器**
   - Codex CLI
   - Claude Code
   - command
   - MCP
   - plugin
   - hook
   - subagent
   - manual prompt
   - mock

3. **声明能力**
   - read_handoff_pack
   - generate_change_report
   - generate_test_scope
   - generate_bug_report
   - run_command
   - read_repo
   - upload_artifact

4. **权限与执行级别**
   - `manual_confirm`
   - `prompt_only`
   - `auto_read_only`
   - `auto_execute_low_risk`

5. **健康检查**
   - Hub 连接
   - SSE stream
   - 执行器命令可用性
   - workspace 可访问性
   - artifact 上传
   - 模拟任务接收

6. **试运行**
   - 服务端发送 mock handoff
   - Connector 收到
   - 生成 prompt
   - 用户确认
   - mock report 回传

## 3. UX 红线

- 不要求用户直接填写复杂 JSON。
- 不把 MCP / plugin / hook 作为第一层概念压给普通岗位人员。
- 不隐藏失败原因。
- 不在未通过健康检查时显示为可用 Agent。
- 不默认自动执行写文件、推送、删除、运行任意脚本。
- 不把“收到推送”当成“用户已确认处理”。

## 4. 状态展示

AgentEndpoint 面板必须展示：

- 在线 / 离线
- 最后心跳
- 当前 SSE 连接状态
- 未确认任务数
- 最近失败原因
- 执行器类型
- 执行模式
- 支持能力
- 最近一次试运行结果

## 5. 设计方向

UI 采用 Vercel Geist + Readout 风格：

- 高密度、低噪声
- 1px border
- 明确列表、表格、timeline、诊断面板
- 不做大卡片营销页
- 原生支持 light/dark
- 关键状态用小面积状态点或 pill

## 6. MVP 边界

Goal 9.1 只要求 mock / manual_confirm 执行器可以完成本地双身份演示。真实 Codex / Claude / MCP adapter 可以后续增加。
