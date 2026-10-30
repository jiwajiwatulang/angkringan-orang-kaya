'use client';
import type {employeeAttendance} from '@/lib/operations';
import LoadingState,{BusyLabel} from '@/components/LoadingState';

type Session=ReturnType<typeof employeeAttendance>['latest'];
const time=(value:string)=>new Date(value).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
export default function AttendanceCard({name,active,latest,loading,busy,error,onAction}:{name:string;active?:Session;latest?:Session;loading:boolean;busy:boolean;error:string;onAction:()=>void}){
  return <section aria-label="Kehadiran Saya" className="space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5">
    <div><h2 className="text-lg font-bold text-fg">Kehadiran Saya</h2><p className="mt-1 text-sm text-muted">{name}</p></div>
    {loading?<LoadingState compact label="Menyiapkan kehadiran"/>:<>
      <p className={`text-sm font-semibold ${active?'text-blue-700':'text-muted'}`}>{active?'Sedang Bekerja':latest?.end?'Sudah Pulang':'Belum Absen'}</p>
      {active?<p className="text-sm text-muted">Masuk {time(active.start)}</p>:latest?.end&&<p className="text-sm text-muted">Terakhir pulang {time(latest.end)}</p>}
      <button type="button" disabled={busy} onClick={onAction} className="min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy?<BusyLabel>Menyimpan</BusyLabel>:active?'Absen Pulang':'Absen Masuk'}</button>
    </>}
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  </section>;
}
