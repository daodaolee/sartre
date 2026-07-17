# 真实验收场景规范

## 1. 定位

MS3-MS7 使用一个独立的 ToB 汽车维修行业供销 SaaS Project 验证 Sartre 的多人协作与 Agent 施工主链。它是测试载体，不是 Sartre 领域模型、演示假数据或第二个需要完整交付的产品。

## 2. 技术与人员

- 前端：React、TypeScript、Vite，负责采购单、发货/收货和库存界面。
- 后端：TypeScript API、PostgreSQL 17.6，负责租户、目录、采购单状态机、库存和审计。
- 测试：Vitest contract/integration、Playwright UI、故障与跨租户拒绝场景。
- 三个独立 Human、ProviderProfile 和 AgentRun 分别代表前端、后端、测试岗位。

第一轮不使用本机现有 Java 8 构建后端。需要 Java 兼容性时单独准备受支持的 JDK 21 测试 Project，不能用 EOL Java 栈扩大主验收范围。

## 3. 业务纵向切片

```text
维修门店选择供应商与配件
-> 创建采购单
-> 供应商确认全部可供或部分缺货
-> 供应商发货
-> 门店收货
-> 已收数量进入门店库存
-> 全量完成或余量保持待发
```

必须包含取消、非法状态转换、重复请求幂等、超量收货、无库存副作用和跨租户访问拒绝。只实现该切片所需的租户、门店、供应商、配件目录、采购单、发货、收货和库存，不扩展财务、结算、CRM、维修工单或完整 ERP。

## 4. Sartre 验收流程

1. 三个岗位围绕自然语言需求完成多轮对话，形成同一 `goal-contract.md` 并确认相同 hash。
2. 建立前端、后端、测试三个岗位任务，各自创建或 mention 获准 Agent。
3. 三个 Agent 使用各自 ProviderProfile；只读分析可以并行，同 Project 写入必须通过 Lease 串行。
4. 前端和后端提交代码与 ExecutionResult，测试岗位读取共享约束和结果，执行真实 API/UI 测试并提交 EvidenceRef。
5. 测试发现至少一个真实合同或边界问题，经会话对齐后修复并用新 correlationId 复验。
6. 初版验收后加入“允许部分到货、余量保持待发”的 blocking Requirement Change，验证 Diff、Context stale、暂停、任务重开、重新确认和两级验收。
7. Steward 能回答谁做了什么、当前决定/放弃项/冲突/证据，并且建议未经 Human 确认不能成为 Confirmed Context。

## 5. 证据边界

- 真实 Project 必须有独立 Git history、PostgreSQL 17.6 Migration、可失败的测试和可检查 UI。
- 三个浏览器登录态只证明 Human Session 隔离；Runtime 验收必须使用两个隔离 data root/endpoint，最终 staging 使用两个 OS 用户或 VM。
- mock、fixture、HTTP 200、文件存在、单人顺序脚本和模型自报成功均不能标为多人 REAL_TEST。
- 每次报告绑定 Sartre commit、测试 Project commit、Schema version、model id、environmentId、命令、退出码和关键产物 hash。
