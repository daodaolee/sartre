# Feature: Provider Model Registry

## 场景 1: 端点注册本地模型执行器 profile

**Given** 开发端点 `dev_codex_local` 已在 Hub 中注册  
**When** 端点提交 provider/model/executor profile，包含 `provider=codex`、`model=codex-cli`、`executor_kind=codex_cli`、能力、token limits 和默认标记  
**Then** Hub 应持久化一个版本化 registry profile  
**And** profile 不应包含 API key、token、provider session id 或 rendered prompt  
**Evidence** SCENARIO_REGISTERED

## 场景 2: 端点重复注册同一个 provider/model/executor

**Given** 已存在同一 tenant、endpoint、provider、model、executor kind 的 profile  
**When** 端点再次提交该 profile 并更新 label、limits 或 default flag  
**Then** Hub 应更新原 profile，而不是创建重复 profile  
**And** profile updated_at 应变化  
**Evidence** SCENARIO_REGISTERED

## 场景 3: 健康报告与能力声明分离

**Given** QA 端点已注册一个 Claude Code profile  
**When** 端点提交健康报告，包含 command check、workspace check 和 provider CLI check  
**Then** Hub 应保存最新 health report  
**And** registry list 应同时返回静态能力声明和最新健康结果  
**Evidence** SCENARIO_REGISTERED

## 场景 4: 端点只能读取自己的 registry

**Given** 开发端点和质量端点各自有 provider model profile  
**When** Web Console 以 `qa_codex_local` 读取 registry list  
**Then** 返回结果只应包含 QA 端点的 profile  
**And** 不应返回 `dev_codex_local` 的 profile  
**Evidence** SCENARIO_REGISTERED

## 场景 5: 解析默认兼容模型选择

**Given** 当前端点有多个 profile，其中一个是 default 且健康可用  
**When** 调用 selection resolve，并要求 `chat` 与 `tool_use` 能力  
**Then** Hub 应返回满足能力和 token limit 的默认 profile  
**And** 响应应包含 selection_reason 和 selected profile id  
**Evidence** SCENARIO_REGISTERED

## 场景 6: Web Console 只读展示 registry

**Given** 当前端点 registry 中存在 Codex 和 Claude profile  
**When** 用户打开 Web Console 能力页面中的模型视图  
**Then** UI 应展示 provider、model、executor kind、能力、健康、token limits 和默认选择  
**And** UI 不应展示 API key 控件、secret 值、聊天输入框、streaming 输出或执行按钮  
**Evidence** SCENARIO_REGISTERED
