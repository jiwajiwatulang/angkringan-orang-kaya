import type { StoreSettings } from './settings';
import { escapePrintText } from './printSafety';

export type LabelSettings = NonNullable<StoreSettings['orderLabel']>;
export const DEFAULT_LABEL_SETTINGS: LabelSettings = { enabled: false, widthMm: 50, heightMm: 30, gapMm: 2, connection: 'system', automatic: false, categories: [] };
export interface LabelOrder {
  id?: number; orderId?: number; status?: string; customerName?: string | null; tableName?: string | null;
  orderType?: string; notes?: string; createdAt?: string;
  items: { id?: number; menuItemId?: number; namaMenu?: string; nama?: string; kategoriMenu?: string; kategori?: string; qty: number; selectedModifiers?: { optionName: string }[] }[];
}
export interface OrderLabel { lines: string[]; sequence: number; total: number; }
export function labelSettings(settings: StoreSettings): LabelSettings {
  const cfg = { ...DEFAULT_LABEL_SETTINGS, ...settings.orderLabel };
  if (![cfg.widthMm, cfg.heightMm, cfg.gapMm].every(Number.isFinite) || cfg.widthMm < 30 || cfg.widthMm > 100 || cfg.heightMm < 25 || cfg.heightMm > 100 || cfg.gapMm < 0 || cfg.gapMm > 10) throw new Error('Ukuran label tidak valid (lebar 30–100 mm, tinggi 25–100 mm, gap 0–10 mm).');
  if (!['system', 'bluetooth'].includes(cfg.connection) || !Array.isArray(cfg.categories) || cfg.categories.some(c => typeof c !== 'string')) throw new Error('Pengaturan printer label tidak valid.');
  return cfg;
}
const clean = (s: unknown) => String(s ?? '').replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
export function labelRevision(order: LabelOrder): string {
  // Exclude payment status/time: settling an unchanged open bill must not reprint cups.
  return JSON.stringify([order.id ?? order.orderId, order.createdAt, order.customerName, order.tableName, order.orderType, order.notes,
    order.items.map(i => [i.menuItemId ?? i.id, i.namaMenu ?? i.nama, i.kategoriMenu ?? i.kategori, i.qty, i.selectedModifiers])]);
}
export function buildOrderLabels(order: LabelOrder, cfg: LabelSettings, kind: 'new' | 'reprint' | 'changed' = 'new'): OrderLabel[] {
  const selected = order.items.filter(i => !cfg.categories.length || cfg.categories.includes(i.kategoriMenu || i.kategori || 'Umum'));
  if (selected.some(i => !Number.isSafeInteger(i.qty) || i.qty < 1)) throw new Error('Label per cup memerlukan jumlah item berupa bilangan bulat positif.');
  const total = selected.reduce((sum, i) => sum + i.qty, 0);
  if (total > 200) throw new Error('Maksimal 200 label per pekerjaan cetak.');
  const stamp = new Date(order.createdAt || '');
  const time = Number.isFinite(stamp.getTime()) ? stamp.toLocaleString('id-ID', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const labels: OrderLabel[] = [];
  for (const item of selected) for (let unit = 0; unit < item.qty; unit++) {
    const sequence = labels.length + 1;
    const marker = order.status === 'void' ? 'PEMBATALAN' : kind === 'reprint' ? 'CETAK ULANG' : kind === 'changed' ? 'PERUBAHAN' : '';
    labels.push({ sequence, total, lines: [
      [marker, `#${order.id ?? order.orderId ?? 'TES'}`, clean(order.orderType)].filter(Boolean).join(' • '),
      [clean(order.customerName), clean(order.tableName)].filter(Boolean).join(' • '),
      clean(item.namaMenu || item.nama || 'Item'),
      ...(item.selectedModifiers || []).map(m => clean(m.optionName)),
      ...(clean(order.notes) ? [clean(order.notes)] : []),
      [time, `${sequence}/${total}`].filter(Boolean).join(' • ')
    ].filter(Boolean) });
  }
  return labels;
}
export function generateOrderLabelHtml(labels: OrderLabel[], cfg: LabelSettings): string {
  // Reject overflow rather than silently hiding an allergy/modifier at the bottom of a label.
  const columns = Math.floor((cfg.widthMm - 4) / 1.5), rows = Math.floor((cfg.heightMm - 4) / 3);
  for (const label of labels) if (wrappedLines(label.lines, columns).length > rows) throw new Error('Isi label terlalu panjang. Besarkan ukuran label agar semua catatan terbaca.');
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>Label Pesanan</title><style>@page{size:${cfg.widthMm}mm ${cfg.heightMm}mm;margin:0}*{box-sizing:border-box}body{margin:0;color:#000;background:#fff;font-family:monospace}.label{width:${cfg.widthMm}mm;height:${cfg.heightMm}mm;padding:2mm;break-after:page;font-size:2.5mm;line-height:3mm;white-space:pre-wrap;overflow-wrap:anywhere}.label:last-child{break-after:auto}.label div:first-child{font-weight:bold}</style></head><body>${labels.map(l => `<section class="label">${wrappedLines(l.lines, columns).map(line => `<div>${escapePrintText(line)}</div>`).join('')}</section>`).join('')}</body></html>`;
}
function wrappedLines(lines: string[], width: number): string[] {
  return lines.flatMap(line => { const chars = Array.from(line); const parts: string[] = []; for (let i = 0; i < chars.length; i += width) parts.push(chars.slice(i, i + width).join('')); return parts; });
}
export function generateOrderLabelTspl(labels: OrderLabel[], cfg: LabelSettings): string {
  // TSPL font 2 is 12x20 dots; this profile targets 203-dpi printers.
  const width = Math.floor((cfg.widthMm * 8 - 32) / 12), rows = Math.floor((cfg.heightMm * 8 - 32) / 24);
  return labels.map(label => {
    const lines = wrappedLines(label.lines, width);
    if (lines.length > rows) throw new Error('Isi label terlalu panjang. Besarkan ukuran label.');
    const text = lines.map((line, i) => {
      const ascii = line.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/•/g, '|').replace(/[–—]/g, '-').replace(/[‘’]/g, "'");
      if (/[^\x20-\x7e]/.test(ascii)) throw new Error('Karakter label tidak didukung profil TSPL teks. Gunakan Dialog Sistem agar nama dan catatan tetap lengkap.');
      const safe = ascii.replace(/["\\]/g, "'");
      return `TEXT 16,${16 + i * 24},"2",0,1,1,"${safe}"`;
    });
    return [`SIZE ${cfg.widthMm} mm,${cfg.heightMm} mm`, `GAP ${cfg.gapMm} mm,0 mm`, 'DIRECTION 1', 'REFERENCE 0,0', 'CLS', ...text, 'PRINT 1,1', ''].join('\r\n');
  }).join('');
}
