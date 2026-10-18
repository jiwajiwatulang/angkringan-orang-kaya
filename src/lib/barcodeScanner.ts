/**
 * Barcode & Audio Feedback Utility for SakuNota POS
 * Supports hardware USB/Bluetooth barcode guns (HID keyboard emulation)
 * and Web Audio API audio feedback (100% offline, zero audio assets required).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!audioCtx) {
      audioCtx = new AudioCtx();
    }
    if (audioCtx.state === "suspended") {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch (_) {
    return null;
  }
}

/**
 * Plays an instant POS scanner beep sound using Web Audio API synthesis.
 */
export function playScannerBeep(type: "success" | "error" | "warning" = "success") {
  if (typeof window === "undefined") return;

  // Haptic feedback for mobile devices
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      if (type === "success") {
        navigator.vibrate(45);
      } else if (type === "error") {
        navigator.vibrate([60, 40, 60]);
      } else {
        navigator.vibrate(30);
      }
    }
  } catch (_) {}

  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "success") {
      // Crisp supermarket POS beep (1200Hz -> 1800Hz quick chirp)
      osc.type = "sine";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(1750, now + 0.05);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.start(now);
      osc.stop(now + 0.07);
    } else if (type === "error") {
      // Low dual warning buzz
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.setValueAtTime(180, now + 0.08);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // Gentle warning / notification tone
      osc.type = "triangle";
      osc.frequency.setValueAtTime(650, now);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.start(now);
      osc.stop(now + 0.1);
    }
  } catch (_) {}
}

/**
 * Global Hardware Barcode Scanner Listener.
 * Intercepts rapid keystrokes from USB / Bluetooth handheld barcode scanners.
 */
export function setupHardwareBarcodeScanner(
  onScan: (barcode: string) => void,
  options?: { enabled?: boolean }
) {
  if (typeof window === "undefined") return () => {};

  let buffer = "";
  let lastKeyTime = 0;
  let resetTimer: ReturnType<typeof setTimeout> | undefined;
  const SCANNER_MAX_INTERVAL_MS = 60; // Scanners send chars in < 30ms intervals
  const MIN_BARCODE_LENGTH = 3;

  const handleKeyDown = (e: KeyboardEvent) => {
    if (options?.enabled === false) return;

    const currentTime = Date.now();
    const target = e.target as HTMLElement | null;
    const isInsideInput =
      target &&
      (target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable);

    // Form editing must never trigger a sale or intercept its Enter key.
    if (isInsideInput && !target?.dataset.barcodeTarget) {
      buffer = ''; lastKeyTime = 0;
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) { buffer = ''; return; }

    // If Enter key is pressed, check if buffer contains a barcode
    if (e.key === "Enter") {
      if (buffer.length >= MIN_BARCODE_LENGTH) {
        // Barcode successfully captured from hardware scanner
        const finalCode = buffer.trim();
        buffer = "";
        lastKeyTime = 0;

        // If the user was inside a standard text input, prevent default form submit
        e.preventDefault();
        e.stopPropagation();

        onScan(finalCode);
      } else {
        buffer = "";
      }
      return;
    }

    // Only accept single printable characters
    if (e.key.length !== 1) {
      return;
    }

    const interval = currentTime - lastKeyTime;
    lastKeyTime = currentTime;

    // If characters come very fast (scanner gun) OR we are already accumulating a rapid scan
    if (interval < SCANNER_MAX_INTERVAL_MS || buffer.length === 0) {
      if (buffer.length === 0 && isInsideInput && !target.dataset.barcodeTarget) {
        // If typing in normal text input slowly, don't hijack unless fast burst starts
        buffer = e.key;
      } else {
        buffer += e.key;
      }
    } else {
      // Gap was too long for a scanner -> reset buffer with current char
      buffer = e.key;
    }

    // Safety timeout to clear stale buffers if enter was never pressed
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      if (Date.now() - lastKeyTime > 300 && buffer.length > 0) {
        buffer = "";
      }
    }, 350);
  };

  window.addEventListener("keydown", handleKeyDown, true);
  return () => {
    clearTimeout(resetTimer);
    window.removeEventListener("keydown", handleKeyDown, true);
  };
}
