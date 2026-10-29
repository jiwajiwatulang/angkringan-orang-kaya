export const IMPORT_LIMITS={bytes:10*1024*1024,expandedBytes:30*1024*1024,entries:512,rows:5000,columns:64,cellChars:4000,timeoutMs:12000} as const;
export class ImportFileError extends Error {}
export function validateImportFile(name:string,size:number){
  if(!/\.(xlsx|xls|csv)$/i.test(name))throw new ImportFileError('Pilih file Excel (.xlsx, .xls) atau CSV.');
  if(!size)throw new ImportFileError('File kosong. Pilih file yang berisi data.');
  if(size>IMPORT_LIMITS.bytes)throw new ImportFileError('File Excel/CSV maksimal 10 MB. Pisahkan menjadi beberapa file.');
}
export function importRupiah(value:unknown):number|undefined{
  if(typeof value==='number')return Number.isSafeInteger(value)&&value>=0&&value<=1e12?value:undefined;
  if(typeof value!=='string')return;
  let s=value.trim().replace(/^(?:Rp\.?|IDR)\s*/i,'');
  if(!s)return;
  // Indonesian thousands grouping, with optional zero-only decimal rupiah.
  if(/^\d{1,3}(?:\.\d{3})+(?:,0{1,2})?$/.test(s))s=s.replace(/\./g,'').replace(/,0{1,2}$/,'');
  else if(/^\d+(?:,0{1,2}|\.0{1,2})?$/.test(s))s=s.replace(/(?:,0{1,2}|\.0{1,2})$/,'');
  else return;
  const n=Number(s);return Number.isSafeInteger(n)&&n>=0&&n<=1e12?n:undefined;
}
export function importDate(value:unknown):string|undefined{
  if(value instanceof Date)return Number.isFinite(value.getTime())?value.toISOString():undefined;
  if(typeof value!=='string')return;
  const match=value.trim().match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:?\d{2})?)?$/);
  if(!match)return;
  const [y,m,d,h,min,sec]=[match[1],match[2],match[3],match[4]||'0',match[5]||'0',match[6]||'0'].map(Number);
  const date=new Date(y,m-1,d,h,min,sec);
  if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d||h>23||min>59||sec>59)return;
  const parsed=match[7]?new Date(value.trim().replace(' ','T')):date;
  return Number.isFinite(parsed.getTime())?parsed.toISOString():undefined;
}
