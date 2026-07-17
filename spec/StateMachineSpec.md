# 状态机规范

## 1. 通用规则

- 状态转换只能由领域模型执行。
- Command 必须携带 expectedVersion；冲突返回 409。
- 每次转换同事务写入 State、DomainEvent、OutboxEvent 和 AuditEvent。
- 非法转换、缺少权限和不满足门禁必须失败关闭。

## 2. Requirement

```text
draft -> aligning -> active -> verifying -> completed
           ^          |          |
           +----------+----------+

draft / aligning / active / verifying -> cancelled
```

active 要求 confirmed Baseline、全部 requiredAligners 确认同一 hash、required Workstream 已接受。实质需求变更使 active/verifying 返回 aligning。completed 只允许创建 follow-up Requirement。

## 3. AlignmentBaseline

```text
draft -> proposed -> confirmed -> superseded
```

confirmed 要求全部 requiredAligners 确认同一 version/hash，且不可原地修改。Baseline 不支持强制确认；名单变化创建新 Draft 并重新确认。新版本 confirmed 后旧版本才 superseded。

## 4. Workstream

```text
planned -> running -> awaiting_review -> done
             |  ^          |
             v  |          v
           blocked       running

planned / running / blocked / awaiting_review -> cancelled
done -> planned 仅允许 confirmed Requirement Change 触发
```

Agent completed 不等于 Workstream done；岗位负责人必须确认。

## 5. Agent/Skill/MCP DefinitionVersion

```text
draft -> published -> superseded
  \-> discarded
published / superseded -> revoked
```

draft 可编辑；published 后内容和 dependency version id 不可原地修改。发布新版本时原 current published 版本进入 superseded。新 Invocation 只能使用 current published version。expected version 已 superseded 但 executionConfigHash 相同时返回非阻断 `agent_metadata_updated`；executionConfigHash 不同时返回 `agent_definition_changed` 和 Diff。

运行中 Invocation 继续使用已锁定的 published/superseded 版本。revoked 用于安全或合规紧急撤销：禁止新 Invocation，并立即禁用受影响 AgentRun 的新工具调用。

## 6. Execution

```text
analyzing_readonly
-> awaiting_plan_approval
-> acquiring_lease
-> running
-> awaiting_scope_approval / context_refresh_required / blocked
-> completed / failed / cancelled / interrupted
```

awaiting_scope_approval、context_refresh_required、blocked 和 interrupted 禁止新的写工具。恢复必须重新验证 ContextSnapshot、ExecutionPlan、LocalProjectBinding、Lease 和文件状态。

## 7. ProjectLease

```text
requested -> active -> released
                    \-> revoked
                    \-> expired
```

同一 projectId 同时最多一个 active Lease。revoke、force release、expire 必须使旧 fencingToken 永久失效。

首版不支持 transfer。换 holder 必须先 release/revoke，再由新 Execution acquire。

## 8. Finding 与 AttentionItem

```text
Finding: suggested -> confirmed / dismissed
         confirmed -> superseded

AttentionItem: open -> snoozed -> open
               open / snoozed -> resolved / rejected / cancelled / expired
```

snoozed 只改变提醒，不解除业务阻塞。

## 9. Invitation

```text
pending -> accepted / declined / revoked / expired
```

accepted 只创建显式 Membership/ProjectAccess，不授予本地目录、credential 或 Agent 写权限。
