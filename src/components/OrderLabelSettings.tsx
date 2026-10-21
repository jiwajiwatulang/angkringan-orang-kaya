"use client";
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';
import { saveStoreSettingsAsync, type StoreSettings } from '@/lib/settings';
import { DEFAULT_LABEL_SETTINGS, buildOrderLabels, generateOrderLabelHtml, generateOrderLabelTspl, labelSettings, type LabelOrder } from '@/lib/orderLabels';
import { recentLabelJobs, sendLabelDocument, type LabelJob } from '@/lib/orderLabelPrinting';

export default function OrderLabelSettings({ settings, refresh, toast }: { settings: StoreSettings; refresh: () => Promise<void>; toast: (message: string, type: 'success' | 'error' | 'info') => void }) {
  const [cfg, setCfg] = useState({ ...DEFAULT_LABEL_SETTINGS, ...settings.orderLabel });
  const [native, setNative] = useState(false), [address, setAddress] = useState('');
  const [devices, setDevices] = useState<{ address: string; name?: string }[]>([]);
  const [busy, setBusy] = useState(false), [preview, setPreview] = useState('');
  const menus = useLiveQuery(() => db.table('menuItems').toArray(), []) || [];
  const jobs = useLiveQuery(recentLabelJobs, []) || [];
  const categories = Array.from(new Set(menus.map(m => String(m.kategori || 'Umum')))).sort();
  useEffect(() => { setCfg({ ...DEFAULT_LABEL_SETTINGS, ...settings.orderLabel }); }, [settings]);
  useEffect(() => { import('@capacitor/core').then(({ Capacitor }) => setNative(Capacitor.isNativePlatform())); setAddress(localStorage.getItem('sakunota_label_printer_mac') || ''); }, []);
  const validated = () => labelSettings({ ...settings, orderLabel: cfg });
  const example: LabelOrder = { id: 24, customerName: 'Pelanggan Tes', orderType: 'Take Away', createdAt: new Date().toISOString(), items: [{ namaMenu: 'Matcha Latte', kategoriMenu: cfg.categories[0] || 'Minuman', qty: 1, selectedModifiers: [{ optionName: 'Less sugar' }, { optionName: 'Less ice' }] }] };
  const run = async (action: () => Promise<void>) => { setBusy(true); try { await action(); } catch (e) { toast(e instanceof Error ? e.message : 'Pengaturan label gagal.', 'error'); } finally { setBusy(false); } };
  const save = () => run(async () => {
    const next = validated();
    if (next.connection === 'bluetooth' && !/^(?:[0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(address)) throw new Error('Pilih printer label atau isi alamat MAC Bluetooth yang valid.');
    await saveStoreSettingsAsync({ ...settings, orderLabel: { ...next, automatic: next.automatic && native && next.connection === 'bluetooth' } });
    localStorage.setItem('sakunota_label_printer_mac', address.trim().toUpperCase());
    await refresh(); toast('Pengaturan label disimpan.', 'success');
  });
  const test = (print: boolean) => run(async () => {
    const next = validated(), labels = buildOrderLabels(example, next), html = generateOrderLabelHtml(labels, next);
    setPreview(html);
    if (print) {
      // Use the saved target so an unsaved device choice never receives a print job.
      const saved = localStorage.getItem('sakunota_label_printer_mac') || '';
      if (next.connection === 'bluetooth' && saved !== address.trim().toUpperCase()) throw new Error('Simpan pilihan printer sebelum tes cetak.');
      const result = await sendLabelDocument(html, next.connection === 'bluetooth' ? generateOrderLabelTspl(labels, next) : '', next);
      toast(result === 'sent' ? 'Label uji dikirim. Periksa hasil di printer.' : 'Dialog label uji dibuka.', 'info');
    }
  });
  const scan = () => run(async () => {
    if (!native) throw new Error('Pemindaian label Bluetooth tersedia pada APK Android.');
    const { BluetoothSerial } = await import('@ascentio-it/capacitor-bluetooth-serial');
    const result = await BluetoothSerial.getPairedDevices();
    setDevices(result.devices || []);
    if (!result.devices?.length) toast('Pasangkan printer label melalui pengaturan Bluetooth perangkat terlebih dahulu.', 'info');
  });
  const release = (job: LabelJob) => run(async () => {
    if (!window.confirm('Periksa printer terlebih dahulu. Izinkan cetak ulang? Label yang sudah keluar dapat tercetak ganda.')) return;
    await db.table('settings').put({ key: `order_label_job:${job.orderId}:${job.revision}`, value: { ...job, status: 'failed', error: 'Pengiriman diperiksa operator; cetak ulang diizinkan.' } });
  });
  const input = 'w-full rounded-xl border border-line bg-card p-2.5 text-sm';
  return <section id="label-pesanan" className="rounded-2xl border border-line bg-card p-4 space-y-4">
    <div><h3 className="font-bold text-lg">Label Pesanan</h3><p className="text-xs text-muted">Stiker per cup, terpisah dari struk pembayaran.</p></div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cfg.enabled} onChange={e => setCfg({ ...cfg, enabled: e.target.checked })} />Aktifkan label pesanan</label>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm space-y-1 block">Ukuran label<select className={input} value={["50x30", "40x30"].includes(`${cfg.widthMm}x${cfg.heightMm}`) ? `${cfg.widthMm}x${cfg.heightMm}` : "custom"} onChange={e => { if (e.target.value === 'custom') setCfg({ ...cfg, widthMm: 60, heightMm: 40 }); else { const [widthMm, heightMm] = e.target.value.split('x').map(Number); setCfg({ ...cfg, widthMm, heightMm }); } }}><option value="50x30">50 × 30 mm</option><option value="40x30">40 × 30 mm</option><option value="custom">Ukuran khusus</option>{!['50x30', '40x30'].includes(`${cfg.widthMm}x${cfg.heightMm}`) && <option value={`${cfg.widthMm}x${cfg.heightMm}`}>Ukuran khusus saat ini</option>}</select></label>
      <label className="text-sm space-y-1 block">Jalur cetak<select className={input} value={cfg.connection} onChange={e => setCfg({ ...cfg, connection: e.target.value as 'system' | 'bluetooth', automatic: false })}><option value="system">Dialog printer sistem (browser / APK)</option><option value="bluetooth" disabled={!native}>Bluetooth printer label TSPL (APK Android)</option></select></label>
      <label className="text-sm space-y-1 block">Lebar (mm)<input className={input} type="number" min={30} max={100} value={cfg.widthMm} onChange={e => setCfg({ ...cfg, widthMm: Number(e.target.value) })} /></label>
      <label className="text-sm space-y-1 block">Tinggi (mm)<input className={input} type="number" min={25} max={100} value={cfg.heightMm} onChange={e => setCfg({ ...cfg, heightMm: Number(e.target.value) })} /></label>
      {cfg.connection === 'bluetooth' && <><label className="text-sm space-y-1 block">Gap antarlabel (mm)<input className={input} type="number" min={0} max={10} step="0.5" value={cfg.gapMm} onChange={e => setCfg({ ...cfg, gapMm: Number(e.target.value) })} /></label><label className="text-sm space-y-1 block">MAC printer label<input className={input} value={address} placeholder="AA:BB:CC:DD:EE:FF" onChange={e => setAddress(e.target.value)} /></label><button type="button" disabled={busy} onClick={scan} className={input}>Pilih Bluetooth yang sudah dipasangkan</button>{devices.length > 0 && <select aria-label="Perangkat label" className={input} value={address} onChange={e => setAddress(e.target.value)}><option value="">Pilih printer label</option>{devices.map(d => <option key={d.address} value={d.address}>{d.name || d.address}</option>)}</select>}</>}
    </div>
    <p className="text-xs text-muted">Browser/PWA memakai driver dan dialog sistem. Bluetooth langsung memakai profil TSPL 203 dpi; lakukan tes pada printer label yang sesuai.</p>
    <label className="flex gap-2 items-center text-sm"><input type="checkbox" checked={cfg.automatic} disabled={!native || cfg.connection !== 'bluetooth'} onChange={e => setCfg({ ...cfg, automatic: e.target.checked })} />Cetak otomatis setelah pesanan disimpan (APK Bluetooth)</label>
    <fieldset><legend className="text-sm font-bold mb-2">Kategori label</legend><label className="flex gap-2 text-sm"><input type="checkbox" checked={!cfg.categories.length} onChange={e => setCfg({ ...cfg, categories: e.target.checked ? [] : categories })} />Semua kategori</label><div className="flex flex-wrap gap-3 mt-2">{Array.from(new Set([...categories, ...cfg.categories])).map(c => <label key={c} className="flex gap-1 text-sm"><input type="checkbox" checked={cfg.categories.includes(c)} onChange={e => setCfg({ ...cfg, categories: e.target.checked ? [...cfg.categories, c] : cfg.categories.filter(x => x !== c) })} />{c}</label>)}</div></fieldset>
    <div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={save} className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-sm">Simpan Label</button><button type="button" disabled={busy} onClick={() => test(false)} className="px-4 py-2 rounded-xl border border-line text-sm">Pratinjau Label</button><button type="button" disabled={busy} onClick={() => test(true)} className="px-4 py-2 rounded-xl border border-line text-sm">Tes Cetak Label</button></div>
    {preview && <iframe title="Pratinjau label pesanan" sandbox="" srcDoc={preview} className="w-full h-48 border border-line rounded-xl bg-white" />}
    {jobs.length > 0 && <div><h4 className="text-sm font-bold mb-2">Pengiriman label terakhir</h4><ul className="space-y-2 text-xs">{jobs.map(j => <li key={`${j.orderId}:${j.revision}`} className="border-t border-line pt-2">#{j.orderId} · {j.count} label · {({ sent: 'Dikirim ke printer', dialog_opened: 'Dialog dibuka', failed: 'Perlu diperiksa', dispatching: 'Pengiriman berjalan / belum terkonfirmasi' })[j.status]}{j.status === 'dispatching' && <button type="button" onClick={() => release(j)} disabled={busy} className="underline ml-2">Periksa &amp; izinkan cetak ulang</button>}</li>)}</ul></div>}
  </section>;
}
