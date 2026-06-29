# WORKFLOW

Sartre 使用 OpenSpec + BDD + acceptance + reports 的轻量规范驱动流程。流程服务于当前岗位协同主线。

## 流程

1. 探索澄清：确认当前 goal 是否属于 Hub、Web、Connector、role capability、conversation ledger 或 execution adapter。
2. 创建或更新 OpenSpec change。
3. 写 proposal/design/tasks。
4. 写 BDD 场景。
5. 写 acceptance checklist。
6. 更新或创建 `reports/<change>/checkpoints/PLAN_LEDGER.md`。
7. TDD 实现。
8. 运行真实验证。
9. 记录报告和 checkpoint。
10. 完成后再考虑归档。

## 当前验证

```bash
pnpm run web:smoke:hub
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
pnpm run architecture:check
```

## Definition of Done

- [ ] 相关测试真实执行并通过。
- [ ] 回归报告写入 `reports/<change>/regression/`。
- [ ] BDD/acceptance 与实现一致。
- [ ] 领域状态机和 API contract 有测试。
- [ ] 架构边界检查通过。
- [ ] Secret scan 无明文密钥。
- [ ] PLAN_LEDGER 无未解释的 `BLOCKED` 或 `CHANGED`。
- [ ] 用户可在本地启动并复现核心流程。

## 常见判断

- 小 bug 可以直接修，但必须补测试或 smoke。
- 非 trivial 功能必须有 OpenSpec/BDD/acceptance。
- UI 体验问题可以用真实浏览器验收，但不能替代单元和 smoke。
