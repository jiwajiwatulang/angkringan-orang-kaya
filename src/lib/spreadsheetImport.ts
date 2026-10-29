import {IMPORT_LIMITS,ImportFileError,validateImportFile} from './importLimits';
import type {ImportRow} from './spreadsheetParser';
export async function readImportRows(file:File,signal?:AbortSignal):Promise<ImportRow[]>{
  signal?.throwIfAborted();
  validateImportFile(file.name,file.size);
  const data=await file.arrayBuffer();
  signal?.throwIfAborted();
  if(typeof window==='undefined'){const {parseSpreadsheet}=await import('./spreadsheetParser');return parseSpreadsheet(data,file.name);}
  if(typeof Worker==='undefined')throw new ImportFileError('Browser ini belum mendukung pembacaan file. Gunakan browser terbaru.');
  return new Promise((resolve,reject)=>{
    let worker:Worker;
    try{worker=new Worker('/spreadsheet-import-worker.js');}catch{return reject(new ImportFileError('Pembacaan file belum tersedia. Muat ulang aplikasi dan coba lagi.'));}
    let settled=false;
    const abort=()=>finish(new DOMException('Pembacaan file dibatalkan.','AbortError'));
    const finish=(error?:Error,rows?:ImportRow[])=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();error?reject(error):resolve(rows!);};
    const timer=setTimeout(()=>finish(new ImportFileError('File terlalu lama dibaca. Pisahkan data menjadi beberapa file.')),IMPORT_LIMITS.timeoutMs);
    worker.onmessage=event=>{const reply=event.data;if(reply?.ok&&Array.isArray(reply.rows)&&reply.rows.length<=IMPORT_LIMITS.rows)finish(undefined,reply.rows);else finish(new ImportFileError(typeof reply?.error==='string'?reply.error:'File tidak dapat dibaca. Gunakan template SakuNota.'));};
    worker.onerror=event=>{event.preventDefault();finish(new ImportFileError('File belum dapat dibaca. Muat ulang aplikasi dan coba lagi.'));};
    signal?.addEventListener('abort',abort,{once:true});
    try{worker.postMessage({data,name:file.name},[data]);}catch{finish(new ImportFileError('File belum dapat dibaca. Pilih ulang file dan coba lagi.'));}
  });
}
