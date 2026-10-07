const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace(/<p className="font-bold text-gray-800 dark:text-white">Tagihan meja ini sudah LUNAS<\/p>[\s\S]*?<button onClick=\{handleClearTable\}/, 
`<p className="font-bold text-gray-800 dark:text-white">Tagihan meja ini sudah LUNAS</p>
<div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4 mt-4 mb-5 text-sm text-yellow-800 dark:text-yellow-200 text-left w-full shadow-inner">
  <p className="font-bold mb-1">Cara Tambah Pesanan:</p>
  <p>Langsung klik/pilih menu di sebelah kiri. Pesanan akan otomatis masuk sebagai <b>Nota Baru</b> untuk meja ini.</p>
</div>
<button onClick={handleClearTable}`);

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
