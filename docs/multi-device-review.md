# Multi-device POS integration — 23 October 2026

Branch: `feat/multi-device-v1`. PR: #4, Draft. Baseline `origin/main` remains `ed297ce5c6f240cfb0afde9b9c9af372415bdf8b` (fetched again during validation). No PR #1/#2/#3 commits were merged or cherry-picked. Both feature switches default off. No production migration or deployment.

## Implemented behavior

- A verified owner/device grant selects a separate `SakuNotaPOS-{store}-{device}` local store. The original merchant store is retained. Legacy records bootstrap in resumable receipt-sized groups, retaining numeric local relationships and assigning global wire IDs. Employee login is mounted around the actual POS; cashier routes and Admin functions require the correct signed role.
- Existing POS order, payment, split allocation, proof, shift, stock and audit writes atomically include an outbox event through Dexie middleware. A failed local transaction rolls back both records and outbox. IDs survive reopening and lost responses. Downloads cannot overwrite unsent local changes.
- The server validates row versions, origin/operator, historical catalog prices, modifiers, receipt arithmetic, payment limits, stock reservation deltas and closed shifts. Stock movements add to canonical quantities; an old-price offline sale preserves newer owner catalog edits. Closed-shift totals are derived from accepted records and frozen. Split allocations carry global line IDs.
- Product/receipt photos use bounded delivery and chunked D1 payload storage, including the existing 2 MB proof limit. No access grant, PIN verifier or private key is exported in recovery archives. Pending archives can be recovered by the live owner after replacement without reviving the old device or duplicating accepted receipts.
- Owner dashboard reads the actual synchronized POS records. Its isolated compatibility view recognizes collections on payment dates and returns on refund dates, includes partial collections and retained money after cancellation, and supports negative refund-only days. It does not import Dashboard PR #1. Regular single-device dashboard behavior remains unchanged.
- Employee switching clears the previous session. Known, still-authorized employees can sign in with cached PIN verification when transport fails even if the browser reports online. A definitive 4xx rejection cannot fall back to offline authorization. Cached authorization expires within 24 hours; offline devices cannot learn a revocation until communication resumes.

## Validation evidence

- `npm test`: 198 passed.
- `npm run test:stability`: 35 passed.
- `npm run test:multidevice`: 32 passed, including actual API calls and two separate POS processes/local stores against the local D1 implementation.
- Typecheck passed. Production build produced 28 static routes. Offline readiness resolved 160 assets. Final logs and screenshots are in this chat's `outputs` directory.
- Actual API scenarios include order editing/tombstones, cash plus QRIS, refund after closing a shift, immutable close totals, stock reservations, unpaid Retail draft then installment repayment, a 2.7 MB encoded payment image, atomic rollback, concurrent offline sales with an owner price update, repeated delivery, and owner replacement with a lost acknowledgment.
- Browser QA renders the actual POS, employee login, recovery controls and owner dashboard with generated local signing keys. It uses localhost/127.0.0.1 storage isolation, not production or third-party credentials. PIN entry, cashier access restrictions, shift opening, sale/receipt, operator switching and received owner totals were exercised. Three browser receipts totaled Rp30,000 and three notes after an offline reopen, a nonempty cashier archive recovered through the Owner UI, reconnect, and one deliberately lost acknowledgment; there were no duplicate notes. Mobile viewport width 390 has no horizontal overflow; lower navigation remains within the viewport after adding sync status.

## Review/release boundary

These are local functional results, not a claim that every bug is absent. The in-app browser exposes one browser context: two origins are not two independent browser profiles or two hardware devices. Network failure/lost-response injection exercises the real application transport; physical airplane-mode installation, browser/process destruction, Cloudflare-hosted staging behavior/limits and physical printer output remain separate release checks. No production writes, secrets, merge or deployment were used to replace those checks.

PR #1's financial implementation and PR #2's weighted refund semantics remain unapproved and absent. The current adapter integrates main's supported POS behavior; it does not claim that unmerged weighted ledger code has been validated. Keep PR #4 Draft and switches off for final review and deployment-specific acceptance.

## Remote validation follow-up

The first GitHub run exposed a test-fixture clock race: two Date.now calls could create an authorization duration one millisecond above the allowed limit. The fixture now derives both timestamps from one reading; security duration enforcement is unchanged. The existing Cloudflare trigger for feat/multi-device-v1 attempted preview without a safe previews configuration. Only that branch trigger was changed to npm run build followed by wrangler deploy --dry-run, so branch validation cannot publish. The production trigger, bindings, resources and secrets were not changed. Local Worker packaging passed (222.45 KiB, dry-run exited without upload).

The repository now declares a separate 120/minute Multi-Device ingress budget; entry and account actions also retain the original 30/minute budget. This prevents two idle devices polling every three seconds from exhausting the public limiter. The additional binding is source configuration only and has not been deployed. The regression test sends 40 authenticated pulls successfully and still rejects the 31st account request.
