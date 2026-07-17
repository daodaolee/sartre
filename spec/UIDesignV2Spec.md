# Sartre Electron UI 规范

## 1. 设计目标

工作台服务开发、Java 测试和质量岗位的重复协作，不做营销首页。第一屏必须是可工作的 Workspace，而不是功能介绍。

用户在任何时刻都应快速回答：当前需求是什么、岗位任务由谁负责、Agent 正在做什么、哪些事项需要我处理、团队依据是什么。

## 2. 全局布局

```text
左侧菜单栏 | 中间主界面 | 右侧可折叠上下文抽屉
```

左侧与中间常驻；右侧默认可折叠，由主界面右上角图标按钮打开。抽屉记忆个人开关和宽度；窄窗口使用覆盖式抽屉，不能把主界面压缩到不可用。

## 3. 左侧菜单栏

从上到下：

1. Workspace Switcher。
2. Action-first Inbox 与待处理 badge。
3. 需求列表。
4. 当前需求的两个整理入口：需求分析、岗位任务。
5. 系统/自定义会话文件夹与 Session。
6. 次级资源入口：Agent、Skill、MCP、Project、成员和设置。

需求分析收拢 Goal Contract、岗位对齐、决定、放弃项、未决问题和来源证据。岗位任务收拢负责人、Project、依赖、状态、ExecutionResult、阻塞和验收。

左侧状态不能只依赖颜色；使用文字、图标和数量表达 active、blocked、待确认、运行中和未读。

## 4. 中间主界面

主界面根据路由显示：

- 需求分析：`goal-contract.md` 阅读/Diff、对齐矩阵、决定与证据。
- 岗位任务：紧凑列表或看板、负责人、Project、依赖、状态和验收。
- Session：canonical messages、mention、Attachment、Execution 卡片和输入框。
- Inbox：需要我处理、提及我、关注更新和已处理。
- 资源/设置：Agent、Project Binding、成员、权限和个人偏好。

切换 Session 后，左侧仍保留当前需求和岗位任务状态。系统不要求用户从历史消息重新寻找目标。

## 5. 右侧上下文抽屉

主界面右上角使用 lucide 图标与 tooltip 打开：管家上下文、内容与证据、活动、当前执行。

抽屉 Scope 根据当前对象显示当前会话、当前岗位任务、整个需求，默认最窄有效 scope。Tab 为当前、决定、内容、活动；待确认 Finding 固定置顶。

关闭抽屉只改变个人 UI，不停止 Steward、不清除 AttentionItem。主界面对象变化时必须同步 scope，禁止继续显示旧 Session 造成误操作。

## 6. Requirement 创建与对齐

- 创建时只要求标题、初始描述和可选来源材料。
- 主交互是与 Requirement Analysis Agent 的多轮自然对话。
- Agent 阶段性生成版本化 `goal-contract.md`，不是持续填写的表单。
- 每个 requiredAligner 在岗位 Session 中对齐；所有人确认同一 version/hash 后才施工。
- 飞书链接/快照是 Evidence，不自动覆盖 Goal Contract。

## 7. 岗位任务与 Execution

Analysis Agent 建议岗位任务，Requirement Owner 核对覆盖，各负责人接受责任。

写 Agent 在原消息位置生成 ExecutionPlan 卡片。卡片原地展示只读分析、待确认、获取 Lease、运行、范围扩展、Context Refresh、阻塞和完成。完整日志按需展开，不淹没聊天。

用户 mention Agent 时，UI 固定当前 AgentDefinitionVersion 和 executionConfigHash。只有 name/avatar/description 等展示信息变化时自动锁定最新版，并在执行卡显示非阻断“Agent 信息已更新”。executionConfigHash 变化时，原输入位置展示 instructions/model policy/capability/Skill/MCP/credential slot 变更摘要，由调用者确认“使用最新版”后重试。权限扩大、新 credential slot 或新副作用 MCP 使用 warning 样式并强制确认，不作为 toast 一闪而过。

创建/发布 Agent 时，模型使用选择菜单，第一版提供 `GPT-5.5 (2026-04-23)` 与 `GPT-5.6 Sol`；推理强度使用 `Medium/High` 分段控件，默认 High。Sol 必须展示当前 catalog 的 resolved version；该版本变化时原 Agent 不静默运行，而是在 mention 位置展示 old/new resolved version Diff，并要求创建者发布新 AgentDefinitionVersion、调用者确认最新版。

Session 顶部提供紧凑执行状态条，展示 Agent、Project、Lease heartbeat、时长和待处理动作。卡片和状态条是同一 Hub 状态投影。

执行卡片对所有有权成员展示公共状态、结果和时长；只对调用者展示“用量明细”。明细使用标准字段分别展示 Input、Cached input、Output、Reasoning output、Total、Cache hit 和 Cache token hit rate，缺失值显示“未返回”而不猜测。个人用量汇总另外展示请求数、命中请求数、Cache request hit rate 和 Cache token hit rate，两种命中率不混为一个指标。

## 8. Inbox

- 需要我处理：AttentionItem，不因读取而解决。
- 提及我：mention 通知。
- 关注更新：关注对象的重要变化。
- 已处理：最近解决/驳回/取消动作。

同一 AttentionItem 在 Inbox、Execution 卡片和 Steward 中同步处理。snooze 不解除业务阻塞。

## 9. 需求变更与验收

Goal Contract 变化显示 Markdown Diff 和 Impact Matrix。实质变化必须醒目展示受影响岗位任务、Project 和 Execution，不能表现为普通通知。

Agent completed、岗位任务 done、需求 completed 是三种不同状态。验收视图将每条 successCriteria 映射到结果、Evidence 和确认人。

## 10. 可见性与异常

Workspace 成员默认看到需求、会话、岗位任务和公共结果；无 Project viewer 权限的原始代码/日志显示权限占位。Secret、本地路径、Scratchpad 和未共享文件不可见。

Runtime 离线、Agent 崩溃、Lease 冲突、权限不足、Context stale、EnvironmentDrift 和上传失败必须给出原因、负责人和恢复动作，不能只显示 toast。

## 11. 视觉与交互约束

- 使用 Geist/Geist Mono、Tailwind、shadcn/ui 和 lucide-react。
- 工具动作优先图标按钮并提供 tooltip；命令使用清晰文本按钮。
- 卡片仅用于重复项目、Modal 和真正框定的工具，不嵌套卡片。
- Compact panel 使用紧凑字号，不使用 Hero 级标题。
- 固定工具栏、状态条和计数器使用稳定尺寸，动态内容不能引发布局跳动。
- 不用颜色作为唯一状态信号；满足键盘操作、焦点、对比度和屏幕阅读标签。
- 不使用装饰性渐变球、营销式大卡片或单色紫蓝主题。
- 文本在桌面最小窗口和常见缩放下不得重叠、裁切或遮挡操作。

## 12. UI 验收

Playwright 与人工验收至少覆盖 1440x900、1280x720 和最小支持窗口；检查抽屉开关、长中文、权限占位、运行状态、错误恢复、键盘和缩放。

开发、Java 测试和质量角色必须分别证明切换多个 Session 后仍能快速定位需求、岗位任务、待处理动作和最近证据。
