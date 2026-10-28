import {db} from './dexie';
import {requireMerchantAdmin} from './merchantAccess';
import {requireCashierWriteAccess} from './licenseGuard';
import {getPosScope} from './multidevice/posWire';
import {currentPosRuntime} from './multidevice/posRuntime';
import {readDeviceList,rememberDeviceList} from './multidevice/deviceListCache';
import {attendanceSummary,commissionBalance,kitchenSignature,kitchenStages,loanBalance,validateOperation,type OperationRecord} from './operations';

export async function operationEmployees(){
  const runtime=currentPosRuntime(),scope=getPosScope();
  if(runtime&&scope?.claims.role==='owner'){
    const cached=await readDeviceList(db,scope.claims);
    if(navigator.onLine){try{const list=await runtime.client.list();await rememberDeviceList(db,scope.claims,list);return list.employees.filter(e=>e.active);}catch(error){if([401,403].includes((error as {status:number}).status))throw error;if(!cached)throw error;}}
    return cached?.list.employees.filter(e=>e.active)||[];
  }
  if(scope?.claims.employeeId)return [{id:scope.claims.employeeId,name:scope.operatorName,active:1}];
  // Existing single-device cashiers are identified by the same names used in shifts.
  const shifts=await db.table('shifts').toArray();
  return [...new Set(shifts.map(s=>s.operatorName as string))].filter(Boolean).map(name=>({id:`local:${name}`,name,active:1}));
}
export async function saveOperation(input:Omit<OperationRecord,'id'|'at'>){
  await requireCashierWriteAccess();
  const scope=getPosScope();
  if(!input.kind.startsWith('attendance.')||scope?.claims.role!=='cashier')await requireMerchantAdmin();
  if(scope?.claims.role==='cashier'&&input.employeeId!==scope.claims.employeeId)throw new Error('Pilih akun kasir Anda');
  const row:OperationRecord={...input,at:new Date().toISOString(),sessionId:input.sessionId||crypto.randomUUID()};
  validateOperation(row);
  return db.transaction('rw',['operations','orders','orderItems','shifts','cashMovements','auditLogs'],async()=>{
    const records:OperationRecord[]=await db.table('operations').toArray();
    if(row.kind.startsWith('attendance.')){
      const active=attendanceSummary(records).find(s=>s.employeeId===row.employeeId&&!s.end);
      if(row.kind==='attendance.in'&&(active||records.some(r=>r.kind==='attendance.in'&&r.sessionId===row.sessionId)))throw new Error('Karyawan sudah absen masuk');
      if(row.kind==='attendance.out'&&(!active||active.id!==row.sessionId))throw new Error('Absensi masuk belum tersedia');
    }
    if(row.kind==='repayment'&&row.amount!>loanBalance(records,row.employeeId))throw new Error('Pembayaran melebihi sisa kasbon');
    if(row.kind==='commission'){
      const order=await db.table('orders').get(row.orderId!),item=await db.table('orderItems').get(row.orderItemId!);
      if(!order||order.status!=='paid'||order.isRefunded||!item||item.orderId!==row.orderId)throw new Error('Pilih layanan dari nota lunas');
      if(records.some(r=>r.kind==='commission'&&r.orderItemId===row.orderItemId))throw new Error('Komisi layanan sudah tercatat');
      const basis=Math.floor(item.qty*item.hargaSatuan*Math.max(0,order.subtotal-(order.discount||0))/order.subtotal);
      if(basis!==row.basisAmount)throw new Error('Nilai layanan berubah. Pilih kembali');
    }
    if(row.kind==='commission.paid'&&row.amount!>commissionBalance(records,row.employeeId,await db.table('orders').toArray()))throw new Error('Pembayaran melebihi komisi tersedia');
    if(row.kind==='kitchen'){
      const item=await db.table('orderItems').get(row.orderItemId!),order=await db.table('orders').get(row.orderId!);
      if(!item||item.orderId!==row.orderId||order?.status==='void')throw new Error('Pesanan sudah tidak tersedia');
      const previous=records.filter(r=>r.kind==='kitchen'&&r.orderItemId===row.orderItemId).at(-1);
      if((row.previousId||undefined)!==(previous?.mdId||previous?.sessionId)||kitchenStages.indexOf(row.stage!)!==kitchenStages.indexOf(previous?.lineSignature===kitchenSignature(item)?previous.stage!:'waiting')+1)throw new Error('Status pesanan berubah. Coba lagi');
    }
    if(row.kind==='kitchen'&&row.lineSignature!==kitchenSignature((await db.table('orderItems').get(row.orderItemId!))!))throw new Error('Pesanan berubah. Periksa kembali');
    if(['loan','repayment','commission.paid'].includes(row.kind)&&row.source==='laci'){
      const shift=await db.table('shifts').get(row.shiftId!);
      if(!shift||shift.status!=='open'||scope&&(shift.mdDeviceId!==scope.claims.deviceId||shift.mdOperatorId!==(scope.claims.employeeId||scope.claims.deviceId)))throw new Error('Buka shift di perangkat ini terlebih dahulu');
      row.cashMovementId=await db.table('cashMovements').add({shiftId:row.shiftId,type:row.kind==='repayment'?'in':'out',amount:row.amount,category:row.kind==='commission.paid'?'komisi':'kasbon_karyawan',paymentSource:'laci',reason:`${row.kind==='loan'?'Kasbon':row.kind==='repayment'?'Bayar kasbon':'Komisi'} · ${row.employeeName}`,operatorName:scope?.operatorName||'Pemilik',timestamp:row.at}) as number;
    }
    const id=await db.table('operations').add(row);
    await db.table('auditLogs').add({action:'OPERATION',amount:row.amount||0,reason:`${row.kind} · ${row.employeeName}${row.note?` · ${row.note}`:''}`,operator:scope?.operatorName||'Pemilik',timestamp:row.at});
    return id;
  });
}
