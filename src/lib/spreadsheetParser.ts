import * as XLSX from 'xlsx';
import {IMPORT_LIMITS,ImportFileError,validateImportFile} from './importLimits';
export type ImportRow=Record<string,string|number|boolean|Date|null>;
// Inspect the ZIP directory before decompression. No content is executed or fetched.
function checkZip(bytes:Uint8Array){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let end=-1;
  for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}
  if(end<0)throw new ImportFileError('File Excel rusak atau belum selesai diunduh.');
  const count=view.getUint16(end+10,true),size=view.getUint32(end+12,true),offset=view.getUint32(end+16,true);
  if(view.getUint16(end+4,true)||view.getUint16(end+6,true)||count>IMPORT_LIMITS.entries||offset+size>end)throw new ImportFileError('File Excel terlalu besar atau tidak didukung.');
  let pos=offset,total=0;
  for(let i=0;i<count;i++){
    if(pos+46>offset+size||view.getUint32(pos,true)!==0x02014b50)throw new ImportFileError('File Excel rusak. Simpan ulang file lalu coba lagi.');
    const expanded=view.getUint32(pos+24,true),compressed=view.getUint32(pos+20,true);
    total+=expanded;
    if((view.getUint16(pos+8,true)&1)||expanded===0xffffffff||compressed===0xffffffff||total>IMPORT_LIMITS.expandedBytes)throw new ImportFileError('Isi file Excel terlalu besar atau terkunci.');
    pos+=46+view.getUint16(pos+28,true)+view.getUint16(pos+30,true)+view.getUint16(pos+32,true);
    if(pos>offset+size)throw new ImportFileError('File Excel rusak. Simpan ulang file lalu coba lagi.');
  }
}
export function parseSpreadsheet(data:ArrayBuffer,name:string):ImportRow[]{
  validateImportFile(name,data.byteLength);
  const bytes=new Uint8Array(data),zip=bytes[0]===0x50&&bytes[1]===0x4b,ole=bytes[0]===0xd0&&bytes[1]===0xcf;
  if(/\.xlsx$/i.test(name)&&!zip)throw new ImportFileError('Isi file tidak sesuai format Excel. Simpan ulang sebagai .xlsx.');
  if(/\.xls$/i.test(name)&&!ole)throw new ImportFileError('Isi file tidak sesuai format Excel. Simpan ulang sebagai .xls atau .xlsx.');
  if(zip)checkZip(bytes);
  if(/\.csv$/i.test(name)&&(zip||ole||bytes.includes(0)||/^\s*</.test(new TextDecoder().decode(bytes.subarray(0,256)))))throw new ImportFileError('Isi file CSV tidak valid. Gunakan template SakuNota.');
  const book=XLSX.read(data,{type:'array',sheets:0,sheetRows:IMPORT_LIMITS.rows+2,dense:true,raw:true,cellDates:true,UTC:false,cellFormula:true,cellHTML:false,cellNF:true,cellStyles:false,cellText:false,bookVBA:false,bookDeps:false,bookFiles:false});
  const sheet=book.Sheets[book.SheetNames[0]];
  if(!sheet||!sheet['!ref'])throw new ImportFileError('Lembar pertama kosong. Gunakan template SakuNota.');
  const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']);
  if(range.e.r>=IMPORT_LIMITS.rows+1||range.e.c>=IMPORT_LIMITS.columns)throw new ImportFileError('Maksimal 5.000 baris data dan 64 kolom per file.');
  const dense=sheet['!data'] as XLSX.CellObject[][]|undefined;
  if(dense)for(const row of dense)if(row)for(const cell of row)if(cell){
    if(cell.f)throw new ImportFileError('File berisi rumus. Salin dan tempel sebagai nilai sebelum diimpor.');
    if(cell.t==='e')throw new ImportFileError('File berisi sel yang bermasalah. Periksa lalu simpan ulang.');
    if(typeof cell.v==='string'&&cell.v.length>IMPORT_LIMITS.cellChars)throw new ImportFileError('Teks dalam sel terlalu panjang. Maksimal 4.000 karakter.');
  }
  const headerCells=dense?.find(row=>row?.some(cell=>cell?.v!==null&&cell?.v!==undefined&&cell.v!==''));
  if(dense&&headerCells)for(const row of dense)if(row)headerCells.forEach((header,index)=>{const cell=row[index];if(/sku|kode|barcode/i.test(String(header?.v??''))&&cell?.t==='n'&&cell.z){cell.v=XLSX.utils.format_cell(cell);cell.t='s';}});
  const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:null,blankrows:false});
  if(rows.length<2)throw new ImportFileError('File belum memiliki baris data.');
  const headers=rows[0].map(value=>String(value??'').trim()),seen=new Set<string>();
  if(!headers.some(Boolean))throw new ImportFileError('Judul kolom belum tersedia. Gunakan template SakuNota.');
  for(const header of headers){const key=header.toLowerCase();if(!key)continue;if(['__proto__','constructor','prototype'].includes(key)||seen.has(key))throw new ImportFileError('Judul kolom tidak valid atau berulang. Gunakan template SakuNota.');seen.add(key);}
  return rows.slice(1).map(row=>{const result:ImportRow=Object.create(null);headers.forEach((header,index)=>{if(header)result[header]=row[index] as ImportRow[string]??null;});return result;});
}
