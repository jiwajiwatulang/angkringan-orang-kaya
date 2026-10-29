import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';
import {parseMenuFile,parseHistoricalTransactionsFile} from '../src/lib/excelUtils';
import {parseSpreadsheet} from '../src/lib/spreadsheetParser';
import {readImportRows} from '../src/lib/spreadsheetImport';
import {IMPORT_LIMITS,importRupiah,importDate} from '../src/lib/importLimits';
import {db} from '../src/lib/dexie';
import {bulkImportMenus,importHistoricalTransactions} from '../src/lib/api';

function workbook(rows:unknown[][],type:'xlsx'|'biff8'='xlsx'){
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(rows),'Data');
  return XLSX.write(book,{type:'array',bookType:type}) as ArrayBuffer;
}
const menuHeaders=['SKU','Nama Produk','Harga (Rp)','Kategori'];
const historyHeaders=['Nomor Nota','Tanggal','Total Nominal','Metode Bayar','Daftar Item'];
test('patched spreadsheet library reads normal XLSX, XLS and CSV without changing barcode or rupiah',async()=>{
  assert.equal(XLSX.version,'0.20.3');
  for(const [type,ext] of [['xlsx','xlsx'],['biff8','xls']] as const){
    const result=await parseMenuFile(new File([workbook([menuHeaders,['001234','Kopi',12000,'Minuman']],type)],'menu.'+ext));
    assert.deepEqual(result.validRows,[{sku:'001234',nama:'Kopi',harga:12000,kategori:'Minuman',isSoldOut:false}]);
  }
  const csv=await parseMenuFile(new File(['SKU,Nama,Harga\n001234,Kopi,"Rp12.000"\n001235,Teh,"Rp 4.500,00"'],'menu.csv'));
  assert.deepEqual(csv.validRows.map(r=>[r.sku,r.harga]),[['001234',12000],['001235',4500]]);
  for(const [input,expected] of [[0,0],['12000',12000],['12.000',12000],['Rp12.000,00',12000],['12000.00',12000]] as const)assert.equal(importRupiah(input),expected);
  for(const input of ['',null,Infinity,NaN,'Rp -1','1e3','12,5','abc12000','12,000','12.34'])assert.equal(importRupiah(input),undefined,String(input));
});
test('normal Excel numeric barcode formatting is preserved and blank product names are rejected',async()=>{
  const sheet=XLSX.utils.aoa_to_sheet([menuHeaders,[123,'Kopi',12000,'Minuman'],['2',null,4000,'Minuman']]);sheet.A2.z='000000';
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Data');
  const result=await parseMenuFile(new File([XLSX.write(book,{type:'array',bookType:'xlsx'})],'menu.xlsx'));
  assert.equal(result.validRows[0].sku,'000123');assert.equal(result.invalidRows.length,1);
});
test('invalid, oversized, truncated and oversized-expanded files fail before merchant writes',async()=>{
  for(const file of [new File([''],'empty.csv'),new File(['bad'],'bad.xlsx'),new File(['<html><table></table></html>'],'bad.csv'),new File(['bad'],'bad.exe'),new File([new Uint8Array(IMPORT_LIMITS.bytes+1)],'large.csv')])await assert.rejects(readImportRows(file));
  const bytes=new Uint8Array(workbook([menuHeaders,['1','Kopi',12000,'Minuman']]));
  const view=new DataView(bytes.buffer);let directory=-1;for(let i=0;i<bytes.length-46;i++)if(view.getUint32(i,true)===0x02014b50){directory=i;break;}
  assert.ok(directory>=0);view.setUint32(directory+24,IMPORT_LIMITS.expandedBytes+1,true);
  assert.throws(()=>parseSpreadsheet(bytes.buffer,'expanded.xlsx'),/terlalu besar/);
  assert.throws(()=>parseSpreadsheet(bytes.buffer.slice(0,bytes.length-20),'truncated.xlsx'));
});
test('row, column, cell, header and formula limits reject unsafe workbooks',()=>{
  for(const rows of [Array.from({length:5002},(_,i)=>i?['x',1]:['Nama','Harga']),[Array.from({length:65},(_,i)=>'Kolom'+i),['x']],[[...menuHeaders],['1','x'.repeat(4001),1000,'Minuman']], [['__proto__','Harga'],['bad',1000]],[['Nama','nama'],['A','B']]])assert.throws(()=>parseSpreadsheet(workbook(rows),'limit.xlsx'));
  const sheet=XLSX.utils.aoa_to_sheet([menuHeaders,['1','Kopi',1000,'Minuman']]);sheet.C2={t:'n',v:1000,f:'500+500'};
  const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,sheet,'Data');
  assert.throws(()=>parseSpreadsheet(XLSX.write(book,{type:'array',bookType:'xlsx'}),'formula.xlsx'),/rumus/);
  assert.equal(({} as any).polluted,undefined);
});
test('historical dates and methods are validated and old item descriptions never multiply the receipt total',async()=>{
  const result=await parseHistoricalTransactionsFile(new File([workbook([historyHeaders,['OLD-1','2025-12-01 19:30','Rp85.000','Cash','Ayam x 2, Teh x 3'],['BAD-1','2025-02-31',1000,'Cash',''],['BAD-2','2025-12-01',1000,'Unknown',''],['OLD-1','2025-12-01 19:30',85000,'Cash','']])],'history.xlsx'));
  assert.equal(result.validTransactions.length,1);assert.equal(result.invalidRows.length,3);
  const t=result.validTransactions[0];assert.equal(t.total,85000);assert.equal(t.items.reduce((n:number,i:any)=>n+i.qty*i.harga,0),85000);assert.ok(t.items[0].nama.includes('Ayam x 2, Teh x 3'));
  assert.equal(importDate('2025-02-31'),undefined);assert.equal(importDate('2025-01-01 25:00'),undefined);assert.equal(importDate('nonsense'),undefined);assert.equal(importDate('2025-01-01T12:00:00.000Z'),'2025-01-01T12:00:00.000Z');
});
test('a bad row or an insert failure rolls back imports; retry is idempotent and stock, payments and shifts stay intact',async()=>{
  await db.delete();await db.open();
  await bulkImportMenus([{sku:'KEPT',nama:'Beras',harga:18000,trackStock:true,stockQty:20}],{mode:'upsert'});
  const tables=['menuItems','orders','orderItems','payments','shifts','inventoryMovements','auditLogs'];
  const state=async()=>JSON.stringify(await Promise.all(tables.map(name=>db.table(name).toArray())));
  const before=await state();
  await assert.rejects(bulkImportMenus([{nama:'New',harga:1000},{nama:'Bad',harga:Infinity}],{mode:'upsert'}));assert.equal(await state(),before);
  const a={receiptNumber:'OLD-A',createdAt:'2025-01-01T12:00:00Z',total:1000,paymentMethod:'Cash' as const,items:[{nama:'Historical',qty:1,harga:1000}]};
  await assert.rejects(importHistoricalTransactions([a,{...a,receiptNumber:'BAD',total:-1}]));assert.equal(await state(),before);
  const fail=()=>{throw new Error('simulated disk failure');};db.table('payments').hook('creating',fail);
  try{await assert.rejects(importHistoricalTransactions([a]),/simulated/);}finally{db.table('payments').hook('creating').unsubscribe(fail);}
  assert.equal(await state(),before,'all earlier order/item writes rolled back');
  const done=await importHistoricalTransactions([a]);assert.equal(done.importedCount,1);
  const retry=await importHistoricalTransactions([a]);assert.equal(retry.importedCount,0);assert.equal(retry.skippedCount,1);assert.equal(await db.table('orders').count(),1);assert.equal(await db.table('payments').count(),1);
  const after=await state();await assert.rejects(importHistoricalTransactions([{...a,receiptNumber:'NEW-B'},{...a,total:2000}]),/isi berbeda/);assert.equal(await state(),after,'conflict rolls back earlier inserts');
  assert.equal((await db.table('menuItems').where('sku').equals('KEPT').first()).stockQty,20);assert.equal(await db.table('shifts').count(),0);
});
test('browser timeout and cancellation terminate the isolated reader instead of accepting stale results',async(t)=>{
  const oldWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),oldWorker=Object.getOwnPropertyDescriptor(globalThis,'Worker');
  let created!:(value:any)=>void;let spawned=new Promise<any>(resolve=>{created=resolve;});
  class FakeWorker{onmessage:any;onerror:any;terminated=false;constructor(){created(this);}postMessage(){}terminate(){this.terminated=true;}}
  Object.defineProperty(globalThis,'window',{value:{},configurable:true});Object.defineProperty(globalThis,'Worker',{value:FakeWorker,configurable:true});
  t.mock.timers.enable({apis:['setTimeout']});
  try{
    const pending=readImportRows(new File(['Nama,Harga\nKopi,1000'],'menu.csv'));const rejected=assert.rejects(pending,/terlalu lama/);const worker=await spawned;t.mock.timers.tick(IMPORT_LIMITS.timeoutMs+1);await rejected;assert.equal(worker.terminated,true);
    spawned=new Promise(resolve=>{created=resolve;});const controller=new AbortController();const cancelled=readImportRows(new File(['Nama,Harga\nKopi,1000'],'menu.csv'),controller.signal);const cancelledResult=assert.rejects(cancelled,{name:'AbortError'});const second=await spawned;controller.abort();await cancelledResult;assert.equal(second.terminated,true);
  }finally{t.mock.timers.reset();if(oldWindow)Object.defineProperty(globalThis,'window',oldWindow);else Reflect.deleteProperty(globalThis,'window');if(oldWorker)Object.defineProperty(globalThis,'Worker',oldWorker);else Reflect.deleteProperty(globalThis,'Worker');}
});
