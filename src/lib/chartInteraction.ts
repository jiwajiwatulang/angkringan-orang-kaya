export function chartPointAtPointer(clientX: number, left: number, width: number, count: number, start = 0.05, end = 0.95): number | null {
  if (count < 1 || width <= 0 || ![clientX, left, width].every(Number.isFinite)) return null;
  // SVG viewBox 800 with 40 units of horizontal padding on each side.
  const fraction = ((clientX - left) / width - start) / (end - start);
  return Math.max(0, Math.min(count - 1, Math.round(fraction * (count - 1))));
}

export function chartTooltipPosition(x: number, y: number, width: number, height: number) {
  const boxWidth = Math.min(224, Math.max(0, width - 16));
  const left = Math.max(8, Math.min(width - boxWidth - 8, x - boxWidth / 2));
  const top = Math.max(8, Math.min(height - 100, y >= 116 ? y - 108 : y + 18));
  return { left, top, width: boxWidth };
}
