'use client';
import React, { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/dexie';
import { getPosScope } from '@/lib/multidevice/posWire';
import { saveOperation } from '@/lib/operationsApi';
import { employeeAttendance } from '@/lib/operations';
import { recordAttendanceWithPhotoAtomic } from '@/lib/attendancePhoto';
import AttendanceCard from './AttendanceCard';
import AttendanceCameraModal from './AttendanceCameraModal';
import { BusyLabel } from '@/components/LoadingState';

export default function AttendanceButton({ variant = 'button' }: { variant?: 'button' | 'card' }) {
  const scope = getPosScope();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const saving = useRef(false);

  const employeeId = scope?.claims.role === 'cashier' ? scope.claims.employeeId : undefined;
  const rows = useLiveQuery(
    () => (employeeId ? db.table('operations').where('employeeId').equals(employeeId).toArray() : []),
    [employeeId]
  );

  if (scope?.claims.role !== 'cashier' || !scope.claims.employeeId) return null;
  const { active, latest } = employeeAttendance(rows || [], scope.claims.employeeId);

  const startAttendance = () => {
    if (saving.current || !rows) return;
    setError('');
    setShowCamera(true);
  };

  const handleConfirmPhoto = async (result: { photoId: string; blob: Blob | string; dataUrl?: string; checksum: string }) => {
    if (saving.current || !scope.claims.employeeId) return;
    saving.current = true;
    setBusy(true);
    setError('');
    const kind = active ? 'attendance.out' : 'attendance.in';
    const sessionId = active?.id;
    try {
      await recordAttendanceWithPhotoAtomic(saveOperation, {
        kind,
        employeeId: scope.claims.employeeId,
        employeeName: scope.operatorName,
        sessionId,
        photo: {
          photoId: result.photoId,
          blob: result.blob,
          checksum: result.checksum,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Absensi belum tersimpan');
      throw e;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  const handleConfirmWithoutPhoto = async (reason: string) => {
    if (saving.current || !scope.claims.employeeId) return;
    saving.current = true;
    setBusy(true);
    setError('');
    const kind = active ? 'attendance.out' : 'attendance.in';
    const sessionId = active?.id;
    try {
      await recordAttendanceWithPhotoAtomic(saveOperation, {
        kind,
        employeeId: scope.claims.employeeId,
        employeeName: scope.operatorName,
        sessionId,
        withoutPhoto: { reason },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Absensi belum tersimpan');
      throw e;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  return (
    <>
      {showCamera && (
        <AttendanceCameraModal
          employeeName={scope.operatorName}
          kind={active ? 'out' : 'in'}
          onConfirmPhoto={handleConfirmPhoto}
          onConfirmWithoutPhoto={handleConfirmWithoutPhoto}
          onClose={() => setShowCamera(false)}
        />
      )}

      {variant === 'card' ? (
        <AttendanceCard
          name={scope.operatorName}
          active={active}
          latest={latest}
          loading={!rows}
          busy={busy}
          error={error}
          onAction={startAttendance}
        />
      ) : (
        <div className="relative">
          <button
            type="button"
            disabled={busy || !rows}
            className="min-h-11 rounded-xl border border-line bg-card px-3 py-2 text-xs font-bold text-fg disabled:opacity-50"
            onClick={startAttendance}
          >
            {busy ? <BusyLabel>Menyimpan</BusyLabel> : active ? 'Absen Pulang' : 'Absen Masuk'}
          </button>
          {error && (
            <p
              role="alert"
              className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800"
            >
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
