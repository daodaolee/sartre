# BDD Test Spec

BDD 用于描述用户可理解的行为期望，不替代自动化测试。

## 文件位置

```text
bdd/features/<change-name>.md
acceptance/checklists/<change-name>.md
```

## 要求

- 每个非 trivial change 必须有 BDD。
- BDD 场景必须能映射到测试、smoke 或人工验收。
- 实现前可以是 `SCENARIO_REGISTERED`。
- 交付前核心场景必须升级为 `REAL_TEST` 或明确 `MANUAL_REQUIRED`。

## 当前主线场景类型

- Hub delivery lifecycle。
- Web Console role switch / task board / task detail / create flow。
- Connector inbox / replay / health / execute。
- Role capability mention。
- Conversation ledger / context projection。
- Error and audit recovery。

## 禁止

- 只写场景不实现却宣称通过。
- 使用与当前 change 无关的场景作为通过证据。
- BDD 与 acceptance/checklist 描述互相矛盾。
