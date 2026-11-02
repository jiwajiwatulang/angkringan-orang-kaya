'use client';
import type { ReactNode } from 'react';
import { getPosScope } from '@/lib/multidevice/posWire';

export default function CashierShiftPanel({
  shift,
  onOpen,
  onCash,
  onClose,
  attendance,
}: {
  shift: { operatorName: string; startTime: string } | null;
  onOpen: () => void;
  onCash: () => void;
  onClose: () => void;
  attendance?: ReactNode;
}) {
  const scope = getPosScope();
  const isEmployee = Boolean(scope?.claims?.employeeId || scope?.claims?.role === 'cashier');
  const isDifferentOperator = Boolean(shift && scope?.operatorName && shift.operatorName !== scope.operatorName);

  return (
    <section className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 pb-28 md:pb-6 landscape:pb-6 max-w-2xl">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-1 border-b border-line">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-fg">Shift Saya</h1>
          <p className="text-xs text-muted">Kelola jam kerja staf dan status uang kasir</p>
        </div>
        {isEmployee && (
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('sakunota:change-employee'))}
            className="px-3 py-1.5 rounded-xl border border-line bg-surface hover:bg-card text-xs font-semibold text-fg transition-all active:scale-95 flex items-center gap-1.5 shadow-2xs"
          >
            <svg className="w-3.5 h-3.5 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Ganti Karyawan
          </button>
        )}
      </div>

      {/* Kehadiran & Foto Bukti Card */}
      {attendance}

      {/* Shift Laci Kasir Card */}
      <section aria-label="Shift Laci Kasir" className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-fg">Shift Laci Kasir</h2>
            <p className="text-xs text-muted mt-0.5">Pertanggungjawaban uang fisik dalam laci kasir</p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-xs font-bold ${
              shift ? 'bg-emerald-600/15 text-emerald-700' : 'bg-muted/15 text-muted'
            }`}
          >
            {shift ? 'Shift Aktif' : 'Laci Belum Dibuka'}
          </span>
        </div>

        {shift ? (
          <div className="space-y-3">
            <div className="rounded-xl border border-line bg-card/60 p-3 space-y-1.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted">Operator Penanggung Jawab:</span>
                <span className="font-bold text-fg">{shift.operatorName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted">Waktu Buka Shift:</span>
                <span className="font-semibold text-fg">
                  {new Date(shift.startTime).toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {isDifferentOperator && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 space-y-1">
                <p className="font-bold">Perhatian: Operator Laci Berbeda</p>
                <p className="text-amber-800">
                  Laci kas ini dibuka oleh <strong>{shift.operatorName}</strong>, sedangkan Anda saat ini login sebagai <strong>{scope?.operatorName}</strong>.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={onCash}
                className="min-h-11 rounded-xl bg-accent hover:opacity-90 text-white font-bold text-xs px-3 py-2.5 transition-all active:scale-[0.99] shadow-sm flex items-center justify-center text-center"
              >
                Kas Masuk / Keluar
              </button>
              <button
                type="button"
                onClick={onClose}
                className="min-h-11 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3 py-2.5 transition-all active:scale-[0.99] shadow-sm flex items-center justify-center text-center"
              >
                Tutup Shift
              </button>
            </div>

            <p className="text-[11px] text-muted leading-relaxed">
              Hitung uang fisik saat menutup shift. Target kas tidak ditampilkan sebelum penghitungan disimpan.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted leading-relaxed">
              Belum ada shift berjalan pada perangkat ini. Buka shift kasir untuk mencatat uang modal awal dan mulai melayani transaksi.
            </p>
            <button
              type="button"
              onClick={onOpen}
              className="w-full min-h-11 rounded-xl bg-accent hover:opacity-90 text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all active:scale-[0.99]"
            >
              Buka Shift Saya
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
