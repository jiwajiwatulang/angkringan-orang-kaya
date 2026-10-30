# Camera scanning in installed SakuNota

## Changes
- Camera scanning now has a bundled ZXing reader when the native browser detector is absent, has incomplete format support, fails to initialize, or throws while reading.
- Formats: EAN-13, EAN-8, UPC-A, UPC-E, Code 128, Code 39, QR and Data Matrix. UPC-A/EAN leading-zero equivalence remains handled by product lookup.
- Frames are processed locally; no photos or video are uploaded. The reader chunk is included in the normal offline manifest.
- Rear camera preferred. Retry resets the camera and reader; hiding the app releases tracks and opening it again restarts scanning. Unmount, cancellation and successful detection stop tracks and the scanning loop. Late async results cannot submit after closing.
- A 20-second startup deadline gives Retry and permission guidance when camera permission or initialization does not respond. Late streams are stopped without resuming an abandoned scan.
- One visible close button, Escape/backdrop dismissal, no forced focus on the manual input (avoids opening the phone keyboard over the camera), and clear permission/busy-camera messages.
- Perangkat & Karyawan uses the existing monitor illustration from the user's icon set (icon-kasir-pos). Keamanan & PIN Admin retains icon-gembok-lock. Colors and card layout stay consistent.

## Verification
- Five unit tests decode generated QR/EAN image pixels, test native format selection, native initialization/runtime failures, blank frames and camera error messages.
- The loopback-only browser fixture disables BarcodeDetector and supplies generated canvas video. Confirmed QR decode, EAN decode, reopen, permission refusal then Retry, hide/resume followed by QR decode, and a late camera request followed by the timeout/retry path. Tracks stop after completion.
- Main suite: 198 pass. Existing 35 stability tests plus the new scanner tests pass. TypeScript/build and 162-URL offline readiness pass.
- Run the fixture: npx tsx scripts/qa-camera.ts (localhost:4383). It is not a production route and contains no merchant credentials or data.

## Limits
Tests use simulated camera video, not a physical phone or an OS-installed PWA. Camera permission remains required; the app cannot override an OS/browser denial. Users must update the installed app while connected once so the new reader is cached. Blurred/damaged codes, lighting, focus and device speed affect recognition. Reading a QR returns its text to the existing calling workflow; it never automatically opens an arbitrary URL.
