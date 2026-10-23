import {AccessError,assertId,integer,lineAmount,text,validateEnvelope,type AccessClaims,type CatalogProduct,type SaleLine,type StoreEvent} from './protocol';

export interface Entity {kind:string;id:string;value:Record<string,unknown>}
export type Lookup = (kind:string,id:string)=>Promise<Record<string,unknown>|undefined>;
function only(data:Record<string,unknown>,keys:string[]) {
  if(Object.keys(data).some(key=>!keys.includes(key))) throw new AccessError('Data tidak valid.',400);
}
function id(value:unknown):string {assertId(value);return value;}
function amount(value:unknown):number {return integer(value);}
function sum(a:number,b:number) {const result=a+b;if(!Number.isSafeInteger(result)) throw new AccessError('Jumlah terlalu besar.',400);return result;}
export async function project(event:StoreEvent,claims:AccessClaims,lookup:Lookup):Promise<Entity[]> {
  validateEnvelope(event,claims);
  const d=event.data, entityId=event.entityId;
  const existing=await lookup(event.kind.split('.')[0],entityId);
  const owned=(row:Record<string,unknown>)=>{
    if(row.deviceId!==claims.deviceId || row.operatorId!==event.operatorId) throw new AccessError('Transaksi ini milik kasir lain.');
  };
  const shift=async(value:unknown)=>{
    const shiftId=id(value),row=await lookup('shift',shiftId);
    if(!row || row.status!=='open') throw new AccessError('Mulai shift terlebih dahulu.',409);
    owned(row);return {shiftId,row};
  };
  if(event.kind==='catalog.put') {
    only(d,['expectedVersion','name','price','cost','unit','priceBasis','active']);
    const expected=integer(d.expectedVersion);
    if(expected!==Number(existing?.version||0)) throw new AccessError('Data harga sudah berubah. Perbarui data.',409);
    if(d.unit!=='pcs' && d.unit!=='g') throw new AccessError('Satuan tidak valid.',400);
    const basis=integer(d.priceBasis,true);
    if(existing && existing.unit!==d.unit) throw new AccessError('Satuan barang yang sudah tersimpan tidak dapat diganti.',409);
    if((d.unit==='pcs' && basis!==1) || (d.unit==='g' && ![100,1000].includes(basis))) throw new AccessError('Satuan tidak valid.',400);
    if(typeof d.active!=='boolean') throw new AccessError('Data tidak valid.',400);
    const product:CatalogProduct={id:entityId,version:expected+1,name:text(d.name),price:amount(d.price),cost:d.cost===null?null:amount(d.cost),unit:d.unit,priceBasis:basis,active:d.active};
    return [{kind:'catalog',id:entityId,value:{...product}},{kind:'catalogVersion',id:`${entityId}_${product.version}`,value:{...product}}];
  }
  if(event.kind==='settings.put') {
    only(d,['expectedVersion','storeName','receiptFooter']);
    const expected=integer(d.expectedVersion);
    if(expected!==Number(existing?.version||0)) throw new AccessError('Pengaturan sudah berubah. Perbarui data.',409);
    if(typeof d.receiptFooter!=='string'||d.receiptFooter.length>200) throw new AccessError('Catatan terlalu panjang.',400);
    return [{kind:'settings',id:entityId,value:{version:expected+1,storeName:text(d.storeName),receiptFooter:d.receiptFooter}}];
  }
  if(event.kind==='shift.open') {
    only(d,['startingCash']);if(existing) throw new AccessError('Shift sudah tercatat.',409);
    const live=await lookup('activeShift',`${claims.deviceId}_${event.operatorId}`);
    if(live?.shiftId) throw new AccessError('Tutup shift sebelumnya.',409);
    return [{kind:'shift',id:entityId,value:{deviceId:claims.deviceId,operatorId:event.operatorId,status:'open',startingCash:amount(d.startingCash),cashSales:0,nonCashSales:0,cashRefunds:0,nonCashRefunds:0}},
      {kind:'activeShift',id:`${claims.deviceId}_${event.operatorId}`,value:{shiftId:entityId,deviceId:claims.deviceId,operatorId:event.operatorId}}];
  }
  if(event.kind==='shift.close') {
    only(d,['actualCash']);if(!existing || existing.status!=='open') throw new AccessError('Shift sudah ditutup.',409);owned(existing);
    const actualCash=amount(d.actualCash),expectedCash=sum(Number(existing.startingCash),Number(existing.cashSales))-Number(existing.cashRefunds);
    return [{kind:'shift',id:entityId,value:{...existing,status:'closed',actualCash,expectedCash,cashDifference:actualCash-expectedCash}},
      {kind:'activeShift',id:`${claims.deviceId}_${event.operatorId}`,value:{shiftId:null,deviceId:claims.deviceId,operatorId:event.operatorId}}];
  }
  if(event.kind==='order.create') {
    only(d,['shiftId','lines','customerName']);if(existing) throw new AccessError('Nota sudah tercatat.',409);
    const {shiftId}=await shift(d.shiftId);
    if(!Array.isArray(d.lines)||!d.lines.length||d.lines.length>200) throw new AccessError('Pilih barang terlebih dahulu.',400);
    const lines:Record<string,unknown>[]=[],stocks=new Map<string,Record<string,unknown>>();let total=0;
    for(const raw of d.lines){
      if(!raw || typeof raw!=='object') throw new AccessError('Barang tidak valid.',400);
      only(raw,['productId','catalogVersion','name','quantity','unit','price','priceBasis']);
      const line=raw as unknown as SaleLine,productId=id(line.productId),version=integer(line.catalogVersion,true),quantity=integer(line.quantity,true);
      const product=await lookup('catalogVersion',`${productId}_${version}`);
      if(!product || !product.active || line.price!==product.price || line.priceBasis!==product.priceBasis || line.unit!==product.unit || line.name!==product.name) throw new AccessError('Harga barang perlu diperbarui.',409);
      const lineTotal=lineAmount(quantity,Number(product.price),Number(product.priceBasis));total=sum(total,lineTotal);
      lines.push({...line,cost:product.cost,lineTotal,returnedQuantity:0});
      const stock=stocks.get(productId)||await lookup('stock',productId)||{quantity:0};
      const remaining=sum(Number(stock.quantity),-quantity);
      stocks.set(productId,{quantity:remaining,needsReview:remaining<0});
    }
    return [{kind:'order',id:entityId,value:{deviceId:claims.deviceId,operatorId:event.operatorId,shiftId,lines,total,paid:0,refunded:0,customerName:d.customerName===undefined?'':text(d.customerName),status:'unpaid'}},
      ...Array.from(stocks,([id,value])=>({kind:'stock',id,value}))];
  }
  if(event.kind==='payment.record') {
    only(d,['orderId','shiftId','amount','method']);if(existing) throw new AccessError('Pembayaran sudah tercatat.',409);
    const orderId=id(d.orderId),order=await lookup('order',orderId);
    if(!order) throw new AccessError('Nota belum diterima. Perbarui data.',409);owned(order);
    const {shiftId,row}=await shift(d.shiftId);
    if(order.shiftId!==shiftId) throw new AccessError('Gunakan shift nota ini.',409);
    const paid=integer(d.amount,true),remaining=Number(order.total)-Number(order.paid);
    if(paid>remaining) throw new AccessError('Pembayaran melebihi tagihan.',409);
    if(!['Cash','QRIS','Transfer'].includes(String(d.method))) throw new AccessError('Pilih pembayaran.',400);
    const field=d.method==='Cash'?'cashSales':'nonCashSales';
    return [{kind:'payment',id:entityId,value:{orderId,shiftId,deviceId:claims.deviceId,operatorId:event.operatorId,amount:paid,method:d.method,refunded:0}},
      {kind:'order',id:orderId,value:{...order,paid:sum(Number(order.paid),paid),status:paid===remaining?'paid':'unpaid'}},
      {kind:'shift',id:shiftId,value:{...row,[field]:sum(Number(row[field]),paid)}}];
  }
  if(event.kind==='refund.record') {
    only(d,['paymentId','shiftId','amount','reason','returns']);if(existing) throw new AccessError('Pengembalian sudah tercatat.',409);
    const paymentId=id(d.paymentId),payment=await lookup('payment',paymentId);
    if(!payment) throw new AccessError('Pembayaran belum diterima.',409);
    const orderId=id(payment.orderId),order=await lookup('order',orderId);
    if(!order) throw new AccessError('Nota belum diterima.',409);
    const {shiftId,row}=await shift(d.shiftId),refund=integer(d.amount,true);
    if(refund>Number(payment.amount)-Number(payment.refunded)) throw new AccessError('Pengembalian melebihi pembayaran.',409);
    const lines=structuredClone(order.lines) as Record<string,unknown>[];
    const stocks=new Map<string,Record<string,unknown>>();
    let returnAmount=0;
    if(d.returns!==undefined){
      if(!Array.isArray(d.returns)||d.returns.length>200) throw new AccessError('Barang tidak valid.',400);
      for(const returned of d.returns){
        only(returned,['line','quantity']);const index=integer(returned.line),quantity=integer(returned.quantity,true),line=lines[index];
        if(!line||quantity>Number(line.quantity)-Number(line.returnedQuantity)) throw new AccessError('Jumlah pengembalian tidak sesuai.',409);
        const before=Number(line.returnedQuantity),after=before+quantity;
        returnAmount=sum(returnAmount,lineAmount(after,Number(line.price),Number(line.priceBasis))- (before===0?0:lineAmount(before,Number(line.price),Number(line.priceBasis))));
        line.returnedQuantity=after;
        const productId=id(line.productId),stock=stocks.get(productId)||await lookup('stock',productId)||{quantity:0};
        const next=sum(Number(stock.quantity),quantity);stocks.set(productId,{quantity:next,needsReview:next<0});
      }
      if(returnAmount!==refund) throw new AccessError('Nominal pengembalian tidak sesuai barang.',409);
    }
    const field=payment.method==='Cash'?'cashRefunds':'nonCashRefunds';
    return [{kind:'refund',id:entityId,value:{paymentId,orderId,shiftId,amount:refund,reason:text(d.reason,300),deviceId:claims.deviceId,operatorId:event.operatorId,returns:d.returns||[]}},
      {kind:'payment',id:paymentId,value:{...payment,refunded:sum(Number(payment.refunded),refund)}},
      {kind:'order',id:orderId,value:{...order,lines,refunded:sum(Number(order.refunded),refund)}},
      {kind:'shift',id:shiftId,value:{...row,[field]:sum(Number(row[field]),refund)}},
      ...Array.from(stocks,([id,value])=>({kind:'stock',id,value}))];
  }
  if(event.kind==='stock.adjust') {
    only(d,['delta','reason']);
    if(typeof d.delta!=='number'||!Number.isSafeInteger(d.delta)||d.delta===0) throw new AccessError('Jumlah tidak valid.',400);
    if(!await lookup('catalog',entityId)) throw new AccessError('Barang tidak ditemukan.',404);
    const quantity=sum(Number(existing?.quantity||0),d.delta);
    return [{kind:'stock',id:entityId,value:{quantity,needsReview:quantity<0,reason:text(d.reason,300)}}];
  }
  throw new AccessError('Tindakan tidak tersedia.',400);
}

export function visibleEntity(entity:Entity,claims:AccessClaims):Entity|undefined {
  if(claims.role==='owner') return entity;
  if(entity.kind==='catalog'||entity.kind==='catalogVersion') {
    const {cost:_cost,...value}=entity.value;return {...entity,value};
  }
  if(entity.kind==='settings'||entity.kind==='stock') return entity;
  if(['order','payment','shift','activeShift'].includes(entity.kind) && entity.value.deviceId===claims.deviceId && entity.value.operatorId===claims.employeeId){
    const value={...entity.value};
    if(Array.isArray(value.lines)) value.lines=value.lines.map((line:Record<string,unknown>)=>{const {cost:_cost,...safe}=line;return safe;});
    return {...entity,value};
  }
  return undefined;
}
