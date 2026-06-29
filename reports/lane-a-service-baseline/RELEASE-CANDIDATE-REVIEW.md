# Lane A 发布前候选审查

日期：2026-06-26

候选 worktree：

```text
/Users/xy/personal/Sartre(agent-workspace-design)/.worktrees/publish-a-c-20260625
```

当前候选：

```text
lane-a-service-baseline
```

## 审查结论

当前工作区是岗位协同首版候选。候选主线包括：

- Hub API
- Web Console
- Connector CLI
- domain/contracts/sdk/connector-core packages
- role capability packs
- OpenSpec / BDD / acceptance / reports 证据链

## 用户验收入口

建议按这个顺序验收：

1. 启动 Hub API 和 Web Console。
2. 在 Web Console 中切换开发/质量身份。
3. 用开发身份创建任务，选择质量岗位的 agent。
4. 切换质量身份，确认任务进入接收视图。
5. 打开任务详情，检查描述、附件/引用、时间线、agent 信息和状态流转。
6. 质量回复并发送给开发，切回开发身份确认任务变化。
7. 执行 agent 放行、失败审计、结束任务等关键路径。

## 工程审查入口

重点看这些文件：

- `README.md`
- `AGENTS.md`
- `docs/00-domain-model.md`
- `docs/01-architecture-overview.md`
- `plan/00-master-plan.md`
- `reports/lane-a-service-baseline/CANDIDATE-MANIFEST.md`
- `scripts/harness-regression.sh`
- `apps/hub-api/**`
- `apps/web-console/**`
- `packages/**`
- `.agents/capabilities/**`

## 真实验证

最后一次完整回归命令：

```bash
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
```

结果：通过。

最新证据：

```text
reports/lane-a-service-baseline/regression/latest.md
```

证据门禁摘要以 `latest.md` 中的 `Regression evidence gate` 为准。

## 已知非阻塞项

- Web Console 构建有 Vite chunk size warning，不影响当前构建通过；后续可用动态 import 或 manualChunks 拆分。
- 当前没有默认 commit/push；是否发布需要用户明确确认。
- 根目录不是本轮事实源；本轮事实源是候选 worktree。

## 发布前硬规则

- 不绕过 `lane-a-service-baseline` 回归门禁。
- 不在未确认情况下直接 commit/push。
