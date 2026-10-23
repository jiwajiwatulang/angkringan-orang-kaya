# Multi-device integration audit

Base: `origin/main` ed297ce. Dedicated branch: `feat/multi-device-v1`.

The production access/weight branch (`origin/fix/admin-session-license-navigation`, c20ac85) and Dashboard financial work are not ancestors of main. Do not copy their migrations or silently merge them. Main has Dexie v9, one device license binding, numeric local transaction keys, and mutable payment refund records. The financial ledger/COGS/weight integration is a release dependency, not an implemented capability of main.

Existing boundaries: `licenseDeviceAccess` authenticates the original device; `merchantAccess` checks local Admin; `api` handles orders, payments, shifts and backup; `inventory` uses local movements; demo uses a separate database. D1 currently contains licensing, not merchant transactions.

Implementation is isolated behind a server-side opt-in. No automatic enrollment, production migration, merge or deployment. The legacy data store is never rewritten by the new transport. Use additive D1 tables and a separate per-store local store; imported numeric IDs must never become network IDs.

Release gates: legacy POS adapter, ledger integration after financial review, restoring/replacing devices without replay, actual independent browser profiles with interrupted connectivity, printed receipts, 390px/desktop screenshots, and full financial reconciliation. Unit tests and HTTP checks do not satisfy these gates. Keep unfinished interfaces inaccessible rather than showing active controls for unfinished behavior.
