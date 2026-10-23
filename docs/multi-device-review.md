# Multi-device integration audit

Base: `origin/main` ed297ce. Dedicated branch: `feat/multi-device-v1`.

The production access/weight branch (`origin/fix/admin-session-license-navigation`, c20ac85) and Dashboard financial work are not ancestors of main. Do not copy their migrations or silently merge them. Main has Dexie v9, one device license binding, numeric local transaction keys, and mutable payment refund records. The financial ledger/COGS/weight integration is a release dependency, not an implemented capability of main.

Existing boundaries: `licenseDeviceAccess` authenticates the original device; `merchantAccess` checks local Admin; `api` handles orders, payments, shifts and backup; `inventory` uses local movements; demo uses a separate database. D1 currently contains licensing, not merchant transactions.

Implementation is isolated behind a server-side opt-in. No automatic enrollment, production migration, merge or deployment. The legacy data store is never rewritten by the new transport. Use additive D1 tables and a separate per-store local store; imported numeric IDs must never become network IDs.

Release gates: legacy POS adapter, ledger integration after financial review, restoring/replacing devices without replay, actual independent browser profiles with interrupted connectivity, printed receipts, 390px/desktop screenshots, and full financial reconciliation. Unit tests and HTTP checks do not satisfy these gates. Keep unfinished interfaces inaccessible rather than showing active controls for unfinished behavior.

## Implemented foundation (not the completed v1 release)

- Dedicated D1 tables; deterministic store identity; live owner/cashier slot constraints.
- Original licensed device proof enrolls the owner. A short-lived, opaque QR capability requires a second, explicit owner approval. Proofs bind the payload, device, access and nonce.
- Employee PINs use salted PBKDF2; signed 24-hour offline access binds the employee's verifier, device key and credential epoch. Both device and employee revocation are checked before server operations. Offline revocation cannot be learned while disconnected; new server operations are rejected after revocation.
- Versioned catalog, retained historical price/cost, owner-only settings and cost fields, cashier-only own orders/shift scope.
- An isolated event projection handles orders, payments, refunds, shifts and additive stock. Event writes and projections share a D1 batch with a revision CAS plus unique mutation marker. This projection is **not yet the existing POS financial ledger**.
- Separate local replicas commit projection and outbox atomically. Delivery preserves dependency order and reuses event IDs; acknowledgment is required before removal. A late download cannot replace a new pending local sale. A connectivity listener and retry timer are available for the future adapter.
- Owner device/employee panel and QR receiver routes exist behind the frontend gate. Both gates default off; the existing POS does not activate them. There is no active navigation entry advertising unfinished functionality.

## Still required

1. Review/choose the financial + weight baseline, then implement the existing POS adapter (including quick add, split payments, discounts/tax, payment proofs, print paths and action/URL guards). The current cashier license guard does not accept the new device grant.
2. Mount a real employee login screen into that adapter; retain role and operator scope on every existing read/write entry point. Core offline PIN verification is not a completed employee login journey.
3. Add safe restore/replacement and legacy bootstrap. The foundation exports owner data without keys or employee verifiers; **no restore/import routine is implemented**. No claim is made that a backup restores a failed device. Unsent/unbacked-up local data can be lost if the device is destroyed.
4. Integrate owner dashboard with received/pending completeness; confirm the other device's state before showing “Semua Data Terbaru”. The status component alone is not dashboard integration.
5. Test real independent browser profiles, offline/reconnect/forced-close, receipts, mobile performance and actual 390px/tablet/desktop screenshots. Browser automation was previously denied; it was not bypassed.
6. Reconcile the existing dual ledger, weighted refunds, immutable closed-shift reports, data migration, backup replay and complete POS behavior end-to-end. A successful foundation projection test does not establish these properties for the application.

## Validation, 23 October 2026 (WITA)

`npm test`: 198 passed. `test:stability`: 35 passed. `test:multidevice`: 22 passed. Typecheck, production build and offline readiness passed. Build generates 28 static routes and 159 offline files. The new suite is included in CI.

Independent storage simulation uses two separate Dexie databases backed by fake-indexeddb and SQLite through the local D1 adapter, not real browsers or Cloudflare production. It covers concurrent sales, cashier privacy, tenfold retries, lost acknowledgments, reopening persisted queues, price/cost history, partial weighted refund/restock, closed shifts, PIN lockout/rotation, store isolation, demo exclusion, revocation and original-license unbinding. The HTTP gate and bounded input parser are exercised through local Requests.

No production migration, secret changes, real transactions, merge or deployment. This PR must remain draft and the feature must remain off.
