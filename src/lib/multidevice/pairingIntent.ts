import {PAIRING_MS} from './protocol';
export const PAIRING_INTENT_KEY='sakunota_pairing_intent';
export interface PairingIntent {code:string;name:string;waiting:boolean;expiresAt:number}
export function pairingCode(input:string,origin:string):string {
  const value=input.trim();
  if(/^[\w-]{43}$/.test(value))return value;
  try{
    const url=new URL(value),current=new URL(origin),local=['localhost','127.0.0.1'];
    const hosts=new Set([current.hostname,'sakunota.my.id','www.sakunota.my.id','angkringan-orang-kaya.ranutarde.workers.dev',...(local.includes(current.hostname)?local:[])]);
    if(!hosts.has(url.hostname)||url.username||url.password||!['/hubungkan-perangkat','/hubungkan-perangkat/'].includes(url.pathname)||url.protocol!=='https:'&&!(url.protocol==='http:'&&local.includes(url.hostname)))return '';
    const code=new URLSearchParams(url.hash.slice(1)).get('code')||'';
    return /^[\w-]{43}$/.test(code)?code:'';
  }catch{return '';}
}
export function readPairingIntent(raw:string|null,now=Date.now()):PairingIntent|null {
  try{const value=JSON.parse(raw||'null');return value&&/^[\w-]{43}$/.test(value.code)&&typeof value.name==='string'&&value.name.length<=100&&typeof value.waiting==='boolean'&&Number.isSafeInteger(value.expiresAt)&&value.expiresAt>now&&value.expiresAt<=now+PAIRING_MS?value:null;}catch{return null;}
}
