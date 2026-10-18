export function formatServerDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  // Older records stored localized display strings instead of timestamps.
  return Number.isFinite(date.getTime()) ? date.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : value;
}
