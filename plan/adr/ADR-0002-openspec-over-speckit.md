# ADR-0002：采用 OpenSpec，不引入 GitHub Spec Kit

> 注：本 ADR 记录于项目早期，文中"Agent Workspace"为本项目旧称，现已更名为 **Sartre**。为保留决策当时语境，正文不改写。

- **状态**：已接受
- **日期**：2026-05-31
- **决策者**：人 + AI 调研后确认
- **相关**：workflow/WORKFLOW.md、spec/（宪法层）、两个参考项目（marketing-bff / superagentai）

## 背景与问题

需要为 Agent Workspace 选定一套规范驱动开发（SDD）工具链。候选是当前主流的两个开源框架：OpenSpec 与 GitHub Spec Kit。两者都是 MIT、都生成 slash 命令供 AI 消费，但治理模型不同。需一次性定下来，避免团队学多套。

## 约束与前提

- 两个现有项目（marketing-bff、superagentai）**已在用 OpenSpec**，有完整的 `openspec/changes` + `specs` 实操。
- 公司目标是百人 AI Native 团队，工具链统一价值高。
- 本项目要精打细算 LLM 上下文（Agent 本身就吃上下文）。
- 已自建宪法层 `spec/`（开发原则/DDD/SOLID/状态机/契约/测试/UI）。

## 候选方案

### 方案 A：OpenSpec（采用）
- 工作流：explore → propose → apply → archive，change 文件夹组织
- 优点：轻量、仓库原生、50KB 上下文上限强制聚焦；与两个现有项目一致；团队有肌肉记忆
- 缺点：无内置 phase gate；无 constitution 机制（但本项目用 `spec/` 等价覆盖）

### 方案 B：GitHub Spec Kit
- 工作流：constitution → specify → clarify → plan → tasks → implement
- 优点：constitution（宪法）机制把治理规则在工具层强制执行；内置 TDD 与阶段门
- 缺点：存在 context tax（框架元数据占上下文）；与现有项目工具链不一致，团队需学第二套 SDD；安装较重

### 方案 C：两者并用
- bighatgroup 等文章指出两者哲学不互斥，可 OpenSpec 探索 + Spec Kit 治理
- 缺点：双工具链维护成本、认知负担翻倍，对当前阶段过重

## 决策

采用 **方案 A：OpenSpec**，不引入 Spec Kit。**吸收 Spec Kit 的 constitution 理念**，但用本项目自己的 `spec/` 宪法层承载，并在 `AGENTS.md` 规定每次执行前强制加载。

## 理由

1. **统一工具链 > 框架理论优劣**：两个现有项目已用 OpenSpec，百人团队统一一套的协同价值，远大于"Spec Kit 理论上更严"。
2. **Spec Kit 的杀手锏可被等价替代**：它唯一的独特机制是 constitution（治理即执行）。本项目的 `spec/` 七份宪法 + `AGENTS.md` 的强制加载规定，已实现同等效果——治理由文件承载、由 AI 执行协议强制。
3. **context tax 对本项目尤其敏感**：Agent Workspace 本身要省着用 LLM 上下文，OpenSpec 的 50KB 上限反而是优点。
4. **第一性原则**：工具是为"高质量交付"服务的，不是为"用最新框架"。在已有成熟实践上叠新框架，违背 KISS。

## 影响

| 影响面 | 说明 |
|-------|------|
| 受影响模块 | 全局工作流（workflow/WORKFLOW.md） |
| 契约变更 | 无 |
| 宪法层变更 | 无；强化 `spec/` 作为 constitution 等价物的定位 |
| 迁移/回填 | 实施仓需引入 OpenSpec CLI + 封装脚本（参考两项目 `scripts/openspecw.sh`） |
| 可逆性 | 中——若未来确需 Spec Kit 的阶段门，可在不丢弃 OpenSpec 的前提下增量引入（方案 C） |

## 后续动作

- [ ] 实施仓 agent-workspace 建立时引入 OpenSpec CLI
- [ ] 提供 `scripts/openspecw.sh` 封装（对齐两个现有项目）
- [ ] 定期复评：若团队规模或合规要求变化，重新评估是否引入 Spec Kit 阶段门

## 参考

- OpenSpec vs Spec Kit 对比：bighatgroup / hashrocket / somniosoftware（2026 系列对比文章）
- github/spec-kit 官方仓库
