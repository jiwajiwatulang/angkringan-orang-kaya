'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type MenuItem } from '@/lib/dexie';
import { getMenus, getTables } from '@/lib/api';
import { checkCashierAccess, type CashierAccessStatus } from '@/lib/licenseGuard';
import { getWaiterSession } from '@/lib/waiterSession';
import { endWaiterSession, submitWaiterOrder, type WaiterLine } from '@/lib/waiter';

export default function WaiterFloorPage() {
  const session = useLiveQuery(getWaiterSession);
  const data = useLiveQuery(async () => ({ menus: await getMenus(), tables: await getTables() }));
  const [access, setAccess] = useState<CashierAccessStatus | null>(null);
  const [tableId, setTableId] = useState(0);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<WaiterLine[]>([]);
  const [product, setProduct] = useState<MenuItem | null>(null);
  const [choices, setChoices] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [pin, setPin] = useState('');
  const requestId = useRef<string | null>(null);
  const cartAnchor = useRef<HTMLElement | null>(null);
  const submitting = useRef(false);
  const orders = useLiveQuery(async () => {
    if (!session?.tableIds.includes(tableId)) return [];
    const orders = await db.table('orders').where('tableId').equals(tableId).filter(o => o.status === 'unpaid').toArray();
    return Promise.all(orders.map(async o => ({ id: o.id, notes: o.notes, items: await db.table('orderItems').where('orderId').equals(o.id).toArray() })));
  }, [tableId, session]);
  useEffect(() => {
    const wantsDemo = window.location.search.includes('demo=true') || sessionStorage.getItem('sakunota_demo_mode') === 'true';
    if (wantsDemo !== (db.name === 'SakuNotaDemoDB')) { window.location.reload(); return; }
    const check = () => { checkCashierAccess().then(setAccess); };
    check(); const timer = window.setInterval(check, 60000);
    window.addEventListener('focus', check);
    return () => { clearInterval(timer); window.removeEventListener('focus', check); };
  }, []);
  useEffect(() => {
    if (session && !session.tableIds.includes(tableId)) setTableId(session.tableIds[0] || 0);
  }, [session, tableId]);
  async function send() {
    if (submitting.current) return;
    submitting.current = true; setBusy(true); setMessage('');
    try {
      const currentAccess = await checkCashierAccess(); setAccess(currentAccess);
      if (!currentAccess.isValid) throw new Error('Lisensi tidak aktif. Minta bantuan pemilik toko.');
      requestId.current ||= crypto.randomUUID();
      const result = await submitWaiterOrder(tableId, cart, notes, requestId.current);
      setMessage(`Pesanan #${result.id} sudah dikirim ke kasir.`); setCart([]); setNotes(''); requestId.current = null;
    } catch (e) { setMessage(e instanceof Error ? e.message : 'Gagal mengirim. Coba lagi.'); }
    finally { submitting.current = false; setBusy(false); }
  }
  async function exit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setMessage('');
    try { if (!(await endWaiterSession(pin))) throw new Error('PIN Admin salah.'); window.location.assign('/pos'); }
    catch (e) { setMessage(e instanceof Error ? e.message : 'Gagal keluar.'); setBusy(false); }
  }
  function addProduct() {
    if (!product || !Number.isInteger(qty) || qty < 1 || qty > 999) { setMessage('Jumlah tidak valid.'); return; }
    for (const group of product.modifiers || []) {
      const count = (choices[group.id] || []).length;
      if (count < Math.max(group.required ? 1 : 0, group.minSelect || 0) || count > group.maxSelect) { setMessage(`Lengkapi ${group.nama}.`); return; }
    }
    setCart(lines => [...lines, { menuItemId: product.id!, qty, choices }]); requestId.current = null; setProduct(null); setMessage('');
    requestAnimationFrame(() => cartAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
  if (session === undefined || !data || !access) return <p className="p-6" role="status">Menyiapkan Waiter Floor…</p>;
  if (!session) return <main className="mx-auto max-w-xl space-y-4 p-6"><h1 className="text-2xl font-bold">Waiter Floor</h1><p>Buka mode pelayan melalui Admin → Pengaturan POS → Waiter Floor.</p><a href="/admin/pelayan" className="text-blue-700 underline">Buka pengaturan pelayan</a></main>;
  const menuById = new Map<number, MenuItem>(data.menus.map((m: MenuItem) => [m.id!, m]));
  return <main className="mx-auto max-w-6xl space-y-5 p-4 pb-12 text-slate-900">
    <header className="flex items-center justify-between border-b border-line pb-4"><div><h1 className="text-xl font-bold">Waiter Floor</h1><p className="text-sm text-muted">{session.name}</p></div><button onClick={() => { setExitOpen(true); setMessage(''); }} className="rounded-xl border border-line bg-white px-3 py-2 text-sm font-semibold">Keluar Mode Pelayan</button></header>
    {!access.isValid && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">Lisensi tidak aktif. Hubungi pemilik toko.</p>}
    {message && <p role="status" className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4"><h2 className="font-bold">Meja tugas</h2><div className="flex flex-wrap gap-2">{data.tables.filter(t => session.tableIds.includes(t.id!)).map(t => <button key={t.id} aria-pressed={tableId === t.id} disabled={busy || cart.length > 0} onClick={() => { setTableId(t.id!); setMessage(''); requestId.current = null; }} className={`rounded-xl border px-4 py-3 text-sm disabled:opacity-50 ${tableId === t.id ? 'border-blue-600 bg-blue-600 text-white' : 'border-line bg-white'}`}>{t.nomor}<span className="ml-2 text-xs">{t.status === 'open' ? 'Terisi' : t.status === 'lunas' ? 'Menunggu dirapikan' : 'Kosong'}</span></button>)}</div>
        <h2 className="font-bold">Pesanan aktif</h2>{orders?.length ? orders.map(o => <div key={o.id} className="rounded-xl border border-line bg-white p-3 text-sm"><strong>Pesanan #{o.id}</strong>{o.items.map(i => <p key={i.id}>{i.qty} × {i.namaMenu}{i.selectedModifiers?.length ? ` — ${i.selectedModifiers.map((m: { optionName: string }) => m.optionName).join(', ')}` : ''}</p>)}{o.notes && <p className="mt-1 text-muted">{o.notes}</p>}</div>) : <p className="text-sm text-muted">Belum ada pesanan aktif di meja ini.</p>}
        <label className="block text-sm font-semibold">Cari menu<input value={search} onChange={e => setSearch(e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-white p-3" /></label>
        <div className="grid max-h-[45vh] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3">{data.menus.filter(m => m.nama.toLowerCase().includes(search.toLowerCase())).map(m => <button key={m.id} disabled={busy || !access.isValid || m.isSoldOut || (m.trackStock && !m.stockQty)} onClick={() => { setProduct(m); setQty(1); setChoices({}); setMessage(''); }} className="rounded-xl border border-line bg-white p-3 text-left text-sm disabled:opacity-40"><strong className="block">{m.nama}</strong><span className="text-muted">{m.isSoldOut ? 'Habis' : `Rp${m.harga.toLocaleString('id-ID')}`}</span></button>)}</div>
      </section>
      <section ref={cartAnchor} className="h-fit scroll-mt-4 space-y-3 rounded-2xl border border-line bg-white p-4"><h2 className="font-bold">Pesanan baru — {data.tables.find(t => t.id === tableId)?.nomor}</h2>{cart.map((line, index) => <div key={index} className="flex justify-between gap-3 text-sm"><div>{line.qty} × {menuById.get(line.menuItemId)?.nama}<p className="text-xs text-muted">{Object.values(line.choices).flat().map(id => menuById.get(line.menuItemId)?.modifiers?.flatMap(g => g.options).find(o => o.id === id)?.nama).filter(Boolean).join(', ')}</p></div><button disabled={busy} onClick={() => { setCart(lines => lines.filter((_, i) => i !== index)); requestId.current = null; }} className="text-red-700">Hapus</button></div>)}{!cart.length && <p className="text-sm text-muted">Pilih menu untuk meja ini.</p>}
        <label className="block text-sm">Catatan meja<textarea maxLength={500} disabled={busy} value={notes} onChange={e => { setNotes(e.target.value); requestId.current = null; }} className="mt-2 w-full rounded-xl border border-line p-3" /></label><button onClick={send} disabled={busy || !access.isValid || !cart.length || !tableId} className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Mengirim…' : 'Kirim Pesanan ke Kasir'}</button>
      </section>
    </div>
    {product && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><section role="dialog" aria-modal="true" aria-label="Pilihan menu" className="max-h-[85vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl bg-white p-5"><h2 className="font-bold">{product.nama}</h2>{product.modifiers?.map(group => <fieldset key={group.id}><legend className="mb-2 text-sm font-semibold">{group.nama}{group.required ? ' (wajib)' : ''}</legend>{group.options.map(option => <label key={option.id} className="mb-2 flex gap-2 text-sm"><input type={group.maxSelect === 1 ? 'radio' : 'checkbox'} name={group.id} checked={(choices[group.id] || []).includes(option.id)} onChange={e => setChoices(old => ({ ...old, [group.id]: group.maxSelect === 1 ? [option.id] : e.target.checked ? [...(old[group.id] || []), option.id] : (old[group.id] || []).filter(id => id !== option.id) }))} />{option.nama}{option.harga ? ` (+Rp${option.harga.toLocaleString('id-ID')})` : ''}</label>)}</fieldset>)}<label className="block text-sm">Jumlah<input type="number" min={1} max={999} value={qty} onChange={e => setQty(Number(e.target.value))} className="ml-3 w-20 rounded-lg border border-line p-2" /></label>{message && <p role="alert" className="text-sm text-red-700">{message}</p>}<div className="flex gap-2"><button onClick={() => setProduct(null)} className="rounded-xl border border-line px-4 py-3 text-sm">Batal</button><button onClick={addProduct} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Tambahkan</button></div></section></div>}
    {exitOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"><form onSubmit={exit} role="dialog" aria-modal="true" aria-label="Keluar Mode Pelayan" className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-5"><h2 className="font-bold">Kembali ke kasir</h2><label className="block text-sm">PIN Admin<input autoFocus type="password" inputMode="numeric" autoComplete="off" value={pin} onChange={e => setPin(e.target.value)} className="mt-2 w-full rounded-xl border border-line p-3" /></label>{message && <p role="alert" className="text-sm text-red-700">{message}</p>}<div className="flex gap-2"><button type="button" onClick={() => { setExitOpen(false); setPin(''); }} className="rounded-xl border border-line px-4 py-3 text-sm">Batal</button><button disabled={busy} className="rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white">Buka Kasir</button></div></form></div>}
  </main>;
}
