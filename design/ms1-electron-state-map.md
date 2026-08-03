# MS1 Electron state map

> Reviewed against `design/pencil/sartre-product-v2.pen` at SHA-256
> `52cb7849746fe0f15ce7e597d40da75faca3f5a88eb137c9d65984a1128af881`.
> This map is product input below `spec/`; it does not replace the editable Pencil source.

## Visual source

MS1 preserves the compact 1280 x 800 desktop hierarchy, Geist/Geist Mono typography, cold dark
palette, border rhythm, and focus treatment from these Pencil nodes:

| Purpose | Pencil node | Reuse |
| --- | --- | --- |
| Application shell and Workspace switcher | `L6149n` (`Sartre v2 / Main Chat`) and `yWkzJ` (`Sidebar`) | Persistent left navigation, selected Workspace, compact status rows |
| Account and session recovery | `nzmVH` (`Sartre / Settings / 账户`) | Form density, account metadata, destructive-session action placement |
| Workspace and members | `XuGBo` (`Sartre / Settings / 工作区`) | Member rows, role labels, invite and empty-state placement |
| Resource settings | `rBxBm` (`Sartre / Settings`) | Settings navigation and bounded content column |
| Feedback and guarded actions | `JbjaW`, `vmUHM`, `ZJOVB` | Inline alert, confirmation modal, loading and failure feedback |

The implementation uses the Pencil variables `bg-app`, `bg-surface`, `bg-surface-2`, `bg-input`,
`border`, `border-subtle`, `text-primary`, `text-secondary`, `text-muted`, `accent`,
`accent-subtle`, `status-success`, `status-warning`, `status-error`, `font-sans`, `font-mono`,
`radius-md`, and `radius-lg`. It does not add a marketing hero, decorative gradient, nested card
stack, or credential/path display.

## State mapping

| Flow | Required states | Surface and recovery |
| --- | --- | --- |
| Local account | signed out, submitting, invalid credentials, dependency offline, restoring, token expired, recovery required, authenticated | Signed-out form follows the Account content width and form rhythm. Errors remain inline beside the submit action. Recovery clears the protected refresh-token blob and returns to the same form. Password is write-only UI state and is cleared after every attempt. |
| Workspace bootstrap and switch | no selection, opening by ID, create, active, forbidden/non-disclosure, offline read-only | The existing Workspace switcher remains the entry. Recent IDs are only local navigation hints; every switch reloads the authoritative summary from Hub. A forbidden or missing Workspace uses the same non-disclosing placeholder. Offline state retains the last visible summary as stale and disables writes. |
| Invitation and membership | invite form, pending, accepted elsewhere, expired, role conflict, removed, forbidden | Rows reuse the Workspace settings table. Version conflict reloads the row before another action. Expired and revoked invitations are terminal text states, never success-colored toasts. Email delivery is not claimed. |
| Project Access | no projects, project list, viewer/editor, grant pending, version conflict, forbidden placeholder | Project rows sit below membership rows in the same settings surface. Source/code affordances are replaced by a permission placeholder when Project viewer access is absent. |
| Local Endpoint | runtime offline, unpaired, pairing, active, rotate confirmation, revoked, incompatible, recovery required | Status is shown in the Account/Runtime settings surface. Pair/rotate/revoke commands stay disabled until authenticated local IPC proves Runtime version, endpoint identity, and challenge. Renderer receives status and stable error codes only; challenge, Endpoint Credential, token, and local path never render. |

## Interaction and accessibility notes

- First focus lands on the email field when signed out and the Workspace switcher when authenticated.
- All form controls have visible labels, persistent focus rings, and an error association through
  `aria-describedby`; status changes use `aria-live="polite"`.
- Status always combines text with an icon or count. Color is supplementary.
- The member and project tables retain their actions with long Chinese names at 1280 x 720; below
  the minimum content width, rows wrap metadata before actions instead of clipping them.
- Escape closes a confirmation modal without applying the action. Enter submits only the focused
  form and never confirms a destructive action implicitly.
- Authentication, Workspace, and Runtime failures provide one next action in place. Toast-only
  recovery is prohibited.

## Deliberate incomplete boundary

The Pencil source does not define an authenticated Electron Main to Local Runtime transport, and the
current Electron package does not ship the Runtime daemon. MS1 UI may display `runtime_offline` and
the recovery instruction, but it must not enable Endpoint pairing, rotation, or revoke until the
production authenticated IPC and packaged Runtime lifecycle are implemented and exercised. This
state is `IN_PROGRESS`, not visual or product PASS.
