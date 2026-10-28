'use client';
import React,{useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {db} from '@/lib/dexie';
import {getPosScope} from '@/lib/multidevice/posWire';
import {saveOperation} from '@/lib/operationsApi';
import {attendanceSummary} from '@/lib/operations';
export default function AttendanceButton(){
  const scope=getPosScope(),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const rows=useLiveQuery(()=>db.table('operations').toArray(),[]);
  if(scope?.claims.role!=='cashier'||!scope.claims.employeeId)return null;
  const active=attendanceSummary(rows||[]).find(s=>s.employeeId===scope.claims.employeeId&&!s.end);
  return <div className="relative"><button type="button" disabled={busy||!rows} className="min-h-11 rounded-xl border border-line bg-card px-3 py-2 text-xs font-bold text-fg disabled:opacity-50" onClick={()=>{setBusy(true);setError('');void saveOperation({kind:active?'attendance.out':'attendance.in',employeeId:scope.claims.employeeId!,employeeName:scope.operatorName,sessionId:active?.id}).catch(e=>setError(e instanceof Error?e.message:'Absensi belum tersimpan')).finally(()=>setBusy(false));}}>{busy?'Menyimpan…':active?'Absen Pulang':'Absen Masuk'}</button>{error&&<p role="alert" className="absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">{error}</p>}</div>;
}
