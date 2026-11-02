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

  return (
    <section className="min-h-0 flex-1 space-y-5 overflow-y-auto p-5 pb-28 md:pb-5 landscape:pb-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Shift Saya</h1>
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
      {attendance}
      {shift ? (
        <>
          <p className="text-sm">
            Operator: <strong>{shift.operatorName}</strong>
          </p>
          <p className="text-sm text-muted">
            Dibuka {new Date(shift.startTime).toLocaleString('id-ID')}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCash}
              className="px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm"
            >
              Kas Masuk / Keluar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 bg-rose-600 text-white rounded-xl font-bold text-sm"
            >
              Tutup Shift
            </button>
          </div>
          <p className="text-sm text-muted">
            Hitung uang fisik saat menutup shift. Target kas tidak ditampilkan sebelum penghitungan disimpan.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm text-muted">Belum ada shift berjalan pada perangkat ini.</p>
          <button
            type="button"
            onClick={onOpen}
            className="px-4 py-3 bg-accent text-white rounded-xl font-bold text-sm"
          >
            Buka Shift Saya
          </button>
        </>
      )}
    </section>
  );
}
