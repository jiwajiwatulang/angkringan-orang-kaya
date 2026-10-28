import {paymentEntries} from './multidevice/posDashboard';
export function storeReports(orders:any[],shifts:any[],now=new Date()){
  const end=new Date(now);end.setHours(0,0,0,0);end.setDate(end.getDate()+1);
  const start=new Date(end);start.setDate(start.getDate()-30);
  const entries=paymentEntries(orders),recent=entries.filter(e=>new Date(e.at)>=start&&new Date(e.at)<end);
  const hours=Array.from({length:24},(_,hour)=>{
    const rows=recent.filter(e=>new Date(e.at).getHours()===hour);
    return {hour,label:`${String(hour).padStart(2,'0')}.00`,net:rows.reduce((n,r)=>n+r.amount-r.refund,0),count:new Set(rows.filter(r=>r.amount>0).map(r=>r.orderId)).size};
  });
  // Last completed Monday–Sunday; no partial-week comparison or payment double counting.
  const monday=new Date(now);monday.setHours(0,0,0,0);monday.setDate(monday.getDate()-(monday.getDay()+6)%7);
  const week=new Date(monday);week.setDate(week.getDate()-7);
  const previous=new Date(week);previous.setDate(previous.getDate()-7);
  const sum=(from:Date,to:Date)=>entries.filter(e=>new Date(e.at)>=from&&new Date(e.at)<to);
  const current=sum(week,monday),before=sum(previous,week);
  const net=current.reduce((n,r)=>n+r.amount-r.refund,0),previousNet=before.reduce((n,r)=>n+r.amount-r.refund,0);
  const count=new Set(current.filter(r=>r.amount>0).map(r=>r.orderId)).size;
  const closed=shifts.filter(s=>s.status==='closed'&&new Date(s.endTime)>=week&&new Date(s.endTime)<monday);
  const differences=closed.filter(s=>s.cashDifference!==0).length;
  const received=current.reduce((n,r)=>n+r.amount,0),refunds=current.reduce((n,r)=>n+r.refund,0);
  const growth=previousNet>0?(net-previousNet)/previousNet:null;
  const rules=[{label:'Penjualan dibanding minggu sebelumnya',points:growth===null?null:growth>=0?40:growth>=-.1?30:15,max:40},{label:'Shift tanpa selisih kas',points:closed.length?Math.round(35*(closed.length-differences)/closed.length):null,max:35},{label:'Pengembalian dibanding pembayaran',points:received>0?Math.round(25*(1-Math.min(1,refunds/received))):null,max:25}];
  const ready=count>=5&&rules.every(r=>r.points!==null),score=ready?rules.reduce((n,r)=>n+r.points!,0):null;
  const grade=score===null?null:score>=90?'A':score>=75?'B':score>=60?'C':score>=45?'D':'E';
  const suggestions:string[]=[];
  if(differences)suggestions.push(`Periksa ${differences} shift dengan selisih kas.`);
  if(growth!==null&&growth<0)suggestions.push('Tinjau produk terlaris dan waktu penjualan sebelum menambah persediaan.');
  if(refunds>0)suggestions.push('Periksa alasan pengembalian pada Riwayat Transaksi.');
  if(!suggestions.length&&ready)suggestions.push('Pertahankan pencatatan kas dan persediaan produk terlaris.');
  if(!ready)suggestions.push('Nilai tersedia setelah dua minggu penjualan, minimal 5 nota lunas dan satu shift tutup pada minggu yang dinilai.');
  return {hours,weekly:{start:week,end:monday,net,previousNet,count,differences,refunds,growth,rules,score,grade,suggestions}};
}
export function cashierReport(orders:any[],shifts:any[],audits:any[]){
  const people=new Map<string,{id:string;name:string;received:number;refunds:number;receipts:Set<number>;shifts:number;difference:number;voids:number}>();
  const person=(id:string,name:string)=>{if(!people.has(id))people.set(id,{id,name,received:0,refunds:0,receipts:new Set(),shifts:0,difference:0,voids:0});return people.get(id)!;};
  for(const order of orders)for(const p of order.payments||[]){if(!['completed','refunded'].includes(p.status))continue;const row=person(p.mdOperatorId||p.operatorName||'Kasir',p.operatorName||'Kasir');row.received+=p.amount;row.receipts.add(order.id);if(p.status==='refunded')row.refunds+=p.mdRefundAmount??p.amount;}
  for(const shift of shifts){const row=person(shift.mdOperatorId||shift.operatorName,shift.operatorName);row.shifts++;if(shift.status==='closed')row.difference+=Math.abs(shift.cashDifference||0);}
  for(const audit of audits)if(audit.action==='VOID'){const row=person(audit.mdOperatorId||audit.operator,audit.operator);row.voids++;}
  return [...people.values()].map(r=>({...r,receipts:r.receipts.size}));
}
