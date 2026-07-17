# Harness SOP

## 1. 证据等级

| 等级 | 含义 |
| --- | --- |
| REAL_TEST | 命令、请求或 UI 场景真实执行，断言失败时非零。 |
| STRUCTURAL_CHECK | 检查文件、Schema、依赖或规格结构。 |
| SCENARIO_REGISTERED | 场景已登记，尚未自动化。 |
| SKIPPED | 因明确原因未执行。 |
| MANUAL_REQUIRED | 需要真实人员验收。 |

证据等级不是结果。结果单独使用 PASS、FAIL、BLOCKED、SKIPPED。

不得把未执行、场景登记、结构检查、服务不可达或 degraded 写成 REAL_TEST/PASS。

## 2. 四层门禁

1. PR：format、lint、typecheck、build、unit、contract、architecture、secret、SAST。
2. Integration：真实 PostgreSQL/RLS、对象存储、Migration、Outbox、SSE、Endpoint、Lease。
3. Staging：Kubernetes 多用户流程、两个 Runtime、故障注入、容量和多岗位体验。
4. Release：最终镜像/签名 Electron Artifact、安装升级、兼容和部署 smoke。

当前仓库脚本只属于 legacy MVP，不能作为新生产仓库 Layer 1-4 完成证据。

## 3. REAL_TEST 条件

- 验证目标真实存在，不只检查文件/字符串。
- 保存命令、退出码、关键输出和 failures。
- 具备负向测试，证明错误状态会失败。
- 环境和依赖可识别，缺失 required 依赖时 BLOCKED。

## 4. 报告元数据

报告至少包含 commitSha、dirtyWorktreeHash、releaseVersion、imageDigest、electronArtifactHash、schemaVersion、environmentId、toolVersions、evidenceLevel、status、startedAt、finishedAt。

代码、Migration、锁文件、构建配置或产物变化后旧报告 stale。`latest.md` 只做索引。

## 5. Required Gate

required step SKIPPED 等同 BLOCKED。重试保存全部 attempts；flaky required test 在修复前阻断发布。

跨租户、认证、人工审批、数据丢失、重复写、旧 fencingToken、Migration 恢复、Secret 和签名验证不允许 waiver。

## 6. 当前状态

旧 `harness:regression`、`hub:smoke`、`architecture:check` 和报告仍可用于 legacy 代码诊断，但其结果不更新新 MS 状态。
