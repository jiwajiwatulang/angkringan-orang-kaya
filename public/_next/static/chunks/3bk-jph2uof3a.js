(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,82568,e=>{var t,a,i,r,n,s,o,l;let d,p,c,m,u,g;(r=t||(t={})).Unimplemented="UNIMPLEMENTED",r.Unavailable="UNAVAILABLE";class h extends Error{constructor(e,t,a){super(e),this.message=e,this.code=t,this.data=a}}let f=(d=(s=n="u">typeof globalThis?globalThis:"u">typeof self?self:"u">typeof window?window:e.g).CapacitorCustomPlatform||null,c=(p=s.Capacitor||{}).Plugins=p.Plugins||{},m=()=>{var e,t;return null!==d?d.name:(null==s?void 0:s.androidBridge)?"android":(null==(t=null==(e=null==s?void 0:s.webkit)?void 0:e.messageHandlers)?void 0:t.bridge)?"ios":"web"},u=e=>{var t;return null==(t=p.PluginHeaders)?void 0:t.find(t=>t.name===e)},g=new Map,p.convertFileSrc||(p.convertFileSrc=e=>e),p.getPlatform=m,p.handleError=e=>s.console.error(e),p.isNativePlatform=()=>"web"!==m(),p.isPluginAvailable=e=>{let t=g.get(e);return!!((null==t?void 0:t.platforms.has(m()))||u(e))},p.registerPlugin=(e,a={})=>{let i,r=g.get(e);if(r)return console.warn(`Capacitor plugin "${e}" already registered. Cannot register plugins twice.`),r.proxy;let n=m(),s=u(e),o=async()=>(!i&&n in a?i=i="function"==typeof a[n]?await a[n]():a[n]:null!==d&&!i&&"web"in a&&(i=i="function"==typeof a.web?await a.web():a.web),i),l=a=>{let i,r=(...r)=>{let l=o().then(o=>{let l=((a,i)=>{var r,o;if(s){let t=null==s?void 0:s.methods.find(e=>i===e.name);if(t)if("promise"===t.rtype)return t=>p.nativePromise(e,i.toString(),t);else return(t,a)=>p.nativeCallback(e,i.toString(),t,a);if(a)return null==(r=a[i])?void 0:r.bind(a)}else if(a)return null==(o=a[i])?void 0:o.bind(a);else throw new h(`"${e}" plugin is not implemented on ${n}`,t.Unimplemented)})(o,a);if(l){let e=l(...r);return i=null==e?void 0:e.remove,e}throw new h(`"${e}.${a}()" is not implemented on ${n}`,t.Unimplemented)});return"addListener"===a&&(l.remove=async()=>i()),l};return r.toString=()=>`${a.toString()}() { [capacitor code] }`,Object.defineProperty(r,"name",{value:a,writable:!1,configurable:!1}),r},f=l("addListener"),b=l("removeListener"),v=(e,t)=>{let a=f({eventName:e},t),i=async()=>{b({eventName:e,callbackId:await a},t)},r=new Promise(e=>a.then(()=>e({remove:i})));return r.remove=async()=>{console.warn("Using addListener() without 'await' is deprecated."),await i()},r},x=new Proxy({},{get(e,t){switch(t){case"$$typeof":return;case"toJSON":return()=>({});case"addListener":return s?v:f;case"removeListener":return b;default:return l(t)}}});return c[e]=x,g.set(e,{name:e,proxy:x,platforms:new Set([...Object.keys(a),...s?[n]:[]])}),x},p.Exception=h,p.DEBUG=!!p.DEBUG,p.isLoggingEnabled=!!p.isLoggingEnabled,n.Capacitor=p),b=f.registerPlugin;class v{constructor(){this.listeners={},this.retainedEventArguments={},this.windowListeners={}}addListener(e,t){let a=!1;this.listeners[e]||(this.listeners[e]=[],a=!0),this.listeners[e].push(t);let i=this.windowListeners[e];return i&&!i.registered&&this.addWindowListener(i),a&&this.sendRetainedArgumentsForEvent(e),Promise.resolve({remove:async()=>this.removeListener(e,t)})}async removeAllListeners(){for(let e in this.listeners={},this.windowListeners)this.removeWindowListener(this.windowListeners[e]);this.windowListeners={}}notifyListeners(e,t,a){let i=this.listeners[e];if(!i){if(a){let a=this.retainedEventArguments[e];a||(a=[]),a.push(t),this.retainedEventArguments[e]=a}return}i.forEach(e=>e(t))}hasListeners(e){var t;return!!(null==(t=this.listeners[e])?void 0:t.length)}registerWindowListener(e,t){this.windowListeners[t]={registered:!1,windowEventName:e,pluginEventName:t,handler:e=>{this.notifyListeners(t,e)}}}unimplemented(e="not implemented"){return new f.Exception(e,t.Unimplemented)}unavailable(e="not available"){return new f.Exception(e,t.Unavailable)}async removeListener(e,t){let a=this.listeners[e];if(!a)return;let i=a.indexOf(t);-1!==i&&this.listeners[e].splice(i,1),this.listeners[e].length||this.removeWindowListener(this.windowListeners[e])}addWindowListener(e){window.addEventListener(e.windowEventName,e.handler),e.registered=!0}removeWindowListener(e){e&&(window.removeEventListener(e.windowEventName,e.handler),e.registered=!1)}sendRetainedArgumentsForEvent(e){let t=this.retainedEventArguments[e];t&&(delete this.retainedEventArguments[e],t.forEach(t=>{this.notifyListeners(e,t)}))}}let x=e=>encodeURIComponent(e).replace(/%(2[346B]|5E|60|7C)/g,decodeURIComponent).replace(/[()]/g,escape);class y extends v{async getCookies(){let e=document.cookie,t={};return e.split(";").forEach(e=>{if(e.length<=0)return;let[a,i]=e.replace(/=/,"CAP_COOKIE").split("CAP_COOKIE");a=a.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent).trim(),i=i.replace(/(%[\dA-F]{2})+/gi,decodeURIComponent).trim(),t[a]=i}),t}async setCookie(e){try{let t=x(e.key),a=x(e.value),i=e.expires?`; expires=${e.expires.replace("expires=","")}`:"",r=(e.path||"/").replace("path=",""),n=null!=e.url&&e.url.length>0?`domain=${e.url}`:"";document.cookie=`${t}=${a||""}${i}; path=${r}; ${n};`}catch(e){return Promise.reject(e)}}async deleteCookie(e){try{document.cookie=`${e.key}=; Max-Age=0`}catch(e){return Promise.reject(e)}}async clearCookies(){try{for(let e of document.cookie.split(";")||[])document.cookie=e.replace(/^ +/,"").replace(/=.*/,`=;expires=${new Date().toUTCString()};path=/`)}catch(e){return Promise.reject(e)}}async clearAllCookies(){try{await this.clearCookies()}catch(e){return Promise.reject(e)}}}b("CapacitorCookies",{web:()=>new y});let w=async e=>new Promise((t,a)=>{let i=new FileReader;i.onload=()=>{let e=i.result;t(e.indexOf(",")>=0?e.split(",")[1]:e)},i.onerror=e=>a(e),i.readAsDataURL(e)});class $ extends v{async request(e){let t,a,i=((e,t={})=>{let a=Object.assign({method:e.method||"GET",headers:e.headers},t),i=((e={})=>{let t=Object.keys(e);return Object.keys(e).map(e=>e.toLocaleLowerCase()).reduce((a,i,r)=>(a[i]=e[t[r]],a),{})})(e.headers)["content-type"]||"";if("string"==typeof e.data)a.body=e.data;else if(i.includes("application/x-www-form-urlencoded")){let t=new URLSearchParams;for(let[a,i]of Object.entries(e.data||{}))t.set(a,i);a.body=t.toString()}else if(i.includes("multipart/form-data")||e.data instanceof FormData){let t=new FormData;if(e.data instanceof FormData)e.data.forEach((e,a)=>{t.append(a,e)});else for(let a of Object.keys(e.data))t.append(a,e.data[a]);a.body=t;let i=new Headers(a.headers);i.delete("content-type"),a.headers=i}else(i.includes("application/json")||"object"==typeof e.data)&&(a.body=JSON.stringify(e.data));return a})(e,e.webFetchExtra),r=((e,t=!0)=>e?Object.entries(e).reduce((e,a)=>{let i,r,[n,s]=a;return Array.isArray(s)?(r="",s.forEach(e=>{i=t?encodeURIComponent(e):e,r+=`${n}=${i}&`}),r.slice(0,-1)):(i=t?encodeURIComponent(s):s,r=`${n}=${i}`),`${e}&${r}`},"").substr(1):null)(e.params,e.shouldEncodeUrlParams),n=r?`${e.url}?${r}`:e.url,s=await fetch(n,i),o=s.headers.get("content-type")||"",{responseType:l="text"}=s.ok?e:{};switch(o.includes("application/json")&&(l="json"),l){case"arraybuffer":case"blob":a=await s.blob(),t=await w(a);break;case"json":t=await s.json();break;default:t=await s.text()}let d={};return s.headers.forEach((e,t)=>{d[t]=e}),{data:t,headers:d,status:s.status,url:s.url}}async get(e){return this.request(Object.assign(Object.assign({},e),{method:"GET"}))}async post(e){return this.request(Object.assign(Object.assign({},e),{method:"POST"}))}async put(e){return this.request(Object.assign(Object.assign({},e),{method:"PUT"}))}async patch(e){return this.request(Object.assign(Object.assign({},e),{method:"PATCH"}))}async delete(e){return this.request(Object.assign(Object.assign({},e),{method:"DELETE"}))}}b("CapacitorHttp",{web:()=>new $}),(o=a||(a={})).Dark="DARK",o.Light="LIGHT",o.Default="DEFAULT",(l=i||(i={})).StatusBar="StatusBar",l.NavigationBar="NavigationBar";class S extends v{async setStyle(){this.unavailable("not available for web")}async setAnimation(){this.unavailable("not available for web")}async show(){this.unavailable("not available for web")}async hide(){this.unavailable("not available for web")}}b("SystemBars",{web:()=>new S}),e.s(["d",0,f,"x",0,v,"U",0,b])},46766,e=>{function t(e){return e.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}e.s(["w",0,t,"D",0,function e(a){return"string"==typeof a?t(a):Array.isArray(a)?a.map(e):a&&"object"==typeof a?Object.fromEntries(Object.entries(a).map(([t,a])=>[t,e(a)])):a},"h",0,function(e){return e&&e.length<=28e5&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(e)?e:""},"o",0,function e(t){return"string"==typeof t?t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,""):Array.isArray(t)?t.map(e):t&&"object"==typeof t?Object.fromEntries(Object.entries(t).map(([t,a])=>[t,e(a)])):t}])},71798,42250,e=>{var t=e.i(68542),a=e.i(43668),i=e.i(82568);let r=(0,i.U)("BluetoothSerial",{web:()=>e.A(88868).then(e=>new e.BluetoothSerialWeb)});e.s(["f",0,r],42250);let n=(0,i.U)("Printer",{web:()=>e.A(28165).then(e=>new e.PrinterWeb)});var s=e.i(46766);let o=e=>`Rp ${Math.round(e||0).toLocaleString("id-ID")}`;function l(e,t){if(!e)return[];let a=e.split(/\s+/),i=[],r="";for(let e of a)if(r)if((r+" "+e).length<=t)r+=" "+e;else if(i.push(r),e.length>t){let a=e;for(;a.length>t;)i.push(a.substring(0,t)),a=a.substring(t);r=a}else r=e;else if(e.length>t){let a=e;for(;a.length>t;)i.push(a.substring(0,t)),a=a.substring(t);r=a}else r=e;return r&&i.push(r),i}let d=e=>{if(!e)return!1;let t=e.toLowerCase();return t.includes("minuman")||t.includes("kopi")||t.includes("tea")||t.includes("matcha")||t.includes("drink")||t.includes("coffee")||t.includes("milkshake")||t.includes("beverage")||t.includes("juice")};function p(e,a,i,r){let n=e.date||(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")),s=e.orderId?`A-${e.orderId}`:e.id?`A-${e.id}`:"-",l=e.tableName?e.tableName:`[${e.orderType||"Dine-in"}]`,p=i.storeName||"SAKUNOTA";"food"===a&&(p="DAPUR (KITCHEN)"),"drink"===a&&(p="BAR (MINUMAN)"),"laundry"===e.serviceCategory&&e.status&&(e={...e,isDraft:"paid"!==e.status});let c=e.items||[],m=0,u=c.map(e=>{let i=d(e.kategori||e.kategoriMenu);if("food"===a&&i||"drink"===a&&!i)return"";let r=Number(e.qty||1),n=(0,t.c)(e,r);m+=n;let s=e.nama||e.namaMenu||"Item",l=e.selectedModifiers&&e.selectedModifiers.length>0?e.selectedModifiers.map(e=>`
          <div class="item-mod">
            &gt; ${e.optionName||e.nama}${e.harga>0?` (+${o(e.harga)})`:""}
          </div>
        `).join(""):"",p=e.notes?`<div class="item-note">* ${e.notes}</div>`:"";return`
      <tr>
        <td class="col-item">
          <div class="item-name">${"weight"===e.saleUnit?(0,t.b)(e,r):r+"x"} ${s}</div>
          ${l}
          ${p}
        </td>
        ${"all"===a?`<td class="col-price">${o(n)}</td>`:""}
      </tr>
    `}).join(""),g=void 0!==e.subtotal?e.subtotal:m,h=void 0!==e.total?e.total:m,f=e.payments&&e.payments.length>0?`
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
      <div class="store-title">${p}</div>
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
          <span class="badge">${l}</span>
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
  `}function c(e){let t=Array.isArray((e=(0,s.D)(e)).items)?e.items:[],a=[];for(let e of t){let t=Math.max(1,Math.round(Number(e.qty)||1));for(let i=0;i<t;i++)a.push(e)}let i=a.length,r=e.orderType?.toLowerCase()==="takeaway"||!e.tableId&&"Dine-in"!==e.orderType,n=r?"Take Away":"Dine In",o="Tamu";if(r)o=e.customerName?.trim()||"Take Away";else{let t=e.tableName?.trim()||(e.tableId?`Meja ${e.tableId}`:""),a=e.customerName?.trim()||"";o=t&&a?`${t} (${a})`:t||a||"Dine In"}let l=e.createdAt?new Date(e.createdAt):new Date,p=e=>String(e).padStart(2,"0"),c=p(l.getDate()),m=p(l.getMonth()+1),u=String(l.getFullYear()).slice(-2),g=p(l.getHours()),h=p(l.getMinutes()),f=`${c}/${m}/${u} ${g}:${h}`;return a.map((t,a)=>{let r=d(t.kategori||t.kategoriMenu),s=[];if(Array.isArray(t.selectedModifiers))for(let e of t.selectedModifiers){let t=e.optionName||e.nama||"";t&&s.push(t)}let l=t.notes||t.catatan||(0===a&&e.notes?e.notes:void 0);return{index:a+1,total:i,customerOrTable:o,orderType:n,nama:t.nama||t.namaMenu||"Menu",unit:r?"1 Cup":"1 Porsi",modifiers:s,notes:l,dateTime:f,orderId:e.orderId||e.id}})}async function m(e){let{title:t,escposText:a,htmlContent:s}=e;if(i.d.isNativePlatform()){let e=localStorage.getItem("bt_printer_mac");if(e)try{try{await r.connect({address:e})}catch(e){}return await r.write({address:e,value:a}),{success:!0,platform:"native_bluetooth",message:"Berhasil dikirim ke Printer Bluetooth Thermal!"}}catch(e){console.warn("Bluetooth Serial write failed, falling back to native system printer:",e);try{return await n.printHtml({html:s,name:t}),{success:!0,platform:"native_system",message:"Bluetooth gagal, dicetak via dialog Printer Sistem Android."}}catch(t){throw Error(`Gagal mencetak di Android: ${e.message||e}`)}}try{return await n.printHtml({html:s,name:t}),{success:!0,platform:"native_system",message:"Berhasil dikirim ke Dialog Printer Sistem Android."}}catch(e){throw Error(`Gagal membuka dialog printer Android: ${e.message||e}`)}}try{let e=document.getElementById("sakunota-print-iframe");e||((e=document.createElement("iframe")).setAttribute("sandbox","allow-same-origin allow-modals"),e.id="sakunota-print-iframe",e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.visibility="hidden",document.body.appendChild(e));let t=e.contentDocument||e.contentWindow?.document;if(t&&(t.open(),t.write(s),t.close(),await new Promise(e=>setTimeout(e,250)),e.contentWindow))return e.contentWindow.focus(),e.contentWindow.print(),window.focus(),{success:!0,platform:"web_iframe",message:"Dialog cetak struk terisolasi berhasil dibuka!"}}catch(e){console.warn("Iframe print error, falling back to Printer.printHtml:",e)}try{return await n.printHtml({html:s,name:t}),{success:!0,platform:"web_fallback",message:"Dialog cetak dibuka via Capacitor Web Plugin."}}catch(e){throw Error(`Gagal mencetak struk di browser: ${e.message||e}`)}}e.s(["executePrintDocument",0,m,"formatCurrency",0,o,"generateBulkReceiptHtml",0,function(e,t="all",i){let r=(0,s.D)(i||(0,a.getStoreSettings)());r.storeLogo=(0,s.h)(r.storeLogo);let n="80mm"===r.paperWidth,o=n?"80mm":"58mm",l=n?"72mm":"52mm",d=e.map(e=>{let a=(0,s.D)(e);return`
      <div class="bulk-receipt-page">
        ${p(a,t,r,n)}
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
  `},"generateCupLabelsEscPos",0,function(e,t){let i=c(e=(0,s.o)(e));if(!i.length)return"";let r="80mm"===(0,s.o)(t||(0,a.getStoreSettings)()).paperWidth?48:32,n="-".repeat(r)+"\n",o=(e,t)=>{let a=r-e.length-t.length;if(a>=0)return`${e}${" ".repeat(a)}${t}
`;let i=Math.max(1,r-t.length-1);return`${e.slice(0,i)} ${t}
`},l="";for(let e of i){for(let t of(l+="\x1b@",l+="\x1bE\x01"+o(e.customerOrTable,e.orderType)+"\x1bE\0",l+=`${e.unit}
`,l+=n,l+="\x1bE\x01\x1b!\x10"+e.nama+"\x1b!\0\x1bE\0\n",e.modifiers))l+=`  * ${t}
`;e.notes&&(l+=`  (Catatan: ${e.notes})
`),l+=n,l+="\x1bE\x01"+o(e.dateTime,`${e.index}/${e.total}`)+"\x1bE\0",l+="\n\n\n\x1dVB\0"}return l},"generateCupLabelsHtml",0,function(e,t){let i=c(e=(0,s.D)(e));if(!i.length)return"";let r="80mm"===(0,s.D)(t||(0,a.getStoreSettings)()).paperWidth,n=i.map(e=>`
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
  `},"generateEscPosReceipt",0,function(e,i="all",r){e=(0,s.o)(e);let n=(0,s.o)(r||(0,a.getStoreSettings)()),p="80mm"===n.paperWidth?48:32,c="-".repeat(p)+"\n",m="=".repeat(p)+"\n",u=e=>e?l(e,p).map(e=>{let t=Math.max(0,Math.floor((p-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",g=(e,t)=>{let a=p-e.length-t.length;if(a>=0)return`${e}${" ".repeat(a)}${t}
`;let i=p-t.length-1;if(i>8){let a=e.substring(0,i),r=e.substring(i),n=p-a.length-t.length;return`${a}${" ".repeat(Math.max(1,n))}${t}
   ${r.trim()}
`}return`${e}
${t.padStart(p," ")}
`},h="";"all"===i?(h+=u(n.storeName||"SAKUNOTA"),n.storeAddress&&l(n.storeAddress,p).forEach(e=>{h+=u(e)}),n.storePhone&&(h+=u(`Telp: ${n.storePhone}`)),n.receiptHeader&&n.receiptHeader.split("\n").forEach(e=>{e.trim()&&(h+=u(e.trim()))})):h+=u("food"===i?"*** STRUK DAPUR (KITCHEN) ***":"*** STRUK BAR (MINUMAN) ***"),h+=m;let f=e.date||(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID"));h+=g(`Tgl: ${f}`,"");let b=e.orderId?`No: A-${e.orderId}`:e.id?`No: A-${e.id}`:"No: -",v="";!1!==n.receiptShowTable&&(e.tableName?v=`Meja: ${String(e.tableName).replace(/^Meja\s*/i,"")}`:e.orderType&&"Dine-in"!==e.orderType&&"Direct"!==e.orderType&&(v=`[${e.orderType}]`)),h+=g(b,v),"laundry"===e.serviceCategory&&(h+=g("Laundry",""),h+=g("Selesai: "+(e.pickupDate||"-"),""),e.customerPhone&&(h+=g("WA: "+e.customerPhone,""))),e.customerName&&!1!==n.receiptShowCustomer&&(h+=g(`Pelanggan: ${e.customerName}`,"")),(e.operatorName||e.kasirName)&&!1!==n.receiptShowCashier&&(h+=g(`Kasir: ${e.operatorName||e.kasirName}`,"")),e.notes&&!1!==n.receiptShowNotes&&(h+=`Catatan: ${e.notes}
`),h+=c;let x=0;if("laundry"===e.serviceCategory&&e.status&&(e={...e,isDraft:"paid"!==e.status}),(e.items||[]).forEach(e=>{let a=d(e.kategori||e.kategoriMenu);if("food"===i&&a||"drink"===i&&!a)return;let r=Number(e.qty||1),n=(0,t.c)(e,r);x+=n;let s=e.nama||e.namaMenu||"Item",c=`${"weight"===e.saleUnit?(0,t.b)(e,r):r+"x"} ${s}`,m=o(n);"all"===i?h+=g(c,m):h+=`${c}
`,e.selectedModifiers&&e.selectedModifiers.length>0&&e.selectedModifiers.forEach(e=>{let t=e.harga>0?` (+${o(e.harga)})`:"",a=`   > ${e.optionName||e.nama}${t}`;h+=l(a,p).join("\n")+"\n"}),e.notes&&(h+=`   * ${e.notes}
`)}),h+=c,"all"===i){let a=void 0!==e.subtotal?e.subtotal:x;if(e.discount&&e.discount>0||e.serviceCharge&&e.serviceCharge>0||e.tax&&e.tax>0){if(h+=g("Subtotal:",o(a)),e.discount&&e.discount>0){let t="percent"===e.discountType?`Diskon (${e.discountValue}%):`:"Diskon:";h+=g(t,"-"+o(e.discount))}e.serviceCharge&&e.serviceCharge>0&&(h+=g("Layanan:",o(e.serviceCharge))),e.tax&&e.tax>0&&(h+=g("Pajak PBJT:",o(e.tax))),h+=c}let i=void 0!==e.total?e.total:x;if(h+=g("TOTAL TAGIHAN:",o(i)),e.payments&&e.payments.length>0){h+=c,h+="Rincian Pembayaran:\n",e.payments.forEach((e,a)=>{let i="refunded"===e.status,r=` ${a+1}. ${e.paymentMethod}${i?" (REFUND)":""}`;h+=g(r,o(e.amount)),e.itemsPaid&&e.itemsPaid.length>0&&e.itemsPaid.forEach(e=>{h+=`    • ${(0,t.b)(e)} ${e.nama}
`})}),h+=c;let a=e.payments.filter(e=>"completed"===e.status).reduce((e,t)=>e+t.amount,0);h+=g("Total Terbayar:",o(a));let r=Math.max(0,i-a);r>0?(h+=g("SISA TAGIHAN:",o(r)),h+=m,h+=u(" STATUS: BELUM LUNAS")):(h+=m,h+=u(" STATUS: LUNAS"))}else{if(h+=g("Metode:",e.paymentMethod||"Tunai"),e.cashTendered&&e.cashTendered>0&&!("laundry"===e.serviceCategory&&e.isDraft)){h+=g("Bayar Tunai:",o(e.cashTendered));let t=Math.max(0,e.cashTendered-i);h+=g("Kembalian:",o(t))}h+=m,e.isDraft?h+=u("laundry"===e.serviceCategory?" BELUM LUNAS":" TAGIHAN SEMENTARA (OPEN BILL)"):h+=u(" LUNAS")}h+=c,n.receiptFooter&&n.receiptFooter.split("\n").forEach(e=>{e.trim()&&(h+=u(e.trim()))}),n.receiptCustomNote&&n.receiptCustomNote.split("\n").forEach(e=>{e.trim()&&(h+=u(e.trim()))}),n.enableWatermark&&(h+="\n"+u("[ SakuNota - Solusi Kasir UMKM ]")),e.isDemo&&(h+="\n"+u("*** STRUK SIMULASI DEMO KASIR ***"),h+=u("BUKAN BUKTI TRANSAKSI RIIL"))}return h+="\n\n\n"},"generatePartialPaymentReceipt",0,function(e,i,r){e=(0,s.o)(e),i=(0,s.o)(i);let n=(0,s.o)(r||(0,a.getStoreSettings)()),d="80mm"===n.paperWidth?48:32,p="-".repeat(d)+"\n",c="=".repeat(d)+"\n",m=e=>e?l(e,d).map(e=>{let t=Math.max(0,Math.floor((d-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",u=(e,t)=>{let a=d-e.length-t.length;return a<=0?`${e}
${t.padStart(d," ")}
`:`${e}${" ".repeat(a)}${t}
`},g="";g+=m(n.storeName||"SAKUNOTA"),n.storeAddress&&(g+=m(n.storeAddress)),n.storePhone&&(g+=m(`Telp: ${n.storePhone}`)),g+=c,g+=m("BUKTI PEMBAYARAN PARSIAL / SPLIT"),g+=p,g+=u(`Tgl: ${i.paidAt?new Date(i.paidAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")}`,""),g+=u(`No: A-${e.id||"-"}`,e.tableId?`Meja: ${e.tableId}`:`[${e.orderType||"Dine-in"}]`),e.customerName&&(g+=u(`Pelanggan: ${e.customerName}`,"")),g+=u(`Kasir: ${i.operatorName||"Kasir"}`,i.shiftId?`Shift #${i.shiftId}`:""),g+=p;let h="item"===i.splitType?"Split by Item (Per Menu)":"equal"===i.splitType?"Split Equally (Bagi Rata)":"Pembayaran Cicil / Parsial";g+=`Tipe: ${h}
`,i.itemsPaid&&i.itemsPaid.length>0&&(g+="Menu yang dibayar:\n",i.itemsPaid.forEach(e=>{g+=u(` • ${(0,t.b)(e)} ${e.nama}`,o((0,t.c)(e)))})),g+=p,g+=u("Nominal Dibayar:",o(i.amount)),g+=u("Metode Bayar:",i.paymentMethod||"Tunai"),"Cash"===i.paymentMethod&&i.cashTendered&&(g+=u("Uang Diterima:",o(i.cashTendered)),g+=u("Kembalian:",o(i.change||0))),g+=p,g+=u("Total Tagihan Nota:",o(e.total));let f=void 0!==e.remainingBalance?e.remainingBalance:Math.max(0,e.total-(e.paidAmount||i.amount));return g+=u("SISA TAGIHAN:",o(f)),g+=c,f>0?(g+=m(" STATUS: BELUM LUNAS"),g+=m("Harap simpan bukti pembayaran ini")):g+=m(" STATUS: LUNAS"),n.enableWatermark&&(g+="\n"+m("[ SakuNota - Solusi Kasir UMKM ]")),g+="\n\n\n"},"generateReceiptHtml",0,function(e,t="all",i){e=(0,s.D)(e);let r=(0,s.D)(i||(0,a.getStoreSettings)());r.storeLogo=(0,s.h)(r.storeLogo);let n="80mm"===r.paperWidth,o=n?"80mm":"58mm",l=n?"72mm":"52mm",d=e.orderId?`A-${e.orderId}`:e.id?`A-${e.id}`:"-";return`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
      <title>Struk_${d}</title>
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
      ${p(e,t,r,n)}
    </body>
    </html>
  `},"generateTestReceiptData",0,function(e){e||(0,a.getStoreSettings)();let t=new Date;return{id:999,orderId:"999",createdAt:t.toISOString(),date:t.toLocaleString("id-ID"),customerName:"Budi Santoso (Uji Coba)",tableName:"Meja Tes #01",orderType:"Dine-in",paymentMethod:"Tunai",operatorName:"Kasir SakuNota",notes:"Uji format pembungkusan teks panjang & kalkulasi",items:[{nama:"Nasi Goreng Spesial Babat Gongso Pedas Manis",qty:2,harga:28e3,kategori:"Makanan Utama",selectedModifiers:[{optionName:"Level 3 - Ekstra Pedas Cabai Rawit",harga:2e3},{optionName:"Tambah Telur Ceplok Setengah Matang",harga:4e3}]},{nama:"Es Kopi Susu Gula Aren Spesial Nusantara",qty:2,harga:18e3,kategori:"Minuman",selectedModifiers:[{optionName:"Less Sugar (50% Manis)",harga:0},{optionName:"Extra Espresso Shot",harga:5e3}]}],subtotal:106e3,discount:6e3,discountType:"fixed",serviceCharge:5e3,tax:10500,total:115500,cashTendered:12e4,change:4500,isDraft:!1}},"generateZReportHtml",0,function(e,t){e=(0,s.D)(e);let i=(0,s.D)(t||(0,a.getStoreSettings)()),r="80mm"===i.paperWidth,n=void 0!==e.cashDifference?e.cashDifference:0,l="SELISIH: Rp 0 (PAS)";return n>0&&(l=`SELISIH: +${o(n)} (LEBIH)`),n<0&&(l=`SELISIH: -${o(Math.abs(n))} (KURANG)`),`
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
      <div class="center bold" style="margin-top: 4px; padding: 2px; border: 1px solid #000;">${l}</div>

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
  `},"generateZReportReceipt",0,function(e,t){e=(0,s.o)(e);let i=(0,s.o)(t||(0,a.getStoreSettings)()),r="80mm"===i.paperWidth?48:32,n="-".repeat(r)+"\n",d="=".repeat(r)+"\n",p=e=>e?l(e,r).map(e=>{let t=Math.max(0,Math.floor((r-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",c=(e,t)=>{let a=r-e.length-t.length;return a<=0?`${e}
${t.padStart(r," ")}
`:`${e}${" ".repeat(a)}${t}
`},m="";m+=p(i.storeName||"SAKUNOTA"),m+=p("*** LAPORAN TUTUP SHIFT (Z-REPORT) ***"),m+=d,m+=c("Shift ID:",`#${e.id||"-"}`),m+=c("Kasir/Operator:",e.operatorName||"Kasir"),"owner"===e.closedBy&&(m+=c("Ditutup Oleh:",`${e.closedByOperator||"Pemilik"} (Pemilik)`),e.closureReason&&(m+=c("Alasan Tutup:",e.closureReason))),m+=c("Waktu Buka:",e.startTime?new Date(e.startTime).toLocaleString("id-ID"):"-"),m+=c("Waktu Tutup:",e.endTime?new Date(e.endTime).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")),m+=n,m+=p("--- REKONSILIASI KAS LACI ---"),m+=c("1. Modal Awal:",o(e.startingCash||0)),m+=c("2. Penjualan Tunai:",`+${o(e.cashSales||0)}`),e.cashIn&&e.cashIn>0&&(m+=c("3. Kas Masuk:",`+${o(e.cashIn)}`)),e.cashOut&&e.cashOut>0&&(m+=c("4. Kas Keluar:",`-${o(e.cashOut)}`)),e.cashRefunds&&e.cashRefunds>0&&(m+=c("5. Refund Tunai:",`-${o(e.cashRefunds)}`)),m+=n,m+=c("KAS FISIK SEHARUSNYA:",o(e.expectedCash||0)),m+=c("HASIL HITUNG FISIK:",o(void 0!==e.actualCash?e.actualCash:e.expectedCash));let u=void 0!==e.cashDifference?e.cashDifference:0,g="SELISIH: Rp 0 (PAS)";return u>0&&(g=`SELISIH: +${o(u)} (LEBIH)`),u<0&&(g=`SELISIH: -${o(Math.abs(u))} (KURANG)`),m+=p(g),m+=d,m+=p("--- NON-TUNAI (BANK / QRIS) ---"),m+=c("QRIS / Transfer:",o(e.nonCashSales||0)),m+=p("(Masuk langsung ke rekening merchant)"),m+=n,e.notes&&(m+=`Catatan: ${e.notes}
`,m+=n),m+=p("Tanda Tangan Kasir,"),m+="\n\n\n",m+=p(`( ${e.operatorName||"Kasir"} )`),i.enableWatermark&&(m+="\n"+p("[ SakuNota - Solusi Kasir UMKM ]")),m+="\n\n\n"}],71798)}])})();