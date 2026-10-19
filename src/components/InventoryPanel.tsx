"use client";

import { useState } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MenuItem } from '@/lib/dexie';
import { adjustStock, configureStock } from '@/lib/inventory';
import { addCashMovement } from '@/lib/api';
import { useAdmin } from '@/app/admin/AdminContext';
import LineIcon from '@/components/LineIcon';

type StockAction = 'opening' | 'in' | 'out' | 'count';
const labels: Record<string, string> = {
  opening: 'Aktifkan Stok',
  in: 'Barang Masuk / Pembelian',
  out: 'Barang Keluar / Rusak',
  count: 'Stok Opname Fisik',
  sale: 'Penjualan Kasir',
  return: 'Retur / Batal'
};

export default function InventoryPanel({ embedded = false }: { embedded?: boolean }) {
  const { storeSettings, showToast } = useAdmin();
  const products = useLiveQuery(() => db.table<MenuItem>('menuItems').toArray(), []) ?? [];
  const movements = useLiveQuery(() => db.table('inventoryMovements').orderBy('id').reverse().limit(100).toArray(), []) ?? [];
  
  const [search, setSearch] = useState('');
  const [onlyLow, setOnlyLow] = useState(false);
  const [selection, setSelection] = useState<{ product: MenuItem; type: StockAction } | null>(null);
  const [amount, setAmount] = useState('');
  const [minimum, setMinimum] = useState('5');
  const [unit, setUnit] = useState('pcs');
  const [supplierName, setSupplierName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [recordExpense, setRecordExpense] = useState(true);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const tracked = products.filter(p => p.trackStock);
  const low = tracked.filter(p => (p.stockQty ?? 0) <= (p.minimumStock ?? 0));
  const filtered = products.filter(p => `${p.nama} ${p.sku ?? ''}`.toLowerCase().includes(search.toLowerCase()) && (!onlyLow || low.some(x => x.id === p.id)));

  function open(product: MenuItem, type: StockAction) {
    setSelection({ product: { ...product }, type });
    setAmount('');
    setReason(type === 'in' ? 'Pembelian stok' : '');
    setSupplierName('');
    setPurchasePrice('');
    setRecordExpense(true);
    setMinimum(String(product.minimumStock ?? 5));
    setUnit(product.stockUnit ?? 'pcs');
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!selection || saving) return;
    if (!amount.trim()) { showToast('Isi jumlah barang terlebih dahulu.', 'error'); return; }
    
    setSaving(true);
    try {
      const numAmount = Number(amount);
      const numPurchasePrice = Number(purchasePrice) || 0;
      const totalCost = numAmount * numPurchasePrice;

      if (selection.type === 'opening') {
        await configureStock(selection.product.id!, numAmount, Number(minimum), unit);
      } else {
        await adjustStock({
          menuItemId: selection.product.id!,
          type: selection.type,
          amount: numAmount,
          supplierName: selection.type === 'in' ? supplierName.trim() || undefined : undefined,
          purchasePrice: selection.type === 'in' && numPurchasePrice > 0 ? numPurchasePrice : undefined,
          reason: reason.trim() || (selection.type === 'in' ? `Barang masuk ${supplierName ? `dari ${supplierName}` : ''}`.trim() : 'Penyesuaian stok'),
          expectedBalance: selection.product.stockQty ?? 0
        });

        // Catat otomatis ke Kas Keluar Toko jika dicentang
        if (selection.type === 'in' && recordExpense && totalCost > 0) {
          await addCashMovement({
            type: 'out',
            amount: totalCost,
            category: 'bahan_baku',
            paymentSource: 'laci',
            reason: `Beli stok ${selection.product.nama} (${numAmount} ${selection.product.stockUnit || 'pcs'}) ${supplierName ? `dari ${supplierName}` : ''}`.trim(),
            operatorName: 'Admin'
          });
        }
      }

      showToast(
        selection.type === 'in' && recordExpense && totalCost > 0
          ? `Stok bertambah & biaya Rp ${totalCost.toLocaleString('id-ID')} tercatat di Buku Kas!`
          : 'Stok dan riwayat berhasil disimpan.',
        'success'
      );
      setSelection(null);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Gagal menyimpan stok.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {!embedded && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-accent mb-2">
              Persediaan • {storeSettings.businessType === 'retail' ? 'Retail / Grosir' : 'Katalog Usaha'}
            </p>
            <h1 className="text-3xl font-bold tracking-tight">Katalog Stok & Pemasok (Supplier)</h1>
            <p className="text-sm text-muted mt-2">
              Pantau persediaan barang, catat barang masuk dari supplier, harga beli satuan (HPP), dan cocokkan dengan opname fisik.
            </p>
          </div>
          <Link href="/admin/menu" className="px-4 py-2 border border-line rounded-xl text-sm font-semibold bg-surface hover:bg-card transition-colors">
            Kelola Katalog Produk →
          </Link>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          ['Produk Terpantau', `${tracked.length} Jenis`, 'Produk dengan pelacakan persediaan'],
          ['Stok Menipis / Habis', `${low.length} Item`, 'Perlu segera direstok dari supplier'],
          ['Total Unit Fisik', `${tracked.reduce((sum, p) => sum + (p.stockQty ?? 0), 0)} Unit`, 'Total akumulasi seluruh persediaan']
        ].map(([title, value, sub]) => (
          <div key={title} className="bg-surface rounded-2xl border border-line p-5 space-y-1 shadow-sm">
            <p className="text-xs text-muted font-bold uppercase tracking-wider">{title}</p>
            <p className="text-3xl font-black text-fg tabular-nums tracking-tight">{value}</p>
            <p className="text-[11px] text-muted">{sub}</p>
          </div>
        ))}
      </div>

      {/* Main Stock Table */}
      <div className="border border-line rounded-3xl bg-surface overflow-hidden shadow-sm">
        <div className="p-4 flex flex-wrap items-center gap-3 border-b border-line bg-card/30">
          <div className="relative flex-1 min-w-48">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-xs">
              <LineIcon name="search" className="w-4 h-4" />
            </span>
            <input
              aria-label="Cari produk atau barcode"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama produk, SKU, atau barcode..."
              className="w-full bg-surface border border-line rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-fg outline-none focus:border-accent"
            />
          </div>

          <label className="text-xs font-bold text-fg flex items-center gap-2 cursor-pointer bg-surface px-3 py-2 rounded-xl border border-line">
            <input
              type="checkbox"
              checked={onlyLow}
              onChange={e => setOnlyLow(e.target.checked)}
              className="w-4 h-4 accent-accent rounded"
            />
            <span>Stok Menipis Saja ({low.length})</span>
          </label>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-card text-muted uppercase font-bold text-[10px] tracking-wider border-b border-line">
              <tr>
                {['Produk & Barcode', 'Kategori', 'Stok Saat Ini', 'Batas Minimum', 'Aksi Persediaan'].map(t => (
                  <th key={t} className="px-5 py-3.5">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-card/40 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-bold text-fg text-sm">{p.nama}</div>
                    <div className="text-[11px] text-muted font-mono mt-0.5">
                      {p.sku ? `SKU: ${p.sku}` : 'Tanpa Barcode'}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="px-2 py-0.5 rounded-md bg-card border border-line text-[10px] font-bold text-muted">
                      {p.kategori || 'Umum'}
                    </span>
                  </td>
                  <td className="px-5 py-4 tabular-nums">
                    {p.trackStock ? (
                      <span className={`font-black text-sm ${(p.stockQty ?? 0) <= (p.minimumStock ?? 0) ? 'text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-lg' : 'text-fg'}`}>
                        {p.stockQty ?? 0} <span className="text-[11px] font-normal text-muted">{p.stockUnit || 'pcs'}</span>
                      </span>
                    ) : (
                      <span className="text-muted italic">Belum dipantau</span>
                    )}
                  </td>
                  <td className="px-5 py-4 tabular-nums">
                    {p.trackStock ? `${p.minimumStock ?? 0} ${p.stockUnit || 'pcs'}` : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(p.trackStock ? (['in', 'out', 'count'] as const) : (['opening'] as const)).map(type => (
                        <button
                          key={type}
                          onClick={() => open(p, type)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 ${
                            type === 'in'
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : type === 'out'
                              ? 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-300'
                              : type === 'count'
                              ? 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-accent hover:bg-accent-hover text-white'
                          }`}
                        >
                          {type === 'in' ? '+ Barang Masuk' : type === 'out' ? '- Barang Keluar' : type === 'count' ? 'Opname Fisik' : 'Aktifkan Stok'}
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-muted">
                    {products.length ? 'Tidak ada produk yang cocok dengan pencarian.' : 'Tambahkan produk di katalog untuk mulai mengelola stok.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-card/20 border-t border-line text-[11px] text-muted leading-relaxed">
          Stok otomatis berkurang saat kasir mencetak pesanan atau menyimpan kasbon. Pembatalan (void) sebelum bayar mengembalikan stok ke rak. Untuk barang masuk dari supplier, isi harga beli (HPP) untuk otomatis mencatat pengeluaran di Buku Kas.
        </div>
      </div>

      {/* Movement History Table */}
      <section className="bg-surface border border-line rounded-3xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-line">
          <div>
            <h2 className="font-black text-base text-fg">Riwayat Mutasi Persediaan & Restok</h2>
            <p className="text-xs text-muted mt-0.5">100 catatan log pergerakan stok, pembelian supplier, dan opname terakhir</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-card/50 text-muted uppercase text-[10px] font-bold tracking-wider">
              <tr>
                {['Waktu', 'Produk', 'Aktivitas', 'Perubahan', 'Saldo Akhir', 'Pemasok (Supplier) & Biaya', 'Keterangan'].map(t => (
                  <th key={t} className="py-3 px-3">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {movements.map(m => (
                <tr key={m.id} className="hover:bg-card/30 transition-colors">
                  <td className="py-3 px-3 whitespace-nowrap text-muted font-mono text-[11px]">
                    {new Date(m.timestamp).toLocaleString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>
                  <td className="py-3 px-3 font-bold text-fg">{m.productName}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      m.type === 'in'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : m.type === 'out'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : m.type === 'sale'
                        ? 'bg-blue-50 text-blue-800 border-blue-200'
                        : m.type === 'count'
                        ? 'bg-purple-50 text-purple-800 border-purple-200'
                        : 'bg-card text-muted border-line'
                    }`}>
                      {labels[m.type] ?? m.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 tabular-nums font-black text-sm">
                    <span className={m.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}>
                      {m.delta > 0 ? `+${m.delta}` : m.delta}
                    </span>
                  </td>
                  <td className="py-3 px-3 tabular-nums font-bold text-fg">{m.balance}</td>
                  <td className="py-3 px-3">
                    {m.supplierName ? (
                      <div>
                        <span className="font-bold text-fg block">{m.supplierName}</span>
                        {m.purchasePrice ? (
                          <span className="text-[10px] text-muted block">
                            @Rp {m.purchasePrice.toLocaleString('id-ID')} {m.totalCost ? `(Total: Rp ${m.totalCost.toLocaleString('id-ID')})` : ''}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-muted">{m.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!movements.length && (
            <p className="py-12 text-center text-muted">Belum ada riwayat pergerakan stok tercatat.</p>
          )}
        </div>
      </section>

      {/* Stock Action Dialog Modal */}
      {selection && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <form
            onSubmit={save}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stock-dialog-title"
            className="bg-surface rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl border border-line"
          >
            <div className="pb-3 border-b border-line">
              <h2 id="stock-dialog-title" className="text-lg font-black text-fg">
                {labels[selection.type]}
              </h2>
              <p className="text-xs text-muted mt-0.5 font-bold">
                Produk: <span className="text-fg">{selection.product.nama}</span>
              </p>
            </div>

            {/* Jumlah Barang */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-fg">
                {selection.type === 'count'
                  ? 'Jumlah Fisik Terhitung di Rak'
                  : selection.type === 'opening'
                  ? 'Jumlah Stok Awal'
                  : 'Jumlah Barang / Unit'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  type="number"
                  min={selection.type === 'in' || selection.type === 'out' ? 1 : 0}
                  step="1"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0"
                  className="flex-1 bg-card border border-line rounded-xl px-3 py-2.5 text-base font-black text-fg outline-none focus:border-accent"
                />
                <span className="text-xs font-bold text-muted bg-card px-3 py-2.5 rounded-xl border border-line">
                  {selection.product.stockUnit || unit}
                </span>
              </div>
            </div>

            {/* Extra inputs for Barang Masuk (Supplier & HPP) */}
            {selection.type === 'in' && (
              <div className="space-y-3 pt-1 border-t border-line">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-fg">
                    Nama Pemasok / Supplier (Opsional):
                  </label>
                  <input
                    type="text"
                    value={supplierName}
                    onChange={e => setSupplierName(e.target.value)}
                    placeholder="Contoh: PT Sumber Pangan, Toko Grosir Jaya, Pasar Induk"
                    className="w-full bg-card border border-line rounded-xl px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-fg">
                    Harga Beli Satuan (HPP) (Rp):
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted">
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={purchasePrice}
                      onChange={e => setPurchasePrice(e.target.value)}
                      placeholder="0 (jika ada)"
                      className="w-full bg-card border border-line rounded-xl pl-9 pr-3 py-2 text-sm font-black text-fg outline-none focus:border-accent"
                    />
                  </div>
                  {Number(amount) > 0 && Number(purchasePrice) > 0 && (
                    <div className="p-2.5 rounded-xl bg-card border border-line flex items-center justify-between text-xs mt-1">
                      <span className="text-muted font-bold">Total Nilai Pembelian:</span>
                      <span className="font-black text-accent-text text-sm">
                        Rp {(Number(amount) * Number(purchasePrice)).toLocaleString('id-ID')}
                      </span>
                    </div>
                  )}
                </div>

                {Number(amount) > 0 && Number(purchasePrice) > 0 && (
                  <label className="flex items-start gap-2.5 text-xs text-fg p-2.5 bg-card/60 rounded-xl border border-line cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recordExpense}
                      onChange={e => setRecordExpense(e.target.checked)}
                      className="w-4 h-4 accent-accent mt-0.5 rounded"
                    />
                    <div>
                      <span className="font-bold block">Catat otomatis sebagai Kas Keluar Operasional</span>
                      <span className="text-[10px] text-muted">
                        Akan mengurangi kas laci dan tercatat di laporan pengeluaran biaya toko.
                      </span>
                    </div>
                  </label>
                )}
              </div>
            )}

            {/* Extra inputs for Saldo Awal */}
            {selection.type === 'opening' && (
              <div className="space-y-3 pt-1 border-t border-line">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-fg">
                    Peringatan Stok Minimum:
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={minimum}
                    onChange={e => setMinimum(e.target.value)}
                    className="w-full bg-card border border-line rounded-xl px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-fg">Satuan Barang:</label>
                  <input
                    required
                    maxLength={20}
                    value={unit}
                    onChange={e => setUnit(e.target.value)}
                    placeholder="pcs, botol, porsi, kg, pack"
                    className="w-full bg-card border border-line rounded-xl px-3 py-2 text-xs text-fg outline-none focus:border-accent"
                  />
                </div>
              </div>
            )}

            {/* Alasan / Catatan */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-fg">
                Alasan / Catatan Referensi:
              </label>
              <input
                required
                maxLength={240}
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Contoh: Pembelian supplier, rusak/kedaluwarsa, opname mingguan"
                className="w-full bg-card border border-line rounded-xl px-3 py-2 text-xs text-fg outline-none focus:border-accent"
              />
            </div>

            {selection.type === 'count' && (
              <p className="text-[11px] text-muted bg-card/60 p-2.5 rounded-xl border border-line">
                Hitung fisik barang terlebih dahulu secara cermat. Selisih dari hitungan fisik akan otomatis dicatat sebagai mutasi opname.
              </p>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-line">
              <button
                type="button"
                disabled={saving}
                onClick={() => setSelection(null)}
                className="px-4 py-2.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors"
              >
                Batal
              </button>
              <button
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-black shadow-md shadow-accent/20 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Mutasi Stok'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
