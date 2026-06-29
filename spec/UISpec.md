# UI Spec

Sartre 当前 UI 是 Web Console。设计参考 Vercel design 文档、Apple 桌面产品气质、Readout/Multica/Slock 的低噪声协同面板，但不照抄任何产品架构。

## 原则

- 工作台优先，不做营销页。
- 高密度、低噪声、1px border、清晰分隔。
- 当前岗位和 endpoint 是一等信息。
- 任务外层只展示必要信息；详情在选中后展开。
- 设置项使用分组行布局。
- message、tooltip、popover、modal 适度使用。

## 信息架构

左侧导航：

- 工作区：收件箱、会话。
- 能力：Agent、模型、Hooks、Skills。
- 设置：固定在左下或独立入口。

任务面板：

- 已发送。
- 已接收。
- 已结束。

不使用“待办/处理中/待发送”作为当前主列。

## 创建任务

创建页必须包含：

- 标题。
- 富文本描述。
- `@` capability mention。
- 文件/图片可视化引用。
- 目标岗位。
- 目标 Agent。

描述区应尽量使用 Tiptap 或等价富文本能力，不回退成固定附件块。

## 任务详情

详情必须包含：

- title / description。
- from / to。
- 当前 endpoint 视角下的收发状态。
- conversation / runtime binding。
- Agent 放行入口。
- 人工回传入口。
- 标记结束入口。
- timeline。

Timeline 根据角色和状态区分颜色，但保持克制。

## 可访问性

- 交互元素必须有可识别文本或 `aria-label`。
- 状态点不能作为唯一信息来源。
- 文案必须中文优先。
- 移动/窄宽度不能出现文本遮挡。

## 禁止

- 大面积营销 hero。
- 卡片套卡片。
- 用复杂系统健康页替代工作区状态提示。
- 左侧菜单序号。
- 把报告做成独立一级菜单；报告跟随任务和 timeline。
