# Payment panel scroll correction — 24 October 2026

Reported behavior: scrolling the mobile checkout could feel stuck. Inspection found nested scrolling on the overlay and form, drag handling on the title, and no touch-cancel reset. The initial Chromium check reproduced scrolling from the form but did not fully reproduce the intermittent physical-phone freeze.

Changes in `src/app/pos/page.tsx`:

- Only the form scrolls; the overlay and sheet clip overflow. Form overscroll stays within the form.
- Drag-to-dismiss starts only on the top handle. Tapping the handle no longer cancels checkout; close and Cancel controls remain available.
- Cancelled or multi-touch gestures reset the translation. A ref tracks final drag distance without depending on the latest React render.
- The panel follows visual viewport height and offset, including resize events; listeners are removed on close. Header and payment footer remain outside the form scroller.
- Payment validation, submission, financial calculations, and synchronization are unchanged.

Validation:

- `npm run typecheck`: passed.
- `NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE=enabled npm run build`: passed.
- `npm run test:offline`: all 164 asset URLs resolved.
- Chromium touch checks at 390×844, 320×740, 844×390 and 1365×900: form scrolls both directions; outer layer does not scroll; payment footer remains within viewport; panel dismisses.
- Portrait checks: cancelled gesture resets translation; title cannot drag the panel; shrinking viewport to 480px preserves footer and a nonzero form area; handle drag dismisses.
- Browser checks use isolated demo data and open checkout in portrait before resizing. Viewport resizing approximates keyboard space; it does not establish behavior on every physical iOS/Android keyboard.

Browser test command: `node /tmp/sakunota-browser/check-payment-scroll.mjs` (session QA script).

Production release:

- Application commit: `6324b74` on `fix/dashboard-mobile-polish` (pushed; not merged into main).
- Worker version: `06ea46c3-d8c9-457c-a57f-f8c0352caa0f`, deployed with `--keep-vars`.
- https://sakunota.my.id: SHA-256 checks matched the deployed offline manifest, service worker, CSS and POS JavaScript to the tested output.
- The same four viewport touch workflows passed against the live domain using isolated demo data. Browser TLS errors were ignored only in the browser test context because of the environment inspection proxy; application TLS configuration was not changed.
- No production database migrations or customer-data modifications were performed.
