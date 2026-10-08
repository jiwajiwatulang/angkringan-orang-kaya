const fs = require('fs');
const dump = JSON.parse(fs.readFileSync('menu_dump.json', 'utf8'));
const menuData = dump[0].results.map(m => ({
  id: m.id,
  nama: m.nama,
  harga: m.harga,
  kategori: m.kategori,
  isSoldOut: Boolean(m.isSoldOut),
  urutan: m.urutan
}));
const initialData = {
  menus: menuData,
  tables: Array.from({length: 20}, (_, i) => ({ nomor: `Meja ${i+1}`, status: 'kosong' }))
};
fs.writeFileSync('src/lib/initialData.json', JSON.stringify(initialData, null, 2), 'utf8');
