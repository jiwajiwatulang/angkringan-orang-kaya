'use client';
import React, { useState } from 'react';
import type { employeeAttendance } from '@/lib/operations';
import LoadingState, { BusyLabel } from '@/components/LoadingState';

type Session = ReturnType<typeof employeeAttendance>['latest'];
const time = (value: string) =>
  new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

export default function AttendanceCard({
  name,
  active,
  latest,
  loading,
  busy,
  error,
  onAction,
}: {
  name: string;
  active?: Session;
  latest?: Session;
  loading: boolean;
  busy: boolean;
  error: string;
  onAction: () => void;
}) {
  const [confirmingCheckout, setConfirmingCheckout] = useState(false);

  return (
    <section aria-label="Kehadiran Saya" className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-fg">Kehadiran Saya</h2>
          <p className="text-xs text-muted mt-0.5">{name}</p>
        </div>
        <span
          className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            active
              ? 'bg-blue-600/15 text-blue-700'
              : latest?.end
              ? 'bg-emerald-600/15 text-emerald-700'
              : 'bg-muted/15 text-muted'
          }`}
        >
          {active ? 'Sedang Bekerja' : latest?.end ? 'Sudah Pulang' : 'Belum Absen'}
        </span>
      </div>

      {loading ? (
        <LoadingState compact label="Menyiapkan kehadiran" />
      ) : (
        <div className="space-y-3">
          {active ? (
            <div className="rounded-xl border border-line bg-card/60 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Status:</span>
                <span className="font-semibold text-blue-700">Sedang Bekerja</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Waktu Masuk:</span>
                <span className="font-semibold text-fg">Masuk {time(active.start)}</span>
              </div>
            </div>
          ) : latest?.end ? (
            <div className="rounded-xl border border-line bg-card/60 p-3 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted">Status:</span>
                <span className="font-semibold text-emerald-700">Sudah Pulang</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Waktu Pulang:</span>
                <span className="font-semibold text-fg">Terakhir pulang {time(latest.end)}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Belum ada catatan jam kerja untuk sesi ini.</p>
          )}

          {active ? (
            confirmingCheckout ? (
              <div className="rounded-xl border border-rose-300 bg-rose-50/70 p-3 space-y-2">
                <p className="text-xs font-bold text-rose-900">
                  Konfirmasi: Selesaikan jam kerja dan ambil foto pulang sekarang?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setConfirmingCheckout(false)}
                    className="min-h-10 rounded-xl border border-line bg-surface text-xs font-semibold text-fg hover:bg-card"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setConfirmingCheckout(false);
                      onAction();
                    }}
                    className="min-h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white disabled:opacity-50"
                  >
                    {busy ? <BusyLabel>Menyimpan</BusyLabel> : 'Ya, Absen Pulang'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmingCheckout(true)}
                className="w-full min-h-11 rounded-xl border border-rose-400/50 bg-rose-50 text-rose-700 hover:bg-rose-100 px-4 py-2.5 text-xs font-bold disabled:opacity-50 transition-all active:scale-[0.99]"
              >
                {busy ? <BusyLabel>Menyimpan</BusyLabel> : 'Absen Pulang'}
              </button>
            )
          ) : (
            <button
              type="button"
              disabled={busy}
              onClick={onAction}
              className="w-full min-h-11 rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50 shadow-sm transition-all active:scale-[0.99]"
            >
              {busy ? <BusyLabel>Menyimpan</BusyLabel> : 'Absen Masuk'}
            </button>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-700 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
          {error}
        </p>
      )}
    </section>
  );
}
