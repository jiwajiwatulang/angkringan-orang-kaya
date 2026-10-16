import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const staticDir = path.resolve('out');
const profileDir = path.resolve('.test-profile-menu-flow');
const artifactDir = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\4c7a1509-3477-4c30-b661-18b9208deb22');
const backupFilePath = path.join(profileDir, 'sakunota-menu-audit-backup.json');
const port = 4366;

const MIME = { 
  '.html': 'text/html', 
  '.js': 'text/javascript', 
  '.css': 'text/css', 
  '.json': 'application/json', 
  '.png': 'image/png', 
  '.jpg': 'image/jpeg', 
  '.svg': 'image/svg+xml', 
  '.txt': 'text/plain', 
  '.woff2': 'font/woff2', 
  '.ico': 'image/x-icon', 
  '.webp': 'image/webp' 
};

const results = [];
function check(condition, name, details = '') {
  if (condition) {
    results.push({ name, passed: true, details });
    console.log(`  ✅ PASS: ${name}${details ? ` (${details})` : ''}`);
  } else {
    results.push({ name, passed: false, details });
    console.error(`  ❌ FAIL: ${name}${details ? ` (${details})` : ''}`);
    throw new Error(`Assertion Failed: ${name} ${details}`);
  }
}

// Helper untuk membaca tabel dari IndexedDB 'AngkringanDB'
async function readDbStore(page, storeName) {
  return await page.evaluate(async (sName) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AngkringanDB');
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(sName)) {
          db.close();
          return resolve([]);
        }
        const tx = db.transaction(sName, 'readonly');
        const store = tx.objectStore(sName);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          db.close();
          resolve(getAll.result || []);
        };
        getAll.onerror = (err) => {
          db.close();
          reject(err);
        };
      };
      req.onerror = (err) => reject(err);
    });
  }, storeName);
}

// 1. Static Web Server
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const root = path.resolve(staticDir);
  const candidates = [
    path.join(root, p),
    path.join(root, p + '.html'),
    path.join(root, p, 'index.html'),
    path.join(root, 'index.html')
  ];
  for (const f of candidates) {
    if (f.startsWith(root) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.writeHead(200, { 
        'Content-Type': MIME[path.extname(f)] || 'application/octet-stream',
        'Service-Worker-Allowed': '/'
      });
      return fs.createReadStream(f).pipe(res);
    }
  }
  res.writeHead(404); 
  res.end('Not Found');
});

await new Promise(r => server.listen(port, r));
console.log(`[TEST-SERVER] Berjalan di http://localhost:${port}`);

