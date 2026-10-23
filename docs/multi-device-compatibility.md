# Compatibility boundaries for PR #4

Baseline: main `ed297ce5c6f240cfb0afde9b9c9af372415bdf8b`.

| Unapproved input | Inspected ref | Concrete integration boundary |
|---|---|---|
| PR #1 Dashboard | `fc208d45d6bcf425b9e90c7bd63fa1b31bfdc6a1` | Adds a refund ledger and financial semantics that differ from main. PR #4 uses `posDashboard` over actual main payments, with explicit refund amounts for newly synchronized returns. A future approved integration must map refund IDs once and avoid reading both representations as separate returns. |
| PR #2 Weight | `ed34168cada7843ca3ffdd2f0bbcebe7e65e4293` | Adds v11 weight-refund storage and gram quantities. PR #4 preserves global line IDs, quantity/basis fields and historical catalog versions, but does not import this code or claim its cumulative weighted refund allocation is integrated. |
| PR #3 Admin | `c20ac85502ad89a12a82b076ca9326fbfe7d002e` | Includes PR #2 as ancestor; taking the whole branch would import unapproved weight code. Main's owner Admin session remains separate from signed employee grants. PR #4 adds role guards and a verified paired-device boundary without copying the one-hour session implementation. |

PR #1's latest inspected ref differs from the previously user-verified `d627100`; remote recency does not establish approval. No branch merge simulation, merge or cherry-pick was performed.

PR #4 uses an opt-in, separate local POS store at version 12 and leaves the original `AngkringanDB` schema/data untouched. Future approval of v10/v11 must reconcile store creation/upgrades deliberately; do not transplant a Dexie version declaration or assume a version number alone imports additional tables.

Main's version-3 full merchant backup and the version-1 pending delivery archive are different formats. Recovery deliberately rejects unrelated archives and never restores private device keys or employee authorization from a file. Synchronized records come from the authenticated store; only original pending events are replayed.

Shared source surfaces now include actual POS/API guards, settings, dashboard entry, mobile header, Dexie store selection and generated build assets. Reconcile source contracts after each PR is approved, preserve all tests, and regenerate cache/manifest/lock files from the combined build. Do not resolve generated files by selecting one branch wholesale.

Implementation and test evidence are in `multi-device-review.md`. The source separation is a compatibility boundary, not a reason to stop the independent POS integration.
