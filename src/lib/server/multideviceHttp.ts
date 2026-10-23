import type {DeviceProof} from '../licenseProtocol';
import {AccessError,requireOwner,type StoreEvent} from '../multidevice/protocol';
import {enrollOwner,requestPairing,authorize,createPairing,approvePairing,revokeDevice,saveEmployee,employeeLogin,listAccess,renewCashierDevice,signingKey,type MultiDeviceEnv} from './multideviceAccess';
import {pullEntities,submitEvent,recoverEvent} from './multideviceSync';

export interface MultiDeviceHttpEnv extends MultiDeviceEnv {PUBLIC_RATE_LIMITER?:{limit(options:{key:string}):Promise<{success:boolean}>}}
function response(body:unknown,status=200){return Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});}
async function boundedBody(request:Request){
  if(!request.headers.get('Content-Type')?.startsWith('application/json')) throw new AccessError('Permintaan tidak sesuai.',415);
  const reader=request.body?.getReader();if(!reader) throw new AccessError('Lengkapi data.',400);
  const chunks:Uint8Array[]=[],limit=160000;let total=0;
  try {
    for(;;){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>limit){await reader.cancel();throw new AccessError('Data terlalu besar.',413);}chunks.push(value);}
  } finally{reader.releaseLock();}
  const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
  try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw new AccessError('Permintaan tidak sesuai.',400);}
}
export async function handleMultiDevice(request:Request,env:MultiDeviceHttpEnv):Promise<Response>{
  try{
    signingKey(env);
    if(request.method!=='POST') return response({error:'Permintaan tidak sesuai.'},405);
    if(env.PUBLIC_RATE_LIMITER){const limit=await env.PUBLIC_RATE_LIMITER.limit({key:`multi:${request.headers.get('CF-Connecting-IP')||'local'}`});if(!limit.success)return response({error:'Terlalu banyak percobaan. Coba lagi nanti.'},429);}
    const body=await boundedBody(request);
    if(!body||typeof body!=='object'||typeof body.action!=='string'||!body.data||typeof body.data!=='object'||Array.isArray(body.data)||!body.proof)throw new AccessError('Permintaan tidak sesuai.',400);
    const action=body.action as string,data=body.data as Record<string,unknown>,proof=body.proof as DeviceProof;
    if(action==='enroll')return response(await enrollOwner(env,{activation:String(data.activation||''),deviceName:String(data.deviceName||''),proof}));
    if(action==='pair.request')return response(await requestPairing(env,{code:String(data.code||''),deviceId:String(data.deviceId||''),deviceName:String(data.deviceName||''),proof}));
    if(typeof body.access!=='string')throw new AccessError('Silakan masuk lagi.',401);
    const claims=await authorize(env,body.access,action,data,proof);
    if(action==='list')return response(await listAccess(env,claims));
    if(action==='refresh')return response(await renewCashierDevice(env,claims));
    if(action==='employee.login')return response(await employeeLogin(env,claims,{id:String(data.id||''),pin:String(data.pin||'')}));
    if(action==='pull')return response(await pullEntities(env.DB,claims,Number(data.cursor)));
    if(action==='send')return response(await submitEvent(env.DB,claims,data.event as StoreEvent));
    requireOwner(claims);
    if(action==='recover')return response(await recoverEvent(env.DB,claims,data.event as StoreEvent));
    if(action==='pair.create')return response(await createPairing(env,claims));
    if(action==='pair.approve')return response(await approvePairing(env,claims,String(data.id||'')));
    if(action==='device.revoke')return response(await revokeDevice(env,claims,String(data.id||'')));
    if(action==='employee.save')return response(await saveEmployee(env,claims,{id:String(data.id||''),name:String(data.name||''),pin:data.pin===undefined?undefined:String(data.pin),active:data.active as boolean}));
    return response({error:'Halaman tidak tersedia.'},404);
  }catch(error){
    if(error instanceof AccessError)return response({error:error.message},error.status);
    // Never expose SQL, submitted PINs, key material or error stacks.
    return response({error:'Data belum dapat diproses. Coba lagi.'},503);
  }
}
