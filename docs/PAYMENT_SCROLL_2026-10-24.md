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
