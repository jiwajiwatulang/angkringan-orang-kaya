import {AccessError,assertId,integer,lineAmount,OFFLINE_ACCESS_MS,type AccessClaims} from './protocol';
import {POS_TABLES,FOREIGN_KEYS,type PosCommit,type PosRow} from './posWire';
import type {Entity,Lookup} from './projection';
import {validateRetailDraft} from '../retailDraft';
import {validateOperation,kitchenSignature,kitchenStages,earnedCommission,type OperationRecord} from '../operations';

const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
const catalogMaster=(value:Record<string,any>)=>Object.fromEntries(Object.keys(value).sort().filter(key=>!['stockQty',...(value.trackStock?['isSoldOut']:[]),'costPrice','purchasePrice','totalCost','stockNeedsReview','mdVersion','mdCatalogVersion','mdId','mdStoreId','mdDeviceId','mdOperatorId'].includes(key)).map(key=>[key,value[key]]));
export async function projectPosCommit(event:PosCommit,claims:AccessClaims,lookup:Lookup,authorization:{ownerRecovery?:boolean}={}):Promise<Entity[]>{
  const rows=event.data.rows?.map(row=>({...row,value:structuredClone(row.value)}));
  const bootstrap=event.data.bootstrap===true;
  if(bootstrap&&claims.role!=='owner')throw new AccessError();
  if(!Array.isArray(rows)||!rows.length||rows.length>600)throw new AccessError('Transaksi tidak valid.',400);
  const changed=new Map<string,PosRow>(),result=new Map<string,Entity>(),lateClosedShiftIds=new Set<string>();
  for(const row of rows){
    assertId(row.id);integer(row.expectedVersion);
    if(!POS_TABLES.includes(row.table)||!row.value||typeof row.value!=='object'||changed.has(`${row.table}:${row.id}`))throw new AccessError('Transaksi tidak valid.',400);
    const value=row.value;
    if(value.mdId!==row.id||value.mdStoreId!==claims.storeId||value.mdVersion!==row.expectedVersion+1)throw new AccessError('Nomor transaksi tidak sesuai.');
    changed.set(`${row.table}:${row.id}`,row);
  }
  const old=async(table:string,id:string):Promise<Record<string,any>|undefined>=>lookup(`pos_${table}`,id);
  const get=async(table:string,id:string)=>changed.get(`${table}:${id}`)?.value||await old(table,id);
  const add=(kind:string,id:string,value:Record<string,any>)=>result.set(`${kind}:${id}`,{kind,id,value});
  const own=(value:Record<string,any>)=>value.mdDeviceId===claims.deviceId&&value.mdOperatorId===(claims.employeeId||claims.deviceId);
  // Only a grant issued before the server accepted closure can carry late
  // offline work. Client dates and event flags never extend that permission.
  const acceptsLate=(shift:Record<string,any>|null|undefined)=>{
    if(!shift||shift.status!=='closed'||shift.closedBy!=='owner'||!own(shift)||claims.role!=='cashier')return false;
    if(authorization.ownerRecovery)return true; // authenticated, separately audited owner recovery
    const closedAt=shift.mdOwnerClosedAt;
    return Number.isSafeInteger(closedAt)&&closedAt>0&&Number.isSafeInteger(claims.issuedAt)&&
      claims.issuedAt<closedAt&&claims.expiresAt<=closedAt+OFFLINE_ACCESS_MS&&Date.now()<claims.expiresAt;
  };
  const indices=new Map<string,Set<string>>();
  const index=async(key:string)=>{
    if(!indices.has(key))indices.set(key,new Set((await lookup('pos_index',key))?.ids as string[]||[]));return indices.get(key)!;
  };
  const staffStates=new Map<string,Record<string,any>>();
  const staff=async(id:string)=>{
    if(!staffStates.has(id))staffStates.set(id,{loanBalance:0,earned:0,paid:0,...await lookup('pos_employeeState',id)});
    return staffStates.get(id)!;
  };
  const commissionOrders=new Map<string,{entries:{id:string;employeeId:string;amount:number;earned:number}[]}>();
  const commissions=async(id:string)=>{
    if(!commissionOrders.has(id))commissionOrders.set(id,{entries:((await lookup('pos_orderCommissions',id))?.entries||[]) as {id:string;employeeId:string;amount:number;earned:number}[]});
    return commissionOrders.get(id)!;
  };
  const sessions=new Map<string,Record<string,any>>();
  for(const row of rows){
    const prior=await old(row.table,row.id),value=row.value;
    if(bootstrap&&prior)throw new AccessError('Data awal sudah tersimpan.',409);
    // Financial history is corrected by authorized reversals, never client deletion markers.
    if(value.mdDeleted&&!['menuItems','tables','orderItems'].includes(row.table))throw new AccessError('Catatan transaksi tidak dapat dihapus. Gunakan pembatalan atau pengembalian.',403);
    let stockOnly=false;
    const tableStatusOnly=row.table==='tables'&&prior&&Object.keys({...prior,...value}).every(key=>['status','mdVersion'].includes(key)||same(prior[key],value[key]));
    if(row.table==='menuItems'&&prior){
      const historical=await lookup('pos_catalogVersion',`${row.id}_${value.mdCatalogVersion}`);
      stockOnly=!!historical&&same(catalogMaster(historical),catalogMaster(value));
      if(!stockOnly&&(claims.role!=='owner'||value.mdCatalogVersion!==Number(prior.mdCatalogVersion||0)+1))throw new AccessError('Katalog berubah. Perbarui data lalu coba lagi.',409);
    }
    if(Number(prior?.mdVersion||0)!==row.expectedVersion&&!tableStatusOnly&&!(row.table==='menuItems'&&(stockOnly||claims.role==='owner')))throw new AccessError('Data berubah. Perbarui data lalu coba lagi.',409);
    if(prior&&(prior.mdDeviceId!==value.mdDeviceId||prior.mdOperatorId!==value.mdOperatorId))throw new AccessError('Pemilik transaksi tidak dapat diganti.');
    if(!prior&&!own(value))throw new AccessError('Transaksi tidak sesuai kasir.');
    for(const [field,parent] of Object.entries(FOREIGN_KEYS[row.table]||{})){
      if(!value[field])continue;assertId(value[field]);if(!await get(parent,value[field]))throw new AccessError('Data transaksi belum diterima.',409);
      if(parent==='orders'&&claims.role==='cashier'&&!own((await get(parent,value[field]))!))throw new AccessError('Transaksi ini milik kasir lain.');
    }
    if(claims.role==='cashier'){
      if(!claims.employeeId)throw new AccessError('Silakan masuk kasir.');
      if(!['menuItems','tables'].includes(row.table)&&!own(value))throw new AccessError('Transaksi ini milik kasir lain.');
      if(row.table==='tables'&&(!prior||Object.keys({...prior,...value}).some(key=>!['status','mdVersion'].includes(key)&&!same(prior[key],value[key]))))throw new AccessError('Meja hanya dapat diatur pemilik.');
      if(row.table==='menuItems'){
        if(prior){
          if(!stockOnly)throw new AccessError('Harga dan katalog hanya dapat diubah pemilik.');
        }else{
          if(value.trackStock||value.modifiers?.length||value.costPrice!=null||!rows.some(item=>item.table==='orderItems'&&item.value.menuItemId===row.id))throw new AccessError('Tambahkan barang melalui transaksi.');
        }
      }
      if(row.table==='payments'&&prior&&prior.status!==value.status)throw new AccessError('Pengembalian memerlukan akses pemilik.');
    }
    if(row.table==='operations'){
      delete value.ignored;delete value.activeSessionId;
      try{validateOperation(value as OperationRecord);}catch(error){throw new AccessError((error as Error).message,400);}
      if(prior)throw new AccessError('Catatan yang tersimpan tidak dapat diganti.',409);
      if(claims.role==='cashier'&&(!value.kind.startsWith('attendance.')||value.employeeId!==claims.employeeId))throw new AccessError('Tindakan ini memerlukan akses pemilik.');
      const state=await staff(value.employeeId);
      if(value.kind.startsWith('attendance.')){
        const key=`${value.employeeId}_${value.sessionId}`,session=sessions.get(key)||await lookup('pos_attendanceSession',key);
        const active=state.activeSession;
        if(value.kind==='attendance.in'){
          if(active||session){value.ignored=true;if(active){value.activeSessionId=active.sessionId;if(Date.parse(value.at)<Date.parse(active.at))active.at=value.at;}}
          else state.activeSession={sessionId:value.sessionId,at:value.at};
          if(!session)sessions.set(key,{employeeId:value.employeeId,activeSessionId:active?.sessionId||value.sessionId,at:active?.at||value.at});
        }else{
          if(!session)throw new AccessError('Absensi masuk belum tersedia.',409);
          if(!active)value.ignored=true;
          else if(session.activeSessionId!==active.sessionId)value.ignored=true;
          else{
            if(Date.parse(value.at)<Date.parse(active.at))throw new AccessError('Waktu pulang sebelum waktu masuk.',409);
            value.sessionId=active.sessionId;state.activeSession=null;
          }
        }
      }
      if(value.kind==='repayment'&&value.amount>state.loanBalance)throw new AccessError('Pembayaran melebihi sisa kasbon.',409);
      if(value.kind==='loan')state.loanBalance+=value.amount;
      if(value.kind==='repayment')state.loanBalance-=value.amount;
      if(value.kind==='commission'){
        const order=await get('orders',value.orderId),item=await get('orderItems',value.orderItemId);
        if(!order||order.status!=='paid'||order.isRefunded||!item||item.orderId!==value.orderId||item.mdDeleted)throw new AccessError('Pilih layanan dari nota lunas.',409);
        const basis=Math.floor(lineAmount(item.qty,item.hargaSatuan,item.saleUnit==='weight'?item.priceBasis||1000:1)*Math.max(0,order.subtotal-(order.discount||0))/order.subtotal);
        if(value.basisAmount!==basis||(await index(`commissionItem_${value.orderItemId}`)).size)throw new AccessError('Komisi layanan sudah tercatat atau nilai berubah.',409);
        (await index(`commissionItem_${value.orderItemId}`)).add(row.id);
        const earned=earnedCommission(value.amount,order as {status:string});
        state.earned+=earned;(await commissions(value.orderId)).entries.push({id:row.id,employeeId:value.employeeId,amount:value.amount,earned});
      }
      if(value.kind==='commission.paid'){
        if(value.amount>state.earned-state.paid)throw new AccessError('Pembayaran melebihi komisi tersedia.',409);
        state.paid+=value.amount;
      }
      if(['loan','repayment','commission.paid'].includes(value.kind)&&value.source==='laci'&&!bootstrap){
        const movement=changed.get(`cashMovements:${value.cashMovementId}`)?.value;
        const direction=value.kind==='repayment'?'in':'out';
        if(!movement||movement.amount!==value.amount||movement.type!==direction||movement.category!==(value.kind==='commission.paid'?'komisi':'kasbon_karyawan')||movement.shiftId!==value.shiftId)throw new AccessError('Catatan uang laci tidak sesuai.',409);
        if(rows.filter(r=>r.table==='operations'&&r.value.cashMovementId===value.cashMovementId).length!==1)throw new AccessError('Catatan uang laci sudah dipakai.',409);
      }
      if(value.kind==='kitchen'){
        const item=await get('orderItems',value.orderItemId),order=await get('orders',value.orderId);
        if(!item||item.orderId!==value.orderId||item.mdDeleted||!order||order.status==='void')throw new AccessError('Pesanan sudah tidak tersedia.',409);
        const ids=await index(`kitchenItem_${value.orderItemId}`),last=[...ids].at(-1),previous=last?await get('operations',last):undefined;
        if((value.previousId||undefined)!==last||kitchenStages.indexOf(value.stage)!==kitchenStages.indexOf(previous?.lineSignature===kitchenSignature(item)?previous.stage:'waiting')+1)throw new AccessError('Status pesanan berubah. Perbarui lalu coba lagi.',409);
        if(value.lineSignature!==kitchenSignature(item))throw new AccessError('Pesanan berubah. Periksa kembali.',409);
        ids.add(row.id);
      }

    }
    if(row.table==='shifts'){
      if(prior?.status==='closed')throw new AccessError('Shift yang ditutup tidak dapat diubah.',409);
      if(prior&&['startingCash','startTime','operatorName'].some(key=>!same(prior[key],value[key])))throw new AccessError('Modal dan kasir shift tidak dapat diganti.',409);
      if(!['open','closed'].includes(value.status))throw new AccessError('Shift tidak valid.',400);
      integer(value.startingCash);
      delete value.mdOwnerClosedAt;
      if(value.status==='closed'){
        integer(value.actualCash);if(!value.endTime)throw new AccessError('Waktu tutup belum tersedia.',400);
        if(!bootstrap){value.closedBy=claims.role;if(claims.role==='owner')value.mdOwnerClosedAt=Date.now();}
      }
    }
    if(row.table==='menuItems'){
      integer(value.harga);if(typeof value.nama!=='string'||!value.nama.trim()||value.nama.length>120)throw new AccessError('Nama barang tidak valid.',400);
      if(value.trackStock&&!Number.isSafeInteger(value.stockQty))throw new AccessError('Stok tidak valid.',400);
    }
    if(row.table==='orderItems'){
      const order=await get('orders',value.orderId),before=prior&&await old('orders',prior.orderId);
      const resolvingDraft=!!prior?.pendingRetailProduct&&!value.pendingRetailProduct&&!!value.menuItemId;
      if((before?.paidAmount>0||before?.status==='paid')&&prior&&Object.keys({...prior,...value}).some(key=>!['paidQty','mdVersion','costPrice',...(resolvingDraft?['menuItemId','pendingRetailProduct','mdCatalogVersion']:[])].includes(key)&&!same(prior[key],value[key])))throw new AccessError('Barang pada nota yang sudah dibayar tidak dapat diganti.',409);
      if(!order)throw new AccessError('Nota tidak tersedia.',409);
      if(!value.mdDeleted){
        integer(value.qty,true);integer(value.hargaSatuan);
        if(order.isHistorical){
          if(claims.role==='cashier')throw new AccessError('Riwayat lama hanya dapat dimasukkan pemilik.',403);
          value.costPrice=null;
        }else{
          const product=await get('menuItems',value.menuItemId);
          const version=Number(value.mdCatalogVersion||0);
          const historical=product?.mdCatalogVersion===version?product:await lookup('pos_catalogVersion',`${value.menuItemId}_${version}`);
          if(resolvingDraft&&(historical?.harga!==prior!.hargaSatuan||historical?.nama!==prior!.pendingRetailProduct.nama))throw new AccessError('Barang berbeda dari nota semula.',409);
          const draft=value.pendingRetailProduct&&!value.menuItemId?validateRetailDraft(value.pendingRetailProduct):undefined;
          if(draft&&(draft.harga!==value.hargaSatuan||value.selectedModifiers?.length))throw new AccessError('Harga barang tidak sesuai.',409);
          if(!bootstrap&&!draft&&(!historical||Number(historical.harga)+(value.selectedModifiers||[]).reduce((sum:number,item:any)=>sum+Number(item.harga),0)!==value.hargaSatuan))throw new AccessError('Harga barang tidak sesuai.',409);
          for(const modifier of value.selectedModifiers||[]){
            if(!bootstrap&&(!Array.isArray(historical?.modifiers)||!historical.modifiers.some((group:any)=>group.nama===modifier.groupName&&group.options?.some((option:any)=>option.nama===modifier.optionName&&option.harga===modifier.harga))))throw new AccessError('Pilihan barang tidak sesuai.',409);
          }
          if(!bootstrap)value.costPrice=historical?.costPrice??null;
        }
      }
      (await index(`orderItems_${value.orderId}`)).add(row.id);
    }
    if(row.table==='orders'){
      if(claims.role==='cashier'&&value.isHistorical)throw new AccessError('Riwayat lama hanya dapat dimasukkan pemilik.',403);
      if(value.tableId)(await index(`tableOrders_${value.tableId}`)).add(row.id);
      for(const field of ['subtotal','discount','tax','serviceCharge','total'])if(value[field]!=null)integer(value[field]);
      if(prior&&Number(prior.paidAmount)>0&&['total','subtotal','discount','tax','serviceCharge','shiftId'].some(field=>!same(prior[field],value[field])))throw new AccessError('Nilai nota yang dibayar tidak dapat diganti.',409);
      if(value.status==='void'&&claims.role!=='owner')throw new AccessError('Pembatalan memerlukan akses pemilik.');
      if(!bootstrap&&!prior&&!value.isHistorical){
        const settings=await lookup('settingsVersion',`${claims.storeId}_${value.mdSettingsVersion}`),profile=settings?.profile as Record<string,any>|undefined;
        const net=Number(value.subtotal)-Number(value.discount||0),service=profile?.enableService?Math.round(net*Number(profile.servicePercent||0)/100):0;
        const tax=profile?.enableTax?Math.round((net+(profile.taxAppliesToService?service:0))*Number(profile.taxPercent||0)/100):0;
        if(Number(value.serviceCharge||0)!==service||Number(value.tax||0)!==tax)throw new AccessError('Pajak atau biaya layanan tidak sesuai.',409);
      }
    }
    if(row.table==='payments'){
      integer(value.amount,true);
      if(!['completed','refunded'].includes(value.status))throw new AccessError('Pembayaran tidak valid.',400);
      if(!['Cash','QRIS','Transfer'].includes(value.paymentMethod))throw new AccessError('Pembayaran tidak valid.',400);
      if(!bootstrap&&!prior&&value.status!=='completed')throw new AccessError('Pengembalian harus berasal dari pembayaran yang sudah diterima.',403);
      if(!bootstrap&&!prior&&['mdRefundAmount','cashRefundAmount','mdRefundMethod','refundShiftId','refundedAt'].some(key=>value[key]!=null))throw new AccessError('Pembayaran baru tidak dapat berisi pengembalian.',400);
      if(claims.role==='cashier'&&value.paymentMethod!=='Cash'&&value.proofStatus==='terverifikasi'){
        const proof=value.proofId?await get('paymentProofs',value.proofId):undefined;
        if(prior?.proofStatus!=='terverifikasi'||!same(prior.proofId,value.proofId)||proof&&proof.status!=='terverifikasi')throw new AccessError('Konfirmasi pembayaran memerlukan akses pemilik.',403);
      }
      if(prior&&['amount','orderId','shiftId','paymentMethod','paidAt','itemsPaid'].some(field=>!same(prior[field],value[field])))throw new AccessError('Pembayaran yang tersimpan tidak dapat diganti.',409);
      const paymentOrder=await get('orders',value.orderId);
      const isHistoricalPayment=!!paymentOrder?.isHistorical;
      const shift=value.shiftId?await get('shifts',value.shiftId):null,beforeShift=value.shiftId?await old('shifts',value.shiftId):null;
      const isLateCashierPayment=acceptsLate(beforeShift);
      if(isLateCashierPayment&&value.shiftId)lateClosedShiftIds.add(value.shiftId);
      const shiftClosedRejection=beforeShift?.status==='closed'&&!isLateCashierPayment;
      if(!bootstrap&&!prior&&!isHistoricalPayment&&(!shift||shiftClosedRejection||shift.mdDeviceId!==claims.deviceId||shift.mdOperatorId!==event.operatorId))throw new AccessError('Mulai shift kasir terlebih dahulu.',409);
      if(isHistoricalPayment&&claims.role==='cashier')throw new AccessError('Riwayat lama hanya dapat dimasukkan pemilik.',403);
      if(prior?.status==='refunded'&&value.status!=='refunded')throw new AccessError('Pengembalian tidak dapat dibatalkan.',409);
      if(prior?.status==='refunded'&&['mdRefundAmount','cashRefundAmount','mdRefundMethod','refundShiftId','refundedAt'].some(key=>!same(prior[key],value[key])))throw new AccessError('Pengembalian yang tersimpan tidak dapat diganti.',409);
      if(prior&&prior.status!==value.status){
        if(claims.role!=='owner')throw new AccessError();
        const refundShift=await get('shifts',value.refundShiftId);if(!refundShift||refundShift.status!=='open'||!own(refundShift))throw new AccessError('Mulai shift pengembalian terlebih dahulu.',409);
        integer(value.cashRefundAmount);integer(value.mdRefundAmount);if(value.cashRefundAmount>value.mdRefundAmount||value.mdRefundAmount>value.amount)throw new AccessError('Pengembalian tidak sesuai pembayaran.',400);
      }
      (await index(`payments_${value.orderId}`)).add(row.id);
      if(value.shiftId)(await index(`shiftPayments_${value.shiftId}`)).add(row.id);
      if(value.refundShiftId)(await index(`shiftRefunds_${value.refundShiftId}`)).add(row.id);
    }
    if(row.table==='inventoryMovements'){
      if(prior)throw new AccessError('Catatan stok yang tersimpan tidak dapat diganti.',409);
      if(!Number.isSafeInteger(value.delta))throw new AccessError('Jumlah stok tidak valid.',400);
      if(!['opening','in','out','count','sale','return'].includes(value.type))throw new AccessError('Catatan stok tidak valid.',400);
      if(value.type==='sale'&&value.delta>=0||value.type==='return'&&value.delta<=0)throw new AccessError('Jumlah stok tidak sesuai nota.',400);
      if(value.type==='count'){const product=await old('menuItems',value.menuItemId);if(Number(value.balance)-value.delta!==Number(product?.stockQty||0))throw new AccessError('Stok berubah. Muat ulang opname.',409);}
      if(claims.role==='cashier'&&!['sale','return'].includes(value.type))throw new AccessError('Stok hanya dapat diubah pemilik.');
      if(['sale','return'].includes(value.type)&&!value.orderId)throw new AccessError('Nota stok tidak tersedia.',400);
    }
    if(row.table==='cashMovements'){
      integer(value.amount,true);const shift=await get('shifts',value.shiftId);
      const isLateCashierMovement=acceptsLate(shift);
      if(isLateCashierMovement&&value.shiftId)lateClosedShiftIds.add(value.shiftId);
      if(!shift||!bootstrap&&shift.status!=='open'&&!isLateCashierMovement||!own(shift))throw new AccessError('Gunakan shift kasir sendiri.');
      if(prior)throw new AccessError('Catatan kas tidak dapat ditimpa.');
      if(!['in','out'].includes(value.type))throw new AccessError('Catatan kas tidak valid.',400);
      if(!bootstrap&&['kasbon_karyawan','komisi'].includes(value.category)&&!rows.some(r=>r.table==='operations'&&r.value.cashMovementId===row.id&&r.value.source==='laci'))throw new AccessError('Catatan karyawan belum tersedia.',409);
      (await index(`shiftCash_${value.shiftId}`)).add(row.id);
    }
    if(row.table==='auditLogs'&&prior)throw new AccessError('Catatan aktivitas tidak dapat ditimpa.');
    if(row.table==='paymentProofs'){
      if(prior&&['orderId','paymentId'].some(field=>!same(prior[field],value[field])))throw new AccessError('Bukti pembayaran tidak dapat dipindahkan.',403);
      if(claims.role==='cashier'&&(value.status==='terverifikasi'||(await get('payments',value.paymentId))?.proofStatus==='terverifikasi'))throw new AccessError('Konfirmasi pembayaran memerlukan akses pemilik.');
    }
    if(row.table==='menuItems'&&prior){
      add('pos_menuItems',row.id,{...(stockOnly?prior:value),mdVersion:Number(prior.mdVersion)+1});
    }else add(`pos_${row.table}`,row.id,{...value,...(tableStatusOnly?{mdVersion:Number(prior!.mdVersion)+1}:{})});
    if(row.table==='menuItems'&&!stockOnly)add('pos_catalogVersion',`${row.id}_${value.mdCatalogVersion}`,{...value});
  }
  const tableIds=new Set<string>(rows.filter(row=>row.table==='tables').map(row=>row.id));
  for(const row of rows)if(row.table==='orders'){
    if(row.value.tableId)tableIds.add(row.value.tableId);
    const prior=await old('orders',row.id);if(prior?.tableId)tableIds.add(prior.tableId);
  }
  for(const id of tableIds){
    const table=result.get(`pos_tables:${id}`)?.value||await get('tables',id);if(!table)continue;
    const notes=await Promise.all(Array.from(await index(`tableOrders_${id}`),orderId=>get('orders',orderId)));
    const attached=notes.filter(note=>note&&note.tableId===id&&!note.isTableCleared&&note.status!=='void');
    const status=attached.some(note=>note?.status==='unpaid')?'open':attached.length?'lunas':'kosong';
    add('pos_tables',id,{...table,status});
  }
  const affected=new Set(rows.filter(row=>['orders','orderItems','payments','inventoryMovements'].includes(row.table)&&(row.table==='orders'||row.value.orderId)).map(row=>row.table==='orders'?row.id:String(row.value.orderId)));
  for(const orderId of affected){
    const order=await get('orders',orderId);if(!order)throw new AccessError('Nota tidak tersedia.',409);
    const itemIds=await index(`orderItems_${orderId}`),paymentIds=await index(`payments_${orderId}`);let subtotal=0,paid=0;
    const reserved=new Map<string,number>(),previousOrder=await old('orders',orderId);
    for(const id of itemIds){const item=await get('orderItems',id);if(!item||item.mdDeleted)continue;subtotal+=lineAmount(item.qty,Number(item.hargaSatuan),item.saleUnit==='weight'?Number(item.priceBasis||1000):1);if(!order.isHistorical&&(order.status!=='void'||Number(previousOrder?.paidAmount)>0)&&item.menuItemId)reserved.set(item.menuItemId,(reserved.get(item.menuItemId)||0)+item.qty);}
    const stockBefore=await lookup('pos_reservation',orderId),oldReserved=(stockBefore?.quantities||{}) as Record<string,number>;
    for(const productId of new Set([...Object.keys(oldReserved),...reserved.keys(),...rows.filter(row=>row.table==='inventoryMovements'&&row.value.orderId===orderId).map(row=>String(row.value.menuItemId))])){
      const product=await get('menuItems',productId);
      const movements=rows.filter(row=>row.table==='inventoryMovements'&&row.value.orderId===orderId&&row.value.menuItemId===productId);
      if(!bootstrap&&movements.some(row=>!['sale','return'].includes(row.value.type)))throw new AccessError('Penyesuaian stok tidak dapat memakai nota penjualan.',403);
      if(!product?.trackStock){if(!bootstrap&&movements.length)throw new AccessError('Produk pada nota tidak memakai stok.',409);continue;}
      const expected=Number(oldReserved[productId]||0)-Number(reserved.get(productId)||0);
      const actual=movements.reduce((n,row)=>n+row.value.delta,0);
      if(!bootstrap&&(expected!==actual||movements.some(row=>expected===0||(expected<0?row.value.type!=='sale':row.value.type!=='return'))))throw new AccessError('Perubahan stok tidak sesuai barang pada nota.',409);
    }
    add('pos_reservation',orderId,{quantities:Object.fromEntries(reserved)});
    if(!bootstrap&&(order.subtotal!==subtotal||Number(order.discount||0)>subtotal||order.total!==subtotal-Number(order.discount||0)+Number(order.tax||0)+Number(order.serviceCharge||0)))throw new AccessError('Perhitungan nota tidak sesuai.',409);
    const paidItems=new Map<string,number>(),nonCash:Record<string,any>[]=[];
    for(const id of paymentIds){const payment=await get('payments',id);if(payment&&payment.status==='completed'){
      paid+=Number(payment.amount);if(payment.paymentMethod!=='Cash')nonCash.push(payment);
      if(payment.splitType==='item'&&!bootstrap)for(const item of payment.itemsPaid||[]){
        integer(item.qty,true);integer(item.harga);
        let matched:string|undefined;
        for(const lineId of itemIds){const line=await get('orderItems',lineId);if(line&&!line.mdDeleted&&line.hargaSatuan===item.harga&&(item.orderItemId?lineId===item.orderItemId:line.menuItemId===item.menuItemId)){matched=lineId;break;}}
        if(!matched)throw new AccessError('Barang pembayaran tidak sesuai nota.',409);
        paidItems.set(matched,(paidItems.get(matched)||0)+item.qty);
      }
    }}
    // Preserve receipts imported before payment records existed; new receipts must have accepted payments.
    const legacyPaid=previousOrder?.status==='paid'&&previousOrder.paidAmount===0&&paymentIds.size===0;
    if(!bootstrap&&order.status==='paid'&&paid!==order.total&&!legacyPaid)throw new AccessError('Nota belum lunas. Lengkapi pembayaran terlebih dahulu.',409);
    if(paid>order.total)throw new AccessError('Pembayaran melebihi tagihan.',409);
    if(!bootstrap)for(const id of itemIds){const item=await get('orderItems',id);if(!item||item.mdDeleted)continue;const paidQty=paidItems.get(id)||0;if(paidQty>item.qty)throw new AccessError('Jumlah barang sudah dibayar.',409);add('pos_orderItems',id,{...item,paidQty:paid===order.total?item.qty:paidQty});}
    // Billing balances are derived from accepted payments; transmitted aggregates are not authoritative.
    const verificationStatus=paid===0&&!legacyPaid?'menunggu_bukti':nonCash.every(p=>p.proofStatus==='terverifikasi')?'terverifikasi':nonCash.some(p=>p.proofStatus==='menunggu_verifikasi')?'menunggu_verifikasi':'menunggu_bukti';
    add('pos_orders',orderId,{...order,paidAmount:paid,remainingBalance:order.total-paid,...(!bootstrap?{verificationStatus}:{})});
  }
  // Revalue commission entitlement from accepted collections whenever a receipt changes.
  // Aggregate state keeps an attendance or payroll write independent of years of history.
  for(const orderId of affected){
    const grants=await commissions(orderId),order=result.get(`pos_orders:${orderId}`)?.value||await get('orders',orderId);
    for(const grant of grants.entries){
      const earned=earnedCommission(grant.amount,order as {status:string}|undefined);
      if(earned!==grant.earned){const state=await staff(grant.employeeId);state.earned+=earned-grant.earned;grant.earned=earned;}
    }
  }
  for(const row of rows)if(row.table==='operations'&&row.value.kind==='commission.paid'){
    const state=await staff(row.value.employeeId);
    if(state.paid>state.earned)throw new AccessError('Pembayaran melebihi komisi tersedia.',409);
  }
  for(const [id,state] of staffStates)add('pos_employeeState',id,state);
  for(const [id,value] of commissionOrders)if(value.entries.length)add('pos_orderCommissions',id,value);
  for(const [id,value] of sessions)add('pos_attendanceSession',id,value);
  for(const row of rows)if(row.table==='shifts'&&row.value.status==='closed'&&!bootstrap){
    lateClosedShiftIds.add(row.id);
  }
  for(const shiftId of lateClosedShiftIds){
    const shiftRow=result.get(`pos_shifts:${shiftId}`)?.value||await get('shifts',shiftId);
    if(!shiftRow||shiftRow.status!=='closed')continue;
    const payments=await Promise.all(Array.from(await index(`shiftPayments_${shiftId}`),id=>get('payments',id)));
    const refunds=await Promise.all(Array.from(await index(`shiftRefunds_${shiftId}`),id=>get('payments',id)));
    const movements=await Promise.all(Array.from(await index(`shiftCash_${shiftId}`),id=>get('cashMovements',id)));
    const sum=(items:(Record<string,any>|undefined)[],filter:(v:Record<string,any>)=>boolean,field='amount')=>items.reduce((n,v)=>n+(v&&filter(v)?Number(v[field]||0):0),0);
    const cashSales=sum(payments,p=>p.paymentMethod==='Cash'),nonCashSales=sum(payments,p=>p.paymentMethod!=='Cash'&&p.status==='completed');
    const verifiedNonCashSales=sum(payments,p=>p.paymentMethod!=='Cash'&&p.status==='completed'&&p.proofStatus==='terverifikasi');
    const cashRefunds=sum(refunds,p=>p.status==='refunded','cashRefundAmount'),cashIn=sum(movements,m=>m.type==='in'),cashOut=sum(movements,m=>m.type==='out');
    const expectedCash=shiftRow.startingCash+cashSales-cashRefunds+cashIn-cashOut;
    const stats={cashSales,nonCashSales,verifiedNonCashSales,unverifiedNonCashSales:nonCashSales-verifiedNonCashSales,cashRefunds,cashIn,cashOut,expectedCash,totalTransactions:payments.filter(p=>p?.status==='completed').length,movements:[]};
    const isDirectShiftCommit=rows.some(r=>r.table==='shifts'&&r.id===shiftId);
    const nextVersion=isDirectShiftCommit?shiftRow.mdVersion:Number(shiftRow.mdVersion||0)+1;
    add('pos_shifts',shiftId,{...shiftRow,...stats,cashDifference:shiftRow.actualCash-expectedCash,mdClosedStats:stats,...(isDirectShiftCommit?{}:{mdVersion:nextVersion})});
  }
  for(const [id,ids] of indices)add('pos_index',id,{ids:Array.from(ids)});
  const stockChanges=new Map<string,number>();
  for(const row of rows)if(row.table==='inventoryMovements'&&!bootstrap)stockChanges.set(row.value.menuItemId,(stockChanges.get(row.value.menuItemId)||0)+row.value.delta);
  for(const id of new Set([...stockChanges.keys(),...rows.filter(row=>row.table==='menuItems').map(row=>row.id)])){
    const delta=stockChanges.get(id)||0,previous=await old('menuItems',id),product=result.get(`pos_menuItems:${id}`)?.value||await get('menuItems',id);if(!product)throw new AccessError('Barang stok tidak ditemukan.',409);
    const stockQty=bootstrap&&!previous?Number(product.stockQty||0):Number(previous?.stockQty||0)+delta;
    add('pos_menuItems',id,{...product,stockQty,isSoldOut:product.trackStock?stockQty<=0:product.isSoldOut,stockNeedsReview:!!product.trackStock&&stockQty<0});
  }
  return Array.from(result.values());
}
export function visiblePosEntity(entity:Entity,claims:AccessClaims):Entity|undefined{
  if(!entity.kind.startsWith('pos_'))return undefined;
  if(claims.role==='owner')return entity;
  if(['pos_index','pos_catalogVersion','pos_reservation'].includes(entity.kind))return undefined;
  // An owner may record attendance for an employee. That employee must see the same session.
  if(entity.kind==='pos_operations'&&['attendance.in','attendance.out'].includes(String(entity.value.kind))&&entity.value.employeeId===claims.employeeId)return entity;
  if(!['pos_menuItems','pos_tables'].includes(entity.kind)&&(entity.value.mdDeviceId!==claims.deviceId||entity.value.mdOperatorId!==claims.employeeId))return undefined;
  const {costPrice:_cost,purchasePrice:_purchase,totalCost:_total,...value}=entity.value;return {...entity,value};
}
