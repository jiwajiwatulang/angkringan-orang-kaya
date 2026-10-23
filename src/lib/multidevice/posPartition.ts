export interface PosPartition {storeId:string;deviceId:string}
export function posPartition():PosPartition|undefined{
  if(process.env.NEXT_PUBLIC_SAKUNOTA_MULTI_DEVICE!=='enabled'||typeof localStorage==='undefined')return;
  try{const value=JSON.parse(localStorage.getItem('sakunota_pos_partition')||'null');if(value&&/^[a-f0-9]{64}$/.test(value.storeId)&&/^[\w-]{16,80}$/.test(value.deviceId))return value;}catch{}
}
export function posDatabaseName(){const p=posPartition();return p?`SakuNotaPOS-${p.storeId}-${p.deviceId}`:undefined;}
