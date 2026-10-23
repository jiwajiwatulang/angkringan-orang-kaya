import {test} from 'node:test';
import assert from 'node:assert/strict';
import {posDashboard} from '../src/lib/multidevice/posDashboard';
test('owner totals retain partial collections and post refunds on their actual day without duplicating notes',()=>{
  const now=new Date(2026,9,23,12),today=new Date(2026,9,23,10).toISOString(),yesterday=new Date(2026,9,22,10).toISOString();
  const order={id:1,status:'unpaid',total:30000,createdAt:yesterday,payments:[{amount:10000,status:'refunded',paymentMethod:'Cash',paidAt:yesterday,refundedAt:today,mdRefundAmount:10000},{amount:20000,status:'completed',paymentMethod:'QRIS',paidAt:yesterday}]};
  const a=posDashboard([order],'today',now),b=posDashboard([order],'yesterday',now),both=posDashboard([order],'7days',now);
  assert.equal(a.net,-10000);assert.equal(a.refunded,10000);assert.equal(a.count,0);
  assert.equal(b.net,30000);assert.equal(b.count,1);assert.equal(both.net,20000);assert.equal(both.count,1);
  assert.equal(a.days[0].net,-10000);
});
test('cancelled receipt retains unreturned money and legacy partial refunds do not remove the full sale',()=>{
  const now=new Date(2026,9,23,12),at=new Date(2026,9,23,10).toISOString();
  const order={id:1,status:'void',isRefunded:true,refundAmount:4000,total:10000,createdAt:at,voidedAt:at,payments:[{amount:10000,status:'refunded',paymentMethod:'QRIS',paidAt:at,refundedAt:at,mdRefundAmount:4000}]};
  assert.equal(posDashboard([order],'today',now).net,6000);
  const legacy=structuredClone(order);delete (legacy.payments[0] as any).mdRefundAmount;
  assert.equal(posDashboard([legacy],'today',now).net,6000);
  assert.equal(posDashboard([{...order,isRefunded:false,refundAmount:0,payments:[{...order.payments[0],mdRefundAmount:0}]}],'today',now).net,10000);
});

test('approved chart buckets and methods follow actual collections and dated refunds',()=>{
  const now=new Date(2026,9,23,12),yesterday=new Date(2026,9,22,10).toISOString(),today=new Date(2026,9,23,10).toISOString();
  const order={id:1,status:'paid',total:30000,createdAt:yesterday,items:[{qty:3}],payments:[{amount:10000,status:'completed',paymentMethod:'Cash',paidAt:yesterday},{amount:20000,status:'completed',paymentMethod:'QRIS',paidAt:today}]};
  const report=posDashboard([order],'today',now);
  assert.equal(report.chart.length,12);assert.equal(report.chart.reduce((n,p)=>n+p.omzet,0),20000);
  assert.equal(report.chart[5].count,1);assert.equal(report.methods.find(m=>m.method==='Cash')?.total,0);
  assert.equal(report.methods.find(m=>m.method==='QRIS')?.total,20000);
  assert.equal(report.currentOrders.length,1);assert.equal(report.previousOrders.length,0);
  const refund=posDashboard([{...order,status:'unpaid',payments:[{...order.payments[0],status:'refunded',refundedAt:today,mdRefundAmount:10000}]}],'today',now);
  assert.equal(refund.chart[5].omzet,-10000);assert.equal(refund.chart[5].count,0);
  assert.equal(refund.methods.find(m=>m.method==='Cash')?.total,-10000);
});
