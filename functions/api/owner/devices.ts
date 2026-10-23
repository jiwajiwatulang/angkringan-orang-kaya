import {extractBearerToken,getD1,verifyOwnerSession} from '../../../src/lib/server/sakunotaServer';
import {listOwnerStores} from '../../../src/lib/server/ownerDevices';

export async function onRequestGet(context:any) {
  const reply=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
  try {
    const db=getD1(context.env?.DB);
    const auth=await verifyOwnerSession(db,extractBearerToken(context.request.headers.get('Authorization')||''));
    if(!auth.valid)return reply({error:'Silakan login kembali.'},401);
    if(context.env?.SAKUNOTA_MULTI_DEVICE!=='enabled')return reply({enabled:false,items:[],next:null});
    const after=new URL(context.request.url).searchParams.get('after')||'';
    if(after&&!/^[a-f0-9]{64}$/.test(after))return reply({error:'Halaman tidak tersedia.'},400);
    return reply({enabled:true,...await listOwnerStores(db,after)});
  } catch {return reply({error:'Daftar perangkat belum dapat dimuat.'},503);}
}
