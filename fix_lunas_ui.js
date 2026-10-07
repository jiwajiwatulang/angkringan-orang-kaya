const fs = require('fs');
let c = fs.readFileSync('src/app/page.tsx', 'utf8');

c = c.replace('<button onClick={() => setView(\'menu\')} className="w-full mt-2 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white font-semibold">+ Tambah Pesanan Baru</button>', '');

c = c.replace('<p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5 px-4">Mau tambah pesanan? Pilih menu 👈 akan jadi <b>nota baru</b>.<br/>Pelanggan sudah pulang? Kosongkan meja.</p>', 
'<p className="text-sm text-gray-500 dark:text-gray-400 mt-2 mb-5 px-4">Jika ingin <b>nambah pesanan</b>, langsung saja klik/pilih menu makanan di sebelah kiri (pesanan akan otomatis masuk ke nota baru untuk meja ini).<br/><br/>Jika meja sudah kosong, silakan klik tombol di bawah.</p>');

fs.writeFileSync('src/app/page.tsx', c, 'utf8');
