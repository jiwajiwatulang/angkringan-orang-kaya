# Retail / Warung weight sales

Products without `saleUnit` remain pieces. Weighted products use `saleUnit: weight`, a `priceBasis` of 100 or 1000 grams, and optional `costPrice` in rupiah for that same basis. Order-item `qty` and stock quantities are whole grams for weighted products. The minimum weight is 1 g; kg input accepts up to three effective decimal places, including decimal commas. No historical quantities are converted.

`weight.ts` owns parsing, quantity labels, line prices and cost calculations. Rupiah values are rounded half up with BigInt intermediates, once per line. Order writes obtain price, basis and cost from the catalog, or the existing order line during edits. Changing product prices or cost never rewrites previous order items. Changing between pieces and weight is blocked once inventory or order history exists.

Order creation, edits and stock reservation share the existing local transaction. Payments never deduct stock a second time. Barcode selection opens the same weight-entry dialog as catalog selection. Retail draft/photo entry continues to create piece products and cannot silently reuse a weighted product. Waiter orders cannot submit weighted products. Rental, QR ordering and photo recognition behavior are otherwise unchanged.

Schema version 11 adds `weightRefunds`. Version 10 retains the previously released `refundEvents` table and its indexes. Existing records are not rewritten. Full backup/restore includes both ledgers plus all weight and cost fields; product JSON transfer preserves the new product fields. Older backups remain valid.

Partial weight returns keep original order quantities, totals, payments and prices. Returned quantities and money are recorded separately. Refunds allocate the original payable amount (including proportional discount and charges) across lines; the last line absorbs the allocation remainder. Cumulative rounding by returned quantity prevents repeated small refunds from creating or losing rupiah. Refund requests support an idempotency key and execute atomically. Optional physical returns restore grams only when explicitly selected. An open shift is required; cash payouts belong to that shift, preserving closed-shift records. Existing payment/full-void refunds are capped to money not already returned.

Mixed piece/weight split-by-item payments identify the exact order-item ID, validate unpaid quantities and use the same cumulative allocation. Full payment marks all original quantities paid. Dashboard sales deduct weight refunds; weighted quantity, cost and gross product margin are shown separately from piece counts. Margin excludes tax/service and includes proportional discount. Missing cost remains unknown, never silently zero. Printed receipts and transaction exports show g/kg.

Validation commands:

```sh
npm test
npm run test:stability
npm run test:weight
npm run typecheck
npm run build
npm run test:offline
```

`test:weight` covers parsing, money boundaries, immutable price/cost, stock rollback, mixed tender payments, split quantities, cumulative returns, duplicate/concurrent returns, closed shifts, transfer/restore, v9/v10 upgrades and the cashier dialog's live interaction in jsdom. This is not a real browser layout or printer-hardware test. Before release, visually verify the cashier at 390 px and desktop, and exercise service-worker reload/offline behavior on an actual browser. No deployment or merge is part of this change.

User instructions are maintained in `src/lib/guideTopics.ts` under **Jual Barang Timbang**, with a shortcut on `/panduan`.
