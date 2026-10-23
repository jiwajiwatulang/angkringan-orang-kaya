"use client";
import React,{useState} from 'react';
import DevicesPanel from '@/components/DevicesPanel';
import {enrollOwnerClient,type DeviceClient} from '@/lib/multidevice/client';
import {requireMerchantAdmin} from '@/lib/merchantAccess';
import {isDemoMode} from '@/lib/demoMode';

export default function DevicesPage(){
  const [client,setClient]=useState<DeviceClient|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  // Release gate remains off until the legacy POS adapter and real-browser acceptance pass.
  if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE!=='enabled')return <p className="text-sm text-muted">Halaman tidak tersedia.</p>;
  if(client)return <DevicesPanel client={client}/>;
  return <div className="max-w-3xl space-y-4"><h1 className="text-2xl font-bold text-fg">Perangkat &amp; Karyawan</h1>
    {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
    <button type="button" disabled={busy} className="min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50" onClick={()=>{
      setBusy(true);setError('');void (async()=>{try{if(isDemoMode())throw new Error('Gunakan lisensi toko untuk menghubungkan perangkat.');await requireMerchantAdmin();setClient(await enrollOwnerClient());}catch(e){setError(e instanceof Error?e.message:'Perangkat belum dapat dibuka.');}finally{setBusy(false);}})();
    }}>{busy?'Memuat…':'Buka Perangkat'}</button>
  </div>;
}
