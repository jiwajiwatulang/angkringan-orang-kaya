"use client";
import React,{useEffect,useState} from 'react';
import Link from 'next/link';
import {findSavedStores,reopenSavedStore,type SavedStore} from '@/lib/savedStoreRecovery';
import LoadingState,{BusyLabel} from '@/components/LoadingState';
import {SUPPORT_WHATSAPP} from '@/lib/config';

export default function RecoverCashierPage(){
  const [stores,setStores]=useState<SavedStore[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[role,setRole]=useState<'owner'|'cashier'>('owner');
  const refresh=async()=>{setLoading(true);setError('');try{setStores(await findSavedStores());}catch{setError('Data tersimpan belum dapat diperiksa. Coba lagi.');}finally{setLoading(false);}};
  useEffect(()=>{void refresh();},[]);
  return <main className="min-h-dvh bg-app px-4 py-8 text-fg"><div className="mx-auto max-w-xl space-y-5">
    <Link href="/pos" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-600">Kembali ke Kasir</Link>
    <header><h1 className="text-2xl font-bold">Bawa Data Lama</h1><p className="mt-2 text-sm text-muted">Sudah memakai SakuNota di browser? Mulai dari toko yang tersimpan.</p></header>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading?<LoadingState label="Memeriksa toko tersimpan"/>:<section className="space-y-3 rounded-2xl border border-line bg-surface p-5"><h2 className="font-bold">Toko di Aplikasi Ini</h2>
      {stores.length?stores.map(store=><div key={store.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3"><div><h3 className="font-semibold">{store.storeName}</h3><p className="mt-1 text-sm text-muted">{store.storeId?'Kasir terhubung':'Data browser'}</p><p className="mt-1 text-sm text-muted">{store.products} produk · {store.receipts} nota</p></div><button disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white disabled:opacity-50" onClick={()=>{setBusy(true);setError('');void reopenSavedStore(store.name).then(()=>{sessionStorage.removeItem('sakunota_demo_mode');location.assign('/pos');}).catch(e=>{setError(e instanceof Error?e.message:'Toko belum dapat dibuka.');setBusy(false);});}}>{busy?<BusyLabel>Membuka</BusyLabel>:'Buka Toko'}</button></div>):<p className="text-sm text-muted">Belum ada toko yang dapat dibuka di aplikasi ini. Data browser lama tetap berada di browser asal.</p>}
      <button disabled={busy} onClick={()=>void refresh()} className="min-h-11 rounded-xl border border-line px-4 text-sm font-semibold">Periksa Lagi</button>
    </section>}
    <section className="space-y-4 rounded-2xl border border-line bg-surface p-5"><h2 className="font-bold">Data Belum Muncul?</h2>
      <div className="flex gap-2" role="group" aria-label="Peran Anda">{(['owner','cashier'] as const).map(value=><button key={value} type="button" aria-pressed={role===value} onClick={()=>setRole(value)} className={`min-h-11 flex-1 rounded-xl border px-4 text-sm font-semibold ${role===value?'border-blue-600 bg-blue-600 text-white':'border-line'}`}>{value==='owner'?'Pemilik':'Karyawan'}</button>)}</div>
      {role==='owner'?<><ol className="list-decimal space-y-3 pl-5 text-sm"><li>Buka browser dan alamat situs yang sebelumnya dipakai. Periksa apakah menu dan nota masih ada.</li><li>Di Pengaturan POS → Data &amp; Cadangan, simpan cadangan lengkap. Untuk dua perangkat, selesaikan pengiriman data lebih dahulu.</li><li>Login di aplikasi terpasang. Setelah lisensi aktif, buka Data &amp; Cadangan untuk memulihkan file tadi.</li></ol><p className="text-sm text-muted">Lisensi masih terikat ke browser lama? Minta bantuan pemindahan lisensi. Jangan hapus data browser asal.</p><div className="flex flex-wrap gap-3"><Link href="/pos" className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">Login</Link><a href={`https://wa.me/${SUPPORT_WHATSAPP}`} className="inline-flex min-h-11 items-center rounded-xl border border-line px-4 text-sm font-semibold">Bantuan Lisensi</a></div></>:<><ol className="list-decimal space-y-3 pl-5 text-sm"><li>Minta Pemilik membuka Perangkat &amp; Karyawan.</li><li>Jika aplikasi terpasang dianggap perangkat baru, selesaikan pengiriman dari browser lama sebelum Pemilik melepas perangkat lama.</li><li>Hubungkan aplikasi ini menggunakan tautan dari Pemilik, lalu masuk dengan nama dan PIN karyawan.</li></ol><Link href="/hubungkan-perangkat" className="inline-flex min-h-11 items-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white">Hubungkan Kasir</Link></>}
    </section>
    <p className="text-sm text-muted">Gunakan browser, profil, dan alamat situs yang sama. Di iPhone/iPad, data Safari tidak otomatis ikut ke aplikasi layar utama.</p>
    <Link href="/panduan" className="inline-flex min-h-11 items-center text-sm font-semibold text-blue-600">Buka Panduan</Link>
  </div></main>;
}
