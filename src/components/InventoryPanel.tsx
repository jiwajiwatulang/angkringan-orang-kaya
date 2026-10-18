"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MenuItem } from '@/lib/dexie';
import { adjustStock, configureStock } from '@/lib/inventory';
import { useAdmin } from '@/app/admin/AdminContext';

type StockAction = 'opening' | 'in' | 'out' | 'count';
const labels = { opening: 'Aktifkan stok', in: 'Barang masuk', out: 'Barang keluar', count: 'Stok opname', sale: 'Penjualan', return: 'Pembatalan' };

export default function InventoryPanel({ embedded = false }: { embedded?: boolean }) {
  const { storeSettings, showToast } = useAdmin();
  const products = useLiveQuery(() => db.table<MenuItem>('menuItems').toArray(), []) ?? [];
  const movements = useLiveQuery(() => db.table('inventoryMovements').orderBy('id').reverse().limit(60).toArray(), []) ?? [];
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [selection, setSelection] = useState<{ product: MenuItem; type: StockAction } | null>(null);
  const [amount, setAmount] = useState('');
  const [minimum, setMinimum] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const tracked = products.filter(p => p.trackStock);
  const low = tracked.filter(p => (p.stockQty ?? 0) <= (p.minimumStock ?? 0));
  const filtered = products.filter(p => `${p.nama} ${p.sku ?? ''}`.toLowerCase().includes(search.toLowerCase()) && (!onlyLow || low.some(x => x.id === p.id)));

  function open(product: MenuItem, type: StockAction) {
    setSelection({ product: { ...product }, type }); setAmount(''); setReason(''); setMinimum(String(product.minimumStock ?? 5)); setUnit(product.stockUnit ?? 'pcs');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!selection || saving) return;
    if (!amount.trim()) { showToast('Isi jumlah barang terlebih dahulu.', 'error'); return; }
    setSaving(true);
    try {
      if (selection.type === 'opening') await configureStock(selection.product.id!, Number(amount), Number(minimum), unit);
      else await adjustStock({ menuItemId: selection.product.id!, type: selection.type, amount: Number(amount), reason, expectedBalance: selection.product.stockQty ?? 0 });
      showToast('Stok dan riwayat berhasil disimpan.'); setSelection(null);
    } catch (error) { showToast(error instanceof Error ? error.message : 'Gagal menyimpan stok.', 'error'); }
    finally { setSaving(false); }
  }

  return <div className="space-y-6 max-w-7xl mx-auto">
    {!embedded && <div className="flex flex-wrap items-start justify-between gap-4">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">Persediaan • {storeSettings.businessType === 'retail' ? 'Retail' : 'Produk'}</p><h1 className="text-3xl font-bold tracking-tight">Stok barang</h1><p className="text-sm text-muted mt-2">Pantau persediaan, catat pergerakan, dan cocokkan dengan hitungan fisik.</p></div>
      <Link href="/admin/menu" className="px-4 py-2 border border-line rounded-lg text-sm font-semibold bg-white">Kelola katalog →</Link>
    </div>}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {[['Produk dipantau', tracked.length], ['Stok menipis / habis', low.length], ['Unit tersedia', tracked.reduce((sum, p) => sum + (p.stockQty ?? 0), 0)]].map(([title, value]) => <div key={title} className="bg-white rounded-xl border border-line p-5"><p className="text-sm text-muted">{title}</p><p className="text-3xl font-bold mt-3 tabular-nums">{value}</p></div>)}
    </div>
    <div className="border border-line rounded-xl bg-white overflow-hidden">
      <div className="p-4 flex flex-wrap items-center gap-3 border-b border-line"><input aria-label="Cari produk atau barcode" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari nama produk atau barcode…" className="border border-line rounded-lg px-3 py-2 text-sm flex-1 min-w-48"/><label className="text-sm flex items-center gap-2"><input type="checkbox" checked={onlyLow} onChange={e => setOnlyLow(e.target.checked)}/> Stok menipis</label></div>
      <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-slate-50 text-muted"><tr>{['Produk / SKU', 'Stok', 'Minimum', 'Tindakan'].map(t => <th key={t} className="px-5 py-3 font-medium">{t}</th>)}</tr></thead><tbody className="divide-y divide-line">
        {filtered.map(p => <tr key={p.id}><td className="px-5 py-4"><div className="font-semibold">{p.nama}</div><div className="text-xs text-muted mt-1">{p.sku || 'Belum ada barcode'}</div></td><td className="px-5 py-4 tabular-nums">{p.trackStock ? <span className={(p.stockQty ?? 0) <= (p.minimumStock ?? 0) ? 'text-amber-700 font-semibold' : ''}>{p.stockQty ?? 0} {p.stockUnit || 'pcs'}</span> : 'Belum dipantau'}</td><td className="px-5 py-4">{p.trackStock ? p.minimumStock ?? 0 : '—'}</td><td className="px-5 py-4"><div className="flex flex-wrap gap-2">{(p.trackStock ? ['in', 'out', 'count'] as const : ['opening'] as const).map(type => <button key={type} onClick={() => open(p, type)} className="px-3 py-2 border border-line rounded-lg hover:bg-blue-50 text-xs font-semibold">{labels[type]}</button>)}</div></td></tr>)}
        {!filtered.length && <tr><td colSpan={4} className="p-10 text-center text-muted">{products.length ? 'Tidak ada produk yang cocok.' : 'Tambahkan produk di katalog untuk mulai mengelola stok.'}</td></tr>}
      </tbody></table></div>
      <p className="text-xs text-muted p-4 border-t border-line">Pesanan tersimpan langsung mengurangi stok, termasuk tagihan belum lunas. Pembatalan nota belum dibayar mengembalikan stok. Untuk refund, periksa barang lalu catat retur layak jual melalui Barang masuk.</p>
    </div>
    <section className="bg-white border border-line rounded-xl p-5"><h2 className="font-semibold text-lg">Riwayat pergerakan</h2><p className="text-xs text-muted mt-1 mb-4">60 aktivitas terbaru pada perangkat ini</p><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="text-muted"><tr>{['Waktu', 'Produk', 'Aktivitas', 'Perubahan', 'Saldo', 'Alasan'].map(t => <th key={t} className="py-3 pr-4 font-medium">{t}</th>)}</tr></thead><tbody className="divide-y divide-line">{movements.map(m => <tr key={m.id}><td className="py-3 pr-4 whitespace-nowrap">{new Date(m.timestamp).toLocaleString('id-ID')}</td><td className="pr-4">{m.productName}</td><td className="pr-4">{labels[m.type as keyof typeof labels] ?? m.type}</td><td className="pr-4 tabular-nums">{m.delta > 0 ? '+' : ''}{m.delta}</td><td className="pr-4 tabular-nums">{m.balance}</td><td>{m.reason}</td></tr>)}</tbody></table>{!movements.length && <p className="py-8 text-center text-muted">Belum ada pergerakan stok.</p>}</div></section>
    {selection && <div className="fixed inset-0 bg-slate-950/50 z-[100] flex items-center justify-center p-4"><form onSubmit={save} role="dialog" aria-modal="true" aria-labelledby="stock-dialog-title" className="bg-white rounded-2xl p-6 max-w-md w-full space-y-4"><h2 id="stock-dialog-title" className="text-xl font-bold">{labels[selection.type]}</h2><p className="text-sm text-muted">{selection.product.nama}</p><label className="block text-sm font-medium">{selection.type === 'count' ? 'Jumlah fisik terhitung' : selection.type === 'opening' ? 'Jumlah stok awal' : 'Jumlah barang'}<input autoFocus type="number" min={selection.type === 'in' || selection.type === 'out' ? 1 : 0} step="1" required value={amount} onChange={e => setAmount(e.target.value)} className="mt-2 w-full border border-line rounded-lg px-3 py-2"/></label>
      {selection.type === 'opening' ? <><label className="block text-sm">Peringatan stok minimum<input type="number" min="0" step="1" required value={minimum} onChange={e => setMinimum(e.target.value)} className="mt-2 w-full border border-line rounded-lg px-3 py-2"/></label><label className="block text-sm">Satuan<input required maxLength={20} value={unit} onChange={e => setUnit(e.target.value)} className="mt-2 w-full border border-line rounded-lg px-3 py-2"/></label></> : <label className="block text-sm">Alasan / referensi<input required maxLength={240} value={reason} onChange={e => setReason(e.target.value)} placeholder="Contoh: pembelian pemasok, rusak, opname mingguan" className="mt-2 w-full border border-line rounded-lg px-3 py-2"/></label>}
      {selection.type === 'count' && <p className="text-xs text-muted">Hitung fisik terlebih dahulu. Selisih dicatat setelah disimpan. Jika ada transaksi lain selama penghitungan, muat ulang dan ulangi opname.</p>}
      <div className="flex justify-end gap-3 pt-2"><button type="button" disabled={saving} onClick={() => setSelection(null)} className="px-4 py-2 border border-line rounded-lg">Batal</button><button disabled={saving} className="px-4 py-2 rounded-lg bg-accent text-white font-semibold">{saving ? 'Menyimpan…' : 'Simpan stok'}</button></div>
    </form></div>}
  </div>;
}
