'use client';

import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';
import type { StoreSettings } from '@/lib/settings';
import { executePrintDocument, generateEscPosReceipt, generateReceiptHtml, generateTestReceiptData } from '@/lib/receipt';

export default function CashierPrinter({ settings }: { settings: StoreSettings }) {
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const [devices, setDevices] = useState<{ name?: string; address: string }[]>([]);
  async function scan() {
    setBusy(true); setMessage('Mencari printer yang sudah dipasangkan…');
    try { const result = await BluetoothSerial.getPairedDevices(); setDevices(result.devices || []); setMessage('Pilih printer. Bila belum ada, pasangkan melalui Bluetooth HP terlebih dahulu.'); }
    catch { setMessage('Bluetooth belum siap. Periksa Bluetooth dan izin aplikasi di HP.'); }
    finally { setBusy(false); }
  }
  async function print() {
    setBusy(true); setMessage('Menyiapkan uji cetak…');
    try { const data = generateTestReceiptData(settings); const result = await executePrintDocument({ title: 'Uji Printer SakuNota', escposText: generateEscPosReceipt(data, 'all', settings), htmlContent: generateReceiptHtml(data, 'all', settings), settings }); setMessage(result.success ? 'Dokumen uji sudah dikirim. Periksa hasil pada printer.' : 'Dokumen belum terkirim. Periksa printer.'); }
    catch { setMessage('Uji cetak belum berhasil. Periksa printer dan sambungan.'); }
    finally { setBusy(false); }
  }
  return <><button type="button" onClick={() => setOpen(true)} className="px-3 py-2 text-xs font-bold border border-line rounded-xl bg-card text-fg hover:bg-line/80 hover:border-accent/40 cursor-pointer transition-all duration-150 active:scale-95 shadow-xs">Printer</button>
    {open && <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="cashier-printer-title"><section className="bg-card text-fg rounded-2xl p-5 max-w-md w-full space-y-4">
      <div className="flex justify-between items-center"><h2 id="cashier-printer-title" className="text-lg font-bold">Printer Kasir</h2><button type="button" onClick={() => setOpen(false)} className="p-2 border border-line rounded-lg">Tutup</button></div>
      <p className="text-sm text-muted">{Capacitor.isNativePlatform() ? 'Pilih printer Bluetooth yang sudah dipasangkan ke HP ini.' : 'Gunakan printer yang tersedia melalui dialog cetak browser atau sistem.'}</p>
      {Capacitor.isNativePlatform() && <button type="button" disabled={busy} onClick={scan} className="px-3 py-2 border border-line rounded-xl text-sm">Cari Printer Bluetooth</button>}
      {devices.map(device => <button key={device.address} type="button" disabled={busy} className="block w-full text-left p-3 border border-line rounded-xl" onClick={() => { localStorage.setItem('bt_printer_mac', device.address); localStorage.setItem('bt_printer_name', device.name || 'Printer Thermal'); setMessage('Printer dipilih. Jalankan uji cetak untuk memastikan sambungan.'); }}>{device.name || device.address}</button>)}
      <button type="button" disabled={busy} onClick={print} className="px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm">Uji Cetak</button><p className="text-sm text-muted" role="status">{message}</p>
    </section></div>}
  </>;
}
