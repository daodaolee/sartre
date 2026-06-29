# Plan Ledger SOP

长计划必须使用 `PLAN_LEDGER.md` 记录执行状态，保证跨会话可恢复。

## 适用范围

必须使用：

- 3 个以上实施环节。
- 跨 Hub/Web/Connector/packages 的改动。
- 涉及数据库迁移、状态机、conversation ledger、executor、role capability。
- 用户明确要求 goal-loop 或完整本地成品。

可以不使用：

- 单文件文案。
- 不改变行为的小样式修正。
- 一次命令即可验证的维护任务。

## 位置

```text
reports/<change-name>/checkpoints/PLAN_LEDGER.md
```

## 状态

- `PENDING`
- `IN_PROGRESS`
- `DONE`
- `BLOCKED`
- `CHANGED`
- `SUPERSEDED`

## 继续执行前

1. 读取 ledger。
2. 读取当前 change 的 design/tasks。
3. 读取对应 BDD 和 acceptance。
4. 检查前置步骤是否 `DONE`。
5. 若计划和代码事实不一致，先修计划或标记 `CHANGED`。

## 环节结束后

写 checkpoint，至少包含：

- 时间。
- change-name。
- 范围。
- 变更文件。
- 执行命令。
- 测试结果和证据等级。
- 跳过项和原因。
- 风险。
- 后续恢复方式。

## 清理原则

开发期保留证据。完成后可以删除重复、过期、已被最新报告覆盖的 timestamp 报告，但必须保留：

- `PLAN_LEDGER.md`
- 最新 regression/latest
- 关键 closeout checkpoint
- OpenSpec/BDD/acceptance
- 数据库迁移和核心设计记录
