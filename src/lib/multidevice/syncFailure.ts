import {AccessError} from './protocol';
export type SyncPhase='send'|'pull';
export function syncFailureMessage(error:unknown,phase:SyncPhase){
  return error instanceof AccessError?error.message.slice(0,180):phase==='send'?'Data belum dapat dikirim. Coba lagi.':'Data belum dapat diperbarui. Coba lagi.';
}
export class PosSyncFailure extends AccessError {
  constructor(public phase:SyncPhase,error:unknown){
    super(syncFailureMessage(error,phase),error instanceof AccessError?error.status:500,error instanceof AccessError?error.code:undefined,error instanceof AccessError?error.retryAt:undefined);
  }
}
