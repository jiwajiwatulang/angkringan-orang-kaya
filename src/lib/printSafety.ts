export function escapePrintText(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
}
// Escape every string in receipt/report snapshots, including modifiers and imported fields.
export function safePrintData<T>(value: T): T {
  if (typeof value === 'string') return escapePrintText(value) as T;
  if (Array.isArray(value)) return value.map(safePrintData) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, safePrintData(item)])) as T;
  return value;
}
export function safePrintLogo(value: string | undefined): string {
  return value && value.length <= 2800000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(value) ? value : '';
}
export function safePrinterText<T>(value: T): T {
  if (typeof value === 'string') return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') as T;
  if (Array.isArray(value)) return value.map(safePrinterText) as T;
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,safePrinterText(item)])) as T;
  return value;
}
