(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,[22457,e=>{var t=e.i(43476),r=e.i(71645),a=e.i(31971),i=e.i(59886),n=e.i(61552),o=e.i(5062),s=e.i(82369);e.s(["f",0,function({orderId:e}){let[l,d]=(0,r.useState)(!1),[f,u]=(0,r.useState)(""),p=(0,a.f)(async()=>{let t=await i.db.table("orders").get(e);return t?.serviceCategory!=="laundry"||"void"===t.status?null:{order:t,previous:(await i.db.table("operations").where("orderId").equals(e).toArray()).filter(e=>"laundry"===e.kind).at(-1)}},[e]);if(!p)return null;let c=p.previous?.laundryStage||"received",h=s.p[s.p.indexOf(c)+1],m="collected"===h&&"paid"!==p.order.status;return(0,t.jsxs)("div",{onClick:e=>e.stopPropagation(),className:"rounded-xl border border-line bg-surface p-3 space-y-2",children:[(0,t.jsx)("p",{className:"text-sm font-bold",children:s.o[c]}),(0,t.jsxs)("p",{className:"text-xs text-muted",children:["Selesai: ",p.order.pickupDate?new Date(p.order.pickupDate+"T12:00:00").toLocaleDateString("id-ID"):"Belum ditentukan"]}),h&&!p.order.isRefunded&&(0,t.jsx)("button",{disabled:l||m,className:"min-h-11 rounded-xl bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50",onClick:async()=>{d(!0),u("");try{let t=(0,o.n)();await (0,n.I)({kind:"laundry",orderId:e,laundryStage:h,previousId:p.previous?.mdId||p.previous?.sessionId,employeeId:t?.claims.employeeId||t?.claims.deviceId||"local:owner",employeeName:t?.operatorName||"Pemilik"})}catch(e){u(e.message)}finally{d(!1)}},children:l?"Menyimpan…":"processing"===h?"Mulai Proses":"ready"===h?"Siap Diambil":"Sudah Diambil"}),m&&(0,t.jsx)("p",{className:"text-xs text-muted",children:"Lunasi pesanan sebelum diambil."}),f&&(0,t.jsx)("p",{role:"alert",className:"text-xs text-red-600",children:f})]})}])},54661,e=>{var t=e.i(67034);function r(e,t=1){if(0===e)return"0 B";let a=Math.floor(Math.log(e)/Math.log(1024));return parseFloat((e/Math.pow(1024,a)).toFixed(t<0?0:t))+" "+["B","KB","MB","GB"][a]}async function a(e,a,i){let n=e.name||a||`bukti_${Date.now()}.jpg`,o=e.type||"image/jpeg";if(!["image/jpeg","image/png","image/webp","image/jpg"].includes(o.toLowerCase()))throw Error("Format file tidak didukung. Harap gunakan gambar JPG, PNG, atau WebP.");if("u"<typeof document){let r=t.Buffer.from(await e.arrayBuffer()),a=`data:${o};base64,${r.toString("base64")}`;return{base64:a,imageData:a,fileName:n,fileSize:r.length,mimeType:o}}return new Promise((t,a)=>{let o=new FileReader;o.onerror=()=>a(Error("Gagal membaca file gambar.")),o.onload=e=>{let o=new Image;o.onerror=()=>a(Error("File bukan gambar yang valid.")),o.onload=()=>{try{let e=i?.maxDim??1600,a=o.width,s=o.height;(a>e||s>e)&&(a>s?(s=Math.round(s*e/a),a=e):(a=Math.round(a*e/s),s=e));let l=document.createElement("canvas");l.width=a,l.height=s;let d=l.getContext("2d");if(!d)throw Error("Gagal menginisialisasi canvas untuk kompresi.");d.fillStyle="#FFFFFF",d.fillRect(0,0,a,s),d.drawImage(o,0,0,a,s);let f="image/webp",u=.82,p=l.toDataURL(f,u);p.startsWith("data:image/webp")||(f="image/jpeg",p=l.toDataURL(f,u));let c=Math.round((p.length-p.indexOf(",")-1)*.75);if(c>(i?.maxBytes??2097152)&&(u=.65,p=l.toDataURL(f,u),c=Math.round((p.length-p.indexOf(",")-1)*.75)),c>(i?.maxBytes??2097152))throw Error(`Ukuran gambar setelah kompresi masih terlalu besar (${r(c)}). Harap pilih gambar yang lebih kecil.`);let h="image/webp"===f?".webp":".jpg",m=n.replace(/\.[^/.]+$/,"")+h;t({base64:p,imageData:p,fileName:m,fileSize:c,mimeType:f})}catch(e){a(e)}},o.src=e.target?.result},o.readAsDataURL(e)})}e.s(["T",0,a,"L",0,r])},63902,e=>{var t=e.i(24839);function r(e){if("owner"!==e.role||e.employeeId)throw new t.P;return`device_list:${e.storeId}:${e.deviceId}:${e.deviceEpoch}`}async function a(e,t){let a=(await e.table("settings").get(r(t)))?.value;return a&&Array.isArray(a.list?.employees)&&Array.isArray(a.list?.devices)?a:null}async function i(e,t,a){let i={savedAt:Date.now(),list:{devices:(a.devices||[]).map(({id:e,name:t,role:r,revoked:a})=>({id:e,name:t,role:r,revoked:a})),employees:a.employees.map(({id:e,name:t,active:r})=>({id:e,name:t,active:r})),pairings:[]}};return await e.table("settings").put({key:r(t),value:i}),i}e.s(["H",0,a,"Q",0,i])},61552,e=>{var t=e.i(82369),r=e.i(59886),a=e.i(6841),i=e.i(77313),n=e.i(5062),o=e.i(67996),s=e.i(63902),l=e.i(33829);async function d(){let e=(0,o.currentPosRuntime)(),t=(0,n.n)();if(e&&t?.claims.role==="owner"){let a=await (0,s.H)(r.db,t.claims);if(navigator.onLine)try{let a=await e.client.list();return await (0,s.Q)(r.db,t.claims,a),a.employees.filter(e=>e.active)}catch(e){if([401,403].includes(e.status)||!a)throw e}return a?.list.employees.filter(e=>e.active)||[]}return t?.claims.employeeId?[{id:t.claims.employeeId,name:t.operatorName,active:1}]:[...new Set((await r.db.table("shifts").toArray()).map(e=>e.operatorName))].filter(Boolean).map(e=>({id:`local:${e}`,name:e,active:1}))}async function f(e,o){if("weight.return"===e.kind)throw Error("Catat retur dari Riwayat Transaksi.");await (0,i.e)();let s=(0,n.n)();if("laundry"===e.kind);else if("kitchen"===e.kind){if(r.db.name.startsWith("SakuNotaPOS-")&&s?.claims.role!=="owner"&&(s?.claims.role!=="cashier"||"served"!==e.stage))throw Error("Tindakan ini memerlukan akses pemilik.")}else e.kind.startsWith("attendance.")&&s?.claims.role==="cashier"||await (0,a.r)();if(s?.claims.role==="cashier"&&e.employeeId!==s.claims.employeeId)throw Error("Pilih akun kasir Anda");let d={...e,at:new Date().toISOString(),sessionId:e.sessionId||crypto.randomUUID()};return(0,l.Q)(d),r.db.transaction("rw",["operations","orders","orderItems","shifts","cashMovements","auditLogs","attendancePhotos"],async()=>{o&&await r.db.table("attendancePhotos").put({id:o.photoId,operationId:d.sessionId,employeeId:d.employeeId,employeeName:d.employeeName,blob:o.blob,checksum:o.checksum,createdAt:d.at,status:"lokal"});let e=await r.db.table("operations").toArray();if(d.kind.startsWith("attendance.")){let t=(0,l.S)(e).find(e=>e.employeeId===d.employeeId&&!e.end);if("attendance.in"===d.kind&&(t||e.some(e=>"attendance.in"===e.kind&&e.sessionId===d.sessionId)))throw Error("Karyawan sudah absen masuk");if("attendance.out"===d.kind&&(!t||t.id!==d.sessionId))throw Error("Absensi masuk belum tersedia")}if("repayment"===d.kind&&d.amount>(0,l.P)(e,d.employeeId))throw Error("Pembayaran melebihi sisa kasbon");if("commission"===d.kind){let t=await r.db.table("orders").get(d.orderId),a=await r.db.table("orderItems").get(d.orderItemId);if(!t||"paid"!==t.status||t.isRefunded||!a||a.orderId!==d.orderId)throw Error("Pilih layanan dari nota lunas");if(e.some(e=>"commission"===e.kind&&e.orderItemId===d.orderItemId))throw Error("Komisi layanan sudah tercatat");if(Math.floor(a.qty*a.hargaSatuan*Math.max(0,t.subtotal-(t.discount||0))/t.subtotal)!==d.basisAmount)throw Error("Nilai layanan berubah. Pilih kembali")}if("commission.paid"===d.kind&&d.amount>(0,l.$)(e,d.employeeId,await r.db.table("orders").toArray()))throw Error("Pembayaran melebihi komisi tersedia");if("laundry"===d.kind){let a=await r.db.table("orders").get(d.orderId);if(!a)throw Error("Pesanan tidak ditemukan");if(s?.claims.role==="cashier"&&(a.mdDeviceId!==s.claims.deviceId||a.mdOperatorId!==s.claims.employeeId))throw Error("Pesanan ini milik kasir lain");let i=e.filter(e=>"laundry"===e.kind&&e.orderId===d.orderId).at(-1);if((d.previousId||void 0)!==(i?.mdId||i?.sessionId))throw Error("Status pesanan berubah. Perbarui lalu coba lagi");(0,t.x)(a,i?.laundryStage||"received",d.laundryStage)}if("kitchen"===d.kind){let t=await r.db.table("orderItems").get(d.orderItemId),a=await r.db.table("orders").get(d.orderId);if(!t||t.orderId!==d.orderId||!a||"void"===a.status||a.isHistorical||t.mdDeleted)throw Error("Pesanan sudah tidak tersedia");if(s?.claims.role==="cashier"&&(a.mdDeviceId!==s.claims.deviceId||a.mdOperatorId!==s.claims.employeeId))throw Error("Pesanan ini milik kasir lain.");let i=e.filter(e=>"kitchen"===e.kind&&e.orderItemId===d.orderItemId).at(-1);if((d.previousId||void 0)!==(i?.mdId||i?.sessionId)||l.x.indexOf(d.stage)!==l.x.indexOf(i?.lineSignature===(0,l.K)(t)?i.stage:"waiting")+1)throw Error("Status pesanan berubah. Coba lagi")}if("kitchen"===d.kind&&d.lineSignature!==(0,l.K)(await r.db.table("orderItems").get(d.orderItemId)))throw Error("Pesanan berubah. Periksa kembali");if(["loan","repayment","commission.paid"].includes(d.kind)&&"laci"===d.source){let e=await r.db.table("shifts").get(d.shiftId);if(!e||"open"!==e.status||s&&(e.mdDeviceId!==s.claims.deviceId||e.mdOperatorId!==(s.claims.employeeId||s.claims.deviceId)))throw Error("Buka shift di perangkat ini terlebih dahulu");d.cashMovementId=await r.db.table("cashMovements").add({shiftId:d.shiftId,type:"repayment"===d.kind?"in":"out",amount:d.amount,category:"commission.paid"===d.kind?"komisi":"kasbon_karyawan",paymentSource:"laci",reason:`${"loan"===d.kind?"Kasbon":"repayment"===d.kind?"Bayar kasbon":"Komisi"} \xb7 ${d.employeeName}`,operatorName:s?.operatorName||"Pemilik",timestamp:d.at})}let a=await r.db.table("operations").add(d);return await r.db.table("auditLogs").add({action:"OPERATION",amount:d.amount||0,reason:`${d.kind} \xb7 ${d.employeeName}${d.note?` \xb7 ${d.note}`:""}`,operator:s?.operatorName||"Pemilik",timestamp:d.at}),a})}e.s(["p",0,d,"I",0,f])},46766,e=>{function t(e){return e.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}e.s(["w",0,t,"D",0,function e(r){return"string"==typeof r?t(r):Array.isArray(r)?r.map(e):r&&"object"==typeof r?Object.fromEntries(Object.entries(r).map(([t,r])=>[t,e(r)])):r},"h",0,function(e){return e&&e.length<=28e5&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(e)?e:""},"o",0,function e(t){return"string"==typeof t?t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,""):Array.isArray(t)?t.map(e):t&&"object"==typeof t?Object.fromEntries(Object.entries(t).map(([t,r])=>[t,e(r)])):t}])},71798,42250,e=>{var t=e.i(68542),r=e.i(43668),a=e.i(82568);let i=(0,a.U)("BluetoothSerial",{web:()=>e.A(88868).then(e=>new e.BluetoothSerialWeb)});e.s(["f",0,i],42250);let n=(0,a.U)("Printer",{web:()=>e.A(28165).then(e=>new e.PrinterWeb)});var o=e.i(46766);let s=e=>`Rp ${Math.round(e||0).toLocaleString("id-ID")}`;function l(e,t){if(!e)return[];let r=e.split(/\s+/),a=[],i="";for(let e of r)if(i)if((i+" "+e).length<=t)i+=" "+e;else if(a.push(i),e.length>t){let r=e;for(;r.length>t;)a.push(r.substring(0,t)),r=r.substring(t);i=r}else i=e;else if(e.length>t){let r=e;for(;r.length>t;)a.push(r.substring(0,t)),r=r.substring(t);i=r}else i=e;return i&&a.push(i),a}let d=e=>{if(!e)return!1;let t=e.toLowerCase();return t.includes("minuman")||t.includes("kopi")||t.includes("tea")||t.includes("matcha")||t.includes("drink")||t.includes("coffee")||t.includes("milkshake")||t.includes("beverage")||t.includes("juice")};function f(e,r,a,i){let n=e.date||(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")),o=e.orderId?`A-${e.orderId}`:e.id?`A-${e.id}`:"-",l=e.tableName?e.tableName:`[${e.orderType||"Dine-in"}]`,f=a.storeName||"SAKUNOTA";"food"===r&&(f="DAPUR (KITCHEN)"),"drink"===r&&(f="BAR (MINUMAN)"),"laundry"===e.serviceCategory&&e.status&&(e={...e,isDraft:"paid"!==e.status});let u=e.items||[],p=0,c=u.map(e=>{let a=d(e.kategori||e.kategoriMenu);if("food"===r&&a||"drink"===r&&!a)return"";let i=Number(e.qty||1),n=(0,t.c)(e,i);p+=n;let o=e.nama||e.namaMenu||"Item",l=e.selectedModifiers&&e.selectedModifiers.length>0?e.selectedModifiers.map(e=>`
          <div class="item-mod">
            &gt; ${e.optionName||e.nama}${e.harga>0?` (+${s(e.harga)})`:""}
          </div>
        `).join(""):"",f=e.notes?`<div class="item-note">* ${e.notes}</div>`:"";return`
      <tr>
        <td class="col-item">
          <div class="item-name">${"weight"===e.saleUnit?(0,t.b)(e,i):i+"x"} ${o}</div>
          ${l}
          ${f}
        </td>
        ${"all"===r?`<td class="col-price">${s(n)}</td>`:""}
      </tr>
    `}).join(""),h=void 0!==e.subtotal?e.subtotal:p,m=void 0!==e.total?e.total:p,g=e.payments&&e.payments.length>0?`
    <div class="divider"></div>
    <div class="bold" style="margin-bottom: 2px;">Rincian Pembayaran:</div>
    ${e.payments.map((e,t)=>`
      <div class="row">
        <span>${t+1}. ${e.paymentMethod}${"refunded"===e.status?" (REFUND)":""}</span>
        <span>${s(e.amount)}</span>
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
        <span>${s(e.cashTendered)}</span>
      </div>
      <div class="row">
        <span>Kembalian:</span>
        <span>${s(Math.max(0,e.cashTendered-m))}</span>
      </div>
    `:""}
  `;return`
    ${a.storeLogo&&!1!==a.receiptShowLogo&&"all"===r?`
      <div class="logo-box">
        <img src="${a.storeLogo}" alt="Logo Toko" />
      </div>
    `:""}

    <div class="center">
      <div class="store-title">${f}</div>
      ${"all"===r?`
        ${a.storeAddress?`<div class="store-sub">${a.storeAddress}</div>`:""}
        ${a.storePhone?`<div class="store-sub">Telp: ${a.storePhone}</div>`:""}
        ${a.receiptHeader?`<div class="store-sub bold" style="margin-top: 2px;">${a.receiptHeader}</div>`:""}
      `:""}
    </div>

    <div class="double-divider"></div>

    <div class="order-banner">
      <div class="order-num">No: ${o}</div>
      ${"laundry"===e.serviceCategory?`<div>Laundry \xb7 Selesai: ${e.pickupDate||"-"}</div><div>${e.customerPhone||""}</div>`:""}
      ${!1!==a.receiptShowCustomer?`<div class="bold">${e.customerName?`An. ${e.customerName}`:"Tamu"}</div>`:""}
      ${!1!==a.receiptShowTable&&(e.tableName||e.orderType&&"Dine-in"!==e.orderType&&"Direct"!==e.orderType)?`
        <div style="margin-top: 3px;">
          <span class="badge">${l}</span>
        </div>
      `:""}
      ${e.notes&&!1!==a.receiptShowNotes?`<div style="text-align: left; border: 1px solid #000; padding: 3px; margin-top: 4px; font-size: 10px; font-weight: bold;">Catatan: ${e.notes}</div>`:""}
    </div>

    <div class="divider"></div>
    <div class="row" style="font-size: 10px;">
      <span>Tgl: ${n}</span>
      <span>${(e.operatorName||e.kasirName)&&!1!==a.receiptShowCashier?`Kasir: ${e.operatorName||e.kasirName}`:""}</span>
    </div>
    <div class="divider"></div>

    <table>
      <tbody>
        ${c}
      </tbody>
    </table>

    ${"all"===r?`
      <div class="divider"></div>

      ${e.discount&&e.discount>0||e.serviceCharge&&e.serviceCharge>0||e.tax&&e.tax>0?`
        <div class="row">
          <span>Subtotal:</span>
          <span>${s(h)}</span>
        </div>
        ${e.discount&&e.discount>0?`
          <div class="row">
            <span>Diskon:</span>
            <span>-${s(e.discount)}</span>
          </div>
        `:""}
        ${e.serviceCharge&&e.serviceCharge>0?`
          <div class="row">
            <span>Layanan:</span>
            <span>${s(e.serviceCharge)}</span>
          </div>
        `:""}
        ${e.tax&&e.tax>0?`
          <div class="row">
            <span>Pajak PBJT:</span>
            <span>${s(e.tax)}</span>
          </div>
        `:""}
        <div class="divider"></div>
      `:""}

      <div class="row total-row">
        <span>TOTAL:</span>
        <span>${s(m)}</span>
      </div>

      ${g}

      <div class="status-box">
        ${e.isDraft?"laundry"===e.serviceCategory?"BELUM LUNAS":"TAGIHAN SEMENTARA (OPEN BILL)":"LUNAS"}
      </div>

      ${e.isDemo?`
        <div class="status-box" style="border: 1px dashed #b45309; background: #fffbeb; color: #92400e; font-size: 10px; margin: 4px 0;">
          *** STRUK SIMULASI DEMO KASIR ***<br />
          <span style="font-size: 9px; font-weight: normal;">BUKAN BUKTI TRANSAKSI RIIL</span>
        </div>
      `:""}

      ${a.receiptFooter?`<div class="footer-text">${a.receiptFooter}</div>`:""}
      ${a.receiptCustomNote?`<div class="footer-text" style="font-style: italic; margin-top: 4px;">${a.receiptCustomNote}</div>`:""}
      ${a.enableWatermark?'<div class="watermark">[ SakuNota - Solusi Kasir UMKM ]</div>':""}
    `:`
      <div class="divider"></div>
      <div class="center bold" style="font-size: 11px; margin-top: 4px;">*** SELESAI TIKET ***</div>
    `}
  `}function u(e){let t=Array.isArray((e=(0,o.D)(e)).items)?e.items:[],r=[];for(let e of t){let t=Math.max(1,Math.round(Number(e.qty)||1));for(let a=0;a<t;a++)r.push(e)}let a=r.length,i=e.orderType?.toLowerCase()==="takeaway"||!e.tableId&&"Dine-in"!==e.orderType,n=i?"Take Away":"Dine In",s="Tamu";if(i)s=e.customerName?.trim()||"Take Away";else{let t=e.tableName?.trim()||(e.tableId?`Meja ${e.tableId}`:""),r=e.customerName?.trim()||"";s=t&&r?`${t} (${r})`:t||r||"Dine In"}let l=e.createdAt?new Date(e.createdAt):new Date,f=e=>String(e).padStart(2,"0"),u=f(l.getDate()),p=f(l.getMonth()+1),c=String(l.getFullYear()).slice(-2),h=f(l.getHours()),m=f(l.getMinutes()),g=`${u}/${p}/${c} ${h}:${m}`;return r.map((t,r)=>{let i=d(t.kategori||t.kategoriMenu),o=[];if(Array.isArray(t.selectedModifiers))for(let e of t.selectedModifiers){let t=e.optionName||e.nama||"";t&&o.push(t)}let l=t.notes||t.catatan||(0===r&&e.notes?e.notes:void 0);return{index:r+1,total:a,customerOrTable:s,orderType:n,nama:t.nama||t.namaMenu||"Menu",unit:i?"1 Cup":"1 Porsi",modifiers:o,notes:l,dateTime:g,orderId:e.orderId||e.id}})}async function p(e){let{title:t,escposText:r,htmlContent:o}=e;if(a.d.isNativePlatform()){let e=localStorage.getItem("bt_printer_mac");if(e)try{try{await i.connect({address:e})}catch(e){}return await i.write({address:e,value:r}),{success:!0,platform:"native_bluetooth",message:"Berhasil dikirim ke Printer Bluetooth Thermal!"}}catch(e){console.warn("Bluetooth Serial write failed, falling back to native system printer:",e);try{return await n.printHtml({html:o,name:t}),{success:!0,platform:"native_system",message:"Bluetooth gagal, dicetak via dialog Printer Sistem Android."}}catch(t){throw Error(`Gagal mencetak di Android: ${e.message||e}`)}}try{return await n.printHtml({html:o,name:t}),{success:!0,platform:"native_system",message:"Berhasil dikirim ke Dialog Printer Sistem Android."}}catch(e){throw Error(`Gagal membuka dialog printer Android: ${e.message||e}`)}}try{let e=document.getElementById("sakunota-print-iframe");e||((e=document.createElement("iframe")).setAttribute("sandbox","allow-same-origin allow-modals"),e.id="sakunota-print-iframe",e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.visibility="hidden",document.body.appendChild(e));let t=e.contentDocument||e.contentWindow?.document;if(t&&(t.open(),t.write(o),t.close(),await new Promise(e=>setTimeout(e,250)),e.contentWindow))return e.contentWindow.focus(),e.contentWindow.print(),window.focus(),{success:!0,platform:"web_iframe",message:"Dialog cetak struk terisolasi berhasil dibuka!"}}catch(e){console.warn("Iframe print error, falling back to Printer.printHtml:",e)}try{return await n.printHtml({html:o,name:t}),{success:!0,platform:"web_fallback",message:"Dialog cetak dibuka via Capacitor Web Plugin."}}catch(e){throw Error(`Gagal mencetak struk di browser: ${e.message||e}`)}}e.s(["executePrintDocument",0,p,"formatCurrency",0,s,"generateBulkReceiptHtml",0,function(e,t="all",a){let i=(0,o.D)(a||(0,r.getStoreSettings)());i.storeLogo=(0,o.h)(i.storeLogo);let n="80mm"===i.paperWidth,s=n?"80mm":"58mm",l=n?"72mm":"52mm",d=e.map(e=>{let r=(0,o.D)(e);return`
      <div class="bulk-receipt-page">
        ${f(r,t,i,n)}
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
          size: ${s} auto;
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
          width: ${l};
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
      ${d}
    </body>
    </html>
  `},"generateCupLabelsEscPos",0,function(e,t){let a=u(e=(0,o.o)(e));if(!a.length)return"";let i="80mm"===(0,o.o)(t||(0,r.getStoreSettings)()).paperWidth?48:32,n="-".repeat(i)+"\n",s=(e,t)=>{let r=i-e.length-t.length;if(r>=0)return`${e}${" ".repeat(r)}${t}
`;let a=Math.max(1,i-t.length-1);return`${e.slice(0,a)} ${t}
`},l="";for(let e of a){for(let t of(l+="\x1b@",l+="\x1bE\x01"+s(e.customerOrTable,e.orderType)+"\x1bE\0",l+=`${e.unit}
`,l+=n,l+="\x1bE\x01\x1b!\x10"+e.nama+"\x1b!\0\x1bE\0\n",e.modifiers))l+=`  * ${t}
`;e.notes&&(l+=`  (Catatan: ${e.notes})
`),l+=n,l+="\x1bE\x01"+s(e.dateTime,`${e.index}/${e.total}`)+"\x1bE\0",l+="\n\n\n\x1dVB\0"}return l},"generateCupLabelsHtml",0,function(e,t){let a=u(e=(0,o.D)(e));if(!a.length)return"";let i="80mm"===(0,o.D)(t||(0,r.getStoreSettings)()).paperWidth,n=a.map(e=>`
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
          size: ${i?"80mm":"58mm"} auto;
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
          width: ${i?"70mm":"50mm"};
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
  `},"generateEscPosReceipt",0,function(e,a="all",i){e=(0,o.o)(e);let n=(0,o.o)(i||(0,r.getStoreSettings)()),f="80mm"===n.paperWidth?48:32,u="-".repeat(f)+"\n",p="=".repeat(f)+"\n",c=e=>e?l(e,f).map(e=>{let t=Math.max(0,Math.floor((f-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",h=(e,t)=>{let r=f-e.length-t.length;if(r>=0)return`${e}${" ".repeat(r)}${t}
`;let a=f-t.length-1;if(a>8){let r=e.substring(0,a),i=e.substring(a),n=f-r.length-t.length;return`${r}${" ".repeat(Math.max(1,n))}${t}
   ${i.trim()}
`}return`${e}
${t.padStart(f," ")}
`},m="";"all"===a?(m+=c(n.storeName||"SAKUNOTA"),n.storeAddress&&l(n.storeAddress,f).forEach(e=>{m+=c(e)}),n.storePhone&&(m+=c(`Telp: ${n.storePhone}`)),n.receiptHeader&&n.receiptHeader.split("\n").forEach(e=>{e.trim()&&(m+=c(e.trim()))})):m+=c("food"===a?"*** STRUK DAPUR (KITCHEN) ***":"*** STRUK BAR (MINUMAN) ***"),m+=p;let g=e.date||(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID"));m+=h(`Tgl: ${g}`,"");let y=e.orderId?`No: A-${e.orderId}`:e.id?`No: A-${e.id}`:"No: -",b="";!1!==n.receiptShowTable&&(e.tableName?b=`Meja: ${String(e.tableName).replace(/^Meja\s*/i,"")}`:e.orderType&&"Dine-in"!==e.orderType&&"Direct"!==e.orderType&&(b=`[${e.orderType}]`)),m+=h(y,b),"laundry"===e.serviceCategory&&(m+=h("Laundry",""),m+=h("Selesai: "+(e.pickupDate||"-"),""),e.customerPhone&&(m+=h("WA: "+e.customerPhone,""))),e.customerName&&!1!==n.receiptShowCustomer&&(m+=h(`Pelanggan: ${e.customerName}`,"")),(e.operatorName||e.kasirName)&&!1!==n.receiptShowCashier&&(m+=h(`Kasir: ${e.operatorName||e.kasirName}`,"")),e.notes&&!1!==n.receiptShowNotes&&(m+=`Catatan: ${e.notes}
`),m+=u;let v=0;if("laundry"===e.serviceCategory&&e.status&&(e={...e,isDraft:"paid"!==e.status}),(e.items||[]).forEach(e=>{let r=d(e.kategori||e.kategoriMenu);if("food"===a&&r||"drink"===a&&!r)return;let i=Number(e.qty||1),n=(0,t.c)(e,i);v+=n;let o=e.nama||e.namaMenu||"Item",u=`${"weight"===e.saleUnit?(0,t.b)(e,i):i+"x"} ${o}`,p=s(n);"all"===a?m+=h(u,p):m+=`${u}
`,e.selectedModifiers&&e.selectedModifiers.length>0&&e.selectedModifiers.forEach(e=>{let t=e.harga>0?` (+${s(e.harga)})`:"",r=`   > ${e.optionName||e.nama}${t}`;m+=l(r,f).join("\n")+"\n"}),e.notes&&(m+=`   * ${e.notes}
`)}),m+=u,"all"===a){let r=void 0!==e.subtotal?e.subtotal:v;if(e.discount&&e.discount>0||e.serviceCharge&&e.serviceCharge>0||e.tax&&e.tax>0){if(m+=h("Subtotal:",s(r)),e.discount&&e.discount>0){let t="percent"===e.discountType?`Diskon (${e.discountValue}%):`:"Diskon:";m+=h(t,"-"+s(e.discount))}e.serviceCharge&&e.serviceCharge>0&&(m+=h("Layanan:",s(e.serviceCharge))),e.tax&&e.tax>0&&(m+=h("Pajak PBJT:",s(e.tax))),m+=u}let a=void 0!==e.total?e.total:v;if(m+=h("TOTAL TAGIHAN:",s(a)),e.payments&&e.payments.length>0){m+=u,m+="Rincian Pembayaran:\n",e.payments.forEach((e,r)=>{let a="refunded"===e.status,i=` ${r+1}. ${e.paymentMethod}${a?" (REFUND)":""}`;m+=h(i,s(e.amount)),e.itemsPaid&&e.itemsPaid.length>0&&e.itemsPaid.forEach(e=>{m+=`    • ${(0,t.b)(e)} ${e.nama}
`})}),m+=u;let r=e.payments.filter(e=>"completed"===e.status).reduce((e,t)=>e+t.amount,0);m+=h("Total Terbayar:",s(r));let i=Math.max(0,a-r);i>0?(m+=h("SISA TAGIHAN:",s(i)),m+=p,m+=c(" STATUS: BELUM LUNAS")):(m+=p,m+=c(" STATUS: LUNAS"))}else{if(m+=h("Metode:",e.paymentMethod||"Tunai"),e.cashTendered&&e.cashTendered>0&&!("laundry"===e.serviceCategory&&e.isDraft)){m+=h("Bayar Tunai:",s(e.cashTendered));let t=Math.max(0,e.cashTendered-a);m+=h("Kembalian:",s(t))}m+=p,e.isDraft?m+=c("laundry"===e.serviceCategory?" BELUM LUNAS":" TAGIHAN SEMENTARA (OPEN BILL)"):m+=c(" LUNAS")}m+=u,n.receiptFooter&&n.receiptFooter.split("\n").forEach(e=>{e.trim()&&(m+=c(e.trim()))}),n.receiptCustomNote&&n.receiptCustomNote.split("\n").forEach(e=>{e.trim()&&(m+=c(e.trim()))}),n.enableWatermark&&(m+="\n"+c("[ SakuNota - Solusi Kasir UMKM ]")),e.isDemo&&(m+="\n"+c("*** STRUK SIMULASI DEMO KASIR ***"),m+=c("BUKAN BUKTI TRANSAKSI RIIL"))}return m+="\n\n\n"},"generatePartialPaymentReceipt",0,function(e,a,i){e=(0,o.o)(e),a=(0,o.o)(a);let n=(0,o.o)(i||(0,r.getStoreSettings)()),d="80mm"===n.paperWidth?48:32,f="-".repeat(d)+"\n",u="=".repeat(d)+"\n",p=e=>e?l(e,d).map(e=>{let t=Math.max(0,Math.floor((d-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",c=(e,t)=>{let r=d-e.length-t.length;return r<=0?`${e}
${t.padStart(d," ")}
`:`${e}${" ".repeat(r)}${t}
`},h="";h+=p(n.storeName||"SAKUNOTA"),n.storeAddress&&(h+=p(n.storeAddress)),n.storePhone&&(h+=p(`Telp: ${n.storePhone}`)),h+=u,h+=p("BUKTI PEMBAYARAN PARSIAL / SPLIT"),h+=f,h+=c(`Tgl: ${a.paidAt?new Date(a.paidAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")}`,""),h+=c(`No: A-${e.id||"-"}`,e.tableId?`Meja: ${e.tableId}`:`[${e.orderType||"Dine-in"}]`),e.customerName&&(h+=c(`Pelanggan: ${e.customerName}`,"")),h+=c(`Kasir: ${a.operatorName||"Kasir"}`,a.shiftId?`Shift #${a.shiftId}`:""),h+=f;let m="item"===a.splitType?"Split by Item (Per Menu)":"equal"===a.splitType?"Split Equally (Bagi Rata)":"Pembayaran Cicil / Parsial";h+=`Tipe: ${m}
`,a.itemsPaid&&a.itemsPaid.length>0&&(h+="Menu yang dibayar:\n",a.itemsPaid.forEach(e=>{h+=c(` • ${(0,t.b)(e)} ${e.nama}`,s((0,t.c)(e)))})),h+=f,h+=c("Nominal Dibayar:",s(a.amount)),h+=c("Metode Bayar:",a.paymentMethod||"Tunai"),"Cash"===a.paymentMethod&&a.cashTendered&&(h+=c("Uang Diterima:",s(a.cashTendered)),h+=c("Kembalian:",s(a.change||0))),h+=f,h+=c("Total Tagihan Nota:",s(e.total));let g=void 0!==e.remainingBalance?e.remainingBalance:Math.max(0,e.total-(e.paidAmount||a.amount));return h+=c("SISA TAGIHAN:",s(g)),h+=u,g>0?(h+=p(" STATUS: BELUM LUNAS"),h+=p("Harap simpan bukti pembayaran ini")):h+=p(" STATUS: LUNAS"),n.enableWatermark&&(h+="\n"+p("[ SakuNota - Solusi Kasir UMKM ]")),h+="\n\n\n"},"generateReceiptHtml",0,function(e,t="all",a){e=(0,o.D)(e);let i=(0,o.D)(a||(0,r.getStoreSettings)());i.storeLogo=(0,o.h)(i.storeLogo);let n="80mm"===i.paperWidth,s=n?"80mm":"58mm",l=n?"72mm":"52mm",d=e.orderId?`A-${e.orderId}`:e.id?`A-${e.id}`:"-";return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
      <title>Struk_${d}</title>
      <style>
        @page {
          margin: 0;
          size: ${s} auto;
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
          width: ${l};
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
      ${f(e,t,i,n)}
    </body>
    </html>
  `},"generateTestReceiptData",0,function(e){e||(0,r.getStoreSettings)();let t=new Date;return{id:999,orderId:"999",createdAt:t.toISOString(),date:t.toLocaleString("id-ID"),customerName:"Budi Santoso (Uji Coba)",tableName:"Meja Tes #01",orderType:"Dine-in",paymentMethod:"Tunai",operatorName:"Kasir SakuNota",notes:"Uji format pembungkusan teks panjang & kalkulasi",items:[{nama:"Nasi Goreng Spesial Babat Gongso Pedas Manis",qty:2,harga:28e3,kategori:"Makanan Utama",selectedModifiers:[{optionName:"Level 3 - Ekstra Pedas Cabai Rawit",harga:2e3},{optionName:"Tambah Telur Ceplok Setengah Matang",harga:4e3}]},{nama:"Es Kopi Susu Gula Aren Spesial Nusantara",qty:2,harga:18e3,kategori:"Minuman",selectedModifiers:[{optionName:"Less Sugar (50% Manis)",harga:0},{optionName:"Extra Espresso Shot",harga:5e3}]}],subtotal:106e3,discount:6e3,discountType:"fixed",serviceCharge:5e3,tax:10500,total:115500,cashTendered:12e4,change:4500,isDraft:!1}},"generateZReportHtml",0,function(e,t){e=(0,o.D)(e);let a=(0,o.D)(t||(0,r.getStoreSettings)()),i="80mm"===a.paperWidth,n=void 0!==e.cashDifference?e.cashDifference:0,l="SELISIH: Rp 0 (PAS)";return n>0&&(l=`SELISIH: +${s(n)} (LEBIH)`),n<0&&(l=`SELISIH: -${s(Math.abs(n))} (KURANG)`),`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
      <title>Z_Report_Shift_${e.id||"-"}</title>
      <style>
        @page { margin: 0; size: ${i?"80mm":"58mm"} auto; }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: ${i?"13px":"11px"};
          line-height: 1.25;
          color: #000000 !important;
          background: #ffffff !important;
          width: ${i?"72mm":"52mm"};
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
      <div class="center bold" style="font-size: 14px;">${a.storeName||"SAKUNOTA"}</div>
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
      <div class="row"><span>Modal Awal:</span><span>${s(e.startingCash||0)}</span></div>
      <div class="row"><span>Penjualan Tunai:</span><span>+${s(e.cashSales||0)}</span></div>
      ${e.cashIn?`<div class="row"><span>Kas Masuk:</span><span>+${s(e.cashIn)}</span></div>`:""}
      ${e.cashOut?`<div class="row"><span>Kas Keluar:</span><span>-${s(e.cashOut)}</span></div>`:""}
      ${e.cashRefunds?`<div class="row"><span>Refund Tunai:</span><span>-${s(e.cashRefunds)}</span></div>`:""}
      
      <div class="divider"></div>
      <div class="row bold"><span>KAS SEHARUSNYA:</span><span>${s(e.expectedCash||0)}</span></div>
      <div class="row bold"><span>HITUNG FISIK:</span><span>${s(void 0!==e.actualCash?e.actualCash:e.expectedCash)}</span></div>
      <div class="center bold" style="margin-top: 4px; padding: 2px; border: 1px solid #000;">${l}</div>

      <div class="double-divider"></div>
      <div class="center bold">--- NON-TUNAI (BANK / QRIS) ---</div>
      <div class="row"><span>QRIS / Transfer:</span><span>${s(e.nonCashSales||0)}</span></div>
      <div class="center" style="font-size: 9px;">(Masuk langsung ke rekening merchant)</div>

      ${e.notes?`<div class="divider"></div><div style="font-size: 10px;">Catatan: ${e.notes}</div>`:""}

      <div class="divider"></div>
      <div class="center" style="margin-top: 16px;">Tanda Tangan Kasir,</div>
      <div style="height: 36px;"></div>
      <div class="center bold">( ${e.operatorName||"Kasir"} )</div>

      ${a.enableWatermark?'<div class="center" style="font-size: 9px; margin-top: 10px; color: #444;">[ SakuNota - Solusi Kasir UMKM ]</div>':""}
    </body>
    </html>
  `},"generateZReportReceipt",0,function(e,t){e=(0,o.o)(e);let a=(0,o.o)(t||(0,r.getStoreSettings)()),i="80mm"===a.paperWidth?48:32,n="-".repeat(i)+"\n",d="=".repeat(i)+"\n",f=e=>e?l(e,i).map(e=>{let t=Math.max(0,Math.floor((i-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",u=(e,t)=>{let r=i-e.length-t.length;return r<=0?`${e}
${t.padStart(i," ")}
`:`${e}${" ".repeat(r)}${t}
`},p="";p+=f(a.storeName||"SAKUNOTA"),p+=f("*** LAPORAN TUTUP SHIFT (Z-REPORT) ***"),p+=d,p+=u("Shift ID:",`#${e.id||"-"}`),p+=u("Kasir/Operator:",e.operatorName||"Kasir"),"owner"===e.closedBy&&(p+=u("Ditutup Oleh:",`${e.closedByOperator||"Pemilik"} (Pemilik)`),e.closureReason&&(p+=u("Alasan Tutup:",e.closureReason))),p+=u("Waktu Buka:",e.startTime?new Date(e.startTime).toLocaleString("id-ID"):"-"),p+=u("Waktu Tutup:",e.endTime?new Date(e.endTime).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")),p+=n,p+=f("--- REKONSILIASI KAS LACI ---"),p+=u("1. Modal Awal:",s(e.startingCash||0)),p+=u("2. Penjualan Tunai:",`+${s(e.cashSales||0)}`),e.cashIn&&e.cashIn>0&&(p+=u("3. Kas Masuk:",`+${s(e.cashIn)}`)),e.cashOut&&e.cashOut>0&&(p+=u("4. Kas Keluar:",`-${s(e.cashOut)}`)),e.cashRefunds&&e.cashRefunds>0&&(p+=u("5. Refund Tunai:",`-${s(e.cashRefunds)}`)),p+=n,p+=u("KAS FISIK SEHARUSNYA:",s(e.expectedCash||0)),p+=u("HASIL HITUNG FISIK:",s(void 0!==e.actualCash?e.actualCash:e.expectedCash));let c=void 0!==e.cashDifference?e.cashDifference:0,h="SELISIH: Rp 0 (PAS)";return c>0&&(h=`SELISIH: +${s(c)} (LEBIH)`),c<0&&(h=`SELISIH: -${s(Math.abs(c))} (KURANG)`),p+=f(h),p+=d,p+=f("--- NON-TUNAI (BANK / QRIS) ---"),p+=u("QRIS / Transfer:",s(e.nonCashSales||0)),p+=f("(Masuk langsung ke rekening merchant)"),p+=n,e.notes&&(p+=`Catatan: ${e.notes}
`,p+=n),p+=f("Tanda Tangan Kasir,"),p+="\n\n\n",p+=f(`( ${e.operatorName||"Kasir"} )`),a.enableWatermark&&(p+="\n"+f("[ SakuNota - Solusi Kasir UMKM ]")),p+="\n\n\n"}],71798)}],67034,(e,t,r)=>{var a={872:function(e,t){"use strict";t.byteLength=function(e){var t=l(e),r=t[0],a=t[1];return(r+a)*3/4-a},t.toByteArray=function(e){var t,r,n=l(e),o=n[0],s=n[1],d=new i((o+s)*3/4-s),f=0,u=s>0?o-4:o;for(r=0;r<u;r+=4)t=a[e.charCodeAt(r)]<<18|a[e.charCodeAt(r+1)]<<12|a[e.charCodeAt(r+2)]<<6|a[e.charCodeAt(r+3)],d[f++]=t>>16&255,d[f++]=t>>8&255,d[f++]=255&t;return 2===s&&(t=a[e.charCodeAt(r)]<<2|a[e.charCodeAt(r+1)]>>4,d[f++]=255&t),1===s&&(t=a[e.charCodeAt(r)]<<10|a[e.charCodeAt(r+1)]<<4|a[e.charCodeAt(r+2)]>>2,d[f++]=t>>8&255,d[f++]=255&t),d},t.fromByteArray=function(e){for(var t,a=e.length,i=a%3,n=[],o=0,s=a-i;o<s;o+=16383)n.push(function(e,t,a){for(var i,n=[],o=t;o<a;o+=3)i=(e[o]<<16&0xff0000)+(e[o+1]<<8&65280)+(255&e[o+2]),n.push(r[i>>18&63]+r[i>>12&63]+r[i>>6&63]+r[63&i]);return n.join("")}(e,o,o+16383>s?s:o+16383));return 1===i?n.push(r[(t=e[a-1])>>2]+r[t<<4&63]+"=="):2===i&&n.push(r[(t=(e[a-2]<<8)+e[a-1])>>10]+r[t>>4&63]+r[t<<2&63]+"="),n.join("")};for(var r=[],a=[],i="u">typeof Uint8Array?Uint8Array:Array,n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",o=0,s=n.length;o<s;++o)r[o]=n[o],a[n.charCodeAt(o)]=o;function l(e){var t=e.length;if(t%4>0)throw Error("Invalid string. Length must be a multiple of 4");var r=e.indexOf("=");-1===r&&(r=t);var a=r===t?0:4-r%4;return[r,a]}a[45]=62,a[95]=63},230:function(e,t,r){"use strict";var a=r(872),i=r(321),n="function"==typeof Symbol&&"function"==typeof Symbol.for?Symbol.for("nodejs.util.inspect.custom"):null;function o(e){if(e>0x7fffffff)throw RangeError('The value "'+e+'" is invalid for option "size"');var t=new Uint8Array(e);return Object.setPrototypeOf(t,s.prototype),t}function s(e,t,r){if("number"==typeof e){if("string"==typeof t)throw TypeError('The "string" argument must be of type string. Received type number');return f(e)}return l(e,t,r)}function l(e,t,r){if("string"==typeof e){var a=e,i=t;if(("string"!=typeof i||""===i)&&(i="utf8"),!s.isEncoding(i))throw TypeError("Unknown encoding: "+i);var n=0|c(a,i),l=o(n),d=l.write(a,i);return d!==n&&(l=l.slice(0,d)),l}if(ArrayBuffer.isView(e))return u(e);if(null==e)throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof e);if(N(e,ArrayBuffer)||e&&N(e.buffer,ArrayBuffer)||"u">typeof SharedArrayBuffer&&(N(e,SharedArrayBuffer)||e&&N(e.buffer,SharedArrayBuffer)))return function(e,t,r){var a;if(t<0||e.byteLength<t)throw RangeError('"offset" is outside of buffer bounds');if(e.byteLength<t+(r||0))throw RangeError('"length" is outside of buffer bounds');return Object.setPrototypeOf(a=void 0===t&&void 0===r?new Uint8Array(e):void 0===r?new Uint8Array(e,t):new Uint8Array(e,t,r),s.prototype),a}(e,t,r);if("number"==typeof e)throw TypeError('The "value" argument must not be of type number. Received type number');var f=e.valueOf&&e.valueOf();if(null!=f&&f!==e)return s.from(f,t,r);var h=function(e){if(s.isBuffer(e)){var t=0|p(e.length),r=o(t);return 0===r.length||e.copy(r,0,0,t),r}return void 0!==e.length?"number"!=typeof e.length||function(e){return e!=e}(e.length)?o(0):u(e):"Buffer"===e.type&&Array.isArray(e.data)?u(e.data):void 0}(e);if(h)return h;if("u">typeof Symbol&&null!=Symbol.toPrimitive&&"function"==typeof e[Symbol.toPrimitive])return s.from(e[Symbol.toPrimitive]("string"),t,r);throw TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type "+typeof e)}function d(e){if("number"!=typeof e)throw TypeError('"size" argument must be of type number');if(e<0)throw RangeError('The value "'+e+'" is invalid for option "size"')}function f(e){return d(e),o(e<0?0:0|p(e))}function u(e){for(var t=e.length<0?0:0|p(e.length),r=o(t),a=0;a<t;a+=1)r[a]=255&e[a];return r}t.Buffer=s,t.SlowBuffer=function(e){return+e!=e&&(e=0),s.alloc(+e)},t.INSPECT_MAX_BYTES=50,t.kMaxLength=0x7fffffff,s.TYPED_ARRAY_SUPPORT=function(){try{var e=new Uint8Array(1),t={foo:function(){return 42}};return Object.setPrototypeOf(t,Uint8Array.prototype),Object.setPrototypeOf(e,t),42===e.foo()}catch(e){return!1}}(),!s.TYPED_ARRAY_SUPPORT&&"u">typeof console&&"function"==typeof console.error&&console.error("This browser lacks typed array (Uint8Array) support which is required by `buffer` v5.x. Use `buffer` v4.x if you require old browser support."),Object.defineProperty(s.prototype,"parent",{enumerable:!0,get:function(){if(s.isBuffer(this))return this.buffer}}),Object.defineProperty(s.prototype,"offset",{enumerable:!0,get:function(){if(s.isBuffer(this))return this.byteOffset}}),s.poolSize=8192,s.from=function(e,t,r){return l(e,t,r)},Object.setPrototypeOf(s.prototype,Uint8Array.prototype),Object.setPrototypeOf(s,Uint8Array),s.alloc=function(e,t,r){return(d(e),e<=0)?o(e):void 0!==t?"string"==typeof r?o(e).fill(t,r):o(e).fill(t):o(e)},s.allocUnsafe=function(e){return f(e)},s.allocUnsafeSlow=function(e){return f(e)};function p(e){if(e>=0x7fffffff)throw RangeError("Attempt to allocate Buffer larger than maximum size: 0x7fffffff bytes");return 0|e}function c(e,t){if(s.isBuffer(e))return e.length;if(ArrayBuffer.isView(e)||N(e,ArrayBuffer))return e.byteLength;if("string"!=typeof e)throw TypeError('The "string" argument must be one of type string, Buffer, or ArrayBuffer. Received type '+typeof e);var r=e.length,a=arguments.length>2&&!0===arguments[2];if(!a&&0===r)return 0;for(var i=!1;;)switch(t){case"ascii":case"latin1":case"binary":return r;case"utf8":case"utf-8":return A(e).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*r;case"hex":return r>>>1;case"base64":return T(e).length;default:if(i)return a?-1:A(e).length;t=(""+t).toLowerCase(),i=!0}}function h(e,t,r){var i,n,o,s=!1;if((void 0===t||t<0)&&(t=0),t>this.length||((void 0===r||r>this.length)&&(r=this.length),r<=0||(r>>>=0)<=(t>>>=0)))return"";for(e||(e="utf8");;)switch(e){case"hex":return function(e,t,r){var a=e.length;(!t||t<0)&&(t=0),(!r||r<0||r>a)&&(r=a);for(var i="",n=t;n<r;++n)i+=B[e[n]];return i}(this,t,r);case"utf8":case"utf-8":return b(this,t,r);case"ascii":return function(e,t,r){var a="";r=Math.min(e.length,r);for(var i=t;i<r;++i)a+=String.fromCharCode(127&e[i]);return a}(this,t,r);case"latin1":case"binary":return function(e,t,r){var a="";r=Math.min(e.length,r);for(var i=t;i<r;++i)a+=String.fromCharCode(e[i]);return a}(this,t,r);case"base64":return i=this,n=t,o=r,0===n&&o===i.length?a.fromByteArray(i):a.fromByteArray(i.slice(n,o));case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return function(e,t,r){for(var a=e.slice(t,r),i="",n=0;n<a.length;n+=2)i+=String.fromCharCode(a[n]+256*a[n+1]);return i}(this,t,r);default:if(s)throw TypeError("Unknown encoding: "+e);e=(e+"").toLowerCase(),s=!0}}function m(e,t,r){var a=e[t];e[t]=e[r],e[r]=a}function g(e,t,r,a,i){var n;if(0===e.length)return -1;if("string"==typeof r?(a=r,r=0):r>0x7fffffff?r=0x7fffffff:r<-0x80000000&&(r=-0x80000000),(n=r*=1)!=n&&(r=i?0:e.length-1),r<0&&(r=e.length+r),r>=e.length)if(i)return -1;else r=e.length-1;else if(r<0)if(!i)return -1;else r=0;if("string"==typeof t&&(t=s.from(t,a)),s.isBuffer(t))return 0===t.length?-1:y(e,t,r,a,i);if("number"==typeof t){if(t&=255,"function"==typeof Uint8Array.prototype.indexOf)if(i)return Uint8Array.prototype.indexOf.call(e,t,r);else return Uint8Array.prototype.lastIndexOf.call(e,t,r);return y(e,[t],r,a,i)}throw TypeError("val must be string, number or Buffer")}function y(e,t,r,a,i){var n,o=1,s=e.length,l=t.length;if(void 0!==a&&("ucs2"===(a=String(a).toLowerCase())||"ucs-2"===a||"utf16le"===a||"utf-16le"===a)){if(e.length<2||t.length<2)return -1;o=2,s/=2,l/=2,r/=2}function d(e,t){return 1===o?e[t]:e.readUInt16BE(t*o)}if(i){var f=-1;for(n=r;n<s;n++)if(d(e,n)===d(t,-1===f?0:n-f)){if(-1===f&&(f=n),n-f+1===l)return f*o}else -1!==f&&(n-=n-f),f=-1}else for(r+l>s&&(r=s-l),n=r;n>=0;n--){for(var u=!0,p=0;p<l;p++)if(d(e,n+p)!==d(t,p)){u=!1;break}if(u)return n}return -1}s.isBuffer=function(e){return null!=e&&!0===e._isBuffer&&e!==s.prototype},s.compare=function(e,t){if(N(e,Uint8Array)&&(e=s.from(e,e.offset,e.byteLength)),N(t,Uint8Array)&&(t=s.from(t,t.offset,t.byteLength)),!s.isBuffer(e)||!s.isBuffer(t))throw TypeError('The "buf1", "buf2" arguments must be one of type Buffer or Uint8Array');if(e===t)return 0;for(var r=e.length,a=t.length,i=0,n=Math.min(r,a);i<n;++i)if(e[i]!==t[i]){r=e[i],a=t[i];break}return r<a?-1:+(a<r)},s.isEncoding=function(e){switch(String(e).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},s.concat=function(e,t){if(!Array.isArray(e))throw TypeError('"list" argument must be an Array of Buffers');if(0===e.length)return s.alloc(0);if(void 0===t)for(r=0,t=0;r<e.length;++r)t+=e[r].length;var r,a=s.allocUnsafe(t),i=0;for(r=0;r<e.length;++r){var n=e[r];if(N(n,Uint8Array)&&(n=s.from(n)),!s.isBuffer(n))throw TypeError('"list" argument must be an Array of Buffers');n.copy(a,i),i+=n.length}return a},s.byteLength=c,s.prototype._isBuffer=!0,s.prototype.swap16=function(){var e=this.length;if(e%2!=0)throw RangeError("Buffer size must be a multiple of 16-bits");for(var t=0;t<e;t+=2)m(this,t,t+1);return this},s.prototype.swap32=function(){var e=this.length;if(e%4!=0)throw RangeError("Buffer size must be a multiple of 32-bits");for(var t=0;t<e;t+=4)m(this,t,t+3),m(this,t+1,t+2);return this},s.prototype.swap64=function(){var e=this.length;if(e%8!=0)throw RangeError("Buffer size must be a multiple of 64-bits");for(var t=0;t<e;t+=8)m(this,t,t+7),m(this,t+1,t+6),m(this,t+2,t+5),m(this,t+3,t+4);return this},s.prototype.toString=function(){var e=this.length;return 0===e?"":0==arguments.length?b(this,0,e):h.apply(this,arguments)},s.prototype.toLocaleString=s.prototype.toString,s.prototype.equals=function(e){if(!s.isBuffer(e))throw TypeError("Argument must be a Buffer");return this===e||0===s.compare(this,e)},s.prototype.inspect=function(){var e="",r=t.INSPECT_MAX_BYTES;return e=this.toString("hex",0,r).replace(/(.{2})/g,"$1 ").trim(),this.length>r&&(e+=" ... "),"<Buffer "+e+">"},n&&(s.prototype[n]=s.prototype.inspect),s.prototype.compare=function(e,t,r,a,i){if(N(e,Uint8Array)&&(e=s.from(e,e.offset,e.byteLength)),!s.isBuffer(e))throw TypeError('The "target" argument must be one of type Buffer or Uint8Array. Received type '+typeof e);if(void 0===t&&(t=0),void 0===r&&(r=e?e.length:0),void 0===a&&(a=0),void 0===i&&(i=this.length),t<0||r>e.length||a<0||i>this.length)throw RangeError("out of range index");if(a>=i&&t>=r)return 0;if(a>=i)return -1;if(t>=r)return 1;if(t>>>=0,r>>>=0,a>>>=0,i>>>=0,this===e)return 0;for(var n=i-a,o=r-t,l=Math.min(n,o),d=this.slice(a,i),f=e.slice(t,r),u=0;u<l;++u)if(d[u]!==f[u]){n=d[u],o=f[u];break}return n<o?-1:+(o<n)},s.prototype.includes=function(e,t,r){return -1!==this.indexOf(e,t,r)},s.prototype.indexOf=function(e,t,r){return g(this,e,t,r,!0)},s.prototype.lastIndexOf=function(e,t,r){return g(this,e,t,r,!1)};function b(e,t,r){r=Math.min(e.length,r);for(var a=[],i=t;i<r;){var n,o,s,l,d=e[i],f=null,u=d>239?4:d>223?3:d>191?2:1;if(i+u<=r)switch(u){case 1:d<128&&(f=d);break;case 2:(192&(n=e[i+1]))==128&&(l=(31&d)<<6|63&n)>127&&(f=l);break;case 3:n=e[i+1],o=e[i+2],(192&n)==128&&(192&o)==128&&(l=(15&d)<<12|(63&n)<<6|63&o)>2047&&(l<55296||l>57343)&&(f=l);break;case 4:n=e[i+1],o=e[i+2],s=e[i+3],(192&n)==128&&(192&o)==128&&(192&s)==128&&(l=(15&d)<<18|(63&n)<<12|(63&o)<<6|63&s)>65535&&l<1114112&&(f=l)}null===f?(f=65533,u=1):f>65535&&(f-=65536,a.push(f>>>10&1023|55296),f=56320|1023&f),a.push(f),i+=u}var p=a,c=p.length;if(c<=4096)return String.fromCharCode.apply(String,p);for(var h="",m=0;m<c;)h+=String.fromCharCode.apply(String,p.slice(m,m+=4096));return h}function v(e,t,r){if(e%1!=0||e<0)throw RangeError("offset is not uint");if(e+t>r)throw RangeError("Trying to access beyond buffer length")}function w(e,t,r,a,i,n){if(!s.isBuffer(e))throw TypeError('"buffer" argument must be a Buffer instance');if(t>i||t<n)throw RangeError('"value" argument is out of bounds');if(r+a>e.length)throw RangeError("Index out of range")}function x(e,t,r,a,i,n){if(r+a>e.length||r<0)throw RangeError("Index out of range")}function I(e,t,r,a,n){return t*=1,r>>>=0,n||x(e,t,r,4,34028234663852886e22,-34028234663852886e22),i.write(e,t,r,a,23,4),r+4}function S(e,t,r,a,n){return t*=1,r>>>=0,n||x(e,t,r,8,17976931348623157e292,-17976931348623157e292),i.write(e,t,r,a,52,8),r+8}s.prototype.write=function(e,t,r,a){if(void 0===t)a="utf8",r=this.length,t=0;else if(void 0===r&&"string"==typeof t)a=t,r=this.length,t=0;else if(isFinite(t))t>>>=0,isFinite(r)?(r>>>=0,void 0===a&&(a="utf8")):(a=r,r=void 0);else throw Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");var i,n,o,s,l,d,f,u,p=this.length-t;if((void 0===r||r>p)&&(r=p),e.length>0&&(r<0||t<0)||t>this.length)throw RangeError("Attempt to write outside buffer bounds");a||(a="utf8");for(var c=!1;;)switch(a){case"hex":return function(e,t,r,a){r=Number(r)||0;var i=e.length-r;a?(a=Number(a))>i&&(a=i):a=i;var n=t.length;a>n/2&&(a=n/2);for(var o=0;o<a;++o){var s,l=parseInt(t.substr(2*o,2),16);if((s=l)!=s)break;e[r+o]=l}return o}(this,e,t,r);case"utf8":case"utf-8":return i=t,n=r,E(A(e,this.length-i),this,i,n);case"ascii":return o=t,s=r,E(k(e),this,o,s);case"latin1":case"binary":return function(e,t,r,a){return E(k(t),e,r,a)}(this,e,t,r);case"base64":return l=t,d=r,E(T(e),this,l,d);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return f=t,u=r,E(function(e,t){for(var r,a,i=[],n=0;n<e.length&&!((t-=2)<0);++n)a=(r=e.charCodeAt(n))>>8,i.push(r%256),i.push(a);return i}(e,this.length-f),this,f,u);default:if(c)throw TypeError("Unknown encoding: "+a);a=(""+a).toLowerCase(),c=!0}},s.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}},s.prototype.slice=function(e,t){var r=this.length;e=~~e,t=void 0===t?r:~~t,e<0?(e+=r)<0&&(e=0):e>r&&(e=r),t<0?(t+=r)<0&&(t=0):t>r&&(t=r),t<e&&(t=e);var a=this.subarray(e,t);return Object.setPrototypeOf(a,s.prototype),a},s.prototype.readUIntLE=function(e,t,r){e>>>=0,t>>>=0,r||v(e,t,this.length);for(var a=this[e],i=1,n=0;++n<t&&(i*=256);)a+=this[e+n]*i;return a},s.prototype.readUIntBE=function(e,t,r){e>>>=0,t>>>=0,r||v(e,t,this.length);for(var a=this[e+--t],i=1;t>0&&(i*=256);)a+=this[e+--t]*i;return a},s.prototype.readUInt8=function(e,t){return e>>>=0,t||v(e,1,this.length),this[e]},s.prototype.readUInt16LE=function(e,t){return e>>>=0,t||v(e,2,this.length),this[e]|this[e+1]<<8},s.prototype.readUInt16BE=function(e,t){return e>>>=0,t||v(e,2,this.length),this[e]<<8|this[e+1]},s.prototype.readUInt32LE=function(e,t){return e>>>=0,t||v(e,4,this.length),(this[e]|this[e+1]<<8|this[e+2]<<16)+0x1000000*this[e+3]},s.prototype.readUInt32BE=function(e,t){return e>>>=0,t||v(e,4,this.length),0x1000000*this[e]+(this[e+1]<<16|this[e+2]<<8|this[e+3])},s.prototype.readIntLE=function(e,t,r){e>>>=0,t>>>=0,r||v(e,t,this.length);for(var a=this[e],i=1,n=0;++n<t&&(i*=256);)a+=this[e+n]*i;return a>=(i*=128)&&(a-=Math.pow(2,8*t)),a},s.prototype.readIntBE=function(e,t,r){e>>>=0,t>>>=0,r||v(e,t,this.length);for(var a=t,i=1,n=this[e+--a];a>0&&(i*=256);)n+=this[e+--a]*i;return n>=(i*=128)&&(n-=Math.pow(2,8*t)),n},s.prototype.readInt8=function(e,t){return(e>>>=0,t||v(e,1,this.length),128&this[e])?-((255-this[e]+1)*1):this[e]},s.prototype.readInt16LE=function(e,t){e>>>=0,t||v(e,2,this.length);var r=this[e]|this[e+1]<<8;return 32768&r?0xffff0000|r:r},s.prototype.readInt16BE=function(e,t){e>>>=0,t||v(e,2,this.length);var r=this[e+1]|this[e]<<8;return 32768&r?0xffff0000|r:r},s.prototype.readInt32LE=function(e,t){return e>>>=0,t||v(e,4,this.length),this[e]|this[e+1]<<8|this[e+2]<<16|this[e+3]<<24},s.prototype.readInt32BE=function(e,t){return e>>>=0,t||v(e,4,this.length),this[e]<<24|this[e+1]<<16|this[e+2]<<8|this[e+3]},s.prototype.readFloatLE=function(e,t){return e>>>=0,t||v(e,4,this.length),i.read(this,e,!0,23,4)},s.prototype.readFloatBE=function(e,t){return e>>>=0,t||v(e,4,this.length),i.read(this,e,!1,23,4)},s.prototype.readDoubleLE=function(e,t){return e>>>=0,t||v(e,8,this.length),i.read(this,e,!0,52,8)},s.prototype.readDoubleBE=function(e,t){return e>>>=0,t||v(e,8,this.length),i.read(this,e,!1,52,8)},s.prototype.writeUIntLE=function(e,t,r,a){if(e*=1,t>>>=0,r>>>=0,!a){var i=Math.pow(2,8*r)-1;w(this,e,t,r,i,0)}var n=1,o=0;for(this[t]=255&e;++o<r&&(n*=256);)this[t+o]=e/n&255;return t+r},s.prototype.writeUIntBE=function(e,t,r,a){if(e*=1,t>>>=0,r>>>=0,!a){var i=Math.pow(2,8*r)-1;w(this,e,t,r,i,0)}var n=r-1,o=1;for(this[t+n]=255&e;--n>=0&&(o*=256);)this[t+n]=e/o&255;return t+r},s.prototype.writeUInt8=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,1,255,0),this[t]=255&e,t+1},s.prototype.writeUInt16LE=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,2,65535,0),this[t]=255&e,this[t+1]=e>>>8,t+2},s.prototype.writeUInt16BE=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,2,65535,0),this[t]=e>>>8,this[t+1]=255&e,t+2},s.prototype.writeUInt32LE=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,4,0xffffffff,0),this[t+3]=e>>>24,this[t+2]=e>>>16,this[t+1]=e>>>8,this[t]=255&e,t+4},s.prototype.writeUInt32BE=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,4,0xffffffff,0),this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=255&e,t+4},s.prototype.writeIntLE=function(e,t,r,a){if(e*=1,t>>>=0,!a){var i=Math.pow(2,8*r-1);w(this,e,t,r,i-1,-i)}var n=0,o=1,s=0;for(this[t]=255&e;++n<r&&(o*=256);)e<0&&0===s&&0!==this[t+n-1]&&(s=1),this[t+n]=(e/o|0)-s&255;return t+r},s.prototype.writeIntBE=function(e,t,r,a){if(e*=1,t>>>=0,!a){var i=Math.pow(2,8*r-1);w(this,e,t,r,i-1,-i)}var n=r-1,o=1,s=0;for(this[t+n]=255&e;--n>=0&&(o*=256);)e<0&&0===s&&0!==this[t+n+1]&&(s=1),this[t+n]=(e/o|0)-s&255;return t+r},s.prototype.writeInt8=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,1,127,-128),e<0&&(e=255+e+1),this[t]=255&e,t+1},s.prototype.writeInt16LE=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,2,32767,-32768),this[t]=255&e,this[t+1]=e>>>8,t+2},s.prototype.writeInt16BE=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,2,32767,-32768),this[t]=e>>>8,this[t+1]=255&e,t+2},s.prototype.writeInt32LE=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,4,0x7fffffff,-0x80000000),this[t]=255&e,this[t+1]=e>>>8,this[t+2]=e>>>16,this[t+3]=e>>>24,t+4},s.prototype.writeInt32BE=function(e,t,r){return e*=1,t>>>=0,r||w(this,e,t,4,0x7fffffff,-0x80000000),e<0&&(e=0xffffffff+e+1),this[t]=e>>>24,this[t+1]=e>>>16,this[t+2]=e>>>8,this[t+3]=255&e,t+4},s.prototype.writeFloatLE=function(e,t,r){return I(this,e,t,!0,r)},s.prototype.writeFloatBE=function(e,t,r){return I(this,e,t,!1,r)},s.prototype.writeDoubleLE=function(e,t,r){return S(this,e,t,!0,r)},s.prototype.writeDoubleBE=function(e,t,r){return S(this,e,t,!1,r)},s.prototype.copy=function(e,t,r,a){if(!s.isBuffer(e))throw TypeError("argument should be a Buffer");if(r||(r=0),a||0===a||(a=this.length),t>=e.length&&(t=e.length),t||(t=0),a>0&&a<r&&(a=r),a===r||0===e.length||0===this.length)return 0;if(t<0)throw RangeError("targetStart out of bounds");if(r<0||r>=this.length)throw RangeError("Index out of range");if(a<0)throw RangeError("sourceEnd out of bounds");a>this.length&&(a=this.length),e.length-t<a-r&&(a=e.length-t+r);var i=a-r;if(this===e&&"function"==typeof Uint8Array.prototype.copyWithin)this.copyWithin(t,r,a);else if(this===e&&r<t&&t<a)for(var n=i-1;n>=0;--n)e[n+t]=this[n+r];else Uint8Array.prototype.set.call(e,this.subarray(r,a),t);return i},s.prototype.fill=function(e,t,r,a){if("string"==typeof e){if("string"==typeof t?(a=t,t=0,r=this.length):"string"==typeof r&&(a=r,r=this.length),void 0!==a&&"string"!=typeof a)throw TypeError("encoding must be a string");if("string"==typeof a&&!s.isEncoding(a))throw TypeError("Unknown encoding: "+a);if(1===e.length){var i,n=e.charCodeAt(0);("utf8"===a&&n<128||"latin1"===a)&&(e=n)}}else"number"==typeof e?e&=255:"boolean"==typeof e&&(e=Number(e));if(t<0||this.length<t||this.length<r)throw RangeError("Out of range index");if(r<=t)return this;if(t>>>=0,r=void 0===r?this.length:r>>>0,e||(e=0),"number"==typeof e)for(i=t;i<r;++i)this[i]=e;else{var o=s.isBuffer(e)?e:s.from(e,a),l=o.length;if(0===l)throw TypeError('The value "'+e+'" is invalid for argument "value"');for(i=0;i<r-t;++i)this[i+t]=o[i%l]}return this};var $=/[^+/0-9A-Za-z-_]/g;function A(e,t){t=t||1/0;for(var r,a=e.length,i=null,n=[],o=0;o<a;++o){if((r=e.charCodeAt(o))>55295&&r<57344){if(!i){if(r>56319||o+1===a){(t-=3)>-1&&n.push(239,191,189);continue}i=r;continue}if(r<56320){(t-=3)>-1&&n.push(239,191,189),i=r;continue}r=(i-55296<<10|r-56320)+65536}else i&&(t-=3)>-1&&n.push(239,191,189);if(i=null,r<128){if((t-=1)<0)break;n.push(r)}else if(r<2048){if((t-=2)<0)break;n.push(r>>6|192,63&r|128)}else if(r<65536){if((t-=3)<0)break;n.push(r>>12|224,r>>6&63|128,63&r|128)}else if(r<1114112){if((t-=4)<0)break;n.push(r>>18|240,r>>12&63|128,r>>6&63|128,63&r|128)}else throw Error("Invalid code point")}return n}function k(e){for(var t=[],r=0;r<e.length;++r)t.push(255&e.charCodeAt(r));return t}function T(e){return a.toByteArray(function(e){if((e=(e=e.split("=")[0]).trim().replace($,"")).length<2)return"";for(;e.length%4!=0;)e+="=";return e}(e))}function E(e,t,r,a){for(var i=0;i<a&&!(i+r>=t.length)&&!(i>=e.length);++i)t[i+r]=e[i];return i}function N(e,t){return e instanceof t||null!=e&&null!=e.constructor&&null!=e.constructor.name&&e.constructor.name===t.name}var B=function(){for(var e="0123456789abcdef",t=Array(256),r=0;r<16;++r)for(var a=16*r,i=0;i<16;++i)t[a+i]=e[r]+e[i];return t}()},321:function(e,t){t.read=function(e,t,r,a,i){var n,o,s=8*i-a-1,l=(1<<s)-1,d=l>>1,f=-7,u=r?i-1:0,p=r?-1:1,c=e[t+u];for(u+=p,n=c&(1<<-f)-1,c>>=-f,f+=s;f>0;n=256*n+e[t+u],u+=p,f-=8);for(o=n&(1<<-f)-1,n>>=-f,f+=a;f>0;o=256*o+e[t+u],u+=p,f-=8);if(0===n)n=1-d;else{if(n===l)return o?0/0:(c?-1:1)*2e308;o+=Math.pow(2,a),n-=d}return(c?-1:1)*o*Math.pow(2,n-a)},t.write=function(e,t,r,a,i,n){var o,s,l,d=8*n-i-1,f=(1<<d)-1,u=f>>1,p=5960464477539062e-23*(23===i),c=a?0:n-1,h=a?1:-1,m=+(t<0||0===t&&1/t<0);for(isNaN(t=Math.abs(t))||1/0===t?(s=+!!isNaN(t),o=f):(o=Math.floor(Math.log(t)/Math.LN2),t*(l=Math.pow(2,-o))<1&&(o--,l*=2),o+u>=1?t+=p/l:t+=p*Math.pow(2,1-u),t*l>=2&&(o++,l/=2),o+u>=f?(s=0,o=f):o+u>=1?(s=(t*l-1)*Math.pow(2,i),o+=u):(s=t*Math.pow(2,u-1)*Math.pow(2,i),o=0));i>=8;e[r+c]=255&s,c+=h,s/=256,i-=8);for(o=o<<i|s,d+=i;d>0;e[r+c]=255&o,c+=h,o/=256,d-=8);e[r+c-h]|=128*m}}},i={};function n(e){var t=i[e];if(void 0!==t)return t.exports;var r=i[e]={exports:{}},o=!0;try{a[e](r,r.exports,n),o=!1}finally{o&&delete i[e]}return r.exports}n.ab="/ROOT/node_modules/next/dist/compiled/buffer/",t.exports=n(230)}]);