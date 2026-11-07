(()=>{"use strict";(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,85888,e=>{var t=e.i(43476),a=e.i(24195),n=e.i(77236),r=e.i(15501),s=e.i(71645),i=e.i(18566),o=e.i(41087),l=e.i(42250),d=e.i(82568),c=e.i(60114),p=e.i(71798),m=e.i(43668);e.s(["default",0,function(){let e=(0,i.useRouter)(),{storeSettings:x,refreshSettings:u,showToast:h}=(0,o.D)(),[b,g]=(0,s.useState)(!1),[f,k]=(0,s.useState)([]),[v,y]=(0,s.useState)(""),[j,N]=(0,s.useState)(""),[w,S]=(0,s.useState)("disconnected"),[$,T]=(0,s.useState)(""),[A,C]=(0,s.useState)(!1),[P,I]=(0,s.useState)(!1),[D,M]=(0,s.useState)(x.paperWidth||"58mm"),[K,L]=(0,s.useState)(!1),[B,E]=(0,s.useState)(x.receiptHeader||""),[U,R]=(0,s.useState)(x.receiptFooter||"Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali"),[z,H]=(0,s.useState)(x.receiptCustomNote||""),[O,W]=(0,s.useState)(!1!==x.receiptShowLogo),[_,F]=(0,s.useState)(!1!==x.receiptShowCashier),[G,q]=(0,s.useState)(!1!==x.receiptShowCustomer),[Y,Z]=(0,s.useState)(!1!==x.receiptShowTable),[J,Q]=(0,s.useState)(!1!==x.receiptShowNotes),[V,X]=(0,s.useState)(!1);(0,s.useEffect)(()=>{g(d.d.isNativePlatform());let e=localStorage.getItem("bt_printer_mac"),t=localStorage.getItem("bt_printer_name");e&&(y(e),t&&N(t),S("connected"),T(`Tersimpan: ${t?`${t} (${e})`:e}`)),x.paperWidth&&M(x.paperWidth),E(x.receiptHeader||""),R(x.receiptFooter||"Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali"),H(x.receiptCustomNote||""),W(!1!==x.receiptShowLogo),F(!1!==x.receiptShowCashier),q(!1!==x.receiptShowCustomer),Z(!1!==x.receiptShowTable),Q(!1!==x.receiptShowNotes)},[x]);let ee=async()=>{X(!0);try{await (0,m.saveStoreSettingsAsync)({...x,paperWidth:D,receiptHeader:B,receiptFooter:U,receiptCustomNote:z,receiptShowLogo:O,receiptShowCashier:_,receiptShowCustomer:G,receiptShowTable:Y,receiptShowNotes:J}),await u(),h("Format kustom struk berhasil disimpan!","success")}catch(e){h("Gagal menyimpan format struk: "+(e?.message||"Terjadi kesalahan"),"error")}finally{X(!1)}};(0,c.t)(()=>{K?L(!1):e.push((0,n.c)("/admin/pengaturan",(0,a.g)()))});let et=async()=>{if(!d.d.isNativePlatform())return void h("Pemindaian Bluetooth Serial langsung memerlukan aplikasi Android (APK). Di browser, gunakan Cetak Dokumen / Sistem.","info");C(!0),T("Memeriksa status Bluetooth perangkat...");try{if(!(await l.f.isEnabled()).enabled)try{await l.f.enable()}catch(e){alert("Bluetooth belum aktif. Silakan aktifkan Bluetooth melalui Pengaturan HP Android Anda."),C(!1);return}T("Memindai perangkat Bluetooth yang terpasang (paired)...");let e=(await l.f.getPairedDevices()).devices||[];0===e.length&&(T("Mencari perangkat baru di sekitar..."),e=((await l.f.scan()).devices||[]).map(e=>({name:e.name,address:e.address}))),k(e),h(`Ditemukan ${e.length} perangkat Bluetooth`,"info"),T(`Ditemukan ${e.length} perangkat. Pilih printer kasir Anda dari daftar di bawah.`)}catch(e){alert("Printer belum tersambung. Pastikan Bluetooth di HP menyala dan izin Bluetooth telah diizinkan, lalu coba lagi."),T("Printer belum tersambung. Periksa Bluetooth dan coba lagi.")}finally{C(!1)}},ea=(e,t)=>{if(!e)return;y(e);let a=t||"Printer Thermal";N(a),localStorage.setItem("bt_printer_mac",e),localStorage.setItem("bt_printer_name",a),S("connected"),T(`Printer terhubung: ${a}`),h(`Printer "${a}" berhasil dipilih & disimpan!`,"success")},en={...x,paperWidth:D,receiptHeader:B,receiptFooter:U,receiptCustomNote:z,receiptShowLogo:O,receiptShowCashier:_,receiptShowCustomer:G,receiptShowTable:Y,receiptShowNotes:J},er=async()=>{I(!0),T("Menyiapkan dokumen uji cetak...");let e=(0,p.generateTestReceiptData)(en),t=(0,p.generateEscPosReceipt)(e,"all",en),a=(0,p.generateReceiptHtml)(e,"all",en);try{(await (0,p.executePrintDocument)({title:"Tes_Print_SakuNota_Thermal",escposText:t,htmlContent:a,settings:en})).success&&(h("Struk uji cetak berhasil dikirim ke printer!","success"),T("Struk uji cetak berhasil dikirim ke printer."))}catch(e){alert("Printer belum tersambung. Periksa Bluetooth dan coba lagi.\n\nTips:\n1. Pastikan printer thermal menyala dan kertas terpasang.\n2. Pastikan printer sudah terhubung (paired) di Bluetooth HP Anda."),T("Printer belum tersambung. Periksa Bluetooth dan coba lagi.")}finally{I(!1)}},es=async()=>{I(!0),T("Menyiapkan stiker cup uji coba...");let e=(0,p.generateTestReceiptData)(en),t=(0,p.generateCupLabelsEscPos)(e,en),a=(0,p.generateCupLabelsHtml)(e,en);try{(await (0,p.executePrintDocument)({title:"Uji_Stiker_Cup_Thermal",escposText:t,htmlContent:a,settings:en})).success&&(h("Stiker cup berhasil dikirim ke printer!","success"),T("Stiker cup berhasil dikirim ke printer."))}catch(e){alert("Printer belum tersambung. Periksa koneksi Bluetooth dan coba lagi."),T("Printer belum tersambung. Periksa Bluetooth dan coba lagi.")}finally{I(!1)}},ei=(0,p.generateTestReceiptData)(en);return(0,t.jsxs)("div",{className:"space-y-6 animate-in fade-in duration-200 max-w-4xl",children:[(0,t.jsxs)("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line",children:[(0,t.jsxs)("div",{children:[(0,t.jsx)("h2",{className:"text-2xl font-black text-fg tracking-tight flex items-center gap-2",children:(0,t.jsx)("span",{children:"Printer Kasir & Dapur (Bluetooth)"})}),(0,t.jsx)("p",{className:"text-xs text-muted mt-0.5",children:"Atur sambungan printer struk ukuran 58mm atau 80mm untuk cetak nota kasir, pesanan dapur, dan laporan shift."})]}),(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsxs)("button",{type:"button",onClick:()=>L(!0),className:"px-3.5 py-2.5 bg-card hover:bg-line text-fg font-bold text-xs rounded-xl border border-line transition-all flex items-center gap-1.5",children:[(0,t.jsx)("span",{children:(0,t.jsx)("svg",{"aria-hidden":"true",width:"18",height:"18",viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"1.8",strokeLinecap:"round",strokeLinejoin:"round",children:(0,t.jsx)("path",{d:"M2 12c5-10 15-10 20 0-5 10-15 10-20 0M15 12a3 3 0 1 0-6 0 3 3 0 0 0 6 0"})})}),(0,t.jsx)("span",{children:"Pratinjau Struk"})]}),(0,t.jsxs)("button",{type:"button",onClick:er,disabled:P,className:"px-4 py-2.5 bg-accent hover:bg-accent-hover text-white font-black text-xs rounded-xl shadow-lg shadow-accent/20 active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"printer"})}),(0,t.jsx)("span",{children:P?"Mencetak Dokumen...":"Tes Cetak Struk"})]}),(0,t.jsxs)("button",{type:"button",onClick:es,disabled:P,className:"px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-1.5 disabled:opacity-50",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"food"})}),(0,t.jsx)("span",{children:"Uji Stiker Cup"})]})]})]}),(0,t.jsxs)("div",{className:"p-5 rounded-3xl bg-surface border border-line shadow-sm space-y-4",children:[(0,t.jsxs)("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between gap-4",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"flex items-center gap-2 mb-1",children:[(0,t.jsx)("span",{className:"text-[10px] font-bold text-muted uppercase tracking-wider",children:"Status Printer Kasir"}),(0,t.jsx)("span",{className:`text-[10px] font-bold px-2.5 py-1 rounded-full ${b?"bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800":"bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold"}`,children:b?"Android APK Native":"PWA / Web Browser"})]}),(0,t.jsxs)("div",{className:"flex items-center gap-2.5",children:[(0,t.jsx)("span",{className:`w-3.5 h-3.5 rounded-full shrink-0 ${b?v?"bg-emerald-500 shadow-md shadow-emerald-500/30 animate-pulse":"bg-amber-500":"bg-emerald-500 shadow-md shadow-emerald-500/30 animate-pulse"}`}),(0,t.jsx)("h3",{className:"text-base font-black text-fg",children:b?v?`${j?`${j} `:""}(${v})`:"Belum Ada Printer Bluetooth Dipilih":"Sistem Cetak Siap (Web / PWA)"})]}),(0,t.jsx)("p",{className:"text-xs text-muted mt-1",children:b?$||"Pindai dan pilih printer Bluetooth Anda di bawah.":$||"Printer Bluetooth, USB, atau WiFi yang terpasang di perangkat Anda dapat langsung digunakan melalui dialog cetak sistem."})]}),(0,t.jsxs)("div",{className:"flex items-center gap-2 shrink-0",children:[b&&v&&(0,t.jsx)("button",{type:"button",onClick:()=>{y(""),N(""),localStorage.removeItem("bt_printer_mac"),localStorage.removeItem("bt_printer_name"),S("disconnected"),T("Printer telah dilepas."),h("Printer berhasil dilepas","info")},className:"px-3 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-800/50 rounded-xl text-xs font-bold transition-all",children:"Putuskan Printer"}),b?(0,t.jsxs)("button",{type:"button",onClick:et,disabled:A,className:"px-4 py-2.5 bg-card hover:bg-line text-fg rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shrink-0 disabled:opacity-50 border border-line",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"search"})}),(0,t.jsx)("span",{children:A?"Memindai...":"Pindai Bluetooth"})]}):(0,t.jsxs)("button",{type:"button",onClick:er,disabled:P,className:"px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm disabled:opacity-50 active:scale-95",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"printer"})}),(0,t.jsx)("span",{children:P?"Mencetak...":"Tes Cetak Struk"})]})]})]}),(0,t.jsxs)("div",{className:"pt-3 border-t border-line flex flex-wrap items-center justify-between gap-3 text-xs",children:[(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)("span",{className:"text-muted font-bold",children:"Ukuran Kertas Default:"}),(0,t.jsxs)("div",{className:"flex items-center bg-card p-1 rounded-xl border border-line",children:[(0,t.jsx)("button",{type:"button",onClick:()=>M("58mm"),className:`px-3 py-1 rounded-lg text-xs font-bold transition-all ${"58mm"===D?"bg-accent text-white shadow-sm":"text-muted hover:text-fg"}`,children:"58mm (Kecil / 32 Kolom)"}),(0,t.jsx)("button",{type:"button",onClick:()=>M("80mm"),className:`px-3 py-1 rounded-lg text-xs font-bold transition-all ${"80mm"===D?"bg-accent text-white shadow-sm":"text-muted hover:text-fg"}`,children:"80mm (Besar / 48 Kolom)"})]})]}),(0,t.jsx)("span",{className:"text-muted text-[11px]",children:"Dokumen cetak terisolasi: tidak akan mencetak dashboard atau menu aplikasi."})]})]}),(0,t.jsxs)("div",{className:"p-5 sm:p-6 rounded-3xl bg-surface border border-line shadow-sm space-y-5",children:[(0,t.jsxs)("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line",children:[(0,t.jsxs)("div",{children:[(0,t.jsxs)("h4",{className:"text-base font-black text-fg flex items-center gap-2",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"receipt"})}),(0,t.jsx)("span",{children:"Kustomisasi Format Struk Kasir"})]}),(0,t.jsx)("p",{className:"text-xs text-muted mt-0.5",children:"Sesuaikan teks header slogan, ucapan penutup, catatan kustom (WiFi/medsos), serta elemen nota cetak."})]}),(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsxs)("button",{type:"button",onClick:()=>L(!0),className:"px-3.5 py-2 bg-card hover:bg-line text-fg font-bold text-xs rounded-xl border border-line transition-all flex items-center gap-1.5",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"eye"})}),(0,t.jsx)("span",{children:"Pratinjau Hasil"})]}),(0,t.jsxs)("button",{type:"button",onClick:ee,disabled:V,className:"px-4 py-2 bg-accent hover:bg-accent-hover text-white font-black text-xs rounded-xl shadow-md shadow-accent/20 transition-all flex items-center gap-1.5 disabled:opacity-50",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"check"})}),(0,t.jsx)("span",{children:V?"Menyimpan...":"Simpan Format Struk"})]})]})]}),(0,t.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-2 gap-4",children:[(0,t.jsxs)("div",{className:"space-y-1.5",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsx)("label",{className:"block text-xs font-bold text-fg",children:"Slogan / Tagline Header Struk"}),(0,t.jsxs)("span",{className:"text-[10px] text-muted font-mono",children:[B.length,"/50 karakter"]})]}),(0,t.jsx)("input",{type:"text",maxLength:50,value:B,onChange:e=>E(e.target.value),placeholder:"Contoh: Nikmatnya Kopi Tradisional & Angkringan",className:"w-full bg-card border border-line rounded-xl px-3.5 py-2.5 text-xs text-fg font-semibold placeholder:text-muted/60 outline-none focus:border-accent"})]}),(0,t.jsxs)("div",{className:"space-y-1.5",children:[(0,t.jsx)("label",{className:"block text-xs font-bold text-fg",children:"Ucapan Terima Kasih (Kaki Struk)"}),(0,t.jsx)("textarea",{rows:2,value:U,onChange:e=>R(e.target.value),placeholder:"Contoh: Terima Kasih atas Kunjungan Anda\nSilakan Datang Kembali",className:"w-full bg-card border border-line rounded-xl px-3.5 py-2 text-xs text-fg font-semibold placeholder:text-muted/60 outline-none focus:border-accent resize-none"})]}),(0,t.jsxs)("div",{className:"space-y-1.5 md:col-span-2",children:[(0,t.jsx)("label",{className:"block text-xs font-bold text-fg",children:"Catatan Kustom Tambahan (WiFi, Akun Medsos, Info Promo)"}),(0,t.jsx)("textarea",{rows:2,value:z,onChange:e=>H(e.target.value),placeholder:"Contoh: WiFi: SakuNota-Hotspot (Pass: ngopienak123)\nFollow IG: @tokokami • Tag story untuk diskon 10%!",className:"w-full bg-card border border-line rounded-xl px-3.5 py-2 text-xs text-fg font-semibold placeholder:text-muted/60 outline-none focus:border-accent resize-none"}),(0,t.jsx)("p",{className:"text-[11px] text-muted",children:"Bebas diisi info WiFi toko, akun medsos, atau catatan promosi lainnya."})]})]}),(0,t.jsxs)("div",{className:"pt-3 border-t border-line space-y-2.5",children:[(0,t.jsx)("label",{className:"block text-xs font-bold text-fg",children:"Elemen Yang Ditampilkan Pada Struk"}),(0,t.jsxs)("div",{className:"grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5",children:[(0,t.jsxs)("label",{className:"flex items-center gap-2.5 p-2.5 bg-card border border-line rounded-xl cursor-pointer hover:border-accent/40 transition-colors",children:[(0,t.jsx)("input",{type:"checkbox",checked:O,onChange:e=>W(e.target.checked),className:"w-4 h-4 rounded text-accent focus:ring-accent accent-accent"}),(0,t.jsx)("span",{className:"text-xs font-bold text-fg",children:"Logo Usaha"})]}),(0,t.jsxs)("label",{className:"flex items-center gap-2.5 p-2.5 bg-card border border-line rounded-xl cursor-pointer hover:border-accent/40 transition-colors",children:[(0,t.jsx)("input",{type:"checkbox",checked:_,onChange:e=>F(e.target.checked),className:"w-4 h-4 rounded text-accent focus:ring-accent accent-accent"}),(0,t.jsx)("span",{className:"text-xs font-bold text-fg",children:"Nama Kasir / Operator"})]}),(0,t.jsxs)("label",{className:"flex items-center gap-2.5 p-2.5 bg-card border border-line rounded-xl cursor-pointer hover:border-accent/40 transition-colors",children:[(0,t.jsx)("input",{type:"checkbox",checked:G,onChange:e=>q(e.target.checked),className:"w-4 h-4 rounded text-accent focus:ring-accent accent-accent"}),(0,t.jsx)("span",{className:"text-xs font-bold text-fg",children:"Nama Pelanggan"})]}),(0,t.jsxs)("label",{className:"flex items-center gap-2.5 p-2.5 bg-card border border-line rounded-xl cursor-pointer hover:border-accent/40 transition-colors",children:[(0,t.jsx)("input",{type:"checkbox",checked:Y,onChange:e=>Z(e.target.checked),className:"w-4 h-4 rounded text-accent focus:ring-accent accent-accent"}),(0,t.jsx)("span",{className:"text-xs font-bold text-fg",children:"Nomor Meja / Tipe Pesanan"})]}),(0,t.jsxs)("label",{className:"flex items-center gap-2.5 p-2.5 bg-card border border-line rounded-xl cursor-pointer hover:border-accent/40 transition-colors",children:[(0,t.jsx)("input",{type:"checkbox",checked:J,onChange:e=>Q(e.target.checked),className:"w-4 h-4 rounded text-accent focus:ring-accent accent-accent"}),(0,t.jsx)("span",{className:"text-xs font-bold text-fg",children:"Catatan Item Menu"})]})]})]})]}),b?(0,t.jsxs)(t.Fragment,{children:[(0,t.jsxs)("div",{className:"bg-surface rounded-3xl p-5 border border-line shadow-sm space-y-3",children:[(0,t.jsxs)("div",{className:"flex items-center justify-between",children:[(0,t.jsx)("h4",{className:"text-sm font-black text-fg flex items-center gap-2",children:(0,t.jsx)("span",{children:"Daftar Perangkat Bluetooth Ditemukan"})}),(0,t.jsx)("span",{className:"text-[11px] text-muted",children:f.length>0?`${f.length} perangkat terdeteksi`:"0 perangkat"})]}),0===f.length?(0,t.jsxs)("div",{className:"py-8 text-center text-muted text-xs space-y-2 border border-dashed border-line/60 rounded-2xl p-4",children:[(0,t.jsx)("div",{className:"text-3xl",children:(0,t.jsx)(r.f,{name:"printer"})}),(0,t.jsx)("p",{className:"font-bold text-fg",children:"Belum ada printer yang dipindai."}),(0,t.jsxs)("p",{className:"max-w-md mx-auto text-[11px] leading-relaxed",children:["Nyalakan Bluetooth HP dan printer thermal Anda. Pastikan printer sudah di-pairing (dipasangkan) di menu Pengaturan Bluetooth HP Android, lalu tekan tombol ",(0,t.jsx)("strong",{children:'"Pindai Bluetooth"'})," di atas."]})]}):(0,t.jsx)("div",{className:"divide-y divide-line",children:f.map((e,a)=>{let n=v===e.address;return(0,t.jsxs)("div",{className:"py-3 flex items-center justify-between gap-3 text-xs",children:[(0,t.jsxs)("div",{className:"flex items-center gap-3",children:[(0,t.jsx)("span",{className:"text-xl",children:(0,t.jsx)(r.f,{name:"printer"})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("span",{className:"font-bold text-fg text-sm block",children:e.name||"Perangkat Thermal Tanpa Nama"}),(0,t.jsxs)("span",{className:"text-[11px] font-mono text-muted",children:["MAC: ",e.address]})]})]}),(0,t.jsx)("button",{type:"button",onClick:()=>ea(e.address,e.name),className:`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${n?"bg-accent text-white font-black shadow-md shadow-accent/20":"bg-card text-fg hover:border-accent hover:text-accent-text border border-line"}`,children:n?"Sedang Digunakan":"Gunakan Printer Ini"})]},a)})})]}),(0,t.jsxs)("div",{className:"bg-surface rounded-3xl p-5 border border-line shadow-sm space-y-3",children:[(0,t.jsx)("h4",{className:"text-sm font-black text-fg flex items-center gap-2",children:(0,t.jsx)("span",{children:"Input Manual MAC Address (Alternatif Tambahan)"})}),(0,t.jsxs)("p",{className:"text-xs text-muted leading-relaxed",children:["Jika printer Bluetooth kasir Anda sudah terpasang (paired) di pengaturan sistem Android namun tidak muncul di hasil pemindaian di atas, masukkan alamat MAC printer secara manual (contoh: ",(0,t.jsx)("code",{children:"66:22:BB:77:88:99"}),"):"]}),(0,t.jsxs)("div",{className:"flex gap-2",children:[(0,t.jsx)("input",{type:"text",placeholder:"66:22:BB:77:88:99",value:v,onChange:e=>y(e.target.value.trim()),className:"flex-1 bg-card border border-line rounded-xl p-2.5 text-xs font-mono font-bold text-fg outline-none focus:border-accent"}),(0,t.jsx)("button",{type:"button",onClick:()=>ea(v,"Printer Manual"),className:"px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-bold transition-colors shadow-sm",children:"Simpan MAC"})]})]})]}):(0,t.jsxs)("div",{className:"bg-surface rounded-3xl p-5 sm:p-6 border border-line shadow-sm space-y-4",children:[(0,t.jsxs)("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-line",children:[(0,t.jsxs)("h4",{className:"text-sm font-black text-fg flex items-center gap-2",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"guide"})}),(0,t.jsx)("span",{children:"Alur Cetak Struk Kasir (Mode Web / PWA)"})]}),(0,t.jsx)("span",{className:"text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 w-fit",children:"Kompatibel Semua Printer (Bluetooth, USB, WiFi)"})]}),(0,t.jsxs)("div",{className:"grid grid-cols-1 md:grid-cols-3 gap-3",children:[(0,t.jsxs)("div",{className:"p-4 rounded-2xl bg-card border border-line space-y-2",children:[(0,t.jsx)("div",{className:"w-8 h-8 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center",children:"1"}),(0,t.jsx)("h5",{className:"text-xs font-bold text-fg",children:"Sambungkan Printer ke Perangkat"}),(0,t.jsxs)("p",{className:"text-[11px] text-muted leading-relaxed",children:["Sambungkan printer thermal ke HP, tablet, atau komputer kasir Anda via menu ",(0,t.jsx)("strong",{children:"Bluetooth perangkat"})," atau colokkan kabel USB / OTG."]})]}),(0,t.jsxs)("div",{className:"p-4 rounded-2xl bg-card border border-line space-y-2",children:[(0,t.jsx)("div",{className:"w-8 h-8 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center",children:"2"}),(0,t.jsx)("h5",{className:"text-xs font-bold text-fg",children:"Tentukan Ukuran Kertas & Slogan"}),(0,t.jsxs)("p",{className:"text-[11px] text-muted leading-relaxed",children:["Pilih ukuran kertas (",(0,t.jsx)("strong",{children:"58mm"})," untuk printer mini kasir atau ",(0,t.jsx)("strong",{children:"80mm"})," untuk printer lebar) serta kustomisasi header/footer nota di atas."]})]}),(0,t.jsxs)("div",{className:"p-4 rounded-2xl bg-card border border-line space-y-2",children:[(0,t.jsx)("div",{className:"w-8 h-8 rounded-xl bg-blue-100 text-blue-700 text-xs font-black flex items-center justify-center",children:"3"}),(0,t.jsx)("h5",{className:"text-xs font-bold text-fg",children:"Cetak Otomatis Saat Transaksi"}),(0,t.jsx)("p",{className:"text-[11px] text-muted leading-relaxed",children:"Saat kasir menekan tombol bayar / cetak, jendela cetak browser akan terbuka. Pilih nama printer thermal Anda satu kali, dan browser akan otomatis mengingatnya."})]})]}),(0,t.jsx)("div",{className:"pt-2 text-center sm:text-left",children:(0,t.jsxs)("button",{type:"button",onClick:er,disabled:P,className:"inline-flex items-center gap-2 px-4 py-2.5 bg-accent hover:bg-accent-hover text-white rounded-xl text-xs font-black shadow-sm transition-all active:scale-95 disabled:opacity-50",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"printer"})}),(0,t.jsx)("span",{children:P?"Mencetak...":"Uji Coba Cetak Sekarang"})]})})]}),K&&(0,t.jsx)("div",{className:"fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200",onClick:()=>L(!1),children:(0,t.jsxs)("div",{className:"bg-card text-fg p-5 sm:p-6 rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col max-h-[90vh] border border-line",onClick:e=>e.stopPropagation(),children:[(0,t.jsxs)("div",{className:"flex items-center justify-between pb-3 border-b border-line mb-4",children:[(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsx)("span",{className:"text-xl",children:(0,t.jsx)(r.f,{name:"info"})}),(0,t.jsxs)("div",{children:[(0,t.jsx)("h3",{className:"font-black text-sm text-fg",children:"Pratinjau Format Struk"}),(0,t.jsxs)("p",{className:"text-[10px] text-muted",children:["Format cetak presisi black-on-white (",D,")"]})]})]}),(0,t.jsxs)("div",{className:"flex items-center gap-2",children:[(0,t.jsxs)("div",{className:"flex items-center bg-surface p-0.5 rounded-lg border border-line text-[10px]",children:[(0,t.jsx)("button",{type:"button",onClick:()=>M("58mm"),className:`px-2 py-0.5 rounded font-bold ${"58mm"===D?"bg-accent text-white":"text-muted"}`,children:"58mm"}),(0,t.jsx)("button",{type:"button",onClick:()=>M("80mm"),className:`px-2 py-0.5 rounded font-bold ${"80mm"===D?"bg-accent text-white":"text-muted"}`,children:"80mm"})]}),(0,t.jsx)("button",{type:"button",onClick:()=>L(!1),className:"w-7 h-7 rounded-lg bg-surface hover:bg-line text-muted flex items-center justify-center font-bold text-sm",children:"×"})]})]}),(0,t.jsx)("div",{className:"flex-1 overflow-y-auto pr-1 bg-neutral-900 p-3 rounded-2xl",children:(0,t.jsxs)("div",{className:"bg-white text-black p-4 rounded-lg font-mono text-xs shadow-inner mx-auto",style:{width:"80mm"===D?"100%":"260px"},children:[(0,t.jsxs)("div",{className:"text-center mb-3",children:[!1!==en.receiptShowLogo&&en.storeLogo&&(0,t.jsx)("div",{className:"flex justify-center mb-2",children:(0,t.jsx)("img",{src:en.storeLogo,alt:"Logo",className:"max-h-12 max-w-[100px] object-contain"})}),(0,t.jsx)("h4",{className:"font-black text-sm uppercase",children:en.storeName||"SAKUNOTA"}),en.storeAddress&&(0,t.jsx)("p",{className:"text-[10px] leading-tight text-neutral-700 mt-0.5",children:en.storeAddress}),en.storePhone&&(0,t.jsxs)("p",{className:"text-[10px] text-neutral-700",children:["Telp: ",en.storePhone]}),en.receiptHeader&&(0,t.jsx)("p",{className:"text-[10px] font-bold text-neutral-900 mt-1",children:en.receiptHeader})]}),(0,t.jsx)("div",{className:"border-t-2 border-dashed border-black my-2"}),(0,t.jsxs)("div",{className:"text-[11px] space-y-0.5 mb-2",children:[(0,t.jsxs)("div",{className:"flex justify-between",children:[(0,t.jsx)("span",{children:"No: A-999"}),!1!==en.receiptShowTable&&(0,t.jsx)("span",{className:"font-bold",children:"[Meja Tes #01]"})]}),!1!==en.receiptShowCustomer&&(0,t.jsxs)("div",{className:"flex justify-between",children:[(0,t.jsx)("span",{children:"Pelanggan: Budi Santoso"}),!1!==en.receiptShowTable&&(0,t.jsx)("span",{children:"Dine-in"})]}),(0,t.jsxs)("div",{className:"flex justify-between text-[10px] text-neutral-600",children:[(0,t.jsxs)("span",{children:["Tgl: ",ei.date]}),!1!==en.receiptShowCashier&&(0,t.jsx)("span",{children:"Kasir: Kasir Toko"})]}),!1!==en.receiptShowNotes&&(0,t.jsx)("div",{className:"text-[10px] text-left border border-black p-1 my-1 font-bold",children:"Catatan: Jangan terlalu manis"})]}),(0,t.jsx)("div",{className:"border-t border-dashed border-black my-2"}),(0,t.jsx)("div",{className:"space-y-2 mb-2",children:ei.items.map((e,a)=>(0,t.jsxs)("div",{children:[(0,t.jsxs)("div",{className:"flex justify-between font-bold",children:[(0,t.jsxs)("span",{className:"pr-2",children:[e.qty,"x ",e.nama]}),(0,t.jsx)("span",{className:"shrink-0",children:(0,p.formatCurrency)(e.qty*e.harga)})]}),e.selectedModifiers&&e.selectedModifiers.map((e,a)=>(0,t.jsxs)("div",{className:"text-[10px] text-neutral-700 pl-3",children:["> ",e.optionName," ",e.harga>0?`(+${(0,p.formatCurrency)(e.harga)})`:""]},a))]},a))}),(0,t.jsx)("div",{className:"border-t border-dashed border-black my-2"}),(0,t.jsxs)("div",{className:"space-y-0.5 text-[11px]",children:[(0,t.jsxs)("div",{className:"flex justify-between",children:[(0,t.jsx)("span",{children:"Subtotal:"}),(0,t.jsx)("span",{children:(0,p.formatCurrency)(ei.subtotal)})]}),(0,t.jsxs)("div",{className:"flex justify-between text-neutral-800",children:[(0,t.jsx)("span",{children:"Diskon:"}),(0,t.jsxs)("span",{children:["-",(0,p.formatCurrency)(ei.discount)]})]}),(0,t.jsxs)("div",{className:"flex justify-between",children:[(0,t.jsx)("span",{children:"Layanan:"}),(0,t.jsx)("span",{children:(0,p.formatCurrency)(ei.serviceCharge)})]}),(0,t.jsxs)("div",{className:"flex justify-between",children:[(0,t.jsx)("span",{children:"Pajak PBJT:"}),(0,t.jsx)("span",{children:(0,p.formatCurrency)(ei.tax)})]}),(0,t.jsx)("div",{className:"border-t border-dashed border-black my-1.5"}),(0,t.jsxs)("div",{className:"flex justify-between font-black text-sm",children:[(0,t.jsx)("span",{children:"TOTAL:"}),(0,t.jsx)("span",{children:(0,p.formatCurrency)(ei.total)})]}),(0,t.jsxs)("div",{className:"flex justify-between",children:[(0,t.jsx)("span",{children:"Bayar Tunai:"}),(0,t.jsx)("span",{children:(0,p.formatCurrency)(ei.cashTendered)})]}),(0,t.jsxs)("div",{className:"flex justify-between",children:[(0,t.jsx)("span",{children:"Kembalian:"}),(0,t.jsx)("span",{children:(0,p.formatCurrency)(ei.change)})]})]}),(0,t.jsx)("div",{className:"border-t-2 border-dashed border-black my-2"}),(0,t.jsx)("div",{className:"text-center font-black text-xs py-1 border border-black my-1",children:"LUNAS"}),en.receiptFooter&&(0,t.jsx)("p",{className:"text-[10px] text-center mt-2 whitespace-pre-line text-neutral-700",children:en.receiptFooter}),en.receiptCustomNote&&(0,t.jsx)("p",{className:"text-[10px] text-center mt-1.5 whitespace-pre-line text-neutral-800 italic border-t border-dashed border-neutral-300 pt-1.5",children:en.receiptCustomNote}),en.enableWatermark&&(0,t.jsx)("p",{className:"text-[9px] text-center mt-1 text-neutral-500",children:"[ SakuNota - Solusi Kasir UMKM ]"})]})}),(0,t.jsxs)("div",{className:"pt-3 border-t border-line mt-4 flex items-center justify-end gap-2",children:[(0,t.jsx)("button",{type:"button",onClick:()=>L(!1),className:"px-4 py-2 bg-surface hover:bg-line text-fg text-xs font-bold rounded-xl transition-colors",children:"Tutup"}),(0,t.jsxs)("button",{type:"button",onClick:er,disabled:P,className:"px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-black rounded-xl transition-all shadow-md shadow-accent/20 flex items-center gap-1.5 disabled:opacity-50",children:[(0,t.jsx)("span",{children:(0,t.jsx)(r.f,{name:"printer"})}),(0,t.jsx)("span",{children:P?"Mencetak...":"Cetak Dokumen Ini Sekarang"})]})]})]})})]})}])},60114,e=>{var t=e.i(71645),a=e.i(77236);e.s(["t",0,function(e){let n=(0,t.useRef)(e);(0,t.useEffect)(()=>{n.current=e}),(0,t.useEffect)(()=>{let e=e=>{!1!==n.current()&&e.preventDefault()};return window.addEventListener(a.g,e),()=>window.removeEventListener(a.g,e)},[])},"S",0,function(e,n){(0,t.useEffect)(()=>{if(!e)return;let t=e=>{let t=e.detail?.href;if("string"!=typeof t)return;let a=new URL(t,location.href);a.origin===location.origin&&(/^\/admin(?:\/|$)/.test(a.pathname)||"/pos"===a.pathname)&&(e.preventDefault(),n(a.pathname+a.search+a.hash))};return window.addEventListener(a.n,t),()=>window.removeEventListener(a.n,t)},[e,n])}])},46766,e=>{function t(e){return e.replace(/[&<>"']/g,e=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[e])}e.s(["w",0,t,"D",0,function e(a){return"string"==typeof a?t(a):Array.isArray(a)?a.map(e):a&&"object"==typeof a?Object.fromEntries(Object.entries(a).map(([t,a])=>[t,e(a)])):a},"h",0,function(e){return e&&e.length<=28e5&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(e)?e:""},"o",0,function e(t){return"string"==typeof t?t.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g,""):Array.isArray(t)?t.map(e):t&&"object"==typeof t?Object.fromEntries(Object.entries(t).map(([t,a])=>[t,e(a)])):t}])},71798,42250,e=>{var t=e.i(68542),a=e.i(43668),n=e.i(82568);let r=(0,n.U)("BluetoothSerial",{web:()=>e.A(88868).then(e=>new e.BluetoothSerialWeb)});e.s(["f",0,r],42250);let s=(0,n.U)("Printer",{web:()=>e.A(28165).then(e=>new e.PrinterWeb)});var i=e.i(46766);let o=e=>`Rp ${Math.round(e||0).toLocaleString("id-ID")}`;function l(e,t){if(!e)return[];let a=e.split(/\s+/),n=[],r="";for(let e of a)if(r)if((r+" "+e).length<=t)r+=" "+e;else if(n.push(r),e.length>t){let a=e;for(;a.length>t;)n.push(a.substring(0,t)),a=a.substring(t);r=a}else r=e;else if(e.length>t){let a=e;for(;a.length>t;)n.push(a.substring(0,t)),a=a.substring(t);r=a}else r=e;return r&&n.push(r),n}let d=e=>{if(!e)return!1;let t=e.toLowerCase();return t.includes("minuman")||t.includes("kopi")||t.includes("tea")||t.includes("matcha")||t.includes("drink")||t.includes("coffee")||t.includes("milkshake")||t.includes("beverage")||t.includes("juice")};function c(e,a,n,r){let s=e.date||(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")),i=e.orderId?`A-${e.orderId}`:e.id?`A-${e.id}`:"-",l=e.tableName?e.tableName:`[${e.orderType||"Dine-in"}]`,c=n.storeName||"SAKUNOTA";"food"===a&&(c="DAPUR (KITCHEN)"),"drink"===a&&(c="BAR (MINUMAN)"),"laundry"===e.serviceCategory&&e.status&&(e={...e,isDraft:"paid"!==e.status});let p=e.items||[],m=0,x=p.map(e=>{let n=d(e.kategori||e.kategoriMenu);if("food"===a&&n||"drink"===a&&!n)return"";let r=Number(e.qty||1),s=(0,t.c)(e,r);m+=s;let i=e.nama||e.namaMenu||"Item",l=e.selectedModifiers&&e.selectedModifiers.length>0?e.selectedModifiers.map(e=>`
          <div class="item-mod">
            &gt; ${e.optionName||e.nama}${e.harga>0?` (+${o(e.harga)})`:""}
          </div>
        `).join(""):"",c=e.notes?`<div class="item-note">* ${e.notes}</div>`:"";return`
      <tr>
        <td class="col-item">
          <div class="item-name">${"weight"===e.saleUnit?(0,t.b)(e,r):r+"x"} ${i}</div>
          ${l}
          ${c}
        </td>
        ${"all"===a?`<td class="col-price">${o(s)}</td>`:""}
      </tr>
    `}).join(""),u=void 0!==e.subtotal?e.subtotal:m,h=void 0!==e.total?e.total:m,b=e.payments&&e.payments.length>0?`
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
    ${n.storeLogo&&!1!==n.receiptShowLogo&&"all"===a?`
      <div class="logo-box">
        <img src="${n.storeLogo}" alt="Logo Toko" />
      </div>
    `:""}

    <div class="center">
      <div class="store-title">${c}</div>
      ${"all"===a?`
        ${n.storeAddress?`<div class="store-sub">${n.storeAddress}</div>`:""}
        ${n.storePhone?`<div class="store-sub">Telp: ${n.storePhone}</div>`:""}
        ${n.receiptHeader?`<div class="store-sub bold" style="margin-top: 2px;">${n.receiptHeader}</div>`:""}
      `:""}
    </div>

    <div class="double-divider"></div>

    <div class="order-banner">
      <div class="order-num">No: ${i}</div>
      ${"laundry"===e.serviceCategory?`<div>Laundry \xb7 Selesai: ${e.pickupDate||"-"}</div><div>${e.customerPhone||""}</div>`:""}
      ${!1!==n.receiptShowCustomer?`<div class="bold">${e.customerName?`An. ${e.customerName}`:"Tamu"}</div>`:""}
      ${!1!==n.receiptShowTable&&(e.tableName||e.orderType&&"Dine-in"!==e.orderType&&"Direct"!==e.orderType)?`
        <div style="margin-top: 3px;">
          <span class="badge">${l}</span>
        </div>
      `:""}
      ${e.notes&&!1!==n.receiptShowNotes?`<div style="text-align: left; border: 1px solid #000; padding: 3px; margin-top: 4px; font-size: 10px; font-weight: bold;">Catatan: ${e.notes}</div>`:""}
    </div>

    <div class="divider"></div>
    <div class="row" style="font-size: 10px;">
      <span>Tgl: ${s}</span>
      <span>${(e.operatorName||e.kasirName)&&!1!==n.receiptShowCashier?`Kasir: ${e.operatorName||e.kasirName}`:""}</span>
    </div>
    <div class="divider"></div>

    <table>
      <tbody>
        ${x}
      </tbody>
    </table>

    ${"all"===a?`
      <div class="divider"></div>

      ${e.discount&&e.discount>0||e.serviceCharge&&e.serviceCharge>0||e.tax&&e.tax>0?`
        <div class="row">
          <span>Subtotal:</span>
          <span>${o(u)}</span>
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

      ${b}

      <div class="status-box">
        ${e.isDraft?"laundry"===e.serviceCategory?"BELUM LUNAS":"TAGIHAN SEMENTARA (OPEN BILL)":"LUNAS"}
      </div>

      ${e.isDemo?`
        <div class="status-box" style="border: 1px dashed #b45309; background: #fffbeb; color: #92400e; font-size: 10px; margin: 4px 0;">
          *** STRUK SIMULASI DEMO KASIR ***<br />
          <span style="font-size: 9px; font-weight: normal;">BUKAN BUKTI TRANSAKSI RIIL</span>
        </div>
      `:""}

      ${n.receiptFooter?`<div class="footer-text">${n.receiptFooter}</div>`:""}
      ${n.receiptCustomNote?`<div class="footer-text" style="font-style: italic; margin-top: 4px;">${n.receiptCustomNote}</div>`:""}
      ${n.enableWatermark?'<div class="watermark">[ SakuNota - Solusi Kasir UMKM ]</div>':""}
    `:`
      <div class="divider"></div>
      <div class="center bold" style="font-size: 11px; margin-top: 4px;">*** SELESAI TIKET ***</div>
    `}
  `}function p(e){let t=Array.isArray((e=(0,i.D)(e)).items)?e.items:[],a=[];for(let e of t){let t=Math.max(1,Math.round(Number(e.qty)||1));for(let n=0;n<t;n++)a.push(e)}let n=a.length,r=e.orderType?.toLowerCase()==="takeaway"||!e.tableId&&"Dine-in"!==e.orderType,s=r?"Take Away":"Dine In",o="Tamu";if(r)o=e.customerName?.trim()||"Take Away";else{let t=e.tableName?.trim()||(e.tableId?`Meja ${e.tableId}`:""),a=e.customerName?.trim()||"";o=t&&a?`${t} (${a})`:t||a||"Dine In"}let l=e.createdAt?new Date(e.createdAt):new Date,c=e=>String(e).padStart(2,"0"),p=c(l.getDate()),m=c(l.getMonth()+1),x=String(l.getFullYear()).slice(-2),u=c(l.getHours()),h=c(l.getMinutes()),b=`${p}/${m}/${x} ${u}:${h}`;return a.map((t,a)=>{let r=d(t.kategori||t.kategoriMenu),i=[];if(Array.isArray(t.selectedModifiers))for(let e of t.selectedModifiers){let t=e.optionName||e.nama||"";t&&i.push(t)}let l=t.notes||t.catatan||(0===a&&e.notes?e.notes:void 0);return{index:a+1,total:n,customerOrTable:o,orderType:s,nama:t.nama||t.namaMenu||"Menu",unit:r?"1 Cup":"1 Porsi",modifiers:i,notes:l,dateTime:b,orderId:e.orderId||e.id}})}async function m(e){let{title:t,escposText:a,htmlContent:i}=e;if(n.d.isNativePlatform()){let e=localStorage.getItem("bt_printer_mac");if(e)try{try{await r.connect({address:e})}catch(e){}return await r.write({address:e,value:a}),{success:!0,platform:"native_bluetooth",message:"Berhasil dikirim ke Printer Bluetooth Thermal!"}}catch(e){console.warn("Bluetooth Serial write failed, falling back to native system printer:",e);try{return await s.printHtml({html:i,name:t}),{success:!0,platform:"native_system",message:"Bluetooth gagal, dicetak via dialog Printer Sistem Android."}}catch(t){throw Error(`Gagal mencetak di Android: ${e.message||e}`)}}try{return await s.printHtml({html:i,name:t}),{success:!0,platform:"native_system",message:"Berhasil dikirim ke Dialog Printer Sistem Android."}}catch(e){throw Error(`Gagal membuka dialog printer Android: ${e.message||e}`)}}try{let e=document.getElementById("sakunota-print-iframe");e||((e=document.createElement("iframe")).setAttribute("sandbox","allow-same-origin allow-modals"),e.id="sakunota-print-iframe",e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.visibility="hidden",document.body.appendChild(e));let t=e.contentDocument||e.contentWindow?.document;if(t&&(t.open(),t.write(i),t.close(),await new Promise(e=>setTimeout(e,250)),e.contentWindow))return e.contentWindow.focus(),e.contentWindow.print(),window.focus(),{success:!0,platform:"web_iframe",message:"Dialog cetak struk terisolasi berhasil dibuka!"}}catch(e){console.warn("Iframe print error, falling back to Printer.printHtml:",e)}try{return await s.printHtml({html:i,name:t}),{success:!0,platform:"web_fallback",message:"Dialog cetak dibuka via Capacitor Web Plugin."}}catch(e){throw Error(`Gagal mencetak struk di browser: ${e.message||e}`)}}e.s(["executePrintDocument",0,m,"formatCurrency",0,o,"generateBulkReceiptHtml",0,function(e,t="all",n){let r=(0,i.D)(n||(0,a.getStoreSettings)());r.storeLogo=(0,i.h)(r.storeLogo);let s="80mm"===r.paperWidth,o=s?"80mm":"58mm",l=s?"72mm":"52mm",d=e.map(e=>{let a=(0,i.D)(e);return`
      <div class="bulk-receipt-page">
        ${c(a,t,r,s)}
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
          font-size: ${s?"13px":"11px"};
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
        .store-title { font-size: ${s?"16px":"14px"}; font-weight: 900; text-transform: uppercase; }
        .store-sub { font-size: ${s?"11px":"10px"}; }
        .order-banner { text-align: center; padding: 4px 0; }
        .order-num { font-size: ${s?"24px":"20px"}; font-weight: 900; }
        .badge { display: inline-block; padding: 1px 4px; border: 1px solid #000; font-size: 10px; font-weight: bold; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 2px 0; }
        .col-item { text-align: left; word-break: break-word; }
        .col-price { text-align: right; white-space: nowrap; padding-left: 6px; }
        .item-name { font-weight: bold; }
        .item-mod { font-size: 0.9em; padding-left: 8px; color: #222; }
        .item-note { font-size: 0.85em; padding-left: 8px; font-style: italic; }
        .total-row { font-size: ${s?"15px":"13px"}; font-weight: 900; margin-top: 3px; }
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
  `},"generateCupLabelsEscPos",0,function(e,t){let n=p(e=(0,i.o)(e));if(!n.length)return"";let r="80mm"===(0,i.o)(t||(0,a.getStoreSettings)()).paperWidth?48:32,s="-".repeat(r)+"\n",o=(e,t)=>{let a=r-e.length-t.length;if(a>=0)return`${e}${" ".repeat(a)}${t}
`;let n=Math.max(1,r-t.length-1);return`${e.slice(0,n)} ${t}
`},l="";for(let e of n){for(let t of(l+="\x1b@",l+="\x1bE\x01"+o(e.customerOrTable,e.orderType)+"\x1bE\0",l+=`${e.unit}
`,l+=s,l+="\x1bE\x01\x1b!\x10"+e.nama+"\x1b!\0\x1bE\0\n",e.modifiers))l+=`  * ${t}
`;e.notes&&(l+=`  (Catatan: ${e.notes})
`),l+=s,l+="\x1bE\x01"+o(e.dateTime,`${e.index}/${e.total}`)+"\x1bE\0",l+="\n\n\n\x1dVB\0"}return l},"generateCupLabelsHtml",0,function(e,t){let n=p(e=(0,i.D)(e));if(!n.length)return"";let r="80mm"===(0,i.D)(t||(0,a.getStoreSettings)()).paperWidth,s=n.map(e=>`
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
      ${s}
    </body>
    </html>
  `},"generateEscPosReceipt",0,function(e,n="all",r){e=(0,i.o)(e);let s=(0,i.o)(r||(0,a.getStoreSettings)()),c="80mm"===s.paperWidth?48:32,p="-".repeat(c)+"\n",m="=".repeat(c)+"\n",x=e=>e?l(e,c).map(e=>{let t=Math.max(0,Math.floor((c-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",u=(e,t)=>{let a=c-e.length-t.length;if(a>=0)return`${e}${" ".repeat(a)}${t}
`;let n=c-t.length-1;if(n>8){let a=e.substring(0,n),r=e.substring(n),s=c-a.length-t.length;return`${a}${" ".repeat(Math.max(1,s))}${t}
   ${r.trim()}
`}return`${e}
${t.padStart(c," ")}
`},h="";"all"===n?(h+=x(s.storeName||"SAKUNOTA"),s.storeAddress&&l(s.storeAddress,c).forEach(e=>{h+=x(e)}),s.storePhone&&(h+=x(`Telp: ${s.storePhone}`)),s.receiptHeader&&s.receiptHeader.split("\n").forEach(e=>{e.trim()&&(h+=x(e.trim()))})):h+=x("food"===n?"*** STRUK DAPUR (KITCHEN) ***":"*** STRUK BAR (MINUMAN) ***"),h+=m;let b=e.date||(e.createdAt?new Date(e.createdAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID"));h+=u(`Tgl: ${b}`,"");let g=e.orderId?`No: A-${e.orderId}`:e.id?`No: A-${e.id}`:"No: -",f="";!1!==s.receiptShowTable&&(e.tableName?f=`Meja: ${String(e.tableName).replace(/^Meja\s*/i,"")}`:e.orderType&&"Dine-in"!==e.orderType&&"Direct"!==e.orderType&&(f=`[${e.orderType}]`)),h+=u(g,f),"laundry"===e.serviceCategory&&(h+=u("Laundry",""),h+=u("Selesai: "+(e.pickupDate||"-"),""),e.customerPhone&&(h+=u("WA: "+e.customerPhone,""))),e.customerName&&!1!==s.receiptShowCustomer&&(h+=u(`Pelanggan: ${e.customerName}`,"")),(e.operatorName||e.kasirName)&&!1!==s.receiptShowCashier&&(h+=u(`Kasir: ${e.operatorName||e.kasirName}`,"")),e.notes&&!1!==s.receiptShowNotes&&(h+=`Catatan: ${e.notes}
`),h+=p;let k=0;if("laundry"===e.serviceCategory&&e.status&&(e={...e,isDraft:"paid"!==e.status}),(e.items||[]).forEach(e=>{let a=d(e.kategori||e.kategoriMenu);if("food"===n&&a||"drink"===n&&!a)return;let r=Number(e.qty||1),s=(0,t.c)(e,r);k+=s;let i=e.nama||e.namaMenu||"Item",p=`${"weight"===e.saleUnit?(0,t.b)(e,r):r+"x"} ${i}`,m=o(s);"all"===n?h+=u(p,m):h+=`${p}
`,e.selectedModifiers&&e.selectedModifiers.length>0&&e.selectedModifiers.forEach(e=>{let t=e.harga>0?` (+${o(e.harga)})`:"",a=`   > ${e.optionName||e.nama}${t}`;h+=l(a,c).join("\n")+"\n"}),e.notes&&(h+=`   * ${e.notes}
`)}),h+=p,"all"===n){let a=void 0!==e.subtotal?e.subtotal:k;if(e.discount&&e.discount>0||e.serviceCharge&&e.serviceCharge>0||e.tax&&e.tax>0){if(h+=u("Subtotal:",o(a)),e.discount&&e.discount>0){let t="percent"===e.discountType?`Diskon (${e.discountValue}%):`:"Diskon:";h+=u(t,"-"+o(e.discount))}e.serviceCharge&&e.serviceCharge>0&&(h+=u("Layanan:",o(e.serviceCharge))),e.tax&&e.tax>0&&(h+=u("Pajak PBJT:",o(e.tax))),h+=p}let n=void 0!==e.total?e.total:k;if(h+=u("TOTAL TAGIHAN:",o(n)),e.payments&&e.payments.length>0){h+=p,h+="Rincian Pembayaran:\n",e.payments.forEach((e,a)=>{let n="refunded"===e.status,r=` ${a+1}. ${e.paymentMethod}${n?" (REFUND)":""}`;h+=u(r,o(e.amount)),e.itemsPaid&&e.itemsPaid.length>0&&e.itemsPaid.forEach(e=>{h+=`    • ${(0,t.b)(e)} ${e.nama}
`})}),h+=p;let a=e.payments.filter(e=>"completed"===e.status).reduce((e,t)=>e+t.amount,0);h+=u("Total Terbayar:",o(a));let r=Math.max(0,n-a);r>0?(h+=u("SISA TAGIHAN:",o(r)),h+=m,h+=x(" STATUS: BELUM LUNAS")):(h+=m,h+=x(" STATUS: LUNAS"))}else{if(h+=u("Metode:",e.paymentMethod||"Tunai"),e.cashTendered&&e.cashTendered>0&&!("laundry"===e.serviceCategory&&e.isDraft)){h+=u("Bayar Tunai:",o(e.cashTendered));let t=Math.max(0,e.cashTendered-n);h+=u("Kembalian:",o(t))}h+=m,e.isDraft?h+=x("laundry"===e.serviceCategory?" BELUM LUNAS":" TAGIHAN SEMENTARA (OPEN BILL)"):h+=x(" LUNAS")}h+=p,s.receiptFooter&&s.receiptFooter.split("\n").forEach(e=>{e.trim()&&(h+=x(e.trim()))}),s.receiptCustomNote&&s.receiptCustomNote.split("\n").forEach(e=>{e.trim()&&(h+=x(e.trim()))}),s.enableWatermark&&(h+="\n"+x("[ SakuNota - Solusi Kasir UMKM ]")),e.isDemo&&(h+="\n"+x("*** STRUK SIMULASI DEMO KASIR ***"),h+=x("BUKAN BUKTI TRANSAKSI RIIL"))}return h+="\n\n\n"},"generatePartialPaymentReceipt",0,function(e,n,r){e=(0,i.o)(e),n=(0,i.o)(n);let s=(0,i.o)(r||(0,a.getStoreSettings)()),d="80mm"===s.paperWidth?48:32,c="-".repeat(d)+"\n",p="=".repeat(d)+"\n",m=e=>e?l(e,d).map(e=>{let t=Math.max(0,Math.floor((d-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",x=(e,t)=>{let a=d-e.length-t.length;return a<=0?`${e}
${t.padStart(d," ")}
`:`${e}${" ".repeat(a)}${t}
`},u="";u+=m(s.storeName||"SAKUNOTA"),s.storeAddress&&(u+=m(s.storeAddress)),s.storePhone&&(u+=m(`Telp: ${s.storePhone}`)),u+=p,u+=m("BUKTI PEMBAYARAN PARSIAL / SPLIT"),u+=c,u+=x(`Tgl: ${n.paidAt?new Date(n.paidAt).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")}`,""),u+=x(`No: A-${e.id||"-"}`,e.tableId?`Meja: ${e.tableId}`:`[${e.orderType||"Dine-in"}]`),e.customerName&&(u+=x(`Pelanggan: ${e.customerName}`,"")),u+=x(`Kasir: ${n.operatorName||"Kasir"}`,n.shiftId?`Shift #${n.shiftId}`:""),u+=c;let h="item"===n.splitType?"Split by Item (Per Menu)":"equal"===n.splitType?"Split Equally (Bagi Rata)":"Pembayaran Cicil / Parsial";u+=`Tipe: ${h}
`,n.itemsPaid&&n.itemsPaid.length>0&&(u+="Menu yang dibayar:\n",n.itemsPaid.forEach(e=>{u+=x(` • ${(0,t.b)(e)} ${e.nama}`,o((0,t.c)(e)))})),u+=c,u+=x("Nominal Dibayar:",o(n.amount)),u+=x("Metode Bayar:",n.paymentMethod||"Tunai"),"Cash"===n.paymentMethod&&n.cashTendered&&(u+=x("Uang Diterima:",o(n.cashTendered)),u+=x("Kembalian:",o(n.change||0))),u+=c,u+=x("Total Tagihan Nota:",o(e.total));let b=void 0!==e.remainingBalance?e.remainingBalance:Math.max(0,e.total-(e.paidAmount||n.amount));return u+=x("SISA TAGIHAN:",o(b)),u+=p,b>0?(u+=m(" STATUS: BELUM LUNAS"),u+=m("Harap simpan bukti pembayaran ini")):u+=m(" STATUS: LUNAS"),s.enableWatermark&&(u+="\n"+m("[ SakuNota - Solusi Kasir UMKM ]")),u+="\n\n\n"},"generateReceiptHtml",0,function(e,t="all",n){e=(0,i.D)(e);let r=(0,i.D)(n||(0,a.getStoreSettings)());r.storeLogo=(0,i.h)(r.storeLogo);let s="80mm"===r.paperWidth,o=s?"80mm":"58mm",l=s?"72mm":"52mm",d=e.orderId?`A-${e.orderId}`:e.id?`A-${e.id}`:"-";return`
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
          font-size: ${s?"13px":"11px"};
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
        .store-title { font-size: ${s?"16px":"14px"}; font-weight: 900; text-transform: uppercase; }
        .store-sub { font-size: ${s?"11px":"10px"}; }
        .order-banner { text-align: center; padding: 4px 0; }
        .order-num { font-size: ${s?"24px":"20px"}; font-weight: 900; }
        .badge { display: inline-block; padding: 1px 4px; border: 1px solid #000; font-size: 10px; font-weight: bold; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 2px 0; }
        .col-item { text-align: left; word-break: break-word; }
        .col-price { text-align: right; white-space: nowrap; padding-left: 6px; }
        .item-name { font-weight: bold; }
        .item-mod { font-size: 0.9em; padding-left: 8px; color: #222; }
        .item-note { font-size: 0.85em; padding-left: 8px; font-style: italic; }
        .total-row { font-size: ${s?"15px":"13px"}; font-weight: 900; margin-top: 3px; }
        .status-box { text-align: center; font-weight: 900; padding: 4px; border: 1px dashed #000; margin: 6px 0; }
        .footer-text { font-size: 10px; text-align: center; margin-top: 8px; white-space: pre-line; }
        .watermark { font-size: 9px; text-align: center; margin-top: 8px; color: #333; }
      </style>
    </head>
    <body>
      ${c(e,t,r,s)}
    </body>
    </html>
  `},"generateTestReceiptData",0,function(e){e||(0,a.getStoreSettings)();let t=new Date;return{id:999,orderId:"999",createdAt:t.toISOString(),date:t.toLocaleString("id-ID"),customerName:"Budi Santoso (Uji Coba)",tableName:"Meja Tes #01",orderType:"Dine-in",paymentMethod:"Tunai",operatorName:"Kasir SakuNota",notes:"Uji format pembungkusan teks panjang & kalkulasi",items:[{nama:"Nasi Goreng Spesial Babat Gongso Pedas Manis",qty:2,harga:28e3,kategori:"Makanan Utama",selectedModifiers:[{optionName:"Level 3 - Ekstra Pedas Cabai Rawit",harga:2e3},{optionName:"Tambah Telur Ceplok Setengah Matang",harga:4e3}]},{nama:"Es Kopi Susu Gula Aren Spesial Nusantara",qty:2,harga:18e3,kategori:"Minuman",selectedModifiers:[{optionName:"Less Sugar (50% Manis)",harga:0},{optionName:"Extra Espresso Shot",harga:5e3}]}],subtotal:106e3,discount:6e3,discountType:"fixed",serviceCharge:5e3,tax:10500,total:115500,cashTendered:12e4,change:4500,isDraft:!1}},"generateZReportHtml",0,function(e,t){e=(0,i.D)(e);let n=(0,i.D)(t||(0,a.getStoreSettings)()),r="80mm"===n.paperWidth,s=void 0!==e.cashDifference?e.cashDifference:0,l="SELISIH: Rp 0 (PAS)";return s>0&&(l=`SELISIH: +${o(s)} (LEBIH)`),s<0&&(l=`SELISIH: -${o(Math.abs(s))} (KURANG)`),`
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
      <div class="center bold" style="font-size: 14px;">${n.storeName||"SAKUNOTA"}</div>
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

      ${n.enableWatermark?'<div class="center" style="font-size: 9px; margin-top: 10px; color: #444;">[ SakuNota - Solusi Kasir UMKM ]</div>':""}
    </body>
    </html>
  `},"generateZReportReceipt",0,function(e,t){e=(0,i.o)(e);let n=(0,i.o)(t||(0,a.getStoreSettings)()),r="80mm"===n.paperWidth?48:32,s="-".repeat(r)+"\n",d="=".repeat(r)+"\n",c=e=>e?l(e,r).map(e=>{let t=Math.max(0,Math.floor((r-e.length)/2));return" ".repeat(t)+e+"\n"}).join(""):"",p=(e,t)=>{let a=r-e.length-t.length;return a<=0?`${e}
${t.padStart(r," ")}
`:`${e}${" ".repeat(a)}${t}
`},m="";m+=c(n.storeName||"SAKUNOTA"),m+=c("*** LAPORAN TUTUP SHIFT (Z-REPORT) ***"),m+=d,m+=p("Shift ID:",`#${e.id||"-"}`),m+=p("Kasir/Operator:",e.operatorName||"Kasir"),"owner"===e.closedBy&&(m+=p("Ditutup Oleh:",`${e.closedByOperator||"Pemilik"} (Pemilik)`),e.closureReason&&(m+=p("Alasan Tutup:",e.closureReason))),m+=p("Waktu Buka:",e.startTime?new Date(e.startTime).toLocaleString("id-ID"):"-"),m+=p("Waktu Tutup:",e.endTime?new Date(e.endTime).toLocaleString("id-ID"):new Date().toLocaleString("id-ID")),m+=s,m+=c("--- REKONSILIASI KAS LACI ---"),m+=p("1. Modal Awal:",o(e.startingCash||0)),m+=p("2. Penjualan Tunai:",`+${o(e.cashSales||0)}`),e.cashIn&&e.cashIn>0&&(m+=p("3. Kas Masuk:",`+${o(e.cashIn)}`)),e.cashOut&&e.cashOut>0&&(m+=p("4. Kas Keluar:",`-${o(e.cashOut)}`)),e.cashRefunds&&e.cashRefunds>0&&(m+=p("5. Refund Tunai:",`-${o(e.cashRefunds)}`)),m+=s,m+=p("KAS FISIK SEHARUSNYA:",o(e.expectedCash||0)),m+=p("HASIL HITUNG FISIK:",o(void 0!==e.actualCash?e.actualCash:e.expectedCash));let x=void 0!==e.cashDifference?e.cashDifference:0,u="SELISIH: Rp 0 (PAS)";return x>0&&(u=`SELISIH: +${o(x)} (LEBIH)`),x<0&&(u=`SELISIH: -${o(Math.abs(x))} (KURANG)`),m+=c(u),m+=d,m+=c("--- NON-TUNAI (BANK / QRIS) ---"),m+=p("QRIS / Transfer:",o(e.nonCashSales||0)),m+=c("(Masuk langsung ke rekening merchant)"),m+=s,e.notes&&(m+=`Catatan: ${e.notes}
`,m+=s),m+=c("Tanda Tangan Kasir,"),m+="\n\n\n",m+=c(`( ${e.operatorName||"Kasir"} )`),n.enableWatermark&&(m+="\n"+c("[ SakuNota - Solusi Kasir UMKM ]")),m+="\n\n\n"}],71798)}])})();