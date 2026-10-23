import {buildSalesSeries,dashboardPeriod,type DashboardRange,localDateKey} from '../dashboardMetrics';
export function posDashboard(orders:any[],range:DashboardRange,now=new Date()){
  const period=dashboardPeriod(range,now);
  const entries:{at:string;amount:number;refund:number;orderId:number;method:string}[]=[];
  for(const order of orders){
    const payments=(order.payments||[]).filter((p:any)=>['completed','refunded'].includes(p.status));
    let oldRefundRemaining=order.status==='void'?Number(order.isRefunded?order.refundAmount||0:0):undefined;
    for(const p of payments){
      entries.push({at:p.paidAt||order.createdAt,amount:p.amount,refund:0,orderId:order.id,method:p.paymentMethod});
      if(p.status==='refunded'){
        const refund=p.mdRefundAmount??(oldRefundRemaining!==undefined?Math.min(p.amount,oldRefundRemaining):p.amount);
        if(oldRefundRemaining!==undefined)oldRefundRemaining-=refund;
        if(refund>0)entries.push({at:p.refundedAt||order.voidedAt||order.updatedAt,amount:0,refund,orderId:order.id,method:p.mdRefundMethod||p.paymentMethod});
      }
    }
    if(!payments.length&&order.status==='paid'&&order.total>0)entries.push({at:order.createdAt,amount:order.total,refund:0,orderId:order.id,method:order.paymentMethod});
  }
  const between=(start:Date,end:Date)=>entries.filter(entry=>{const t=new Date(entry.at).getTime();return t>=start.getTime()&&t<end.getTime();});
  const summarize=(rows:typeof entries)=>({received:rows.reduce((n,row)=>n+row.amount,0),refunded:rows.reduce((n,row)=>n+row.refund,0),net:rows.reduce((n,row)=>n+row.amount-row.refund,0),count:new Set(rows.filter(row=>row.amount>0).map(row=>row.orderId)).size});
  const rows=between(period.start,period.end),days=[];
  for(const day=new Date(period.start);day<period.end;day.setDate(day.getDate()+1)){
    const key=localDateKey(day);days.push({key,label:day.toLocaleDateString('id-ID',{day:'numeric',month:'short'}),...summarize(rows.filter(row=>localDateKey(row.at)===key))});
  }
  const summary=summarize(rows);
  const methods=['Cash','QRIS','Transfer'].map(method=>{
    const matching=rows.filter(row=>row.method===method),total=matching.reduce((n,row)=>n+row.amount-row.refund,0);
    return {method,total,count:new Set(matching.filter(row=>row.amount>0).map(row=>row.orderId)).size,percent:summary.received>0?Math.max(0,Math.round(total/summary.received*100)):0};
  });
  // Unit/product panels count a receipt once, when its final payment settles it.
  const settled=(start:Date,end:Date)=>orders.filter(order=>{
    if(order.status!=='paid'||order.isRefunded)return false;
    const payments=(order.payments||[]).filter((p:any)=>p.status==='completed');
    const at=payments.length?Math.max(...payments.map((p:any)=>new Date(p.paidAt||order.createdAt).getTime())):new Date(order.createdAt).getTime();
    return at>=start.getTime()&&at<end.getTime();
  });
  const chart=buildSalesSeries(entries.map(row=>({createdAt:row.at,total:row.amount-row.refund})),range,now);
  // buildSalesSeries counts ledger entries; the UI needs distinct paid receipts per bucket.
  const hourly=range==='today'||range==='yesterday';
  for(let i=0;i<chart.length;i++){
    const start=new Date(period.start),end=new Date(period.start);
    if(hourly){start.setHours(start.getHours()+i*2);end.setHours(end.getHours()+(i+1)*2);}
    else{start.setDate(start.getDate()+i);end.setDate(end.getDate()+i+1);}
    chart[i].count=summarize(between(start,end)).count;
  }
  return {...summary,previous:summarize(between(period.previousStart,period.previousEnd)),days,chart,methods,currentOrders:settled(period.start,period.end),previousOrders:settled(period.previousStart,period.previousEnd)};
}
