// Local-only browser fixture. This entry is not a Next.js route or a production asset.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import DevicesPanel from '../../src/components/DevicesPanel';
import EmployeeLogin from '../../src/components/EmployeeLogin';
import {DeviceClient} from '../../src/lib/multidevice/client';
import {EmployeeSessions} from '../../src/lib/multidevice/employeeSession';
import {getLocalDeviceId} from '../../src/lib/ordersClient';
import {createDeviceProof,deviceKeyIdentity} from '../../src/lib/deviceIdentity';
import {verifyAccess} from '../../src/lib/multidevice/offlineAccess';
import {db} from '../../src/lib/dexie';
import type {AccessClaims} from '../../src/lib/multidevice/protocol';
import {activatePosPartition} from '../../src/lib/multidevice/posActivation';
import {DEFAULT_SETTINGS} from '../../src/lib/settings';
import {getPosScope} from '../../src/lib/multidevice/posWire';
import {verifyMerchantPin} from '../../src/lib/merchantAccess';
import {createAdminSession} from '../../src/lib/session';
import {currentPosRuntime} from '../../src/lib/multidevice/posRuntime';
function OwnerDevices(){const runtime=currentPosRuntime();return runtime?.scope?.claims.role==='owner'?<DevicesPanel client={runtime.client}/>:<p>Akses pemilik diperlukan.</p>;}

// Fault injection belongs only to this loopback fixture, never to a production route.
if(new URLSearchParams(location.search).has('faults')){
  let denied=sessionStorage.getItem('qa_denied')==='yes';
  let disconnected=sessionStorage.getItem('qa_disconnected')==='yes',loseAck=false,slow=new URLSearchParams(location.search).has('slow')||sessionStorage.getItem('qa_slow')==='yes';
  Object.defineProperty(navigator,'onLine',{configurable:true,get:()=>!disconnected});
  const originalFetch=window.fetch.bind(window);
  window.fetch=async(input,options)=>{
    if(String(input).startsWith('/api/store')){
      if(disconnected)throw new TypeError('Local transport disconnected');
      if(denied)return Response.json({error:'Akses perangkat sudah dicabut.'},{status:403});
      if(slow)await new Promise<void>((resolve,reject)=>{const signal=options?.signal;const abort=()=>{clearTimeout(timer);reject(new DOMException('Local timeout','TimeoutError'));};const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},12000);if(signal?.aborted)abort();else signal?.addEventListener('abort',abort,{once:true});});
      const response=await originalFetch(input,options);
      if(loseAck&&JSON.parse(String(options?.body||'{}')).action==='send'&&response.ok){loseAck=false;throw new TypeError('Local response lost');}
      return response;
    }
    return originalFetch(input,options);
  };
  const controls=document.createElement('div');controls.style.cssText='position:fixed;bottom:70px;right:4px;z-index:99999;display:flex;gap:4px;background:white;border:1px solid #94a3b8;padding:4px;font-size:11px';
  const network=document.createElement('button');network.textContent=disconnected?'Sambung Koneksi Uji':'Putus Koneksi Uji';
  network.onclick=()=>{disconnected=!disconnected;sessionStorage.setItem('qa_disconnected',disconnected?'yes':'no');network.textContent=disconnected?'Sambung Koneksi Uji':'Putus Koneksi Uji';window.dispatchEvent(new Event(disconnected?'offline':'online'));};
  const retry=document.createElement('button');retry.textContent='Hilangkan Satu Konfirmasi';retry.onclick=()=>{loseAck=true;};const latency=document.createElement('button');latency.textContent=slow?'Normalkan Koneksi Uji':'Lambatkan Koneksi Uji';latency.onclick=()=>{slow=!slow;sessionStorage.setItem('qa_slow',slow?'yes':'no');latency.textContent=slow?'Normalkan Koneksi Uji':'Lambatkan Koneksi Uji';};const rejection=document.createElement('button');rejection.textContent=denied?'Izinkan Akses Uji':'Tolak Akses Uji';rejection.onclick=()=>{denied=!denied;sessionStorage.setItem('qa_denied',denied?'yes':'no');rejection.textContent=denied?'Izinkan Akses Uji':'Tolak Akses Uji';};controls.append(network,retry,latency,rejection);document.body.append(controls);
}

function OwnerReport({Page,Provider}:{Page:React.ComponentType;Provider:React.ComponentType<{children:React.ReactNode}>}){
  const [ready,setReady]=useState(false);
  React.useEffect(()=>{void (async()=>{if(getPosScope()?.claims.role==='owner'&&await verifyMerchantPin(DEFAULT_SETTINGS.adminPin)){await createAdminSession();setReady(true);}})();},[]);
  return ready?<Provider><Page/></Provider>:<p>Memuat laporan…</p>;
}

