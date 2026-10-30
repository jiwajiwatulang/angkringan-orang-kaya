'use client';
import React,{useRef,useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/dexie';
import {getPosScope} from '@/lib/multidevice/posWire';
import {saveOperation} from '@/lib/operationsApi';
import {employeeAttendance} from '@/lib/operations';
import AttendanceCard from './AttendanceCard';
import {BusyLabel} from '@/components/LoadingState';
export default function AttendanceButton({variant='button'}:{variant?:'button'|'card'}){
  const scope=getPosScope(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const saving=useRef(false),employeeId=scope?.claims.role==='cashier'?scope.claims.employeeId:undefined;
  const rows=useLiveQuery(()=>employeeId?db.table('operations').where('employeeId').equals(employeeId).toArray():[],[employeeId]);
  if(scope?.claims.role!=='cashier'||!scope.claims.employeeId)return null;
  const {active,latest}=employeeAttendance(rows||[],scope.claims.employeeId);
  const record=()=>{
    if(saving.current||!rows)return;
    saving.current=true;setBusy(true);setError('');
    void saveOperation({kind:active?'attendance.out':'attendance.in',employeeId:scope.claims.employeeId!,employeeName:scope.operatorName,sessionId:active?.id})
      .catch(e=>setError(e instanceof Error?e.message:'Absensi belum tersimpan')).finally(()=>{saving.current=false;setBusy(false);});
  };
  if(variant==='card')return <AttendanceCard name={scope.operatorName} active={active} latest={latest} loading={!rows} busy={busy} error={error} onAction={record}/>;
  return <div className="relative"><button type="button" disabled={busy||!rows} className="min-h-11 rounded-xl border border-line bg-card px-3 py-2 text-xs font-bold text-fg disabled:opacity-50" onClick={record}>{busy?<BusyLabel>Menyimpan</BusyLabel>:active?'Absen Pulang':'Absen Masuk'}</button>{error&&<p role="alert" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}</div>;
}
