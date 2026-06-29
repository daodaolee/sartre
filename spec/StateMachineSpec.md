# State Machine Spec

状态机必须显式、可测试、可审计。

## 当前必须显式建模的状态机

- Delivery lifecycle
- Connector execution lifecycle
- health probe result
- conversation/model run projection lifecycle

## 规则

- 状态用封闭枚举或 union 表达。
- 转换集中在领域层或明确 application use case。
- 非法转换必须抛出分类错误。
- 每个合法转换有测试。
- 关键非法转换有测试。
- 每次状态变化写入 audit event。

## Delivery 当前状态

```text
queued
delivered
acknowledged
accepted
running
report_ready
closed
failed
expired
```

`result_sent` 是 lifecycle event，不新增全局 Delivery status。这样质量把报告发送给开发时，可以表达“质量视角已发送”，而不把原始任务塞进一个全局“待发送”状态。