async function post(path:string,data:unknown){const response=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const result=await response.json();if(!response.ok)throw new Error(result.error||'Belum dapat dibuka.');return result;}
function Cashier({sessions}:{sessions:EmployeeSessions}){
  const [name,setName]=useState('');
  return name?<section className="mx-auto max-w-sm space-y-5 rounded-2xl border border-line bg-surface p-5"><h1 className="text-xl font-bold">{name}</h1><p role="status">Masuk berhasil</p><button className="min-h-11 rounded-xl border border-line px-4 py-2.5" onClick={()=>{void sessions.logout().then(()=>setName(''));}}>Keluar</button></section>:<EmployeeLogin sessions={sessions} onSuccess={async session=>{setName(session.name);}}/>;
}
async function main(){
  const root=createRoot(document.getElementById('root')!);
  (window as any).__QA_POS__={api:await import('../../src/lib/api'),db};
  if(new URLSearchParams(location.search).has('portal')){
    const {OwnerDeviceRows}=await import('../../src/components/OwnerDeviceOverview');
    root.render(<main className="mx-auto max-w-3xl p-5 text-fg"><h1 className="mb-5 text-2xl font-bold">Perangkat Toko</h1><OwnerDeviceRows data={{enabled:true,next:null,items:[{licenseKey:'SN-LOCAL-BROWSER-ONLY',devices:[{id:'owner',name:'Laptop Pemilik',role:'owner',lastReceivedAt:Date.now()},{id:'cashier',name:'Kasir Depan',role:'cashier',lastReceivedAt:null}]}]}}/></main>);return;
  }
  try{
    if(location.pathname==='/pos'){
      const [{default:POS},{default:Boundary}]=await Promise.all([import('../../src/app/pos/page'),import('../../src/components/PosSessionBoundary')]);
      if(new URLSearchParams(location.search).has('devices')){root.render(<Boundary><OwnerDevices/></Boundary>);return;}
      if(new URLSearchParams(location.search).has('data')){
        const [{default:Page},{AdminProvider}]=await Promise.all([import('../../src/app/admin/pengaturan/data/page'),import('../../src/app/admin/AdminContext')]);
        root.render(<Boundary><OwnerReport Page={Page} Provider={AdminProvider}/></Boundary>);return;
      }
      if(new URLSearchParams(location.search).has('report')){
        const [{default:Page},{AdminProvider}]=await Promise.all([import('../../src/app/admin/page'),import('../../src/app/admin/AdminContext')]);
        root.render(<Boundary><OwnerReport Page={Page} Provider={AdminProvider}/></Boundary>);return;
      }
      root.render(<Boundary><POS/></Boundary>);return;
    }
    const config=await (await fetch('/fixture/config')).json(),deviceId=getLocalDeviceId(),identity=await deviceKeyIdentity();
    let session:{access:string;claims:AccessClaims};
    if(location.hostname==='localhost'){
      const proof=await createDeviceProof('qa.owner',config.licenseKey,deviceId,'');
      session=await post('/fixture/owner',{deviceId,proof});
      await verifyAccess(session.access,deviceId,identity,config.publicKey);
      if(location.pathname==='/devices'){root.render(<DevicesPanel client={new DeviceClient(session.access,session.claims,config.publicKey)}/>);return;}
      await db.table('settings').put({key:'pos_store_settings',value:{...DEFAULT_SETTINGS,storeName:'Warung Uji',businessType:'warung',serviceMode:'quick',onboardingCompleted:true,enableTax:false,enableService:false}});
      if(!await db.table('menuItems').count())await db.table('menuItems').add({nama:'Kopi Susu',harga:10000,kategori:'Minuman',isSoldOut:false,urutan:0});
      await activatePosPartition(db,session.access,session.claims);location.assign('/pos');
    }else{
      const pair=await post('/fixture/pair',{}),proof=await createDeviceProof('multi.pair',pair.code,deviceId,'');
      await post('/api/store',{action:'pair.request',data:{code:pair.code,deviceId,deviceName:'Tablet Kasir'},proof});
      await post('/fixture/approve',{id:pair.id});
      const retry=await createDeviceProof('multi.pair',pair.code,deviceId,'');
      session=await post('/api/store',{action:'pair.request',data:{code:pair.code,deviceId,deviceName:'Tablet Kasir'},proof:retry});
      await verifyAccess(session.access,deviceId,identity,config.publicKey);
      await activatePosPartition(db,session.access,session.claims);location.assign('/pos');
    }
  }catch(error){root.render(<p role="alert">{error instanceof Error?error.message:'Belum dapat dibuka.'}</p>);}
}
void main();
