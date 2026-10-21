export function chartPointAtPointer(clientX: number, left: number, width: number, count: number): number | null {
  if (count < 1 || width <= 0 || ![clientX, left, width].every(Number.isFinite)) return null;
  // SVG viewBox 800 with 40 units of horizontal padding on each side.
  const fraction = ((clientX - left) / width - 0.05) / 0.9;
  return Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1))));
}
