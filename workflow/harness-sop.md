# Harness SOP

本文件定义自动化验证与证据等级。证据等级是技术栈无关的硬约束。

## 证据等级

| 等级 | 含义 | 当前项目例子 |
| --- | --- | --- |
| `REAL_TEST` | 真实执行命令或请求，并且能失败 | Vitest、build、lint、Hub smoke、Connector smoke |
| `STRUCTURAL_CHECK` | 检查文件、OpenSpec、BDD、验收清单、架构边界是否存在和一致 | OpenSpec validate、architecture check |
| `SCENARIO_REGISTERED` | 行为场景已登记，尚未由代码验证 | 新 change 的 BDD 初稿 |
| `SKIPPED` | 因明确环境原因跳过 | 缺少外部 provider 凭证 |
| `MANUAL_REQUIRED` | 需要人工验收 | 用户级 UI 体验验收 |

不得把未执行命令、`SCENARIO_REGISTERED`、`SKIPPED` 写成 `PASS`。

## 当前回归入口

```bash
pnpm run harness:regression
CHANGE_NAME=lane-a-service-baseline pnpm run harness:regression
```

当前默认 change 是 `lane-a-service-baseline`。

每次运行生成：

```text
reports/<change-name>/regression/<timestamp>-regression-report.md
reports/<change-name>/regression/latest.md
```

## 当前主线必须覆盖

- OpenSpec validate。
- BDD / acceptance / PLAN_LEDGER 结构检查。
- `packages/domain`、`contracts`、`sdk`、`connector-core` 测试。
- `apps/hub-api`、`web-console`、`connector-cli` 测试。
- Web Console Hub real smoke。
- 所有当前包 build。
- `pnpm run lint:lane-a`。
- `pnpm run architecture:check`。
- secret scan。
- `git diff --check`。

## 报告规则

报告必须包含：

- 命令。
- 证据等级。
- 原始输出摘要。
- PASS/FAIL/SKIP。
- failures 统计。

最终交付只允许引用本次或最近一次真实执行的报告。
