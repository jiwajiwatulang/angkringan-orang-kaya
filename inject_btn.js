const fs = require('fs');
let c = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

c = c.replace(/className="text-2xl font-bold mb-4">Pengaturan Web<\/h2>/, 
`className="text-2xl font-bold mb-4">Pengaturan Web</h2>
              <div className="mb-6 bg-red-50 p-4 rounded-lg border border-red-200">
                <h3 className="text-lg font-bold text-red-700 mb-2">Pemulihan Data Darurat</h3>
                <p className="text-sm text-red-600 mb-4">Gunakan tombol ini HANYA JIKA menu Anda hilang atau kosong. Ini akan menyuntikkan ulang semua data menu Anda dari cadangan server lama (D1).</p>
                <button 
                  onClick={async () => {
                    if(confirm('Yakin ingin menyuntikkan ulang data menu cadangan? Ini akan mereset menu saat ini.')) {
                      const { db } = await import('@/lib/dexie');
                      const initialData = (await import('@/lib/initialData.json')).default;
                      await db.table('menuItems').clear();
                      const menusToInsert = initialData.menus.map(m => ({
                        nama: m.nama,
                        harga: m.harga,
                        kategori: m.kategori,
                        isSoldOut: m.isSoldOut,
                        urutan: m.urutan
                      }));
                      await db.table('menuItems').bulkAdd(menusToInsert);
                      alert('Berhasil disuntikkan! Halaman akan dimuat ulang.');
                      window.location.reload();
                    }
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-bold"
                >
                  Suntik Ulang Data Menu Lama
                </button>
              </div>`);

fs.writeFileSync('src/app/admin/page.tsx', c, 'utf8');
