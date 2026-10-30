// Append-only operational records. Amounts are whole rupiah; attendance never changes a cash shift.
export type OperationKind='attendance.in'|'attendance.out'|'loan'|'repayment'|'commission'|'commission.paid'|'kitchen';
export type KitchenStage='waiting'|'preparing'|'ready'|'served';
export interface OperationRecord {
  id?:number; kind:OperationKind; employeeId:string; employeeName:string; at:string;
  amount?:number; note?:string; source?:'laci'|'rekening'; shiftId?:number; cashMovementId?:number;
  orderId?:number; orderItemId?:number; stage?:KitchenStage; sessionId?:string; previousId?:string;
  rate?:number; basisAmount?:number; mdId?:string; lineSignature?:string;
  ignored?:boolean; activeSessionId?:string;
}
export function kitchenSignature(item:{qty?:number;namaMenu?:string;selectedModifiers?:unknown[]}){return JSON.stringify([item.qty,item.namaMenu||'',item.selectedModifiers||[]]);}
export const kitchenStages:KitchenStage[]=['waiting','preparing','ready','served'];
export const kitchenLabels:Record<KitchenStage,string>={waiting:'Menunggu',preparing:'Disiapkan',ready:'Siap',served:'Disajikan'};
export function supportsKitchen(businessType?:string){return ['warung','restoran','kafe'].includes(businessType||'warung');}
export function kitchenItemStage(item:{id?:number;qty?:number;namaMenu?:string;selectedModifiers?:unknown[]},records:OperationRecord[]):KitchenStage{
  const previous=records.filter(row=>row.kind==='kitchen'&&row.orderItemId===item.id).at(-1);
  return previous?.lineSignature===kitchenSignature(item)?previous.stage||'waiting':'waiting';
}
export function wholeMoney(value:unknown,positive=false):number {
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<(positive?1:0)||value>1_000_000_000_000)throw new Error('Jumlah tidak valid');
  return value;
}
export function validateOperation(row:OperationRecord){
  if(!['attendance.in','attendance.out','loan','repayment','commission','commission.paid','kitchen'].includes(row.kind))throw new Error('Catatan tidak valid');
  if(typeof row.employeeId!=='string'||!row.employeeId.trim()||row.employeeId.length>160||typeof row.employeeName!=='string'||!row.employeeName.trim()||row.employeeName.length>120)throw new Error('Pilih karyawan');
  if(typeof row.at!=='string'||!Number.isFinite(Date.parse(row.at))||Date.parse(row.at)>Date.now()+60000)throw new Error('Waktu tidak valid');
  if(row.note!=null&&(typeof row.note!=='string'||row.note.length>240))throw new Error('Catatan maksimal 240 karakter');
  if(['loan','repayment','commission','commission.paid'].includes(row.kind))wholeMoney(row.amount,true);
  if(['loan','repayment','commission.paid'].includes(row.kind)&&!['laci','rekening'].includes(row.source||''))throw new Error('Pilih sumber uang');
  if(row.kind.startsWith('attendance.')&&!row.sessionId)throw new Error('Absensi tidak valid');
  if(row.kind==='commission'){
    wholeMoney(row.basisAmount,true);wholeMoney(row.rate,true);
    if(row.rate!>10000||Math.round(row.basisAmount!*row.rate!/10000)!==row.amount)throw new Error('Komisi tidak valid');
    if(!row.orderId||!row.orderItemId)throw new Error('Pilih layanan');
  }
  if(row.kind==='kitchen'&&(!row.orderId||!row.orderItemId||!kitchenStages.includes(row.stage!)))throw new Error('Pesanan tidak valid');
}
export function loanBalance(rows:OperationRecord[],employeeId:string){return rows.filter(r=>r.employeeId===employeeId).reduce((n,r)=>n+(r.kind==='loan'?r.amount||0:r.kind==='repayment'?-(r.amount||0):0),0);}
export function earnedCommission(amount:number,order:{status:string;total?:number;paidAmount?:number;isRefunded?:boolean}|undefined){
  if(!order||order.status==='void'||order.isRefunded)return 0;
  if(order.status==='paid')return amount;
  if(order.paidAmount===undefined)return order.status==='paid'?amount:0;
  if(!order.total)return 0;
  return Math.round(amount*Math.min(1,Math.max(0,order.paidAmount/order.total)));
}
export function commissionBalance(rows:OperationRecord[],employeeId:string,orders:{id?:number;status:string;total?:number;paidAmount?:number;isRefunded?:boolean}[]){
  return rows.filter(r=>r.employeeId===employeeId).reduce((n,r)=>n+(r.kind==='commission'?earnedCommission(r.amount||0,orders.find(o=>o.id===r.orderId)):r.kind==='commission.paid'?-(r.amount||0):0),0);
}
export function attendanceSummary(rows:OperationRecord[]){
  const sessions=new Map<string,{employeeId:string;name:string;start:string;end?:string}>();
  for(const row of rows)if(row.kind==='attendance.in'&&!row.ignored)sessions.set(row.sessionId!,{employeeId:row.employeeId,name:row.employeeName,start:row.at});
  for(const row of rows)if(row.kind==='attendance.in'&&row.ignored&&row.activeSessionId){const session=sessions.get(row.activeSessionId);if(session&&session.employeeId===row.employeeId&&Date.parse(row.at)<Date.parse(session.start))session.start=row.at;}
  for(const row of rows)if(row.kind==='attendance.out'&&!row.ignored){const session=sessions.get(row.sessionId!);if(session&&session.employeeId===row.employeeId)session.end=row.at;}
  return [...sessions.entries()].map(([id,s])=>({id,...s,minutes:s.end?Math.max(0,Math.round((Date.parse(s.end)-Date.parse(s.start))/60000)):null}));
}
export function priceSimulation(price:number,cost:number,units:number){
  wholeMoney(price,true);wholeMoney(cost);wholeMoney(units,true);
  const revenue=price*units,modal=cost*units;if(!Number.isSafeInteger(revenue)||!Number.isSafeInteger(modal))throw new Error('Jumlah terlalu besar');
  return {revenue,cost:modal,profit:revenue-modal,margin:(price-cost)/price*100};
}
export function estimateFinalTax(turnover:number,entity:'individual'|'single_company'|'cooperative'|'other',eligible:boolean){
  wholeMoney(turnover);if(!eligible||entity==='other'||turnover>4_800_000_000)return null;
  const taxable=Math.max(0,turnover-(entity==='individual'?500_000_000:0));
  return {turnover,taxable,tax:Math.round(taxable/200)};
}