if (fs.existsSync(profileDir)) {
  try {
    fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {}
}
fs.mkdirSync(profileDir, { recursive: true });

console.log('\n================================================================');
console.log('  🍔 SAKUNOTA MENU & STOK MANAGEMENT E2E VERIFICATION SUITE');
console.log('================================================================\n');

let context;
try {
  context = await chromium.launchPersistentContext(profileDir, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    acceptDownloads: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    viewport: { width: 1280, height: 860 }
  });
  const page = context.pages()[0] || await context.newPage();

  // -------------------------------------------------------------------------
  // TAHAP 1: Otentikasi Admin & Navigasi ke Kelola Menu
  // -------------------------------------------------------------------------
  console.log('[TAHAP 1] Otentikasi Admin & Inisialisasi...');
  await page.goto(`http://localhost:${port}/admin`);
  await page.waitForTimeout(1000);

  const setupPinInput = page.locator('input[placeholder="4-6 digit angka..."]');
  if (await setupPinInput.isVisible()) {
    await setupPinInput.fill('1234');
    await page.locator('input[placeholder="Ulangi PIN baru..."]').fill('1234');
    await page.locator('button:has-text("Simpan PIN & Buat Kode Pemulihan")').click();
    await page.waitForTimeout(800);
    const recoveryCheckbox = page.locator('input[type="checkbox"]');
    if (await recoveryCheckbox.isVisible()) {
      await recoveryCheckbox.check();
      await page.locator('button:has-text("Selesai & Buka Backoffice")').click();
      await page.waitForTimeout(800);
    }
  }

  const pinInput = page.locator('input[placeholder="Masukkan PIN..."]');
  if (await pinInput.isVisible()) {
    await pinInput.fill('1234');
    await page.locator('button:has-text("Masuk Backoffice")').click();
    await page.waitForTimeout(1000);
  }

  await page.goto(`http://localhost:${port}/admin/menu`);
  await page.waitForTimeout(1500);
  check(page.url().includes('/admin/menu'), 'Berhasil masuk ke halaman Kelola Menu & Stok (/admin/menu)');

  // -------------------------------------------------------------------------
  // TAHAP 2: Pemeriksaan Form Default Tambah Menu & Screenshot Form Tambah
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 2] Memeriksa Form Default Tambah Menu...');
  const addMenuBtn = page.locator('button:has-text("Tambah Menu")').first();
  await addMenuBtn.waitFor({ state: 'visible', timeout: 5000 });
  await addMenuBtn.click();
  await page.waitForTimeout(500);

  const skuInput = page.locator('input[placeholder="Kosongkan jika tidak ada kode khusus"]');
  await skuInput.waitFor({ state: 'visible', timeout: 5000 });
  const defaultSkuVal = await skuInput.inputValue();
  check(defaultSkuVal === '', 'Field SKU default benar-benar kosong (tidak otomatis diisi SKU-001)');

  const tersediaActiveBadge = page.locator('form button:has-text("Tersedia") >> text=✓ Aktif');
  check(await tersediaActiveBadge.isVisible(), 'Status Ketersediaan default adalah [🟢 Tersedia] aktif');

  const modCheckbox = page.locator('form input[type="checkbox"]').first();
  check((await modCheckbox.isChecked()) === false, 'Checkbox Pilihan Tambahan default tidak tercentang (nonaktif)');

  // Screenshot Form Tambah Menu
  const formTambahShot = path.join(artifactDir, 'menu_form_tambah.png');
  await page.screenshot({ path: formTambahShot, fullPage: false });
  console.log(`  📸 Screenshot Form Tambah Menu disimpan: ${formTambahShot}`);

  // -------------------------------------------------------------------------
  // TAHAP 3: Tambah Menu Tanpa SKU, Kategori Standar, Tanpa Modifier & Anti-Auto-Enrichment
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 3] Menambah Menu Tanpa SKU & Tanpa Modifier + Uji Anti-Auto-Enrichment...');
  await page.locator('input[placeholder="Contoh: Ayam Panggang, Nasi Goreng, Es Teh"]').fill('Pisang Pasir Coklat Crispy');
  await page.locator('input[placeholder="Contoh: 15000"]').fill('15000');
  await page.locator('form select').first().selectOption('Camilan');

  await page.locator('button[type="submit"]:has-text("Tambah Menu")').click();
  await page.waitForTimeout(1000);

  let allMenus = await readDbStore(page, 'menuItems');
  let pisangMenu = allMenus.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(pisangMenu !== undefined, 'Menu "Pisang Pasir Coklat Crispy" tersimpan di IndexedDB AngkringanDB');
  check(pisangMenu.sku === undefined, 'SKU di database bernilai undefined saat dikosongkan', `sku=${pisangMenu.sku}`);
  check(pisangMenu.kategori === 'Camilan', 'Kategori standar terpilih tersimpan akurat', pisangMenu.kategori);
  check(Array.isArray(pisangMenu.modifiers) && pisangMenu.modifiers.length === 0, 'Modifiers tersimpan sebagai array kosong []');

  // Reload halaman berkali-kali untuk menguji getMenus() tidak menginjeksi modifier otomatis
  await page.reload();
  await page.waitForTimeout(1200);
  await page.reload();
  await page.waitForTimeout(1200);

  allMenus = await readDbStore(page, 'menuItems');
  pisangMenu = allMenus.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(pisangMenu.modifiers.length === 0, 'Setelah 2x reload & getMenus(), modifiers tetap [] (Zero Auto-Enrichment)');

  // Pilih filter kategori "Camilan" untuk menampilkan Pisang Pasir di halaman pertama
  await page.locator('button:has-text("Camilan")').first().click();
  await page.waitForTimeout(300);

  const pisangRow = page.locator('tr:has-text("Pisang Pasir Coklat Crispy")').first();
  check(await pisangRow.isVisible(), 'Baris menu Pisang Pasir tampil di tabel UI pada kategori Camilan');
  const pisangRowText = await pisangRow.innerText();
  check(pisangRowText.includes(`ID #${pisangMenu.id}`) && !pisangRowText.includes('SKU-'), 'Tabel UI menampilkan ID internal (tanpa SKU otomatis) dan tanpa badge modifier');

  // -------------------------------------------------------------------------
  // TAHAP 4: Buat Kategori Baru & Konfigurasi Pilihan Tambahan (Tingkat Pedas & Lalapan)
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 4] Membuat Kategori Baru & Mengonfigurasi Pilihan Tambahan (Lalapan & Pedas)...');
  await page.locator('button:has-text("Tambah Menu")').first().click();
  await page.waitForTimeout(500);

  await page.locator('input[placeholder="Contoh: Ayam Panggang, Nasi Goreng, Es Teh"]').fill('Ayam Geprek Sambal Korek');
  await page.locator('input[placeholder="Contoh: 15000"]').fill('18000');
  await page.locator('input[placeholder="Kosongkan jika tidak ada kode khusus"]').fill('GEPREK-01');

  // Pilih "+ Buat Kategori Baru..."
  await page.locator('form select').first().selectOption('Lainnya');
  await page.waitForTimeout(200);
  const customCatInput = page.locator('input[placeholder*="Ketik kategori baru"]');
  check(await customCatInput.isVisible(), 'Input kategori baru muncul saat memilih "+ Buat Kategori Baru..."');
  await customCatInput.fill('Spesial Bakar & Penyet');

  // Aktifkan Pilihan Tambahan
  await page.locator('form input[type="checkbox"]').first().check();
  await page.waitForTimeout(300);

  // Klik Template Cepat: Tingkat Pedas & Tambah Lalapan (+2k)
  await page.locator('form button:has-text("Tingkat Pedas")').click();
  await page.waitForTimeout(200);
  await page.locator('form button:has-text("Tambah Lalapan")').click();
  await page.waitForTimeout(300);

  // Screenshot Editor Modifier di Form Tambah
  const modEditorShot = path.join(artifactDir, 'menu_modifier_editor.png');
  await page.screenshot({ path: modEditorShot, fullPage: false });
  console.log(`  📸 Screenshot Editor Modifier disimpan: ${modEditorShot}`);

  await page.locator('button[type="submit"]:has-text("Tambah Menu")').click();
  await page.waitForTimeout(1000);

  // Verifikasi Kategori Baru muncul di filter bar & bisa dipilih
  const newCatChip = page.locator('button:has-text("Spesial Bakar & Penyet")').first();
  check(await newCatChip.isVisible(), 'Kategori baru "Spesial Bakar & Penyet" muncul di tombol filter kategori');
  await newCatChip.click();
  await page.waitForTimeout(300);

  allMenus = await readDbStore(page, 'menuItems');
  let geprekMenu = allMenus.find(m => m.nama === 'Ayam Geprek Sambal Korek');
  check(geprekMenu !== undefined, 'Menu "Ayam Geprek Sambal Korek" tersimpan di database');
  check(geprekMenu.kategori === 'Spesial Bakar & Penyet', 'Kategori baru tersimpan di database', geprekMenu.kategori);
  check(geprekMenu.sku === 'GEPREK-01', 'SKU kustom GEPREK-01 tersimpan di database', geprekMenu.sku);
  check(geprekMenu.modifiers.length === 2, '2 grup pilihan tambahan (Tingkat Pedas & Lalapan) tersimpan di database');

  // -------------------------------------------------------------------------
  // TAHAP 5: Edit Menu — Memuat Kembali Modifier, Menambah Opsi & Screenshot Form Edit
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 5] Menguji Edit Menu: Memuat & Mengubah Pilihan Tambahan + Hapus SKU...');
  const geprekRow = page.locator('tr:has-text("Ayam Geprek Sambal Korek")').first();
  await geprekRow.locator('button[title="Edit Menu"]').click();
  await page.waitForTimeout(600);

  check(await page.locator('h3:has-text("Edit Menu")').isVisible(), 'Modal "✏️ Edit Menu" terbuka');

  // Pastikan kategori kustom terpilih langsung di select
  const selectedCatInEdit = await page.locator('form select').first().inputValue();
  check(selectedCatInEdit === 'Spesial Bakar & Penyet', 'Kategori kustom langsung terpilih di dropdown Edit Menu', selectedCatInEdit);

  // Pastikan grup modifier ter-load di form Edit
  const groupInputs = page.locator('input[placeholder*="Nama Grup"]');
  check((await groupInputs.count()) === 2, 'Kedua grup pilihan tambahan berhasil dimuat kembali di form Edit Menu');

  // Tambahkan opsi baru "Kol Goreng" (+Rp 3.000) pada grup ke-2 (Pilihan Tambah Lalapan)
  const addOptionBtns = page.locator('button:has-text("Tambah Pilihan Opsi")');
  await addOptionBtns.nth(1).click();
  await page.waitForTimeout(300);

  const optionNameInputs = page.locator('input[placeholder*="Nama Opsi"]');
  const lastOptIdx = (await optionNameInputs.count()) - 1;
  await optionNameInputs.nth(lastOptIdx).fill('Kol Goreng');

  const optionPriceInputs = page.locator('form input[placeholder="0"]');
  const lastPriceIdx = (await optionPriceInputs.count()) - 1;
  await optionPriceInputs.nth(lastPriceIdx).fill('3000');
  await page.waitForTimeout(300);

  // Screenshot Form Edit Menu
  const formEditShot = path.join(artifactDir, 'menu_form_edit.png');
  await page.screenshot({ path: formEditShot, fullPage: false });
  console.log(`  📸 Screenshot Form Edit Menu disimpan: ${formEditShot}`);

  // Simpan Perubahan
  await page.locator('button[type="submit"]:has-text("Simpan Perubahan")').click();
  await page.waitForTimeout(1000);

  allMenus = await readDbStore(page, 'menuItems');
  geprekMenu = allMenus.find(m => m.nama === 'Ayam Geprek Sambal Korek');
  const lalapanGroup = geprekMenu.modifiers.find(g => g.nama.includes('Lalapan'));
  const kolGorengOpt = lalapanGroup?.options.find(o => o.nama === 'Kol Goreng');
  check(kolGorengOpt !== undefined && kolGorengOpt.harga === 3000, 'Opsi baru "Kol Goreng (+Rp 3.000)" hasil edit tersimpan di database');

  // Uji Edit SKU menjadi kosong kembali pada Pisang Pasir (pilih kategori Camilan)
  await page.locator('button:has-text("Camilan")').first().click();
  await page.waitForTimeout(300);
  await pisangRow.locator('button[title="Edit Menu"]').click();
  await page.waitForTimeout(400);
  await page.locator('input[placeholder="Kosongkan jika tidak ada kode khusus"]').fill('TEMP-SKU-99');
  await page.locator('button[type="submit"]:has-text("Simpan Perubahan")').click();
  await page.waitForTimeout(800);

  await pisangRow.locator('button[title="Edit Menu"]').click();
  await page.waitForTimeout(400);
  await page.locator('input[placeholder="Kosongkan jika tidak ada kode khusus"]').fill('');
  await page.locator('button[type="submit"]:has-text("Simpan Perubahan")').click();
  await page.waitForTimeout(800);

  allMenus = await readDbStore(page, 'menuItems');
  pisangMenu = allMenus.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(pisangMenu.sku === undefined, 'Mengosongkan SKU saat Edit Menu berhasil menghapus SKU menjadi undefined tanpa auto-fill');

  // -------------------------------------------------------------------------
  // TAHAP 6: Validasi Penolakan SKU Duplikat
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 6] Menguji Penolakan SKU Duplikat...');
  await page.locator('button:has-text("Tambah Menu")').first().click();
  await page.waitForTimeout(400);
  await page.locator('input[placeholder="Contoh: Ayam Panggang, Nasi Goreng, Es Teh"]').fill('Ayam Bakar Madu');
  await page.locator('input[placeholder="Contoh: 15000"]').fill('20000');
  await page.locator('input[placeholder="Kosongkan jika tidak ada kode khusus"]').fill('GEPREK-01');
  await page.locator('button[type="submit"]:has-text("Tambah Menu")').click();
  await page.waitForTimeout(600);

  const dupToast = page.locator('text=sudah digunakan oleh menu').first();
  check(await dupToast.isVisible(), 'Pesan error SKU duplikat tampil jelas saat mengisi SKU yang sudah dipakai');

  // Tutup form & buang perubahan
  await page.locator('form button:has-text("Batal")').click();
  await page.waitForTimeout(300);
  const discardBtn = page.locator('button:has-text("Buang Perubahan")');
  if (await discardBtn.isVisible()) {
    await discardBtn.click();
    await page.waitForTimeout(300);
  }

  // -------------------------------------------------------------------------
  // TAHAP 7: Status Ketersediaan Saling Eksklusif, Idempotensi & Persistensi Refresh
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 7] Menguji Status Tersedia / Tidak Tersedia Saling Eksklusif & Refresh...');
  await page.locator('button:has-text("Camilan")').first().click();
  await page.waitForTimeout(300);
  const targetRow = page.locator('tr:has-text("Pisang Pasir Coklat Crispy")').first();
  const btnHabis = targetRow.locator('button:has-text("🔴 Habis")');

  // Klik 🔴 Habis
  await btnHabis.click();
  await page.waitForTimeout(800);

  allMenus = await readDbStore(page, 'menuItems');
  pisangMenu = allMenus.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(pisangMenu.isSoldOut === true, 'Klik [🔴 Habis] mengubah status isSoldOut menjadi true di database');

  // Klik ulang 🔴 Habis (Idempotensi)
  await btnHabis.click();
  await page.waitForTimeout(400);
  allMenus = await readDbStore(page, 'menuItems');
  pisangMenu = allMenus.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(pisangMenu.isSoldOut === true, 'Klik ulang [🔴 Habis] yang sudah aktif bersifat idempotent (tetap Habis)');

  // Refresh halaman dan pastikan status Habis bertahan
  await page.reload();
  await page.waitForTimeout(1200);

  // Set Tampil: Semua (value "0") agar seluruh menu tampil di 1 halaman tabel
  await page.locator('select').nth(1).selectOption('0');
  await page.waitForTimeout(400);

  allMenus = await readDbStore(page, 'menuItems');
  pisangMenu = allMenus.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(pisangMenu.isSoldOut === true, 'Status [🔴 Habis] tetap bertahan di database setelah halaman di-refresh');

  const btnHabisClassAfterReload = await page.locator('tr:has-text("Pisang Pasir Coklat Crispy")').first().locator('button:has-text("🔴 Habis")').getAttribute('class');
  check(btnHabisClassAfterReload.includes('bg-rose-600'), 'Tombol [🔴 Habis] tetap aktif secara eksklusif di UI setelah halaman di-refresh');

  // Screenshot Tabel Kelola Menu
  const tableShot = path.join(artifactDir, 'menu_management_table.png');
  await page.screenshot({ path: tableShot, fullPage: false });
  console.log(`  📸 Screenshot Tabel Kelola Menu disimpan: ${tableShot}`);

  // -------------------------------------------------------------------------
  // TAHAP 8: Integrasi Kasir POS — Perhitungan Pilihan Tambahan & Pencatatan Nota
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 8] Menguji Perhitungan Pilihan Tambahan di POS & Pencatatan di Nota...');
  await page.goto(`http://localhost:${port}/pos?view=menu`);
  await page.waitForTimeout(1500);

  // Filter ke kategori "Camilan" di POS untuk memeriksa Pisang Pasir yang berstatus Habis
  await page.locator('button:has-text("Camilan")').first().click();
  await page.waitForTimeout(300);

  const soldOutPosCard = page.locator('button:has-text("Pisang Pasir Coklat Crispy")').first();
  await soldOutPosCard.waitFor({ state: 'visible', timeout: 5000 });
  check(await soldOutPosCard.isDisabled(), 'Menu berstatus [🔴 Habis] otomatis terkunci (disabled) di layar Kasir POS');

  // Filter ke kategori baru "Spesial Bakar & Penyet" di POS dan klik Ayam Geprek Sambal Korek (Rp 18.000)
  await page.locator('button:has-text("Spesial Bakar & Penyet")').first().click();
  await page.waitForTimeout(300);

  const geprekPosCard = page.locator('button:has-text("Ayam Geprek Sambal Korek")').first();
  await geprekPosCard.click();
  await page.waitForTimeout(600);

  check(await page.locator('text=Pilihan Menu').first().isVisible(), 'Modal Pilihan Menu muncul saat memilih menu dengan modifier di POS');

  // Pilih Tingkat Pedas: "Sedang" (Rp 0)
  await page.locator('button:has-text("Sedang")').first().click();
  await page.waitForTimeout(200);

  // Pilih Tambah Lalapan: "Kol Goreng" (+Rp 3.000)
  await page.locator('button:has-text("Kol Goreng")').first().click();
  await page.waitForTimeout(300);

  // Verifikasi Subtotal Item di modal: 18.000 + 3.000 = Rp 21.000
  const modalSubtotalText = await page.locator('text=Subtotal Item').locator('..').innerText();
  check(modalSubtotalText.includes('21.000'), 'Subtotal Item di modal POS menghitung ekstra harga dengan benar (Rp 21.000)', modalSubtotalText.replace(/\n/g, ' '));

  const posModShot = path.join(artifactDir, 'pos_modifier_selection.png');
  await page.screenshot({ path: posModShot, fullPage: false });
  console.log(`  📸 Screenshot Pilihan Modifier POS disimpan: ${posModShot}`);

  // Tambahkan ke keranjang
  await page.locator('button:has-text("+ Tambahkan")').click();
  await page.waitForTimeout(600);

  const posCartShot = path.join(artifactDir, 'pos_cart_with_modifiers.png');
  await page.screenshot({ path: posCartShot, fullPage: false });
  console.log(`  📸 Screenshot Keranjang POS disimpan: ${posCartShot}`);

  // Lanjut ke Pembayaran
  await page.locator('button:has-text("Lanjut ke Pembayaran")').click();
  await page.waitForTimeout(600);

  // Pilih Takeaway (Bungkus), Uang Pas, lalu Bayar Sekarang
  const takeawayBtn = page.locator('button:has-text("Takeaway")').first();
  if (await takeawayBtn.isVisible()) {
    await takeawayBtn.click();
    await page.waitForTimeout(200);
  }
  await page.locator('button:has-text("Uang Pas")').click();
  await page.waitForTimeout(200);
  await page.locator('button:has-text("Bayar Sekarang")').click();
  await page.waitForTimeout(1200);

  check(await page.locator('#printable-receipt').isVisible(), 'Nota pembayaran berhasil diterbitkan setelah transaksi selesai');
  const receiptText = await page.locator('#printable-receipt').innerText();
  check(receiptText.includes('Ayam Geprek Sambal Korek'), 'Nama menu tercatat di struk nota');
  check(receiptText.includes('Kol Goreng'), 'Pilihan tambahan "Kol Goreng" tercatat di struk nota');
  check(receiptText.includes('21.000'), 'Total Rp 21.000 tercatat akurat di struk nota');

  const receiptShot = path.join(artifactDir, 'pos_receipt_success.png');
  await page.screenshot({ path: receiptShot, fullPage: false });
  console.log(`  📸 Screenshot Nota Struk POS disimpan: ${receiptShot}`);

  // Verifikasi penyimpanan transaksi di IndexedDB (orders & orderItems)
  const dbOrders = await readDbStore(page, 'orders');
  const dbOrderItems = await readDbStore(page, 'orderItems');
  const latestOrder = dbOrders[dbOrders.length - 1];
  check(latestOrder !== undefined && latestOrder.total === 21000, 'Order tersimpan di tabel orders dengan total Rp 21.000', `total=${latestOrder?.total}`);

  const latestOrderItems = dbOrderItems.filter(oi => oi.orderId === latestOrder.id);
  check(latestOrderItems.length === 1, 'Item pesanan tersimpan di tabel orderItems');
  check(latestOrderItems[0].hargaSatuan === 21000, 'Harga satuan item + ekstra modifier tercatat Rp 21.000 (18.000 + 3.000)');
  const savedMods = latestOrderItems[0].selectedModifiers || [];
  check(
    savedMods.some(m => m.optionName === 'Sedang' && m.harga === 0) &&
    savedMods.some(m => m.optionName === 'Kol Goreng' && m.harga === 3000),
    'Snapshot selectedModifiers pada orderItems menyimpan "Sedang (Rp 0)" dan "Kol Goreng (+Rp 3.000)"'
  );

  // -------------------------------------------------------------------------
  // TAHAP 9: Verifikasi Kompatibilitas Backup & Restore Data Usaha
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 9] Menguji Keutuhan Data Transaksi & Menu pada Backup / Restore...');
  await page.goto(`http://localhost:${port}/admin/pengaturan/data`);
  await page.waitForTimeout(1500);

  const downloadPromise = page.waitForEvent('download');
  await page.locator('button:has-text("Cadangkan Sekarang")').first().click();
  const download = await downloadPromise;
  await download.saveAs(backupFilePath);

  check(fs.existsSync(backupFilePath), 'File cadangan JSON berhasil diunduh melalui UI');
  const backupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));

  const backupGeprek = backupData.menus?.find(m => m.nama === 'Ayam Geprek Sambal Korek');
  const backupPisang = backupData.menus?.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(backupGeprek !== undefined && backupGeprek.modifiers?.length === 2, 'File backup JSON menyimpan konfigurasi modifier menu dengan utuh');
  check(backupPisang !== undefined && backupPisang.sku === undefined && backupPisang.isSoldOut === true, 'File backup JSON menyimpan status Habis & SKU kosong dengan benar');
  check(backupData.orders?.some(o => o.total === 21000), 'File backup JSON menyimpan riwayat transaksi POS dengan benar');
  check(backupData.orderItems?.some(oi => oi.selectedModifiers?.some(m => m.optionName === 'Kol Goreng')), 'File backup JSON menyimpan detail modifier pada nota transaksi');

  // Uji Restore kembali melalui UI
  await page.setInputFiles('#backup-file-input', backupFilePath);
  await page.waitForSelector('text=Kembalikan Data Usaha?');
  await page.locator('button:has-text("Ya, Kembalikan Data Sekarang")').click();
  await page.waitForTimeout(2500);

  const restoredMenus = await readDbStore(page, 'menuItems');
  const restoredOrders = await readDbStore(page, 'orders');
  const restoredOrderItems = await readDbStore(page, 'orderItems');

  const restoredGeprek = restoredMenus.find(m => m.nama === 'Ayam Geprek Sambal Korek');
  const restoredPisang = restoredMenus.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(restoredGeprek !== undefined && restoredGeprek.modifiers.length === 2, 'Setelah Restore, menu & modifier kembali utuh di IndexedDB');
  check(restoredPisang !== undefined && restoredPisang.sku === undefined && restoredPisang.isSoldOut === true, 'Setelah Restore, menu tanpa SKU & status Habis kembali utuh');
  check(restoredOrders.some(o => o.total === 21000) && restoredOrderItems.some(oi => oi.selectedModifiers?.length === 2), 'Setelah Restore, seluruh data transaksi & nota modifier tetap utuh 100%');

  // Kembalikan Pisang Pasir ke Tersedia di akhir tes dan verifikasi
  await page.goto(`http://localhost:${port}/admin/menu`);
  await page.waitForTimeout(1200);
  await page.locator('button:has-text("Camilan")').first().click();
  await page.waitForTimeout(300);
  await page.locator('tr:has-text("Pisang Pasir Coklat Crispy")').first().locator('button:has-text("🟢 Tersedia")').click();
  await page.waitForTimeout(800);
  allMenus = await readDbStore(page, 'menuItems');
  pisangMenu = allMenus.find(m => m.nama === 'Pisang Pasir Coklat Crispy');
  check(pisangMenu.isSoldOut === false, 'Klik [🟢 Tersedia] mengembalikan status menu menjadi Tersedia (isSoldOut = false)');

  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  console.log('\n================================================================');
  console.log(`  📊 HASIL AKHIR E2E MENU & STOK: ${passCount} PASSED, ${failCount} FAILED (Total: ${results.length})`);
  console.log('================================================================\n');

  await context.close();
  server.close();
  process.exit(failCount > 0 ? 1 : 0);

} catch (err) {
  const passCount = results.filter(r => r.passed).length;
  const failCount = results.filter(r => !r.passed).length;
  console.error('\n❌ TEST RUNNER ERROR:', err.message);
  console.log(`  📊 RINGKASAN SAAT BERHENTI: ${passCount} PASSED, ${failCount} FAILED`);
  if (context) await context.close().catch(() => {});
  server.close();
  process.exit(1);
}
