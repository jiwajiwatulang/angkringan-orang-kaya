(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,22016,(e,t,n)=>{e.i(47167),Object.defineProperty(n,"__esModule",{value:!0});var a={default:function(){return h},useLinkStatus:function(){return x}};for(var o in a)Object.defineProperty(n,o,{enumerable:!0,get:a[o]});let i=e.r(90809),r=e.r(43476),s=i._(e.r(71645)),l=e.r(95057),c=e.r(8372),d=e.r(18581),p=e.r(18967),f=e.r(5550),u=e.r(88540),m=e.r(91949),g=e.r(73668),b=e.r(9396);function h(t){var n;let a,o,i,[h,x]=(0,s.useOptimistic)(m.IDLE_LINK_STATUS),y=(0,s.useRef)(null),{href:w,as:k,children:P,prefetch:A=null,passHref:N,replace:T,shallow:$,scroll:S,onClick:E,onMouseEnter:C,onTouchStart:j,legacyBehavior:R=!1,onNavigate:L,transitionTypes:I,ref:_,unstable_dynamicOnHover:M,...z}=t;a=P,R&&("string"==typeof a||"number"==typeof a)&&(a=(0,r.jsx)("a",{children:a}));let O=s.default.useContext(c.AppRouterContext),U=!1!==A,B=!1===A?"none":!0===A?"full":"auto",D="none"!==B?"auto"===B?b.FetchStrategy.PPR:b.FetchStrategy.Full:b.FetchStrategy.PPR,F="string"==typeof(n=k||w)?n:(0,l.formatUrl)(n);if(R){if(a?.$$typeof===Symbol.for("react.lazy"))throw Error("`<Link legacyBehavior>` received a direct child that is either a Server Component, or JSX that was loaded with React.lazy(). This is not supported. Either remove legacyBehavior, or make the direct child a Client Component that renders the Link's `<a>` tag.");o=s.default.Children.only(a)}let K=R?o&&"object"==typeof o&&o.ref:_,W,G=s.default.useCallback(e=>(null!==O&&(y.current=(0,m.mountLinkInstance)(e,F,O,D,U,x,W)),()=>{y.current&&((0,m.unmountLinkForCurrentNavigation)(y.current),y.current=null),(0,m.unmountPrefetchableInstance)(e)}),[U,F,O,D,x,W]),H={ref:(0,d.useMergedRef)(G,K),onClick(t){R||"function"!=typeof E||E(t),R&&o.props&&"function"==typeof o.props.onClick&&o.props.onClick(t),!O||t.defaultPrevented||function(t,n,a,o,i,r,s,l="none"){if("u">typeof window){let c,{nodeName:d}=t.currentTarget;if("A"===d.toUpperCase()&&((c=t.currentTarget.getAttribute("target"))&&"_self"!==c||t.metaKey||t.ctrlKey||t.shiftKey||t.altKey||t.nativeEvent&&2===t.nativeEvent.which)||t.currentTarget.hasAttribute("download"))return;if(!(0,g.isLocalURL)(n)){o&&(t.preventDefault(),location.replace(n));return}if(t.preventDefault(),r){let e=!1;if(r({preventDefault:()=>{e=!0}}),e)return}let{navigate:p}=e.r(32916);p(n,o?"replace":"push",!1===i?u.ScrollBehavior.NoScroll:u.ScrollBehavior.Default,a.current,s,l)}}(t,F,y,T,S,L,I,B)},onMouseEnter(e){R||"function"!=typeof C||C(e),R&&o.props&&"function"==typeof o.props.onMouseEnter&&o.props.onMouseEnter(e),O&&U&&(0,m.onNavigationIntent)(e.currentTarget,!0===M)},onTouchStart:function(e){R||"function"!=typeof j||j(e),R&&o.props&&"function"==typeof o.props.onTouchStart&&o.props.onTouchStart(e),O&&U&&(0,m.onNavigationIntent)(e.currentTarget,!0===M)}};return(0,p.isAbsoluteUrl)(F)?H.href=F:R&&!N&&("a"!==o.type||"href"in o.props)||(H.href=(0,f.addBasePath)(F)),i=R?s.default.cloneElement(o,H):(0,r.jsx)("a",{...z,...H,children:a}),(0,r.jsx)(v.Provider,{value:h,children:i})}let v=(0,s.createContext)(m.IDLE_LINK_STATUS),x=()=>(0,s.useContext)(v);("function"==typeof n.default||"object"==typeof n.default&&null!==n.default)&&void 0===n.default.__esModule&&(Object.defineProperty(n.default,"__esModule",{value:!0}),Object.assign(n.default,n),t.exports=n.default)},18581,(e,t,n)=>{Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"useMergedRef",{enumerable:!0,get:function(){return o}});let a=e.r(71645);function o(e,t){let n=(0,a.useRef)(null),o=(0,a.useRef)(null);return(0,a.useCallback)(a=>{if(null===a){let e=n.current;e&&(n.current=null,e());let t=o.current;t&&(o.current=null,t())}else e&&(n.current=i(e,a)),t&&(o.current=i(t,a))},[e,t])}function i(e,t){if("function"!=typeof e)return e.current=t,()=>{e.current=null};{let n=e(t);return"function"==typeof n?n:()=>e(null)}}("function"==typeof n.default||"object"==typeof n.default&&null!==n.default)&&void 0===n.default.__esModule&&(Object.defineProperty(n.default,"__esModule",{value:!0}),Object.assign(n.default,n),t.exports=n.default)},95057,(e,t,n)=>{e.i(47167),Object.defineProperty(n,"__esModule",{value:!0});var a={formatUrl:function(){return s},formatWithValidation:function(){return c},urlObjectKeys:function(){return l}};for(var o in a)Object.defineProperty(n,o,{enumerable:!0,get:a[o]});let i=e.r(90809)._(e.r(98183)),r=/https?|ftp|gopher|file/;function s(e){let{auth:t,hostname:n}=e,a=e.protocol||"",o=e.pathname||"",s=e.hash||"",l=e.query||"",c=!1;t=t?encodeURIComponent(t).replace(/%3A/i,":")+"@":"",e.host?c=t+e.host:n&&(c=t+(~n.indexOf(":")?`[${n}]`:n),e.port&&(c+=":"+e.port)),l&&"object"==typeof l&&(l=String(i.urlQueryToSearchParams(l)));let d=e.search||l&&`?${l}`||"";return a&&!a.endsWith(":")&&(a+=":"),e.slashes||(!a||r.test(a))&&!1!==c?(c="//"+(c||""),o&&"/"!==o[0]&&(o="/"+o)):c||(c=""),s&&"#"!==s[0]&&(s="#"+s),d&&"?"!==d[0]&&(d="?"+d),o=o.replace(/[?#]/g,encodeURIComponent),d=d.replace("#","%23"),`${a}${c}${o}${d}${s}`}let l=["auth","hash","host","hostname","href","path","pathname","port","protocol","query","search","slashes"];function c(e){return s(e)}},73668,(e,t,n)=>{Object.defineProperty(n,"__esModule",{value:!0}),Object.defineProperty(n,"isLocalURL",{enumerable:!0,get:function(){return i}});let a=e.r(18967),o=e.r(52817);function i(e){if(!(0,a.isAbsoluteUrl)(e))return!0;try{let t=(0,a.getLocationOrigin)(),n=new URL(e,t);return n.origin===t&&(0,o.hasBasePath)(n.pathname)}catch(e){return!1}}},18967,(e,t,n)=>{e.i(47167),Object.defineProperty(n,"__esModule",{value:!0});var a={DecodeError:function(){return h},MiddlewareNotFoundError:function(){return w},MissingStaticPage:function(){return y},NormalizeError:function(){return v},PageNotFoundError:function(){return x},SP:function(){return g},ST:function(){return b},WEB_VITALS:function(){return i},execOnce:function(){return r},getDisplayName:function(){return p},getLocationOrigin:function(){return c},getURL:function(){return d},isAbsoluteUrl:function(){return l},isResSent:function(){return f},loadGetInitialProps:function(){return m},normalizeRepeatedSlashes:function(){return u},stringifyError:function(){return k}};for(var o in a)Object.defineProperty(n,o,{enumerable:!0,get:a[o]});let i=["CLS","FCP","INP","LCP","TTFB"];function r(e){let t,n=!1;return(...a)=>(n||(n=!0,t=e(...a)),t)}let s=/^[a-zA-Z][a-zA-Z\d+\-.]*?:/,l=e=>{let t=e.charCodeAt(0);return!!(t>=65&&t<=90||t>=97&&t<=122)&&s.test(e)};function c(){let{protocol:e,hostname:t,port:n}=window.location;return`${e}//${t}${n?":"+n:""}`}function d(){let{href:e}=window.location,t=c();return e.substring(t.length)}function p(e){return"string"==typeof e?e:e.displayName||e.name||"Unknown"}function f(e){return e.finished||e.headersSent}function u(e){let t=e.split("?");return t[0].replace(/\\/g,"/").replace(/\/\/+/g,"/")+(t[1]?`?${t.slice(1).join("?")}`:"")}async function m(e,t){let n=t.res||t.ctx&&t.ctx.res;if(!e.getInitialProps)return t.ctx&&t.Component?{pageProps:await m(t.Component,t.ctx)}:{};let a=await e.getInitialProps(t);if(n&&f(n))return a;if(!a)throw Error(`"${p(e)}.getInitialProps()" should resolve to an object. But found "${a}" instead.`);return a}let g="u">typeof performance,b=g&&["mark","measure","getEntriesByName"].every(e=>"function"==typeof performance[e]);class h extends Error{}class v extends Error{}class x extends Error{constructor(e){super(),this.code="ENOENT",this.name="PageNotFoundError",this.message=`Cannot find module for page: ${e}`}}class y extends Error{constructor(e,t){super(),this.message=`Failed to load static file for page: ${e} ${t}`}}class w extends Error{constructor(){super(),this.code="ENOENT",this.message="Cannot find the middleware module"}}function k(e){return JSON.stringify({message:e.message,stack:e.stack})}},15501,e=>{var t=e.i(43476);let n={cashier:"icon-kasir-pos",devices:"icon-kasir-pos",tables:"icon-kelola-meja",table:"icon-meja",receipt:"icon-transaksi",shift:"icon-shift-kas",catalog:"icon-katalog-stok",stock:"icon-katalog-stok",settings:"icon-pengaturan",chart:"icon-dashboard",store:"icon-toko",home:"icon-home",printer:"icon-printer",bluetooth:"icon-bluetooth",lock:"icon-gembok-lock",pin:"icon-kunci-pin",security:"icon-keamanan",tax:"icon-pajak-diskon",backup:"btn-simpan-backup",info:"status-tips",import:"btn-import",export:"btn-export",camera:"btn-kamera",search:"btn-cari",add:"btn-tambah",edit:"btn-edit",delete:"btn-hapus",copy:"btn-salin",attachment:"btn-lampiran",guide:"icon-panduan",cash:"icon-tunai-cash",card:"icon-kartu-debit",qris:"icon-ewallet-qris",split:"icon-split-bill",success:"status-sukses",error:"status-gagal",warning:"status-peringatan",waiting:"status-menunggu",available:"status-tersedia",soldout:"status-habis",license:"icon-lisensi-resmi",tester:"icon-lisensi-tester",demo:"icon-sandbox-demo",logout:"icon-logout",sync:"icon-sync-reset",lightning:"icon-kilat",food:"cat-makanan-utama",drink:"cat-minuman",skewers:"cat-sate-sundukan",snack:"cat-snack-gorengan",bread:"cat-roti-bakar",takeaway:"cat-takeaway",bundle:"cat-paket-hemat"};e.s(["f",0,function({name:e,className:a="w-5 h-5"}){let o=n[e]||n.info;return(0,t.jsx)("svg",{"aria-hidden":"true",focusable:"false",className:`sakunota-icon ${a}`,viewBox:"0 0 24 24",children:(0,t.jsx)("use",{href:`/icons/sakunota-icons.svg#${o}`})})}])},47133,e=>{var t=e.i(47167);let n=t.default.env.NEXT_PUBLIC_SUPPORT_WHATSAPP||"6285158748884",a=t.default.env.NEXT_PUBLIC_PAYMENT_ACCOUNT_NAME||"REZA RESTU RENGGA HARDIANTO";t.default.env.NEXT_PUBLIC_SITE_URL,e.s(["A",0,a,"S",0,"2582118451","K",0,"Bank BCA","H",0,n])},9276,e=>{var t=e.i(47133),n=e.i(46766);function a(e){if(!e)return new Date().toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"});let t=Date.parse(e);return Number.isNaN(t)?e:new Date(t).toLocaleDateString("id-ID",{day:"2-digit",month:"long",year:"numeric"})}function o(e){let t="number"!=typeof e||Number.isNaN(e)?5e4:e;return`Rp ${Math.round(t).toLocaleString("id-ID")}`}e.s(["f",0,function(e){let i,r,s,l,c,d,p,f,u,m,g,b,h,v,x,y,w,k,P,A,N,T;if("u"<typeof document)return;let $=(i="lunas_lisensi_terbit"===e.status,r="batal"===e.status,s=(0,n.w)(e.orderId||"-"),l=`INV-${s}`,c=(0,n.w)(a(e.createdAt)),d=e.verifiedAt?(0,n.w)(a(e.verifiedAt)):"",p=(0,n.w)(e.businessName||"-"),f=(0,n.w)(e.buyerName||"-"),u=(0,n.w)(e.whatsapp||"-"),m=e.email?(0,n.w)(e.email):"",g=e.npwp?(0,n.w)(e.npwp):"",b=(0,n.w)(e.accessCode||"-"),h=(0,n.w)(e.paymentMethod||(i?"Midtrans / Transfer Terverifikasi":"Transfer Bank BCA / QRIS")),v=e.licenseKey?(0,n.w)(e.licenseKey):"",x=e.promoCode?(0,n.w)(e.promoCode):"",y=e.paymentLink?(0,n.w)(e.paymentLink):"",w=e.originalAmount||5e4,k=e.discountAmount||0,A=Math.round((P=e.amount??Math.max(0,w-k))/1.11),N=P-A,T=Math.round(w/1.11),`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Faktur Resmi SakuNota - ${l}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 100%;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
    }
    .invoice-page {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 28px 30px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 18px;
      border-bottom: 2px solid #0f172a;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .brand-sub {
      font-size: 12px;
      font-weight: 700;
      color: #2563eb;
      margin-top: 2px;
    }
    .company-meta {
      font-size: 11px;
      color: #475569;
      margin-top: 6px;
      line-height: 1.45;
    }
    .invoice-meta {
      text-align: right;
    }
    .doc-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #475569;
    }
    .inv-number {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 3px;
    }
    .inv-date {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: ${i?"#047857":r?"#be123c":"#b45309"};
      background-color: ${i?"#ecfdf5":r?"#fff1f2":"#fffbeb"};
      border: 1px solid ${i?"#6ee7b7":r?"#fda4af":"#fcd34d"};
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 18px;
    }
    .info-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .info-box-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 2.5px 0;
      font-size: 11.5px;
    }
    .info-label {
      color: #64748b;
      flex-shrink: 0;
    }
    .info-val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }
    .info-val.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 700;
    }
    .items-section {
      margin-top: 18px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      overflow: hidden;
    }
    table.invoice-table {
      width: 100%;
      border-collapse: collapse;
    }
    table.invoice-table thead th {
      background-color: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 14px;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    table.invoice-table tbody td {
      padding: 14px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 12px;
    }
    .item-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 12.5px;
    }
    .item-desc {
      font-size: 11px;
      color: #475569;
      margin-top: 3px;
    }
    .col-center {
      text-align: center !important;
      white-space: nowrap;
    }
    .col-right {
      text-align: right !important;
      white-space: nowrap;
    }
    .summary-row td {
      padding: 8px 14px;
      font-size: 11.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .promo-row td {
      background-color: #ecfdf5;
      color: #047857;
      font-weight: 700;
    }
    .total-row td {
      background-color: #f8fafc;
      padding: 12px 14px;
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      border-bottom: none;
    }
    .total-amount {
      color: #1d4ed8;
      font-size: 15px;
    }
    .payment-box {
      margin-top: 18px;
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .payment-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #fde68a;
    }
    .payment-box-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #92400e;
      letter-spacing: 0.04em;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      font-size: 11.5px;
    }
    .license-box {
      margin-top: 18px;
      background-color: #eff6ff;
      border: 1px solid #93c5fd;
      border-radius: 10px;
      padding: 14px 16px;
      text-align: center;
    }
    .license-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1e40af;
    }
    .license-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 16px;
      font-weight: 800;
      color: #1d4ed8;
      letter-spacing: 0.08em;
      margin-top: 4px;
      padding: 6px 12px;
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      display: inline-block;
    }
    .footer-row {
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      font-size: 10.5px;
      color: #64748b;
    }
    .stamp-box {
      text-align: right;
      flex-shrink: 0;
    }
    .stamp-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="invoice-page">
    <div class="header-row">
      <div>
        <div class="brand-title">SakuNota</div>
        <div class="brand-sub">Kasir Jalan Tanpa Internet</div>
        <div class="company-meta">
          <strong>PT Pemuda Gaya Bebas</strong><br />
          NPWP: 125383232617000<br />
          sakunota.my.id
        </div>
      </div>
      <div class="invoice-meta">
        <div class="doc-label">Faktur / Invoice Resmi</div>
        <div class="inv-number">${l}</div>
        <div class="inv-date">Tanggal Terbit: ${c}</div>
        ${d?`<div class="inv-date">Tanggal Lunas: ${d}</div>`:""}
        <div class="status-badge">${i?"LUNAS / PAID":r?"DIBATALKAN / CANCELLED":"MENUNGGU PEMBAYARAN / UNPAID"}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">Diterbitkan Untuk (Pelanggan)</div>
        <div class="info-row">
          <span class="info-label">Nama Usaha:</span>
          <span class="info-val">${p}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nama Pemilik:</span>
          <span class="info-val">${f}</span>
        </div>
        <div class="info-row">
          <span class="info-label">No. WhatsApp:</span>
          <span class="info-val mono">${u}</span>
        </div>
        ${m?`<div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-val">${m}</span>
        </div>`:""}
        ${g?`<div class="info-row">
          <span class="info-label">NPWP Pelanggan:</span>
          <span class="info-val mono">${g}</span>
        </div>`:""}
      </div>

      <div class="info-box">
        <div class="info-box-title">Rincian Pesanan &amp; Akses</div>
        <div class="info-row">
          <span class="info-label">Nomor Pesanan:</span>
          <span class="info-val mono">${s}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Kode Akses Rahasia:</span>
          <span class="info-val mono" style="color: #1d4ed8;">${b}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Metode Pembayaran:</span>
          <span class="info-val">${h}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tipe Lisensi:</span>
          <span class="info-val">Sekali Bayar (Aktif Permanen)</span>
        </div>
      </div>
    </div>

    <div class="items-section">
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width: 42px;" class="col-center">No</th>
            <th>Deskripsi Produk &amp; Layanan</th>
            <th style="width: 55px;" class="col-center">Qty</th>
            <th style="width: 130px;" class="col-right">Harga Satuan</th>
            <th style="width: 130px;" class="col-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="col-center" style="font-weight: 700; color: #475569;">1</td>
            <td>
              <div class="item-title">Lisensi SakuNota</div>
              <div class="item-desc">
                Akses satu toko (maksimal 2 perangkat), tanpa biaya langganan bulanan
              </div>
            </td>
            <td class="col-center" style="font-weight: 700;">1</td>
            <td class="col-right">${o(T)}</td>
            <td class="col-right" style="font-weight: 700;">${o(T)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="4" class="col-right">Dasar Pengenaan Pajak (DPP):</td>
            <td class="col-right">${o(A)}</td>
          </tr>
          ${x?`<tr class="summary-row promo-row">
            <td colspan="4" class="col-right">Potongan Diskon Promo (${x}):</td>
            <td class="col-right">-${o(k)}</td>
          </tr>`:""}
          <tr class="summary-row">
            <td colspan="4" class="col-right">PPN 11% (Termasuk / Included):</td>
            <td class="col-right">${o(N)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" class="col-right">TOTAL TAGIHAN (Termasuk PPN 11%):</td>
            <td class="col-right total-amount">${o(P)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${!i&&!r?`<div class="payment-box">
      <div class="payment-box-header">
        <span class="payment-box-title">Instruksi Pembayaran Transfer Bank</span>
        <span style="font-size: 10px; font-weight: 800; color: #92400e;">CANTUMKAN NOMOR PESANAN PADA BERITA TRANSFER</span>
      </div>
      <div class="payment-grid">
        <div class="info-row">
          <span class="info-label">Bank Tujuan:</span>
          <span class="info-val">${(0,n.w)(t.K)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nominal Transfer:</span>
          <span class="info-val" style="color: #047857; font-weight: 800;">${o(P)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nomor Rekening:</span>
          <span class="info-val mono" style="font-size: 13px;">${(0,n.w)(t.S)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Berita Transfer:</span>
          <span class="info-val mono">${s}</span>
        </div>
        <div class="info-row" style="grid-column: span 2;">
          <span class="info-label">Atas Nama Rekening:</span>
          <span class="info-val">${(0,n.w)(t.A)}</span>
        </div>
        ${y?`<div class="info-row" style="grid-column: span 2; padding-top: 4px; border-top: 1px dashed #fde68a;">
          <span class="info-label">Link Pembayaran QRIS / Digital:</span>
          <span class="info-val mono" style="font-size: 10.5px; color: #1d4ed8;">${y}</span>
        </div>`:""}
      </div>
    </div>`:""}

    ${v?`<div class="license-box">
      <div class="license-label">Kode Lisensi Resmi SakuNota</div>
      <div class="license-code">${v}</div>
      <div style="font-size: 10.5px; color: #334155; margin-top: 6px;">
        Masukkan kode lisensi di atas pada menu <strong>Aktivasi Lisensi</strong> di aplikasi SakuNota perangkat kasir Anda.
      </div>
    </div>`:""}

    <div class="footer-row">
      <div style="max-width: 480px;">
        <strong>Catatan Resmi:</strong><br />
        Faktur / Invoice ini diterbitkan secara elektronik oleh sistem SakuNota dan merupakan bukti pembayaran yang sah termasuk PPN 11% tanpa memerlukan tanda tangan basah.
      </div>
      <div class="stamp-box">
        <div class="stamp-title">PT Pemuda Gaya Bebas</div>
        <div>NPWP: 125383232617000</div>
        <div>sakunota.my.id</div>
      </div>
    </div>
  </div>
</body>
</html>`);try{let e=document.getElementById("sakunota-invoice-print-iframe");e||((e=document.createElement("iframe")).id="sakunota-invoice-print-iframe",e.setAttribute("sandbox","allow-same-origin allow-modals"),e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.visibility="hidden",document.body.appendChild(e));let t=e.contentDocument||e.contentWindow?.document;t&&e.contentWindow&&(t.open(),t.write($),t.close(),setTimeout(()=>{try{e?.contentWindow?.focus(),e?.contentWindow?.print()}catch(e){console.error("Gagal mencetak invoice via iframe:",e)}},250))}catch(e){console.error("Gagal menyiapkan dokumen invoice:",e)}}])},46766,e=>{function t(e){return e.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}e.s(["w",0,t,"D",0,function e(n){return"string"==typeof n?t(n):Array.isArray(n)?n.map(e):n&&"object"==typeof n?Object.fromEntries(Object.entries(n).map(([t,n])=>[t,e(n)])):n},"h",0,function(e){return e&&e.length<=28e5&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(e)?e:""},"o",0,function e(t){return"string"==typeof t?t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,""):Array.isArray(t)?t.map(e):t&&"object"==typeof t?Object.fromEntries(Object.entries(t).map(([t,n])=>[t,e(n)])):t}])}])})();