import { db } from './dexie';
import type { StoreSettings } from './settings';
import { buildOrderLabels, generateOrderLabelHtml, generateOrderLabelTspl, labelRevision, labelSettings, type LabelOrder, type LabelSettings } from './orderLabels';

export interface LabelJob { orderId: number; revision: string; count: number; at: string; status: 'dispatching' | 'sent' | 'dialog_opened' | 'failed'; error?: string; }
export type LabelTransport = (html: string, tspl: string, cfg: LabelSettings) => Promise<'sent' | 'dialog_opened'>;
export async function labelOrderSnapshot(orderId: number): Promise<LabelOrder> {
  const order = await db.table('orders').get(orderId);
  if (!order) throw new Error('Nota tidak ditemukan.');
  const items = await db.table('orderItems').where('orderId').equals(orderId).toArray();
  const menus = await db.table('menuItems').toArray();
  const labelItems = items.map(item => {
    const menu = menus.find(m => m.id === item.menuItemId);
    return { ...item, namaMenu: item.namaMenu || menu?.nama || 'Item', kategoriMenu: item.kategoriMenu || menu?.kategori || 'Umum' };
  });
  const table = order.tableId ? await db.table('tables').get(order.tableId) : undefined;
  return { ...order, items: labelItems, tableName: table?.nomor };
}
export async function printOrderLabels(order: LabelOrder, settings: StoreSettings, options: { automatic?: boolean; transport?: LabelTransport } = {}): Promise<string> {
  const cfg = labelSettings(settings);
  if (!cfg.enabled) return 'Label pesanan belum diaktifkan.';
  if (options.automatic && (!cfg.automatic || cfg.connection !== 'bluetooth')) return '';
  const orderId = order.id ?? order.orderId;
  if (!Number.isSafeInteger(orderId) || Number(orderId) <= 0) throw new Error('Simpan pesanan terlebih dahulu sebelum mencetak label.');
  const selectedOrder = { ...order, items: order.items.filter(i => !cfg.categories.length || cfg.categories.includes(i.kategoriMenu || i.kategori || 'Umum')) };
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(labelRevision(selectedOrder) + (order.status === 'void' ? ':void' : '')));
  const revision = Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
  const key = `order_label_job:${orderId}:${revision}`;
  const claimed = await db.transaction('rw', db.table('settings'), async () => {
    const existing = (await db.table('settings').get(key))?.value as LabelJob | undefined;
    if (options.automatic && existing) return undefined;
    if (existing?.status === 'dispatching') throw new Error('Pengiriman label masih berjalan. Periksa printer sebelum mencoba lagi.');
    const prior = await db.table('settings').filter(r => r.key.startsWith(`order_label_job:${orderId}:`)).count();
    const labels = buildOrderLabels(order, cfg, existing ? 'reprint' : prior ? 'changed' : 'new');
    if (!labels.length) return undefined;
    const html = generateOrderLabelHtml(labels, cfg);
    const tspl = cfg.connection === 'bluetooth' ? generateOrderLabelTspl(labels, cfg) : '';
    const job: LabelJob = { orderId: Number(orderId), revision, count: labels.length, at: new Date().toISOString(), status: 'dispatching' };
    await db.table('settings').put({ key, value: job });
    return { job, html, tspl };
  });
  if (!claimed) return options.automatic ? '' : 'Tidak ada item yang cocok dengan kategori label.';
  try {
    const status = await (options.transport || sendLabelDocument)(claimed.html, claimed.tspl, cfg);
    await db.table('settings').put({ key, value: { ...claimed.job, status } });
    return status === 'sent' ? `${claimed.job.count} label dikirim ke printer. Periksa hasil cetak.` : `Dialog cetak ${claimed.job.count} label dibuka. Pilih printer dan ukuran label yang sesuai.`;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pengiriman label gagal.';
    await db.table('settings').put({ key, value: { ...claimed.job, status: 'failed', error: message } });
    throw new Error(`${message} Pesanan tetap tersimpan. Periksa printer sebelum cetak ulang agar label tidak ganda.`);
  }
}
export async function printSavedOrderLabels(orderId: number, settings: StoreSettings, automatic = false): Promise<string> {
  if (!settings.orderLabel?.enabled || (automatic && !settings.orderLabel.automatic)) return '';
  return printOrderLabels(await labelOrderSnapshot(orderId), settings, { automatic });
}
export async function recentLabelJobs(): Promise<LabelJob[]> {
  const rows = await db.table('settings').filter(r => r.key.startsWith('order_label_job:')).toArray();
  return rows.map(r => r.value as LabelJob).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 10);
}
let activeTransport = false;
export async function sendLabelDocument(html: string, tspl: string, cfg: LabelSettings): Promise<'sent' | 'dialog_opened'> {
  if (activeTransport) throw new Error('Printer label sedang dipakai. Tunggu pengiriman sebelumnya selesai.');
  activeTransport = true;
  try { return await sendLabelDocumentUnlocked(html, tspl, cfg); }
  finally { activeTransport = false; }
}
async function sendLabelDocumentUnlocked(html: string, tspl: string, cfg: LabelSettings): Promise<'sent' | 'dialog_opened'> {
  const { Capacitor } = await import('@capacitor/core');
  if (cfg.connection === 'bluetooth') {
    if (!Capacitor.isNativePlatform()) throw new Error('Bluetooth label langsung memerlukan APK Android. Pilih Dialog Sistem untuk browser/PWA.');
    const address = localStorage.getItem('sakunota_label_printer_mac');
    if (!address || !/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(address)) throw new Error('Pilih alamat Bluetooth printer label di Pengaturan Printer.');
    const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial');
    await BluetoothSerial.connect({ address });
    await BluetoothSerial.write({ address, value: tspl });
    return 'sent';
  }
  if (Capacitor.isNativePlatform()) {
    const { Printer } = await import('@capgo/capacitor-printer');
    await Printer.printHtml({ html, name: 'Label_Pesanan_SakuNota' });
    return 'dialog_opened';
  }
  if (typeof window === 'undefined') throw new Error('Cetak label memerlukan browser.');
  let frame = document.getElementById('sakunota-label-print') as HTMLIFrameElement | null;
  if (!frame) {
    frame = document.createElement('iframe'); frame.id = 'sakunota-label-print';
    frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    document.body.appendChild(frame);
  }
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) throw new Error('Dialog label tidak tersedia.');
  doc.open(); doc.write(html); doc.close();
  await new Promise(resolve => setTimeout(resolve, 250));
  frame.contentWindow.focus(); frame.contentWindow.print();
  return 'dialog_opened';
}
