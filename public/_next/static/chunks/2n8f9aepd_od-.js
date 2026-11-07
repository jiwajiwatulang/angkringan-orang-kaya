(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,25652,e=>{var t=e.i(43476),a=e.i(71645),i=e.i(87991),r=e.i(67996);e.s(["f",0,function({client:e}){let[n,s]=(0,a.useState)(!1),[o,d]=(0,a.useState)(""),[l,c]=(0,a.useState)(!1),[m,p]=(0,a.useState)(!1),[u,g]=(0,a.useState)(),h=(e,t)=>{let a=URL.createObjectURL(new Blob([JSON.stringify(e)],{type:"application/json"})),i=document.createElement("a");i.href=a,i.download=t,i.click(),setTimeout(()=>URL.revokeObjectURL(a),1e3)},f=async()=>(0,r.currentPosRuntime)()?.synchronizer.db||(await e.openReplica()).db;(0,a.useEffect)(()=>{let e=!1;return(async()=>{let t=await f();if(!e){p(!!(await t.table("settings").get("recoveryJob"))?.value);let e=await t.table("settings").where("key").startsWith("recoveryCancelled:").toArray();e.sort((e,t)=>t.value.cancelledAt-e.value.cancelledAt),g(e[0]?.value.archive)}})().catch(()=>{}),()=>{e=!0}},[e]);let b=async e=>{s(!0),c(!1),d("");try{await e()}catch(e){c(!0),d(e instanceof Error?e.message:"Data belum dapat dipulihkan.")}finally{try{p(!!(await (await f()).table("settings").get("recoveryJob"))?.value)}catch{}s(!1)}},y=async()=>{let t=await f();await (0,i.resumeRecovery)(t,e.claims,t=>e.recover(t));let a=(0,r.currentPosRuntime)();a?await a.synchronizer.synchronize():await (await e.openReplica()).synchronize(e),p(!1),d("Data berhasil dipulihkan.")};return(0,t.jsxs)("section",{className:"space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-5",children:[(0,t.jsx)("h2",{className:"text-lg font-bold text-fg",children:"Cadangan Pengiriman"}),(0,t.jsxs)("div",{className:"flex flex-wrap gap-3",children:[(0,t.jsx)("button",{type:"button",disabled:n,className:"min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-50",onClick:()=>void b(async()=>{let t=(0,r.currentPosRuntime)(),a=t?await t.synchronizer.backup():await (await e.openReplica()).exportData(),i=URL.createObjectURL(new Blob([JSON.stringify(a)],{type:"application/json"})),n=document.createElement("a");n.href=i,n.download=`sakunota-perangkat-${new Date().toISOString().slice(0,10)}.json`,n.click(),setTimeout(()=>URL.revokeObjectURL(i),1e3),d("Cadangan disimpan.")}),children:"Simpan Transaksi Belum Terkirim"}),(0,t.jsxs)("label",{className:`relative inline-flex min-h-11 items-center rounded-xl border border-line px-4 py-2.5 text-sm font-semibold ${n||m?"opacity-50":"cursor-pointer"}`,children:["Pilih Cadangan Pengiriman",(0,t.jsx)("input",{"aria-label":"Pilih Cadangan Pengiriman",type:"file",accept:".json,application/json",disabled:n||m,className:"absolute inset-0 cursor-pointer opacity-0",onChange:t=>{let a=t.target.files?.[0];t.target.value="",a&&b(async()=>{let t;if(a.size>0x6400000)throw Error("Ukuran cadangan terlalu besar.");try{t=JSON.parse(await a.text())}catch{throw Error("Cadangan tidak valid.")}await (0,i.stageRecovery)(await f(),e.claims,t),p(!0),await y()})}})]}),m&&(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("button",{type:"button",disabled:n,className:"min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50",onClick:()=>void b(y),children:"Lanjutkan Pemulihan"}),(0,t.jsx)("button",{type:"button",disabled:n,className:"min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-50",onClick:()=>void b(async()=>{let t=await (0,i.cancelRecovery)(await f(),e.claims);t&&(g(t),h(t,"sakunota-cadangan-pemulihan.json")),d("Pemulihan dibatalkan. Cadangan asli tetap disimpan di perangkat. Pilih cadangan pengganti untuk melanjutkan.")}),children:"Simpan & Batalkan Pemulihan"})]}),u&&(0,t.jsx)("button",{type:"button",disabled:n,className:"min-h-11 rounded-xl border border-line px-4 py-2.5 text-sm font-semibold disabled:opacity-50",onClick:()=>h(u,"sakunota-cadangan-pemulihan.json"),children:"Unduh Cadangan yang Dibatalkan"})]}),(0,t.jsx)("p",{className:"text-sm text-muted",children:"Cadangan menyimpan data yang belum terkirim. Simpan sebelum mengganti perangkat."}),o&&(0,t.jsx)("p",{role:l?"alert":"status",className:`text-sm ${l?"text-red-700":"text-blue-700"}`,children:o})]})}])},91652,e=>{var t=e.i(43476),a=e.i(15501);function i({name:e,className:r="h-5 w-5"}){return"shift"===e?(0,t.jsx)(a.f,{name:"shift",className:r}):(0,t.jsx)("svg",{className:r,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.7",strokeLinecap:"round",strokeLinejoin:"round","aria-hidden":"true",children:"clock"===e?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("circle",{cx:"12",cy:"12",r:"8.5"}),(0,t.jsx)("path",{d:"M12 7v5l3 2"})]}):"arrow"===e?(0,t.jsx)("path",{d:"M5 12h14m-5-5 5 5-5 5"}):"check"===e?(0,t.jsx)("path",{d:"m5 12 4 4L19 6"}):"devices"===e?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsx)("rect",{x:"3",y:"4",width:"12",height:"10",rx:"2"}),(0,t.jsx)("path",{d:"M7 18h4m-2-4v4"}),(0,t.jsx)("rect",{x:"16",y:"9",width:"5",height:"11",rx:"1.5"})]}):"chart"===e?(0,t.jsx)(t.Fragment,{children:(0,t.jsx)("path",{d:"M4 4v16h16M8 15v-4m5 4V7m5 8v-6"})}):(0,t.jsx)(t.Fragment,{children:(0,t.jsx)("path",{d:"M4 3v5a3 3 0 0 0 6 0V3M7 3v18M17 13V3c-3 2-3 7-3 10h6M20 3v18"})})})}e.s(["N",0,function({title:e,children:a}){return(0,t.jsxs)("section",{className:"sn-card space-y-4 rounded-2xl border border-line bg-surface p-4 sm:p-6",children:[(0,t.jsx)("h2",{className:"sn-card-title text-base font-bold sm:text-lg",children:e}),a]})},"S",0,i,"g",0,function({title:e,icon:a,children:r}){return(0,t.jsxs)("header",{className:"sn-page-heading flex flex-wrap items-center justify-between gap-4",children:[(0,t.jsxs)("div",{className:"flex min-w-0 items-center gap-3",children:[a&&"none"!==a?(0,t.jsx)("span",{className:"sn-heading-icon",children:(0,t.jsx)(i,{name:a,className:"h-6 w-6"})}):null,(0,t.jsx)("h1",{className:"text-2xl font-bold tracking-tight sm:text-[28px]",children:e})]}),r]})},"M",0,function({label:e,value:a}){return(0,t.jsxs)("div",{className:"sn-stat rounded-2xl border border-line bg-surface p-4 sm:p-5",children:[(0,t.jsx)("span",{className:"sn-stat-mark","aria-hidden":"true"}),(0,t.jsx)("p",{className:"text-sm font-medium text-muted",children:e}),(0,t.jsx)("p",{className:"mt-3 text-2xl font-bold tracking-tight tabular-nums sm:text-[28px]",children:a})]})},"i",0,function({items:e,value:a,onChange:i}){return(0,t.jsx)("div",{className:"sn-tabs flex gap-1 overflow-x-auto",role:"tablist",children:e.map(e=>(0,t.jsx)("button",{type:"button",role:"tab","aria-selected":a===e.id,onClick:()=>i(e.id),className:"sn-tab min-h-11 shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold",children:e.label},e.id))})},"c",0,e=>new Date(e).toLocaleString("id-ID",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}),"m",0,"sn-field mt-1 min-h-11 w-full rounded-xl border border-line bg-surface px-3 py-2 text-fg","z",0,e=>new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(e),"B",0,"sn-primary min-h-11 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50","j",0,"sn-secondary min-h-11 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-fg disabled:opacity-50"])},63902,e=>{var t=e.i(24839);function a(e){if("owner"!==e.role||e.employeeId)throw new t.P;return`device_list:${e.storeId}:${e.deviceId}:${e.deviceEpoch}`}async function i(e,t){let i=(await e.table("settings").get(a(t)))?.value;return i&&Array.isArray(i.list?.employees)&&Array.isArray(i.list?.devices)?i:null}async function r(e,t,i){let r={savedAt:Date.now(),list:{devices:(i.devices||[]).map(({id:e,name:t,role:a,revoked:i})=>({id:e,name:t,role:a,revoked:i})),employees:i.employees.map(({id:e,name:t,active:a})=>({id:e,name:t,active:a})),pairings:[]}};return await e.table("settings").put({key:a(t),value:r}),r}e.s(["H",0,i,"Q",0,r])},37945,e=>{e.i(47167);var t=e.i(20437),a=e.i(5062),i=e.i(35151);async function r(e,r,n){if("SakuNotaDemoDB"===e.name)throw Error("Keluar dari demo terlebih dahulu.");let s=new t.default(`SakuNotaPOS-${n.storeId}-${n.deviceId}`),o=new i.DeviceClient(r,n),d=0,l=!1;for(let e=0;e<1e3;e++){let t=await o.pull(d);if((l=t.entities.some(e=>e.kind.startsWith("pos_")))||!t.hasMore)break;if(t.cursor<=d||(d=t.cursor,999===e))throw Error("Data belum dapat diperiksa. Coba lagi.")}s.version(14).stores(Object.fromEntries([...a.h.map(e=>[e,"operations"===e?"++id,kind,employeeId,at,orderId,orderItemId,sessionId":"menuItems"===e?"++id,sku,nama,kategori,isSoldOut,urutan":"orders"===e?"++id,shiftId,idempotencyKey,tableId,status,verificationStatus,createdAt":"orderItems"===e?"++id,orderId,menuItemId":"payments"===e?"++id,orderId,shiftId,paymentMethod,status,proofStatus,paidAt":"shifts"===e?"++id,status,startTime,operatorName":"cashMovements"===e?"++id,shiftId,type,timestamp":"paymentProofs"===e?"++id,paymentId,orderId,status,uploadedAt":"inventoryMovements"===e?"++id,menuItemId,orderId,type,timestamp":"auditLogs"===e?"++id,orderId,action,timestamp":"++id,nomor,status"]),["settings","key"],["posOutbox","id,ordinal"],["posMeta","key"],["posIds","key"]]));try{if(await s.table("posMeta").get("initialized"))await s.table("settings").put({key:"multi_device_access",value:{access:r,claims:n}});else{let t=(await e.table("settings").get("license_device_keys_v2"))?.value,i=(await e.table("settings").get("pos_store_settings"))?.value,o={};if("owner"===n.role&&!l)for(let t of a.h)o[t]=e.tables.some(e=>e.name===t)?await e.table(t).toArray():[];let d=new Map;for(let e of a.h)for(let t of o[e]||[])d.set(`${e}:${t.id}`,t.mdId||crypto.randomUUID());await s.transaction("rw",s.tables,async()=>{for(let e of(t&&await s.table("settings").put({key:"license_device_keys_v2",value:t}),i&&"owner"===n.role&&await s.table("settings").put({key:"pos_store_settings",value:i}),a.h))for(let t of o[e]||[]){let a={...t,mdId:d.get(`${e}:${t.id}`),mdStoreId:n.storeId,mdDeviceId:n.deviceId,mdOperatorId:n.deviceId,mdVersion:0,mdCatalogVersion:"menuItems"===e?1:t.mdCatalogVersion};await s.table(e).put(a),await s.table("posIds").put({key:`${e}:${a.mdId}`,value:t.id})}await s.table("settings").put({key:"multi_device_access",value:{access:r,claims:n}}),await s.table("posMeta").put({key:"initialized",value:!0}),await s.table("posMeta").put({key:"bootstrapRequired",value:"owner"===n.role&&!l})})}localStorage.setItem("sakunota_pos_partition",JSON.stringify({storeId:n.storeId,deviceId:n.deviceId})),sessionStorage.removeItem("sakunota_demo_mode")}finally{s.close()}}e.s(["activatePosPartition",0,r])},87991,e=>{var t=e.i(24839),a=e.i(5062);function i(e,i){if(!e||"object"!=typeof e)throw new t.P("Cadangan tidak valid.",400);if(1!==e.version||e.storeId!==i||!Array.isArray(e.outbox)||e.outbox.length>1e4)throw new t.P("Cadangan tidak sesuai toko ini.",400);(0,t.f)(e.deviceId);let r=new Set,n=0,s=e.outbox.slice().sort((e,t)=>e.ordinal-t.ordinal).map(s=>{if(!s||!s.event||s.event.storeId!==i||s.event.deviceId!==e.deviceId||s.id!==s.event.id||!Number.isSafeInteger(s.ordinal)||s.ordinal<=n||r.has(s.id)||((0,t.f)(s.id),(0,t.f)(s.event.entityId),(0,t.f)(s.event.operatorId),!s.event.data||"object"!=typeof s.event.data||Array.isArray(s.event.data)||new TextEncoder().encode(JSON.stringify(s.event)).length>8388608||!["catalog.put","settings.put","shift.open","shift.close","order.create","payment.record","refund.record","stock.adjust","pos.commit"].includes(s.event.kind)))throw new t.P("Cadangan tidak valid.",400);if("pos.commit"===s.event.kind){let e=s.event.data.rows;if(!Array.isArray(e)||!e.length||e.length>600)throw new t.P("Transaksi dalam cadangan tidak valid.",400);let r=new Set;for(let n of e){if(!n||!a.h.includes(n.table)||!n.value||"object"!=typeof n.value||Array.isArray(n.value))throw new t.P("Transaksi dalam cadangan tidak valid.",400);(0,t.f)(n.id),(0,t.w)(n.expectedVersion);let e=`${n.table}:${n.id}`;if(r.has(e)||n.value.mdId!==n.id||n.value.mdStoreId!==i||n.value.mdVersion!==n.expectedVersion+1)throw new t.P("Transaksi dalam cadangan tidak valid.",400);r.add(e)}}return r.add(s.id),n=s.ordinal,{id:s.id,ordinal:s.ordinal,attempts:0,event:s.event}});return{version:1,storeId:i,deviceId:e.deviceId,outbox:s}}async function r(e,a,r){if("owner"!==a.role||a.expiresAt<=Date.now())throw new t.P;let n=i(r,a.storeId);return await e.transaction("rw",e.table("settings"),async()=>{if((await e.table("settings").get("recoveryJob"))?.value)throw new t.P("Selesaikan pemulihan sebelumnya.",409);await e.table("settings").put({key:"recoveryJob",value:{id:crypto.randomUUID(),archive:n,index:0}})}),n.outbox.length}async function n(e,a){if("owner"!==a.role||a.expiresAt<=Date.now())throw new t.P;return e.transaction("rw",e.table("settings"),async()=>{let t=(await e.table("settings").get("recoveryJob"))?.value;if(!t)return;let a=`recoveryCancelled:${crypto.randomUUID()}`;return await e.table("settings").put({key:a,value:{...t,cancelledAt:Date.now()}}),await e.table("settings").delete("recoveryJob"),t.archive})}async function s(e,a,r){if("owner"!==a.role||a.expiresAt<=Date.now())throw new t.P;let n=await e.transaction("rw",e.table("settings"),async()=>{let t=(await e.table("settings").get("recoveryJob"))?.value;if(!t)return;if(t.id)return t;let a={...t,id:crypto.randomUUID()};return await e.table("settings").put({key:"recoveryJob",value:a}),a});if(!n)return;let s=i(n.archive,a.storeId);if(!Number.isSafeInteger(n.index)||n.index<0||n.index>s.outbox.length)throw new t.P("Cadangan tidak valid.");let o=async()=>{let a=(await e.table("settings").get("recoveryJob"))?.value;if(a?.id!==n.id)throw new t.P("Pemulihan ini sudah dihentikan.",409)};for(let a=n.index;a<s.outbox.length;a++){await o();let i=s.outbox[a].event,d=await r(i);if(d.id!==i.id||!Number.isSafeInteger(d.sequence)||d.sequence<1)throw new t.P("Pemulihan belum dikonfirmasi.",409);let l=e.tables.some(e=>"posOutbox"===e.name);await e.transaction("rw",[e.table("settings"),...l?[e.table("posOutbox")]:[]],async()=>{if(await o(),l){let t=await e.table("posOutbox").get(i.id);t&&JSON.stringify(t.event)===JSON.stringify(i)&&await e.table("posOutbox").delete(i.id)}await e.table("settings").put({key:"recoveryJob",value:{...n,index:a+1}})})}await e.transaction("rw",e.table("settings"),async()=>{await o(),await e.table("settings").delete("recoveryJob")})}e.s(["cancelRecovery",0,n,"resumeRecovery",0,s,"stageRecovery",0,r])},61552,e=>{var t=e.i(82369),a=e.i(59886),i=e.i(6841),r=e.i(77313),n=e.i(5062),s=e.i(67996),o=e.i(63902),d=e.i(33829);async function l(){let e=(0,s.currentPosRuntime)(),t=(0,n.n)();if(e&&t?.claims.role==="owner"){let i=await (0,o.H)(a.db,t.claims);if(navigator.onLine)try{let i=await e.client.list();return await (0,o.Q)(a.db,t.claims,i),i.employees.filter(e=>e.active)}catch(e){if([401,403].includes(e.status)||!i)throw e}return i?.list.employees.filter(e=>e.active)||[]}return t?.claims.employeeId?[{id:t.claims.employeeId,name:t.operatorName,active:1}]:[...new Set((await a.db.table("shifts").toArray()).map(e=>e.operatorName))].filter(Boolean).map(e=>({id:`local:${e}`,name:e,active:1}))}async function c(e,s){if("weight.return"===e.kind)throw Error("Catat retur dari Riwayat Transaksi.");await (0,r.e)();let o=(0,n.n)();if("laundry"===e.kind);else if("kitchen"===e.kind){if(a.db.name.startsWith("SakuNotaPOS-")&&o?.claims.role!=="owner"&&(o?.claims.role!=="cashier"||"served"!==e.stage))throw Error("Tindakan ini memerlukan akses pemilik.")}else e.kind.startsWith("attendance.")&&o?.claims.role==="cashier"||await (0,i.r)();if(o?.claims.role==="cashier"&&e.employeeId!==o.claims.employeeId)throw Error("Pilih akun kasir Anda");let l={...e,at:new Date().toISOString(),sessionId:e.sessionId||crypto.randomUUID()};return(0,d.Q)(l),a.db.transaction("rw",["operations","orders","orderItems","shifts","cashMovements","auditLogs","attendancePhotos"],async()=>{s&&await a.db.table("attendancePhotos").put({id:s.photoId,operationId:l.sessionId,employeeId:l.employeeId,employeeName:l.employeeName,blob:s.blob,checksum:s.checksum,createdAt:l.at,status:"lokal"});let e=await a.db.table("operations").toArray();if(l.kind.startsWith("attendance.")){let t=(0,d.S)(e).find(e=>e.employeeId===l.employeeId&&!e.end);if("attendance.in"===l.kind&&(t||e.some(e=>"attendance.in"===e.kind&&e.sessionId===l.sessionId)))throw Error("Karyawan sudah absen masuk");if("attendance.out"===l.kind&&(!t||t.id!==l.sessionId))throw Error("Absensi masuk belum tersedia")}if("repayment"===l.kind&&l.amount>(0,d.P)(e,l.employeeId))throw Error("Pembayaran melebihi sisa kasbon");if("commission"===l.kind){let t=await a.db.table("orders").get(l.orderId),i=await a.db.table("orderItems").get(l.orderItemId);if(!t||"paid"!==t.status||t.isRefunded||!i||i.orderId!==l.orderId)throw Error("Pilih layanan dari nota lunas");if(e.some(e=>"commission"===e.kind&&e.orderItemId===l.orderItemId))throw Error("Komisi layanan sudah tercatat");if(Math.floor(i.qty*i.hargaSatuan*Math.max(0,t.subtotal-(t.discount||0))/t.subtotal)!==l.basisAmount)throw Error("Nilai layanan berubah. Pilih kembali")}if("commission.paid"===l.kind&&l.amount>(0,d.$)(e,l.employeeId,await a.db.table("orders").toArray()))throw Error("Pembayaran melebihi komisi tersedia");if("laundry"===l.kind){let i=await a.db.table("orders").get(l.orderId);if(!i)throw Error("Pesanan tidak ditemukan");if(o?.claims.role==="cashier"&&(i.mdDeviceId!==o.claims.deviceId||i.mdOperatorId!==o.claims.employeeId))throw Error("Pesanan ini milik kasir lain");let r=e.filter(e=>"laundry"===e.kind&&e.orderId===l.orderId).at(-1);if((l.previousId||void 0)!==(r?.mdId||r?.sessionId))throw Error("Status pesanan berubah. Perbarui lalu coba lagi");(0,t.x)(i,r?.laundryStage||"received",l.laundryStage)}if("kitchen"===l.kind){let t=await a.db.table("orderItems").get(l.orderItemId),i=await a.db.table("orders").get(l.orderId);if(!t||t.orderId!==l.orderId||!i||"void"===i.status||i.isHistorical||t.mdDeleted)throw Error("Pesanan sudah tidak tersedia");if(o?.claims.role==="cashier"&&(i.mdDeviceId!==o.claims.deviceId||i.mdOperatorId!==o.claims.employeeId))throw Error("Pesanan ini milik kasir lain.");let r=e.filter(e=>"kitchen"===e.kind&&e.orderItemId===l.orderItemId).at(-1);if((l.previousId||void 0)!==(r?.mdId||r?.sessionId)||d.x.indexOf(l.stage)!==d.x.indexOf(r?.lineSignature===(0,d.K)(t)?r.stage:"waiting")+1)throw Error("Status pesanan berubah. Coba lagi")}if("kitchen"===l.kind&&l.lineSignature!==(0,d.K)(await a.db.table("orderItems").get(l.orderItemId)))throw Error("Pesanan berubah. Periksa kembali");if(["loan","repayment","commission.paid"].includes(l.kind)&&"laci"===l.source){let e=await a.db.table("shifts").get(l.shiftId);if(!e||"open"!==e.status||o&&(e.mdDeviceId!==o.claims.deviceId||e.mdOperatorId!==(o.claims.employeeId||o.claims.deviceId)))throw Error("Buka shift di perangkat ini terlebih dahulu");l.cashMovementId=await a.db.table("cashMovements").add({shiftId:l.shiftId,type:"repayment"===l.kind?"in":"out",amount:l.amount,category:"commission.paid"===l.kind?"komisi":"kasbon_karyawan",paymentSource:"laci",reason:`${"loan"===l.kind?"Kasbon":"repayment"===l.kind?"Bayar kasbon":"Komisi"} \xb7 ${l.employeeName}`,operatorName:o?.operatorName||"Pemilik",timestamp:l.at})}let i=await a.db.table("operations").add(l);return await a.db.table("auditLogs").add({action:"OPERATION",amount:l.amount||0,reason:`${l.kind} \xb7 ${l.employeeName}${l.note?` \xb7 ${l.note}`:""}`,operator:o?.operatorName||"Pemilik",timestamp:l.at}),i})}e.s(["p",0,l,"I",0,c])},46766,e=>{function t(e){return e.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}e.s(["w",0,t,"D",0,function e(a){return"string"==typeof a?t(a):Array.isArray(a)?a.map(e):a&&"object"==typeof a?Object.fromEntries(Object.entries(a).map(([t,a])=>[t,e(a)])):a},"h",0,function(e){return e&&e.length<=28e5&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(e)?e:""},"o",0,function e(t){return"string"==typeof t?t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,""):Array.isArray(t)?t.map(e):t&&"object"==typeof t?Object.fromEntries(Object.entries(t).map(([t,a])=>[t,e(a)])):t}])},71798,42250,e=>{var t=e.i(68542),a=e.i(43668),i=e.i(82568);let r=(0,i.U)("BluetoothSerial",{web:()=>e.A(88868).then(e=>new e.BluetoothSerialWeb)});e.s(["f",0,r],42250);let n=(0,i.U)("Printer",{web:()=>e.A(28165).then(e=>new e.PrinterWeb)});var s=e.i(46766);let o=e=>`Rp ${Math.round(e||0).toLocaleString("id-ID")}`;function d(e,t){if(!e)return[];let a=e.split(/\s+/),i=[],r="";for(let e of a)if(r)if((r+" "+e).length<=t)r+=" "+e;else if(i.push(r),e.length>t){let a=e;for(;a.length>t;)i.push(a.substring(0,t)),a=a.substring(t);r=a}else r=e;else if(e.length>t){let a=e;for(;a.length>t;)i.push(a.substring(0,t)),a=a.substring(t);r=a}else r=e;return r&&i.push(r),i}let l=e=>{if(!e)return!1;let t=e.toLowerCase();return t.includes("minuman")||t.includes("kopi")||t.includes("tea")||t.includes("matcha")||t.includes("drink")||t.includes("coffee")||t.includes("milkshake")||t.includes("beverage")||t.includes("juice")};function c(e,a,i,r){let n=e.date||(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")),s=e.orderId?`A-${e.orderId}`:e.id?`A-${e.id}`:"-",d=e.tableName?e.tableName:`[${e.orderType||"Dine-in"}]`,c=i.storeName||"SAKUNOTA";"food"===a&&(c="DAPUR (KITCHEN)"),"drink"===a&&(c="BAR (MINUMAN)"),"laundry"===e.serviceCategory&&e.status&&(e={...e,isDraft:"paid"!==e.status});let m=e.items||[],p=0,u=m.map(e=>{let i=l(e.kategori||e.kategoriMenu);if("food"===a&&i||"drink"===a&&!i)return"";let r=Number(e.qty||1),n=(0,t.c)(e,r);p+=n;let s=e.nama||e.namaMenu||"Item",d=e.selectedModifiers&&e.selectedModifiers.length>0?e.selectedModifiers.map(e=>`
          <div class="item-mod">
            &gt; ${e.optionName||e.nama}${e.harga>0?` (+${o(e.harga)})`:""}
          </div>
        `).join(""):"",c=e.notes?`<div class="item-note">* ${e.notes}</div>`:"";return`
      <tr>
        <td class="col-item">
          <div class="item-name">${"weight"===e.saleUnit?(0,t.b)(e,r):r+"x"} ${s}</div>
          ${d}
          ${c}
        </td>
        ${"all"===a?`<td class="col-price">${o(n)}</td>`:""}
      </tr>
    `}).join(""),g=void 0!==e.subtotal?e.subtotal:p,h=void 0!==e.total?e.total:p,f=e.payments&&e.payments.length>0?`
    <div class="divider"></div>
    <div class="bold" style="margin-bottom: 2px;">Rincian Pembayaran:</div>
    ${e.payments.map((e,t)=>`
      <div class="row">
        <span>${t+1}. ${e.paymentMethod}${"refunded"===e.status?" (REFUND)":""}</span>
        <span>${o(e.amount)}</span>
      </div>
    `).join("")}
  `:`
    <div class="row">
      <span>Metode Bayar:</span>
      <span>${e.paymentMethod||"Tunai"}</span>
    </div>
    ${e.cashTendered&&!("laundry"===e.serviceCategory&&e.isDraft)?`
      <div class="row">
        <span>Uang Diterima:</span>
        <span>${o(e.cashTendered)}</span>
      </div>
      <div class="row">
        <span>Kembalian:</span>
        <span>${o(Math.max(0,e.cashTendered-h))}</span>
      </div>
    `:""}
  `;return`
    ${i.storeLogo&&!1!==i.receiptShowLogo&&"all"===a?`
      <div class="logo-box">
        <img src="${i.storeLogo}" alt="Logo Toko" />
      </div>
    `:""}

    <div class="center">
      <div class="store-title">${c}</div>
      ${"all"===a?`
        ${i.storeAddress?`<div class="store-sub">${i.storeAddress}</div>`:""}
        ${i.storePhone?`<div class="store-sub">Telp: ${i.storePhone}</div>`:""}
        ${i.receiptHeader?`<div class="store-sub bold" style="margin-top: 2px;">${i.receiptHeader}</div>`:""}
      `:""}
    </div>

    <div class="double-divider"></div>

    <div class="order-banner">
      <div class="order-num">No: ${s}</div>
      ${"laundry"===e.serviceCategory?`<div>Laundry \xb7 Selesai: ${e.pickupDate||"-"}</div><div>${e.customerPhone||""}</div>`:""}
      ${!1!==i.receiptShowCustomer?`<div class="bold">${e.customerName?`An. ${e.customerName}`:"Tamu"}</div>`:""}
      ${!1!==i.receiptShowTable&&(e.tableName||e.orderType&&"Dine-in"!==e.orderType&&"Direct"!==e.orderType)?`
        <div style="margin-top: 3px;">
          <span class="badge">${d}</span>
        </div>
      `:""}
      ${e.notes&&!1!==i.receiptShowNotes?`<div style="text-align: left; border: 1px solid #000; padding: 3px; margin-top: 4px; font-size: 10px; font-weight: bold;">Catatan: ${e.notes}</div>`:""}
    </div>

    <div class="divider"></div>
    <div class="row" style="font-size: 10px;">
      <span>Tgl: ${n}</span>
      <span>${(e.operatorName||e.kasirName)&&!1!==i.receiptShowCashier?`Kasir: ${e.operatorName||e.kasirName}`:""}</span>
    </div>
    <div class="divider"></div>

    <table>
      <tbody>
        ${u}
      </tbody>
    </table>

    ${"all"===a?`
      <div class="divider"></div>

      ${e.discount&&e.discount>0||e.serviceCharge&&e.serviceCharge>0||e.tax&&e.tax>0?`
        <div class="row">
          <span>Subtotal:</span>
          <span>${o(g)}</span>
        </div>
        ${e.discount&&e.discount>0?`
          <div class="row">
            <span>Diskon:</span>
            <span>-${o(e.discount)}</span>
          </div>
        `:""}
        ${e.serviceCharge&&e.serviceCharge>0?`
          <div class="row">
            <span>Layanan:</span>
            <span>${o(e.serviceCharge)}</span>
          </div>
        `:""}
        ${e.tax&&e.tax>0?`
          <div class="row">
            <span>Pajak PBJT:</span>
            <span>${o(e.tax)}</span>
          </div>
        `:""}
        <div class="divider"></div>
      `:""}

      <div class="row total-row">
        <span>TOTAL:</span>
        <span>${o(h)}</span>
      </div>

      ${f}

      <div class="status-box">
        ${e.isDraft?"laundry"===e.serviceCategory?"BELUM LUNAS":"TAGIHAN SEMENTARA (OPEN BILL)":"LUNAS"}
      </div>

      ${e.isDemo?`
        <div class="status-box" style="border: 1px dashed #b45309; background: #fffbeb; color: #92400e; font-size: 10px; margin: 4px 0;">
          *** STRUK SIMULASI DEMO KASIR ***<br />
          <span style="font-size: 9px; font-weight: normal;">BUKAN BUKTI TRANSAKSI RIIL</span>
        </div>
      `:""}

      ${i.receiptFooter?`<div class="footer-text">${i.receiptFooter}</div>`:""}
      ${i.receiptCustomNote?`<div class="footer-text" style="font-style: italic; margin-top: 4px;">${i.receiptCustomNote}</div>`:""}
      ${i.enableWatermark?'<div class="watermark">[ SakuNota - Solusi Kasir UMKM ]</div>':""}
    `:`
      <div class="divider"></div>
      <div class="center bold" style="font-size: 11px; margin-top: 4px;">*** SELESAI TIKET ***</div>
    `}
  `}function m(e){let t=Array.isArray((e=(0,s.D)(e)).items)?e.items:[],a=[];for(let e of t){let t=Math.max(1,Math.round(Number(e.qty)||1));for(let i=0;i<t;i++)a.push(e)}let i=a.length,r=e.orderType?.toLowerCase()==="takeaway"||!e.tableId&&"Dine-in"!==e.orderType,n=r?"Take Away":"Dine In",o="Tamu";if(r)o=e.customerName?.trim()||"Take Away";else{let t=e.tableName?.trim()||(e.tableId?`Meja ${e.tableId}`:""),a=e.customerName?.trim()||"";o=t&&a?`${t} (${a})`:t||a||"Dine In"}let d=e.createdAt?new Date(e.createdAt):new Date,c=e=>String(e).padStart(2,"0"),m=c(d.getDate()),p=c(d.getMonth()+1),u=String(d.getFullYear()).slice(-2),g=c(d.getHours()),h=c(d.getMinutes()),f=`${m}/${p}/${u} ${g}:${h}`;return a.map((t,a)=>{let r=l(t.kategori||t.kategoriMenu),s=[];if(Array.isArray(t.selectedModifiers))for(let e of t.selectedModifiers){let t=e.optionName||e.nama||"";t&&s.push(t)}let d=t.notes||t.catatan||(0===a&&e.notes?e.notes:void 0);return{index:a+1,total:i,customerOrTable:o,orderType:n,nama:t.nama||t.namaMenu||"Menu",unit:r?"1 Cup":"1 Porsi",modifiers:s,notes:d,dateTime:f,orderId:e.orderId||e.id}})}async function p(e){let{title:t,escposText:a,htmlContent:s}=e;if(i.d.isNativePlatform()){let e=localStorage.getItem("bt_printer_mac");if(e)try{try{await r.connect({address:e})}catch(e){}return await r.write({address:e,value:a}),{success:!0,platform:"native_bluetooth",message:"Berhasil dikirim ke Printer Bluetooth Thermal!"}}catch(e){console.warn("Bluetooth Serial write failed, falling back to native system printer:",e);try{return await n.printHtml({html:s,name:t}),{success:!0,platform:"native_system",message:"Bluetooth gagal, dicetak via dialog Printer Sistem Android."}}catch(t){throw Error(`Gagal mencetak di Android: ${e.message||e}`)}}try{return await n.printHtml({html:s,name:t}),{success:!0,platform:"native_system",message:"Berhasil dikirim ke Dialog Printer Sistem Android."}}catch(e){throw Error(`Gagal membuka dialog printer Android: ${e.message||e}`)}}try{let e=document.getElementById("sakunota-print-iframe");e||((e=document.createElement("iframe")).setAttribute("sandbox","allow-same-origin allow-modals"),e.id="sakunota-print-iframe",e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.visibility="hidden",document.body.appendChild(e));let t=e.contentDocument||e.contentWindow?.document;if(t&&(t.open(),t.write(s),t.close(),await new Promise(e=>setTimeout(e,250)),e.contentWindow))return e.contentWindow.focus(),e.contentWindow.print(),window.focus(),{success:!0,platform:"web_iframe",message:"Dialog cetak struk terisolasi berhasil dibuka!"}}catch(e){console.warn("Iframe print error, falling back to Printer.printHtml:",e)}try{return await n.printHtml({html:s,name:t}),{success:!0,platform:"web_fallback",message:"Dialog cetak dibuka via Capacitor Web Plugin."}}catch(e){throw Error(`Gagal mencetak struk di browser: ${e.message||e}`)}}e.s(["executePrintDocument",0,p,"formatCurrency",0,o,"generateBulkReceiptHtml",0,function(e,t="all",i){let r=(0,s.D)(i||(0,a.getStoreSettings)());r.storeLogo=(0,s.h)(r.storeLogo);let n="80mm"===r.paperWidth,o=n?"80mm":"58mm",d=n?"72mm":"52mm",l=e.map(e=>{let a=(0,s.D)(e);return`
      <div class="bulk-receipt-page">
        ${c(a,t,r,n)}
      </div>
    `}).join("");return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
      <title>Cetak_Masal_${e.length}_Nota</title>
      <style>
        @page {
          margin: 0;
          size: ${o} auto;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Courier New', Courier, monospace, system-ui;
          font-size: ${n?"13px":"11px"};
          line-height: 1.25;
          color: #000000 !important;
          background: #ffffff !important;
          width: ${d};
          margin: 0 auto;
          padding: 0;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000000; margin: 5px 0; }
        .double-divider { border-top: 2px dashed #000000; margin: 6px 0; }
        .logo-box { text-align: center; margin-bottom: 6px; }
        .logo-box img { max-height: 48px; max-width: 120px; object-fit: contain; filter: grayscale(100%) contrast(200%); }
        .store-title { font-size: ${n?"16px":"14px"}; font-weight: 900; text-transform: uppercase; }
        .store-sub { font-size: ${n?"11px":"10px"}; }
        .order-banner { text-align: center; padding: 4px 0; }
        .order-num { font-size: ${n?"24px":"20px"}; font-weight: 900; }
        .badge { display: inline-block; padding: 1px 4px; border: 1px solid #000; font-size: 10px; font-weight: bold; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 2px 0; }
        .col-item { text-align: left; word-break: break-word; }
        .col-price { text-align: right; white-space: nowrap; padding-left: 6px; }
        .item-name { font-weight: bold; }
        .item-mod { font-size: 0.9em; padding-left: 8px; color: #222; }
        .item-note { font-size: 0.85em; padding-left: 8px; font-style: italic; }
        .total-row { font-size: ${n?"15px":"13px"}; font-weight: 900; margin-top: 3px; }
        .status-box { text-align: center; font-weight: 900; padding: 4px; border: 1px dashed #000; margin: 6px 0; }
        .footer-text { font-size: 10px; text-align: center; margin-top: 8px; white-space: pre-line; }
        .watermark { font-size: 9px; text-align: center; margin-top: 8px; color: #333; }

        .bulk-receipt-page {
          width: 100%;
          padding: 8px 4px 20px 4px;
          page-break-after: always;
          break-after: page;
        }
        .bulk-receipt-page:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        @media print {
          .bulk-receipt-page {
            page-break-after: always;
            break-after: page;
          }
          .bulk-receipt-page:last-child {
            page-break-after: auto;
            break-after: auto;
          }
        }
      </style>
    </head>
    <body>
      ${l}
    </body>
    </html>
  `},"generateCupLabelsEscPos",0,function(e,t){let i=m(e=(0,s.o)(e));if(!i.length)return"";let r="80mm"===(0,s.o)(t||(0,a.getStoreSettings)()).paperWidth?48:32,n="-".repeat(r)+"\n",o=(e,t)=>{let a=r-e.length-t.length;if(a>=0)return`${e}${" ".repeat(a)}${t}
`;let i=Math.max(1,r-t.length-1);return`${e.slice(0,i)} ${t}
`},d="";for(let e of i){for(let t of(d+="\x1b@",d+="\x1bE\x01"+o(e.customerOrTable,e.orderType)+"\x1bE\0",d+=`${e.unit}
`,d+=n,d+="\x1bE\x01\x1b!\x10"+e.nama+"\x1b!\0\x1bE\0\n",e.modifiers))d+=`  * ${t}
`;e.notes&&(d+=`  (Catatan: ${e.notes})
`),d+=n,d+="\x1bE\x01"+o(e.dateTime,`${e.index}/${e.total}`)+"\x1bE\0",d+="\n\n\n\x1dVB\0"}return d},"generateCupLabelsHtml",0,function(e,t){let i=m(e=(0,s.D)(e));if(!i.length)return"";let r="80mm"===(0,s.D)(t||(0,a.getStoreSettings)()).paperWidth,n=i.map(e=>`
    <div class="cup-label">
      <div class="label-header">
        <span class="label-cust">${e.customerOrTable}</span>
        <span class="label-type">${e.orderType}</span>
      </div>
      <div class="label-unit">${e.unit}</div>
      <div class="label-item-name">${e.nama}</div>
      ${e.modifiers.length>0?`<div class="label-modifiers">${e.modifiers.map(e=>`<div>• ${e}</div>`).join("")}</div>`:""}
      ${e.notes?`<div class="label-notes">Catatan: ${e.notes}</div>`:""}
      <div class="label-footer">
        <span class="label-date">${e.dateTime}</span>
        <span class="label-counter">${e.index}/${e.total}</span>
      </div>
    </div>
  `).join("\n");return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>Stiker_Cup_${e.orderId||e.id||"Order"}</title>
      <style>
        @page {
          margin: 0;
          size: ${r?"80mm":"58mm"} auto;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Courier New", monospace;
          font-size: 11px;
          line-height: 1.25;
          color: #000000 !important;
          background: #ffffff !important;
          padding: 4px;
        }
        .cup-label {
          width: ${r?"70mm":"50mm"};
          min-height: 32mm;
          margin: 0 auto 5mm auto;
          padding: 3mm 2.5mm;
          border: 1px dashed #777;
          border-radius: 4px;
          page-break-after: always;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          background: #ffffff;
        }
        @media print {
          body {
            padding: 0;
          }
          .cup-label {
            border: none;
            margin: 0 auto;
            border-radius: 0;
          }
        }
        .label-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 1.5px solid #000;
          padding-bottom: 2px;
          margin-bottom: 2px;
        }
        .label-cust {
          font-weight: 900;
          font-size: 13px;
          max-width: 65%;
          word-break: break-word;
        }
        .label-type {
          font-weight: 800;
          font-size: 10px;
          text-transform: uppercase;
          text-align: right;
        }
        .label-unit {
          font-size: 9px;
          color: #444;
          font-weight: bold;
          margin-top: 2px;
        }
        .label-item-name {
          font-size: 14px;
          font-weight: 900;
          line-height: 1.15;
          margin: 3px 0 2px 0;
          word-break: break-word;
        }
        .label-modifiers {
          font-size: 10px;
          font-weight: 600;
          color: #222;
          margin-bottom: 4px;
          line-height: 1.25;
          padding-left: 2px;
        }
        .label-notes {
          font-size: 9px;
          font-style: italic;
          color: #444;
          margin-bottom: 4px;
        }
        .label-footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-top: 1px dashed #666;
          padding-top: 2px;
          margin-top: auto;
          font-size: 9px;
        }
        .label-date {
          font-weight: normal;
        }
        .label-counter {
          font-weight: 900;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      ${n}
    </body>
    </html>
  `},"generateEscPosReceipt",0,function(e,i="all",r){e=(0,s.o)(e);let n=(0,s.o)(r||(0,a.getStoreSettings)()),c="80mm"===n.paperWidth?48:32,m="-".repeat(c)+"\n",p="=".repeat(c)+"\n",u=e=>e?d(e,c).map(e=>{let t=Math.max(0,Math.floor((c-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",g=(e,t)=>{let a=c-e.length-t.length;if(a>=0)return`${e}${" ".repeat(a)}${t}
`;let i=c-t.length-1;if(i>8){let a=e.substring(0,i),r=e.substring(i),n=c-a.length-t.length;return`${a}${" ".repeat(Math.max(1,n))}${t}
   ${r.trim()}
`}return`${e}
${t.padStart(c," ")}
`},h="";"all"===i?(h+=u(n.storeName||"SAKUNOTA"),n.storeAddress&&d(n.storeAddress,c).forEach(e=>{h+=u(e)}),n.storePhone&&(h+=u(`Telp: ${n.storePhone}`)),n.receiptHeader&&n.receiptHeader.split("\n").forEach(e=>{e.trim()&&(h+=u(e.trim()))})):h+=u("food"===i?"*** STRUK DAPUR (KITCHEN) ***":"*** STRUK BAR (MINUMAN) ***"),h+=p;let f=e.date||(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID"));h+=g(`Tgl: ${f}`,"");let b=e.orderId?`No: A-${e.orderId}`:e.id?`No: A-${e.id}`:"No: -",y="";!1!==n.receiptShowTable&&(e.tableName?y=`Meja: ${String(e.tableName).replace(/^Meja\s*/i,"")}`:e.orderType&&"Dine-in"!==e.orderType&&"Direct"!==e.orderType&&(y=`[${e.orderType}]`)),h+=g(b,y),"laundry"===e.serviceCategory&&(h+=g("Laundry",""),h+=g("Selesai: "+(e.pickupDate||"-"),""),e.customerPhone&&(h+=g("WA: "+e.customerPhone,""))),e.customerName&&!1!==n.receiptShowCustomer&&(h+=g(`Pelanggan: ${e.customerName}`,"")),(e.operatorName||e.kasirName)&&!1!==n.receiptShowCashier&&(h+=g(`Kasir: ${e.operatorName||e.kasirName}`,"")),e.notes&&!1!==n.receiptShowNotes&&(h+=`Catatan: ${e.notes}
`),h+=m;let x=0;if("laundry"===e.serviceCategory&&e.status&&(e={...e,isDraft:"paid"!==e.status}),(e.items||[]).forEach(e=>{let a=l(e.kategori||e.kategoriMenu);if("food"===i&&a||"drink"===i&&!a)return;let r=Number(e.qty||1),n=(0,t.c)(e,r);x+=n;let s=e.nama||e.namaMenu||"Item",m=`${"weight"===e.saleUnit?(0,t.b)(e,r):r+"x"} ${s}`,p=o(n);"all"===i?h+=g(m,p):h+=`${m}
`,e.selectedModifiers&&e.selectedModifiers.length>0&&e.selectedModifiers.forEach(e=>{let t=e.harga>0?` (+${o(e.harga)})`:"",a=`   > ${e.optionName||e.nama}${t}`;h+=d(a,c).join("\n")+"\n"}),e.notes&&(h+=`   * ${e.notes}
`)}),h+=m,"all"===i){let a=void 0!==e.subtotal?e.subtotal:x;if(e.discount&&e.discount>0||e.serviceCharge&&e.serviceCharge>0||e.tax&&e.tax>0){if(h+=g("Subtotal:",o(a)),e.discount&&e.discount>0){let t="percent"===e.discountType?`Diskon (${e.discountValue}%):`:"Diskon:";h+=g(t,"-"+o(e.discount))}e.serviceCharge&&e.serviceCharge>0&&(h+=g("Layanan:",o(e.serviceCharge))),e.tax&&e.tax>0&&(h+=g("Pajak PBJT:",o(e.tax))),h+=m}let i=void 0!==e.total?e.total:x;if(h+=g("TOTAL TAGIHAN:",o(i)),e.payments&&e.payments.length>0){h+=m,h+="Rincian Pembayaran:\n",e.payments.forEach((e,a)=>{let i="refunded"===e.status,r=` ${a+1}. ${e.paymentMethod}${i?" (REFUND)":""}`;h+=g(r,o(e.amount)),e.itemsPaid&&e.itemsPaid.length>0&&e.itemsPaid.forEach(e=>{h+=`    • ${(0,t.b)(e)} ${e.nama}
`})}),h+=m;let a=e.payments.filter(e=>"completed"===e.status).reduce((e,t)=>e+t.amount,0);h+=g("Total Terbayar:",o(a));let r=Math.max(0,i-a);r>0?(h+=g("SISA TAGIHAN:",o(r)),h+=p,h+=u(" STATUS: BELUM LUNAS")):(h+=p,h+=u(" STATUS: LUNAS"))}else{if(h+=g("Metode:",e.paymentMethod||"Tunai"),e.cashTendered&&e.cashTendered>0&&!("laundry"===e.serviceCategory&&e.isDraft)){h+=g("Bayar Tunai:",o(e.cashTendered));let t=Math.max(0,e.cashTendered-i);h+=g("Kembalian:",o(t))}h+=p,e.isDraft?h+=u("laundry"===e.serviceCategory?" BELUM LUNAS":" TAGIHAN SEMENTARA (OPEN BILL)"):h+=u(" LUNAS")}h+=m,n.receiptFooter&&n.receiptFooter.split("\n").forEach(e=>{e.trim()&&(h+=u(e.trim()))}),n.receiptCustomNote&&n.receiptCustomNote.split("\n").forEach(e=>{e.trim()&&(h+=u(e.trim()))}),n.enableWatermark&&(h+="\n"+u("[ SakuNota - Solusi Kasir UMKM ]")),e.isDemo&&(h+="\n"+u("*** STRUK SIMULASI DEMO KASIR ***"),h+=u("BUKAN BUKTI TRANSAKSI RIIL"))}return h+="\n\n\n"},"generatePartialPaymentReceipt",0,function(e,i,r){e=(0,s.o)(e),i=(0,s.o)(i);let n=(0,s.o)(r||(0,a.getStoreSettings)()),l="80mm"===n.paperWidth?48:32,c="-".repeat(l)+"\n",m="=".repeat(l)+"\n",p=e=>e?d(e,l).map(e=>{let t=Math.max(0,Math.floor((l-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",u=(e,t)=>{let a=l-e.length-t.length;return a<=0?`${e}
${t.padStart(l," ")}
`:`${e}${" ".repeat(a)}${t}
`},g="";g+=p(n.storeName||"SAKUNOTA"),n.storeAddress&&(g+=p(n.storeAddress)),n.storePhone&&(g+=p(`Telp: ${n.storePhone}`)),g+=m,g+=p("BUKTI PEMBAYARAN PARSIAL / SPLIT"),g+=c,g+=u(`Tgl: ${i.paidAt?new Date(i.paidAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")}`,""),g+=u(`No: A-${e.id||"-"}`,e.tableId?`Meja: ${e.tableId}`:`[${e.orderType||"Dine-in"}]`),e.customerName&&(g+=u(`Pelanggan: ${e.customerName}`,"")),g+=u(`Kasir: ${i.operatorName||"Kasir"}`,i.shiftId?`Shift #${i.shiftId}`:""),g+=c;let h="item"===i.splitType?"Split by Item (Per Menu)":"equal"===i.splitType?"Split Equally (Bagi Rata)":"Pembayaran Cicil / Parsial";g+=`Tipe: ${h}
`,i.itemsPaid&&i.itemsPaid.length>0&&(g+="Menu yang dibayar:\n",i.itemsPaid.forEach(e=>{g+=u(` • ${(0,t.b)(e)} ${e.nama}`,o((0,t.c)(e)))})),g+=c,g+=u("Nominal Dibayar:",o(i.amount)),g+=u("Metode Bayar:",i.paymentMethod||"Tunai"),"Cash"===i.paymentMethod&&i.cashTendered&&(g+=u("Uang Diterima:",o(i.cashTendered)),g+=u("Kembalian:",o(i.change||0))),g+=c,g+=u("Total Tagihan Nota:",o(e.total));let f=void 0!==e.remainingBalance?e.remainingBalance:Math.max(0,e.total-(e.paidAmount||i.amount));return g+=u("SISA TAGIHAN:",o(f)),g+=m,f>0?(g+=p(" STATUS: BELUM LUNAS"),g+=p("Harap simpan bukti pembayaran ini")):g+=p(" STATUS: LUNAS"),n.enableWatermark&&(g+="\n"+p("[ SakuNota - Solusi Kasir UMKM ]")),g+="\n\n\n"},"generateReceiptHtml",0,function(e,t="all",i){e=(0,s.D)(e);let r=(0,s.D)(i||(0,a.getStoreSettings)());r.storeLogo=(0,s.h)(r.storeLogo);let n="80mm"===r.paperWidth,o=n?"80mm":"58mm",d=n?"72mm":"52mm",l=e.orderId?`A-${e.orderId}`:e.id?`A-${e.id}`:"-";return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
      <title>Struk_${l}</title>
      <style>
        @page {
          margin: 0;
          size: ${o} auto;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Courier New', Courier, monospace, system-ui;
          font-size: ${n?"13px":"11px"};
          line-height: 1.25;
          color: #000000 !important;
          background: #ffffff !important;
          width: ${d};
          margin: 0 auto;
          padding: 8px 4px 20px 4px;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000000; margin: 5px 0; }
        .double-divider { border-top: 2px dashed #000000; margin: 6px 0; }
        .logo-box { text-align: center; margin-bottom: 6px; }
        .logo-box img { max-height: 48px; max-width: 120px; object-fit: contain; filter: grayscale(100%) contrast(200%); }
        .store-title { font-size: ${n?"16px":"14px"}; font-weight: 900; text-transform: uppercase; }
        .store-sub { font-size: ${n?"11px":"10px"}; }
        .order-banner { text-align: center; padding: 4px 0; }
        .order-num { font-size: ${n?"24px":"20px"}; font-weight: 900; }
        .badge { display: inline-block; padding: 1px 4px; border: 1px solid #000; font-size: 10px; font-weight: bold; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 2px 0; }
        .col-item { text-align: left; word-break: break-word; }
        .col-price { text-align: right; white-space: nowrap; padding-left: 6px; }
        .item-name { font-weight: bold; }
        .item-mod { font-size: 0.9em; padding-left: 8px; color: #222; }
        .item-note { font-size: 0.85em; padding-left: 8px; font-style: italic; }
        .total-row { font-size: ${n?"15px":"13px"}; font-weight: 900; margin-top: 3px; }
        .status-box { text-align: center; font-weight: 900; padding: 4px; border: 1px dashed #000; margin: 6px 0; }
        .footer-text { font-size: 10px; text-align: center; margin-top: 8px; white-space: pre-line; }
        .watermark { font-size: 9px; text-align: center; margin-top: 8px; color: #333; }
      </style>
    </head>
    <body>
      ${c(e,t,r,n)}
    </body>
    </html>
  `},"generateTestReceiptData",0,function(e){e||(0,a.getStoreSettings)();let t=new Date;return{id:999,orderId:"999",createdAt:t.toISOString(),date:t.toLocaleString("id-ID"),customerName:"Budi Santoso (Uji Coba)",tableName:"Meja Tes #01",orderType:"Dine-in",paymentMethod:"Tunai",operatorName:"Kasir SakuNota",notes:"Uji format pembungkusan teks panjang & kalkulasi",items:[{nama:"Nasi Goreng Spesial Babat Gongso Pedas Manis",qty:2,harga:28e3,kategori:"Makanan Utama",selectedModifiers:[{optionName:"Level 3 - Ekstra Pedas Cabai Rawit",harga:2e3},{optionName:"Tambah Telur Ceplok Setengah Matang",harga:4e3}]},{nama:"Es Kopi Susu Gula Aren Spesial Nusantara",qty:2,harga:18e3,kategori:"Minuman",selectedModifiers:[{optionName:"Less Sugar (50% Manis)",harga:0},{optionName:"Extra Espresso Shot",harga:5e3}]}],subtotal:106e3,discount:6e3,discountType:"fixed",serviceCharge:5e3,tax:10500,total:115500,cashTendered:12e4,change:4500,isDraft:!1}},"generateZReportHtml",0,function(e,t){e=(0,s.D)(e);let i=(0,s.D)(t||(0,a.getStoreSettings)()),r="80mm"===i.paperWidth,n=void 0!==e.cashDifference?e.cashDifference:0,d="SELISIH: Rp 0 (PAS)";return n>0&&(d=`SELISIH: +${o(n)} (LEBIH)`),n<0&&(d=`SELISIH: -${o(Math.abs(n))} (KURANG)`),`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
      <title>Z_Report_Shift_${e.id||"-"}</title>
      <style>
        @page { margin: 0; size: ${r?"80mm":"58mm"} auto; }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: ${r?"13px":"11px"};
          line-height: 1.25;
          color: #000000 !important;
          background: #ffffff !important;
          width: ${r?"72mm":"52mm"};
          margin: 0 auto;
          padding: 8px 4px 20px 4px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .double-divider { border-top: 2px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      </style>
    </head>
    <body>
      <div class="center bold" style="font-size: 14px;">${i.storeName||"SAKUNOTA"}</div>
      <div class="center bold" style="font-size: 11px;">LAPORAN TUTUP SHIFT (Z-REPORT)</div>
      <div class="double-divider"></div>

      <div class="row"><span>Shift ID:</span><span>#${e.id||"-"}</span></div>
      <div class="row"><span>Kasir:</span><span>${e.operatorName||"Kasir"}</span></div>
      ${"owner"===e.closedBy?`
      <div class="row"><span>Ditutup Oleh:</span><span>${e.closedByOperator||"Pemilik"} (Pemilik)</span></div>
      ${e.closureReason?`<div class="row"><span>Alasan Tutup:</span><span>${e.closureReason}</span></div>`:""}
      `:""}
      <div class="row"><span>Buka:</span><span>${e.startTime?new Date(e.startTime).toLocaleString("id-ID"):"-"}</span></div>
      <div class="row"><span>Tutup:</span><span>${e.endTime?new Date(e.endTime).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")}</span></div>
      
      <div class="divider"></div>
      <div class="center bold">--- REKONSILIASI KAS LACI ---</div>
      <div class="row"><span>Modal Awal:</span><span>${o(e.startingCash||0)}</span></div>
      <div class="row"><span>Penjualan Tunai:</span><span>+${o(e.cashSales||0)}</span></div>
      ${e.cashIn?`<div class="row"><span>Kas Masuk:</span><span>+${o(e.cashIn)}</span></div>`:""}
      ${e.cashOut?`<div class="row"><span>Kas Keluar:</span><span>-${o(e.cashOut)}</span></div>`:""}
      ${e.cashRefunds?`<div class="row"><span>Refund Tunai:</span><span>-${o(e.cashRefunds)}</span></div>`:""}
      
      <div class="divider"></div>
      <div class="row bold"><span>KAS SEHARUSNYA:</span><span>${o(e.expectedCash||0)}</span></div>
      <div class="row bold"><span>HITUNG FISIK:</span><span>${o(void 0!==e.actualCash?e.actualCash:e.expectedCash)}</span></div>
      <div class="center bold" style="margin-top: 4px; padding: 2px; border: 1px solid #000;">${d}</div>

      <div class="double-divider"></div>
      <div class="center bold">--- NON-TUNAI (BANK / QRIS) ---</div>
      <div class="row"><span>QRIS / Transfer:</span><span>${o(e.nonCashSales||0)}</span></div>
      <div class="center" style="font-size: 9px;">(Masuk langsung ke rekening merchant)</div>

      ${e.notes?`<div class="divider"></div><div style="font-size: 10px;">Catatan: ${e.notes}</div>`:""}

      <div class="divider"></div>
      <div class="center" style="margin-top: 16px;">Tanda Tangan Kasir,</div>
      <div style="height: 36px;"></div>
      <div class="center bold">( ${e.operatorName||"Kasir"} )</div>

      ${i.enableWatermark?'<div class="center" style="font-size: 9px; margin-top: 10px; color: #444;">[ SakuNota - Solusi Kasir UMKM ]</div>':""}
    </body>
    </html>
  `},"generateZReportReceipt",0,function(e,t){e=(0,s.o)(e);let i=(0,s.o)(t||(0,a.getStoreSettings)()),r="80mm"===i.paperWidth?48:32,n="-".repeat(r)+"\n",l="=".repeat(r)+"\n",c=e=>e?d(e,r).map(e=>{let t=Math.max(0,Math.floor((r-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",m=(e,t)=>{let a=r-e.length-t.length;return a<=0?`${e}
${t.padStart(r," ")}
`:`${e}${" ".repeat(a)}${t}
`},p="";p+=c(i.storeName||"SAKUNOTA"),p+=c("*** LAPORAN TUTUP SHIFT (Z-REPORT) ***"),p+=l,p+=m("Shift ID:",`#${e.id||"-"}`),p+=m("Kasir/Operator:",e.operatorName||"Kasir"),"owner"===e.closedBy&&(p+=m("Ditutup Oleh:",`${e.closedByOperator||"Pemilik"} (Pemilik)`),e.closureReason&&(p+=m("Alasan Tutup:",e.closureReason))),p+=m("Waktu Buka:",e.startTime?new Date(e.startTime).toLocaleString("id-ID"):"-"),p+=m("Waktu Tutup:",e.endTime?new Date(e.endTime).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")),p+=n,p+=c("--- REKONSILIASI KAS LACI ---"),p+=m("1. Modal Awal:",o(e.startingCash||0)),p+=m("2. Penjualan Tunai:",`+${o(e.cashSales||0)}`),e.cashIn&&e.cashIn>0&&(p+=m("3. Kas Masuk:",`+${o(e.cashIn)}`)),e.cashOut&&e.cashOut>0&&(p+=m("4. Kas Keluar:",`-${o(e.cashOut)}`)),e.cashRefunds&&e.cashRefunds>0&&(p+=m("5. Refund Tunai:",`-${o(e.cashRefunds)}`)),p+=n,p+=m("KAS FISIK SEHARUSNYA:",o(e.expectedCash||0)),p+=m("HASIL HITUNG FISIK:",o(void 0!==e.actualCash?e.actualCash:e.expectedCash));let u=void 0!==e.cashDifference?e.cashDifference:0,g="SELISIH: Rp 0 (PAS)";return u>0&&(g=`SELISIH: +${o(u)} (LEBIH)`),u<0&&(g=`SELISIH: -${o(Math.abs(u))} (KURANG)`),p+=c(g),p+=l,p+=c("--- NON-TUNAI (BANK / QRIS) ---"),p+=m("QRIS / Transfer:",o(e.nonCashSales||0)),p+=c("(Masuk langsung ke rekening merchant)"),p+=n,e.notes&&(p+=`Catatan: ${e.notes}
`,p+=n),p+=c("Tanda Tangan Kasir,"),p+="\n\n\n",p+=c(`( ${e.operatorName||"Kasir"} )`),i.enableWatermark&&(p+="\n"+c("[ SakuNota - Solusi Kasir UMKM ]")),p+="\n\n\n"}],71798)},96984,61412,98529,e=>{function t(e){let t="string"==typeof e?new Date(e):e;return Number.isFinite(t.getTime())?`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`:""}function a(e,t=new Date){let i=new Date(t.getFullYear(),t.getMonth(),t.getDate()),r=new Date(i);r.setDate(r.getDate()+1),"yesterday"===e&&(i.setDate(i.getDate()-1),r.setDate(r.getDate()-1)),("7days"===e||"30days"===e)&&i.setDate(i.getDate()-("7days"===e?6:29)),"thisMonth"===e&&i.setDate(1);let n=new Date(i),s=new Date(i);return"thisMonth"===e?s.setMonth(s.getMonth()-1):s.setDate(s.getDate()-("7days"===e?7:"30days"===e?30:1)),{start:i,end:r,previousStart:s,previousEnd:n}}function i(e,t,r=new Date){let{start:n,end:s}=a(t,r),o=[],d="today"===t||"yesterday"===t;for(let t=new Date(n);t<s;){let a=new Date(t);d?t.setHours(t.getHours()+2):t.setDate(t.getDate()+1);let i=e.filter(e=>{let i=new Date(e.createdAt||e.created_at).getTime();return i>=a.getTime()&&i<t.getTime()}),r=d?`${String(a.getHours()).padStart(2,"0")}:00`:a.toLocaleDateString("id-ID",{day:"numeric",month:"short"});o.push({label:r,sublabel:d?`${r}–${String(t.getHours()).padStart(2,"0")}:00`:a.toLocaleDateString("id-ID",{weekday:"long",day:"numeric",month:"long"}),omzet:i.reduce((e,t)=>e+(t.total||0),0),count:i.length})}return o}function r(e){let t=[];for(let a of e){let e=(a.payments||[]).filter(e=>["completed","refunded"].includes(e.status)),i="void"===a.status?Number(a.isRefunded&&a.refundAmount||0):void 0;for(let r of e)if(t.push({at:r.paidAt||a.createdAt,amount:r.amount,refund:0,orderId:a.id,method:r.paymentMethod}),"refunded"===r.status){let e=r.mdRefundAmount??(void 0!==i?Math.min(r.amount,i):r.amount);void 0!==i&&(i-=e),e>0&&t.push({at:r.refundedAt||a.voidedAt||a.updatedAt,amount:0,refund:e,orderId:a.id,method:r.mdRefundMethod||r.paymentMethod})}for(let e of a.weightReturns||[])for(let[i,r]of Object.entries(e.returnPayments||{}))t.push({at:e.at,amount:0,refund:Number(r),orderId:a.id,method:i});!e.length&&"paid"===a.status&&a.total>0&&t.push({at:a.createdAt,amount:a.total,refund:0,orderId:a.id,method:a.paymentMethod})}return t}e.s(["G",0,i,"H",0,a,"L",0,t,"f",0,function(e,t,i=new Date){let r=a(t,i),n=e.filter(e=>"paid"===e.status&&!e.isRefunded),s=(e,t)=>n.filter(a=>{let i=new Date(a.createdAt||a.created_at).getTime();return i>=e.getTime()&&i<t.getTime()});return{currentOrders:s(r.start,r.end),previousOrders:s(r.previousStart,r.previousEnd)}}],61412),e.s(["i",0,r,"W",0,function(e,n,s=new Date){let o=a(n,s),d=r(e),l=(e,t)=>d.filter(a=>{let i=new Date(a.at).getTime();return i>=e.getTime()&&i<t.getTime()}),c=e=>({received:e.reduce((e,t)=>e+t.amount,0),refunded:e.reduce((e,t)=>e+t.refund,0),net:e.reduce((e,t)=>e+t.amount-t.refund,0),count:new Set(e.filter(e=>e.amount>0).map(e=>e.orderId)).size}),m=l(o.start,o.end),p=[];for(let e=new Date(o.start);e<o.end;e.setDate(e.getDate()+1)){let a=t(e);p.push({key:a,label:e.toLocaleDateString("id-ID",{day:"numeric",month:"short"}),...c(m.filter(e=>t(e.at)===a))})}let u=c(m),g=["Cash","QRIS","Transfer"].map(e=>{let t=m.filter(t=>t.method===e),a=t.reduce((e,t)=>e+t.amount-t.refund,0);return{method:e,total:a,count:new Set(t.filter(e=>e.amount>0).map(e=>e.orderId)).size,percent:u.received>0?Math.max(0,Math.round(a/u.received*100)):0}}),h=(t,a)=>e.filter(e=>{if("paid"!==e.status||e.isRefunded)return!1;let i=(e.payments||[]).filter(e=>"completed"===e.status),r=i.length?Math.max(...i.map(t=>new Date(t.paidAt||e.createdAt).getTime())):new Date(e.createdAt).getTime();return r>=t.getTime()&&r<a.getTime()}),f=i(d.map(e=>({createdAt:e.at,total:e.amount-e.refund})),n,s),b="today"===n||"yesterday"===n;for(let e=0;e<f.length;e++){let t=new Date(o.start),a=new Date(o.start);b?(t.setHours(t.getHours()+2*e),a.setHours(a.getHours()+(e+1)*2)):(t.setDate(t.getDate()+e),a.setDate(a.getDate()+e+1)),f[e].count=c(l(t,a)).count}return{...u,previous:c(l(o.previousStart,o.previousEnd)),days:p,chart:f,methods:g,currentOrders:h(o.start,o.end),previousOrders:h(o.previousStart,o.previousEnd)}}],98529),e.s(["r",0,function(e,t,a){let i=new Map,r=(e,t)=>(i.has(e)||i.set(e,{id:e,name:t,received:0,refunds:0,receipts:new Set,shifts:0,difference:0,voids:0}),i.get(e));for(let t of e)for(let e of t.payments||[]){if(!["completed","refunded"].includes(e.status))continue;let a=r(e.mdOperatorId||e.operatorName||"Kasir",e.operatorName||"Kasir");a.received+=e.amount,a.receipts.add(t.id),"refunded"===e.status&&(a.refunds+=e.mdRefundAmount??e.amount)}for(let e of t){let t=r(e.mdOperatorId||e.operatorName,e.operatorName);t.shifts++,"closed"===e.status&&(t.difference+=Math.abs(e.cashDifference||0))}for(let e of a)if("VOID"===e.action){let t=r(e.mdOperatorId||e.operator,e.operator);t.voids++}return[...i.values()].map(e=>({...e,receipts:e.receipts.size}))},"O",0,function(e,t,a=new Date){let i=new Date(a);i.setHours(0,0,0,0),i.setDate(i.getDate()+1);let n=new Date(i);n.setDate(n.getDate()-30);let s=r(e),o=s.filter(e=>new Date(e.at)>=n&&new Date(e.at)<i),d=Array.from({length:24},(e,t)=>{let a=o.filter(e=>new Date(e.at).getHours()===t);return{hour:t,label:`${String(t).padStart(2,"0")}.00`,net:a.reduce((e,t)=>e+t.amount-t.refund,0),count:new Set(a.filter(e=>e.amount>0).map(e=>e.orderId)).size}}),l=new Date(a);l.setHours(0,0,0,0),l.setDate(l.getDate()-(l.getDay()+6)%7);let c=new Date(l);c.setDate(c.getDate()-7);let m=new Date(c);m.setDate(m.getDate()-7);let p=(e,t)=>s.filter(a=>new Date(a.at)>=e&&new Date(a.at)<t),u=p(c,l),g=p(m,c),h=u.reduce((e,t)=>e+t.amount-t.refund,0),f=g.reduce((e,t)=>e+t.amount-t.refund,0),b=new Set(u.filter(e=>e.amount>0).map(e=>e.orderId)).size,y=t.filter(e=>"closed"===e.status&&new Date(e.endTime)>=c&&new Date(e.endTime)<l),x=y.filter(e=>0!==e.cashDifference).length,v=u.reduce((e,t)=>e+t.amount,0),w=u.reduce((e,t)=>e+t.refund,0),k=f>0?(h-f)/f:null,I=[{label:"Penjualan dibanding minggu sebelumnya",points:null===k?null:k>=0?40:k>=-.1?30:15,max:40},{label:"Shift tanpa selisih kas",points:y.length?Math.round(35*(y.length-x)/y.length):null,max:35},{label:"Pengembalian dibanding pembayaran",points:v>0?Math.round(25*(1-Math.min(1,w/v))):null,max:25}],$=b>=5&&I.every(e=>null!==e.points),S=$?I.reduce((e,t)=>e+t.points,0):null,D=null===S?null:S>=90?"A":S>=75?"B":S>=60?"C":S>=45?"D":"E",A=[];return x&&A.push(`Periksa ${x} shift dengan selisih kas.`),null!==k&&k<0&&A.push("Tinjau produk terlaris dan waktu penjualan sebelum menambah persediaan."),w>0&&A.push("Periksa alasan pengembalian pada Riwayat Transaksi."),!A.length&&$&&A.push("Pertahankan pencatatan kas dan persediaan produk terlaris."),$||A.push("Nilai tersedia setelah dua minggu penjualan, minimal 5 nota lunas dan satu shift tutup pada minggu yang dinilai."),{hours:d,weekly:{start:c,end:l,net:h,previousNet:f,count:b,differences:x,refunds:w,growth:k,rules:I,score:S,grade:D,suggestions:A}}}],96984)}])})();