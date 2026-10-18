'use client';

export default function CashierShiftPanel({ shift, onOpen, onCash, onClose }: {
  shift: { operatorName: string; startTime: string } | null; onOpen: () => void; onCash: () => void; onClose: () => void;
}) {
  return <section className="p-5 space-y-5 overflow-y-auto"><h1 className="text-xl font-bold">Shift Saya</h1>
    {shift ? <><p className="text-sm">Operator: <strong>{shift.operatorName}</strong></p><p className="text-sm text-muted">Dibuka {new Date(shift.startTime).toLocaleString('id-ID')}</p>
      <div className="flex flex-wrap gap-3"><button type="button" onClick={onCash} className="px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm">Kas Masuk / Keluar</button><button type="button" onClick={onClose} className="px-4 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm">Tutup Shift</button></div>
      <p className="text-sm text-muted">Hitung uang fisik saat menutup shift. Target kas tidak ditampilkan sebelum penghitungan disimpan.</p>
    </> : <><p className="text-sm text-muted">Belum ada shift berjalan pada perangkat ini.</p><button type="button" onClick={onOpen} className="px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm">Buka Shift Saya</button></>}
  </section>;
}
