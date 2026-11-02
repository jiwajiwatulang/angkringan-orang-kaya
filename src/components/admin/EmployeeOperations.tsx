'use client';
import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type AttendancePhotoRecord } from '@/lib/dexie';
import { getActiveShift } from '@/lib/api';
import { operationEmployees, saveOperation } from '@/lib/operationsApi';
import { attendanceSummary, loanBalance, commissionBalance, type OperationKind, type OperationRecord } from '@/lib/operations';
import { cashierReport } from '@/lib/storeReports';
import { getAttendancePhoto, getOrCreateOwnerE2eeKeyPair, pullAndPersistAttendancePhoto } from '@/lib/attendancePhoto';
import { exportPublicKeyJwk } from '@/lib/crypto/e2eePhoto';
import { currentPosRuntime } from '@/lib/multidevice/posRuntime';
import { getPosScope } from '@/lib/multidevice/posWire';
import { Card, Stat, Tabs, field, primary, secondary, money, date } from '@/components/operations/Shared';
import OwnerAccessSettings from '@/components/OwnerAccessSettings';
import LoadingState, { BusyLabel } from '@/components/LoadingState';

export default function EmployeeOperations() {
  const [tab, setTab] = useState('access');
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [employee, setEmployee] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [source, setSource] = useState<'laci' | 'rekening'>('laci');
  const [kind, setKind] = useState<OperationKind>('loan');
  const [lineId, setLineId] = useState('');
  const [rate, setRate] = useState('10');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const scope = getPosScope();

  // Auto-register Owner E2EE public key with R2 relay when Owner is active
  useEffect(() => {
    const runtime = currentPosRuntime();
    if (runtime?.client && scope?.claims.role === 'owner' && typeof navigator !== 'undefined' && navigator.onLine) {
      void getOrCreateOwnerE2eeKeyPair(scope.claims.storeId)
        .then(async pair => {
          let pubJwk: JsonWebKey | undefined;
          try {
            pubJwk = await exportPublicKeyJwk(pair.publicKey);
          } catch {
            const savedPubStr = typeof localStorage !== 'undefined' ? localStorage.getItem(`sakunota_e2ee_pub_${scope.claims.storeId}`) : null;
            if (savedPubStr) pubJwk = JSON.parse(savedPubStr);
          }
          if (pubJwk) {
            await runtime.client.call('photo.relay.owner_key.set', { publicKeyJwk: pubJwk }).catch(() => {});
          }
        })
        .catch(() => {});
    }
  }, [scope]);

  // Attendance Photo viewer modal state
  const [viewingPhoto, setViewingPhoto] = useState<{ id?: string; label: string; name: string; at: string; employeeId?: string; operationId?: string } | null>(null);
  const [requestingReupload, setRequestingReupload] = useState(false);
  const [reuploadSent, setReuploadSent] = useState(false);
  const [photoRecord, setPhotoRecord] = useState<AttendancePhotoRecord | null | undefined>(undefined);
  const [loadingPhoto, setLoadingPhoto] = useState(false);
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string>('');

  useEffect(() => {
    if (!photoRecord?.blob) {
      setPhotoObjectUrl('');
      return;
    }
    if (typeof photoRecord.blob === 'string') {
      setPhotoObjectUrl(photoRecord.blob);
      return;
    }
    const url = URL.createObjectURL(photoRecord.blob);
    setPhotoObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [photoRecord]);

  useEffect(() => {
    setReuploadSent(false);
    setRequestingReupload(false);
    if (!viewingPhoto?.id) {
      setPhotoRecord(undefined);
      return;
    }
    setLoadingPhoto(true);
    void getAttendancePhoto(viewingPhoto.id)
      .then(async res => {
        if (res?.blob) {
          setPhotoRecord(res);
          return;
        }
        const runtime = currentPosRuntime();
        if (runtime?.client && viewingPhoto.id && scope?.claims.role === 'owner') {
          try {
            const { privateKey } = await getOrCreateOwnerE2eeKeyPair(scope.claims.storeId);
            const pulled = await pullAndPersistAttendancePhoto(runtime.client, viewingPhoto.id, privateKey, db);
            if (pulled) {
              setPhotoRecord(pulled);
              return;
            }
          } catch {}
        }
        setPhotoRecord(res || null);
      })
      .catch(() => setPhotoRecord(null))
      .finally(() => setLoadingPhoto(false));
  }, [viewingPhoto, scope]);

  const data = useLiveQuery(async () => {
    const [records, orders, payments, items, shifts, audits] = await Promise.all(
      ['operations', 'orders', 'payments', 'orderItems', 'shifts', 'auditLogs'].map(t => db.table(t).toArray())
    );
    return {
      records: records as OperationRecord[],
      orders: orders.map(o => ({ ...o, payments: payments.filter(p => p.orderId === o.id) })),
      items,
      shifts,
      audits,
    };
  }, []);

  const reloadEmployees = async () => {
    try {
      const rows = await operationEmployees();
      setEmployees(rows);
      setError('');
    } catch {
      setError('Daftar karyawan belum tersedia. Coba lagi.');
    }
  };

  useEffect(() => {
    if (tab !== 'access') void reloadEmployees();
  }, [tab]);

  const person = employees.find(e => e.id === employee);
  const perform = async (work: () => Promise<unknown>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await work();
      setAmount('');
      setNote('');
      setMessage('Catatan tersimpan');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Catatan belum tersimpan');
    } finally {
      setBusy(false);
    }
  };

  const base = () => {
    if (!person) throw new Error('Pilih karyawan');
    return { employeeId: person.id, employeeName: person.name, note };
  };

  const submitMoney = (event: React.FormEvent) => {
    event.preventDefault();
    void perform(async () => {
      const shift = await getActiveShift();
      await saveOperation({
        ...base(),
        kind,
        amount: Number(amount),
        source,
        shiftId: source === 'laci' ? shift?.id : undefined,
      });
    });
  };

  const sessions = data ? attendanceSummary(data.records) : [];
  const active = sessions.find(s => s.employeeId === employee && !s.end);
  const services =
    data?.items.filter(
      item =>
        data.orders.some(o => o.id === item.orderId && o.status === 'paid' && !o.isRefunded) &&
        !data.records.some(r => r.kind === 'commission' && r.orderItemId === item.id)
    ) || [];

  return (
    <div className="space-y-5 sm:space-y-6">
      <Tabs
        value={tab}
        onChange={id => {
          setTab(id);
          setError('');
          setMessage('');
          setKind(id === 'commission' ? 'commission.paid' : 'loan');
        }}
        items={[
          { id: 'access', label: 'Nama & PIN' },
          { id: 'attendance', label: 'Absensi' },
          { id: 'loans', label: 'Kasbon Karyawan' },
          { id: 'commission', label: 'Komisi' },
          { id: 'report', label: 'Rapor Kasir' },
        ]}
      />

      {/* Photo Viewer Modal */}
      {viewingPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-photo-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
        >
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-line bg-surface p-4 text-fg shadow-2xl">
            <div className="flex items-center justify-between border-b border-line pb-2">
              <div>
                <h3 id="view-photo-title" className="text-sm font-bold">
                  {viewingPhoto.label}
                </h3>
                <p className="text-xs text-muted">
                  {viewingPhoto.name} {viewingPhoto.at ? `· ${date(viewingPhoto.at)}` : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingPhoto(null)}
                aria-label="Tutup Pratinjau Foto"
                className="min-h-9 min-w-9 rounded-lg text-xl font-bold text-muted hover:text-fg"
              >
                &times;
              </button>
            </div>

            <div className="flex min-h-48 items-center justify-center">
              {loadingPhoto ? (
                <LoadingState compact label="Membuka foto..." />
              ) : photoRecord?.blob ? (
                <div className="space-y-2 w-full">
                  <div className="overflow-hidden rounded-xl border border-line bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photoObjectUrl}
                      alt={`Foto absensi ${viewingPhoto.name}`}
                      className="max-h-[55dvh] w-full object-contain"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted">
                    <span>Status: Tersimpan Lokal</span>
                    {photoRecord.checksum && (
                      <span title={photoRecord.checksum} className="font-mono">
                        Hash: {photoRecord.checksum.slice(0, 10)}...
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-center text-xs text-amber-900 space-y-3 w-full">
                  <p className="font-semibold">Foto Belum Tersedia di HP Pemilik</p>
                  <p className="text-muted">
                    Foto asli masih tersimpan aman di HP karyawan atau buffer transit R2 (24 jam) telah kedaluwarsa.
                  </p>
                  {scope?.claims.role === 'owner' && (
                    <button
                      type="button"
                      disabled={requestingReupload || reuploadSent}
                      onClick={async () => {
                        if (!viewingPhoto?.id || !scope?.claims.storeId) return;
                        const runtime = currentPosRuntime();
                        if (!runtime?.client) return;
                        setRequestingReupload(true);
                        try {
                          const { publicKey } = await getOrCreateOwnerE2eeKeyPair(scope.claims.storeId);
                          let pubJwk: JsonWebKey | undefined;
                          try {
                            pubJwk = await exportPublicKeyJwk(publicKey);
                          } catch {
                            const savedPubStr = typeof localStorage !== 'undefined' ? localStorage.getItem(`sakunota_e2ee_pub_${scope.claims.storeId}`) : null;
                            if (savedPubStr) pubJwk = JSON.parse(savedPubStr);
                          }
                          if (!pubJwk) throw new Error('Kunci publik pemilik belum tersedia.');
                          await runtime.client.call('photo.relay.reupload', {
                            photoId: viewingPhoto.id,
                            employeeId: viewingPhoto.employeeId,
                            operationId: viewingPhoto.operationId || viewingPhoto.id,
                            reason: 'Pemilik meminta pengiriman ulang bukti foto absensi',
                            ownerPublicKeyJwk: pubJwk,
                          });
                          setReuploadSent(true);
                        } catch (err: any) {
                          alert(err?.message || 'Gagal meminta unggah ulang foto.');
                        } finally {
                          setRequestingReupload(false);
                        }
                      }}
                      className="min-h-10 w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-fg hover:opacity-90 disabled:opacity-50"
                    >
                      {requestingReupload
                        ? 'Mengirim permintaan...'
                        : reuploadSent
                        ? 'Permintaan Kirim Ulang Terkirim'
                        : 'Minta Kirim Ulang Foto'}
                    </button>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setViewingPhoto(null)}
              className="min-h-11 w-full rounded-xl border border-line px-4 py-2 text-xs font-semibold text-fg"
            >
              Tutup
            </button>
          </div>
        </div>
      )}

      {tab === 'access' ? (
        <OwnerAccessSettings view="employees" />
      ) : (
        <>
          {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
          {message && <p role="status" className="text-sm text-blue-700">{message}</p>}
          {!data ? (
            <LoadingState label="Menyiapkan catatan karyawan" />
          ) : (
            <>
              {tab !== 'report' && (
                <Card title="Karyawan">
                  <label className="block text-sm font-medium">
                    Nama
                    <select className={field} value={employee} onChange={e => setEmployee(e.target.value)}>
                      <option value="">Pilih Nama</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>
                          {e.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  {!employees.length && (
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="text-sm text-muted">
                        Belum ada nama karyawan. Pilih Nama &amp; PIN untuk menambahkan.
                      </p>
                      <button className={secondary} onClick={() => setTab('access')}>
                        Tambah Karyawan
                      </button>
                      <button className={secondary} onClick={() => void reloadEmployees()}>
                        Perbarui Daftar
                      </button>
                    </div>
                  )}
                </Card>
              )}

              {tab === 'attendance' && (
                <>
                  <Card title={active ? 'Sedang Bekerja' : 'Catat Kehadiran'}>
                    {active && <p className="text-sm text-muted">Masuk {date(active.start)}</p>}
                    <button
                      className={primary}
                      disabled={busy || !person}
                      onClick={() =>
                        void perform(() =>
                          saveOperation({
                            ...base(),
                            kind: active ? 'attendance.out' : 'attendance.in',
                            sessionId: active?.id,
                          })
                        )
                      }
                    >
                      {busy ? <BusyLabel>Menyimpan</BusyLabel> : active ? 'Absen Pulang' : 'Absen Masuk'}
                    </button>
                  </Card>

                  <Card title="Riwayat Kehadiran">
                    <div className="divide-y divide-line">
                      {sessions
                        .filter(s => !employee || s.employeeId === employee)
                        .reverse()
                        .map(s => (
                          <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                            <div className="space-y-1">
                              <p className="font-semibold">{s.name}</p>
                              <p className="text-sm text-muted">
                                {date(s.start)}
                                {s.end ? ` — ${date(s.end)}` : ''}
                              </p>

                              {/* Photo evidence buttons and honest status pills */}
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                {s.inPhotoId ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingPhoto({
                                        id: s.inPhotoId,
                                        label: 'Foto Absen Masuk',
                                        name: s.name,
                                        at: s.start,
                                        employeeId: s.employeeId,
                                        operationId: s.id,
                                      })
                                    }
                                    className="rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold text-fg hover:border-fg"
                                  >
                                    Lihat Foto Masuk
                                  </button>
                                ) : s.inPhotoStatus === 'tanpa_foto' ? (
                                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
                                    Masuk: Tanpa Foto ({s.inPhotoReason || 'Alasan tidak tercatat'})
                                  </span>
                                ) : null}

                                {s.outPhotoId ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setViewingPhoto({
                                        id: s.outPhotoId,
                                        label: 'Foto Absen Pulang',
                                        name: s.name,
                                        at: s.end || '',
                                        employeeId: s.employeeId,
                                        operationId: s.id,
                                      })
                                    }
                                    className="rounded-lg border border-line bg-card px-2.5 py-1 text-xs font-semibold text-fg hover:border-fg"
                                  >
                                    Lihat Foto Pulang
                                  </button>
                                ) : s.outPhotoStatus === 'tanpa_foto' ? (
                                  <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs text-amber-900">
                                    Pulang: Tanpa Foto ({s.outPhotoReason || 'Alasan tidak tercatat'})
                                  </span>
                                ) : null}
                              </div>
                            </div>
                            <span className="text-sm">
                              {s.minutes === null
                                ? 'Sedang bekerja'
                                : `${Math.floor(s.minutes / 60)} jam ${s.minutes % 60} menit`}
                            </span>
                          </div>
                        ))}
                      {!sessions.length && <p className="text-sm text-muted">Belum ada absensi.</p>}
                    </div>
                  </Card>
                </>
              )}

              {tab === 'loans' && (
                <>
                  <Stat
                    label="Sisa Kasbon"
                    value={money(
                      employee
                        ? loanBalance(data.records, employee)
                        : data.records.reduce(
                            (n, r) => n + (r.kind === 'loan' ? r.amount || 0 : r.kind === 'repayment' ? -(r.amount || 0) : 0),
                            0
                          )
                    )}
                  />
                  <Card title="Catat Kasbon">
                    <form onSubmit={submitMoney} className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        Jenis
                        <select className={field} value={kind} onChange={e => setKind(e.target.value as OperationKind)}>
                          <option value="loan">Berikan Kasbon</option>
                          <option value="repayment">Terima Pembayaran</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Jumlah (Rp)
                        <input
                          className={field}
                          required
                          type="number"
                          min="1"
                          max="1000000000000"
                          step="1"
                          inputMode="numeric"
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Uang
                        <select
                          className={field}
                          value={source}
                          onChange={e => setSource(e.target.value as typeof source)}
                        >
                          <option value="laci">Laci Kasir</option>
                          <option value="rekening">Rekening Usaha</option>
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Catatan
                        <input
                          className={field}
                          maxLength={240}
                          value={note}
                          onChange={e => setNote(e.target.value)}
                        />
                      </label>
                      <button className={primary} disabled={busy || !person}>
                        {busy ? <BusyLabel>Menyimpan</BusyLabel> : 'Simpan'}
                      </button>
                    </form>
                  </Card>
                </>
              )}

              {tab === 'commission' && (
                <>
                  <Stat
                    label="Komisi Belum Dibayar"
                    value={money(employee ? commissionBalance(data.records, employee, data.orders) : 0)}
                  />
                  <Card title="Komisi Layanan">
                    <form
                      className="grid gap-4 sm:grid-cols-2"
                      onSubmit={e => {
                        e.preventDefault();
                        void perform(async () => {
                          const item = services.find(i => i.id === Number(lineId)),
                            order = item && data.orders.find(o => o.id === item.orderId);
                          if (!item || !order) throw new Error('Pilih layanan');
                          const basisAmount = Math.floor(
                              (item.qty * item.hargaSatuan * Math.max(0, order.subtotal - (order.discount || 0))) /
                                order.subtotal
                            ),
                            basisRate = Math.round(Number(rate) * 100);
                          await saveOperation({
                            ...base(),
                            kind: 'commission',
                            orderId: order.id,
                            orderItemId: item.id,
                            basisAmount,
                            rate: basisRate,
                            amount: Math.round((basisAmount * basisRate) / 10000),
                          });
                          setLineId('');
                        });
                      }}
                    >
                      <label className="text-sm font-medium">
                        Layanan yang Sudah Dibayar
                        <select
                          required
                          value={lineId}
                          onChange={e => setLineId(e.target.value)}
                          className={field}
                        >
                          <option value="">Pilih Layanan</option>
                          {services.map(i => (
                            <option key={i.id} value={i.id}>
                              Nota #{i.orderId} · {i.namaMenu} × {i.qty}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="text-sm font-medium">
                        Komisi (%)
                        <input
                          required
                          type="number"
                          min="0.01"
                          max="100"
                          step="0.01"
                          className={field}
                          value={rate}
                          onChange={e => setRate(e.target.value)}
                        />
                      </label>
                      <button className={primary} disabled={busy || !person}>
                        Catat Komisi
                      </button>
                    </form>
                    <p className="text-sm text-muted">
                      Komisi mengikuti nilai layanan setelah diskon. Nota yang dikembalikan tidak menambah komisi.
                    </p>
                  </Card>
                  <Card title="Bayar Komisi">
                    <form onSubmit={submitMoney} className="grid gap-4 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        Jumlah (Rp)
                        <input
                          required
                          type="number"
                          min="1"
                          step="1"
                          className={field}
                          value={amount}
                          onChange={e => setAmount(e.target.value)}
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Uang
                        <select
                          className={field}
                          value={source}
                          onChange={e => setSource(e.target.value as typeof source)}
                        >
                          <option value="laci">Laci Kasir</option>
                          <option value="rekening">Rekening Usaha</option>
                        </select>
                      </label>
                      <button disabled={busy || !person} className={primary}>
                        Bayar Komisi
                      </button>
                    </form>
                  </Card>
                </>
              )}

              {(tab === 'loans' || tab === 'commission') && (
                <Card title="Riwayat">
                  <div className="divide-y divide-line">
                    {data.records
                      .filter(
                        r =>
                          (!employee || r.employeeId === employee) &&
                          (tab === 'loans' ? ['loan', 'repayment'] : ['commission', 'commission.paid']).includes(
                            r.kind
                          )
                      )
                      .reverse()
                      .map(r => (
                        <div key={r.id} className="flex flex-wrap justify-between gap-3 py-3">
                          <div>
                            <p className="font-semibold">{r.employeeName}</p>
                            <p className="text-sm text-muted">
                              {
                                {
                                  loan: 'Kasbon',
                                  repayment: 'Pembayaran Kasbon',
                                  commission: 'Komisi',
                                  'commission.paid': 'Pembayaran Komisi',
                                }[r.kind as 'loan']
                              }{' '}
                              · {date(r.at)}
                            </p>
                            {r.note && <p className="text-sm">{r.note}</p>}
                          </div>
                          <strong className="tabular-nums">{money(r.amount || 0)}</strong>
                        </div>
                      ))}
                  </div>
                </Card>
              )}

              {tab === 'report' && (
                <>
                  <Card title="Rapor Kasir">
                    <p className="text-sm text-muted">Seluruh catatan tersimpan</p>
                    <div className="grid gap-4 md:grid-cols-2">
                      {cashierReport(data.orders, data.shifts, data.audits).map(r => (
                        <article key={r.id} className="space-y-3 rounded-xl border border-line p-4">
                          <h3 className="font-bold">{r.name}</h3>
                          <dl className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <dt className="text-muted">Pembayaran</dt>
                              <dd className="font-semibold">{money(r.received)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted">Pengembalian</dt>
                              <dd>{money(r.refunds)}</dd>
                            </div>
                            <div>
                              <dt className="text-muted">Nota</dt>
                              <dd>{r.receipts}</dd>
                            </div>
                            <div>
                              <dt className="text-muted">Shift</dt>
                              <dd>{r.shifts}</dd>
                            </div>
                          </dl>
                          {r.difference > 0 && (
                            <p className="text-sm text-amber-800">Periksa selisih kas: {money(r.difference)}</p>
                          )}
                          {r.voids > 0 && (
                            <p className="text-sm text-amber-800">Periksa {r.voids} pembatalan nota.</p>
                          )}
                        </article>
                      ))}
                    </div>
                  </Card>
                  <Card title="Riwayat Tindakan">
                    <div className="max-h-96 divide-y divide-line overflow-y-auto">
                      {data.audits
                        .slice(-100)
                        .reverse()
                        .map(a => (
                          <div className="py-3 text-sm" key={a.id}>
                            <p className="font-semibold">
                              {a.operator} · {money(a.amount || 0)}
                            </p>
                            <p className="text-muted">{date(a.timestamp)}</p>
                            <p>
                              {
                                (
                                  {
                                    OPERATION: 'Catatan karyawan',
                                    VOID: 'Pembatalan nota',
                                    REFUND: 'Pengembalian',
                                    PARTIAL_REFUND: 'Pengembalian pembayaran',
                                    OPEN_SHIFT: 'Buka shift',
                                    CLOSE_SHIFT: 'Tutup shift',
                                    CASH_IN: 'Kas masuk',
                                    CASH_OUT: 'Kas keluar',
                                    DELETE: 'Penghapusan',
                                    RESET: 'Pengosongan data',
                                    PARTIAL_PAYMENT: 'Pembayaran sebagian',
                                    UPLOAD_PROOF: 'Bukti pembayaran ditambahkan',
                                    VERIFY_PROOF: 'Bukti pembayaran diperiksa',
                                    DELETE_PROOF: 'Bukti pembayaran dihapus',
                                    BULK_IMPORT: 'Data ditambahkan',
                                    BULK_UPDATE: 'Data diperbarui',
                                    BULK_DELETE: 'Data dihapus',
                                    MIGRATION: 'Pemindahan data',
                                  } as Record<string, string>
                                )[a.action] || 'Perubahan data'
                              }
                            </p>
                          </div>
                        ))}
                    </div>
                  </Card>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
