# Living Master Plan import-boundary repair

## Goal

Restore `pnpm run spec:verify` after an evidence-only milestone status update without weakening the
immutable provenance checks for imported specification, workflow, design, ADR, architecture, and
database-schema documents.

## Root cause

`plan/00-master-plan.md` is both a living milestone-status document and a member of the immutable
legacy import allowlist. MS0 closeout correctly changed its status, which necessarily invalidated
the import hash. Replacing only the recorded hash would falsely claim source/target equality.

## Scope

1. Add a regression expectation that the mutable Master Plan is not an immutable import target.
2. Remove only that mapping from the approved allowlist and checked-in manifest.
3. Keep all remaining 26 mappings exact, unique, contained, wildcard-free, and hash-verified.
4. Update the PortingLedger boundary statement and record command evidence in the task ledger.
5. Resolve any current High/Critical dependency gate introduced since the verified MS0 subject,
   using the smallest compatible override and exercising the affected packaging path.

## Non-goals

- Do not change the MS0 verified subject, evidence commit, or tag.
- Do not regenerate the legacy freeze manifest or import manifest.
- Do not change any imported authority document content.
- Do not implement MS1 product behavior.

## Verification

- Focused RED then GREEN: `pnpm exec vitest run scripts/constitution/spec-import-manifest.test.ts`.
- `pnpm run spec:verify`.
- `pnpm run format:check`, `pnpm run lint`, `pnpm run typecheck`, and `pnpm run test`.
- `pnpm run dependency:check` and Electron arm64 directory packaging when the live audit changes a
  packaging dependency.
- `pnpm run secret:check`, cached whitespace/path review, and index Secret check before commit.
