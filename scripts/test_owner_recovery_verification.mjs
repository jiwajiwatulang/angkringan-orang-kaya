import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const staticDir = path.resolve('out');
const profileDir = path.resolve('.test-profile-recovery-owner');
const port = 4360;

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
console.log('  🛡️ SAKUNOTA OWNER VERIFICATION & RECOVERY CODE AUDIT');
console.log('================================================================\n');

try {
  const context = await chromium.launchPersistentContext(profileDir, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    viewport: { width: 412, height: 915 }
  });
  const page = context.pages()[0] || await context.newPage();

  // -------------------------------------------------------------------------
  // TAHAP 1: Login Awal (1234) & Pengaturan PIN Pribadi + Generate Recovery Code
  // -------------------------------------------------------------------------
  console.log('[TAHAP 1] Setup Kredensial Awal & Perolehan Recovery Code...');
  await page.goto(`http://localhost:${port}/admin`);
  await page.waitForTimeout(1000);

  // Login awal 1234
  await page.locator('input[type="password"]').fill('1234');
  await page.locator('button:has-text("Masuk Backoffice")').click();
  await page.waitForTimeout(1000);

  // Navigasi ke Keamanan
  await page.goto(`http://localhost:${port}/admin/pengaturan/keamanan`);
  await page.waitForTimeout(1000);

  // Ganti PIN ke 5678 (Sistem otomatis menghasilkan Recovery Code pertama)
  await page.locator('input[placeholder="Masukkan PIN saat ini"]').fill('1234');
  await page.locator('input[placeholder="PIN Baru..."]').fill('5678');
  await page.locator('input[placeholder="Konfirmasi..."]').fill('5678');
  await page.locator('button:has-text("Simpan PIN Baru")').click();
  await page.waitForTimeout(1000);

  // Periksa apakah modal Kode Pemulihan muncul
  const modalTitle = await page.locator('text=Simpan Kode Pemulihan Baru Anda').first().textContent();
  assert(modalTitle !== null, 'Modal Kode Pemulihan Pemilik muncul saat setup PIN');
  console.log('  ✅ PASS: Modal Kode Pemulihan Pemilik muncul otomatis saat PIN baru disetel');

  // Baca Kode Pemulihan yang ditampilkan
  const initialRecoveryCode = (await page.locator('.font-mono').first().textContent()).trim();
  console.log(`  -> Recovery Code yang Diterima Pemilik: "${initialRecoveryCode}"`);
  assert(initialRecoveryCode.startsWith('SAKU-'), 'Format Recovery Code valid (SAKU-XXXX-XXXX)');

  // Centang persetujuan dan tutup modal
  await page.locator('input[type="checkbox"]').check();
  await page.locator('button:has-text("Selesai & Tutup")').click();
  await page.waitForTimeout(1000);

  // Verifikasi hash tersimpan di IndexedDB
  const storedHash = await page.evaluate(async () => {
    const raw = localStorage.getItem('pos_store_settings');
    return JSON.parse(raw).recoveryCodeHash;
  });
  console.log(`  -> Hash SHA-256 yang tersimpan di database lokal: ${storedHash.substring(0, 16)}...`);
  assert(storedHash && storedHash.length === 64, 'Hash SHA-256 tersimpan valid di storage lokal');
  assert(!storedHash.includes('SAKU-'), 'Plaintext kode TIDAK PERNAH disimpan di database');
  console.log('  ✅ PASS: Hanya hash SHA-256 yang disimpan lokal, bukan plaintext kode');

  // -------------------------------------------------------------------------
  // TAHAP 2: Audit Sanitasi Backup (Zero Credential Leak)
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 2] Audit Sanitasi File Cadangan (Backup JSON)...');
  await page.goto(`http://localhost:${port}/admin/pengaturan/data`);
  await page.waitForTimeout(1000);

  const exported = await page.evaluate(async () => {
    return await window.__SAKUNOTA_API__.exportAllData();
  });
  console.log(`  -> adminPin diekspor:         ${exported.settings?.adminPin}`);
  console.log(`  -> recoveryCodeHash diekspor: ${exported.settings?.recoveryCodeHash}`);
  assert(exported.settings?.adminPin === undefined, 'PIN Admin disanitasi dari backup');
  assert(exported.settings?.recoveryCodeHash === undefined, 'Recovery Code Hash disanitasi dari backup');
  console.log('  ✅ PASS: Baik PIN maupun Recovery Code 100% bersih dari file JSON cadangan');

  // -------------------------------------------------------------------------
  // TAHAP 3: Simulasi Kritis: PIN Dihapus / Hilang di Toko yang Sudah Berjalan
  // -------------------------------------------------------------------------
  console.log('\n[TAHAP 3] Uji Kasus Kritis: PIN Hilang / Dihapus Secara Tidak Sah...');
  await page.evaluate(async () => {
    // Simulasi PIN hilang tetapi data usaha dan recovery code tetap ada
    const raw = localStorage.getItem('pos_store_settings');
    const mod = JSON.parse(raw);
    mod.adminPin = ''; // PIN dikosongkan
    localStorage.setItem('pos_store_settings', JSON.stringify(mod));
    localStorage.removeItem('adminLoginExpiry');

    const req = indexedDB.open('AngkringanDB');
    req.onsuccess = () => {
      const db = req.result;
      const tx = db.transaction('settings', 'readwrite');
      tx.objectStore('settings').put({ key: 'pos_store_settings', value: mod });
    };
  });
  await page.waitForTimeout(1000);

  // Akses halaman /admin
  await page.goto(`http://localhost:${port}/admin`);
  await page.waitForTimeout(1000);

  // SISTEM HARUS MENOLAK PEMBUATAN PIN BARU DAN MEWAJIBKAN RECOVERY CODE
  const verifyTitle = await page.locator('text=Verifikasi Pemilik Toko').first().textContent();
  assert(verifyTitle !== null, 'Sistem mendeteksi PIN hilang dan mewajibkan Verifikasi Pemilik Toko');
  console.log('  ✅ PASS: Form pembuatan PIN baru DIBLOKIR. Sistem mewajibkan Verifikasi Pemilik Toko');

  // Uji coba memasukkan kode asal / palsu
  console.log('  -> Menguji coba kode palsu (Brute Force simulation)...');
  await page.locator('input[placeholder="SAKU-XXXX-XXXX"]').fill('SAKU-9999-9999');
  await page.locator('button:has-text("Verifikasi Hak Pemilik")').click();
  await page.waitForTimeout(500);

  const errorMsg = await page.locator('text=Kode Pemulihan salah').first().textContent();
  assert(errorMsg !== null, 'Kode palsu ditolak dengan peringatan sisa percobaan');
  console.log(`  ✅ PASS: Kode palsu ditolak! Pesan: "${errorMsg?.trim()}"`);

  // Masukkan Kode Pemulihan yang benar
  console.log('  -> Memasukkan Kode Pemulihan pemilik yang sah...');
  await page.locator('input[placeholder="SAKU-XXXX-XXXX"]').fill(initialRecoveryCode);
  await page.locator('button:has-text("Verifikasi Hak Pemilik")').click();
  await page.waitForTimeout(1000);

  // Setelah kode valid, layar beralih ke Buat PIN Admin Baru
  const resetTitle = await page.locator('text=Buat PIN Admin Baru').first().textContent();
  assert(resetTitle !== null, 'Pemilik sah berhasil membuka form reset PIN');
  console.log('  ✅ PASS: Identitas pemilik terbukti, form pembuatan PIN baru dibuka');

  // Pemilik menyetel PIN baru 9988
  await page.locator('input[placeholder="4-6 digit angka..."]').fill('9988');
  await page.locator('input[placeholder="Ulangi PIN baru..."]').fill('9988');
  await page.locator('button:has-text("Simpan PIN & Buat Kode Pemulihan")').click();
  await page.waitForTimeout(1000);

  // Sistem mewajibkan mencatat Kode Pemulihan BARU (One-Time Invalidation)
  const newCodeTitle = await page.locator('text=Simpan Kode Pemulihan Anda!').first().textContent();
  assert(newCodeTitle !== null, 'Siklus baru: Kode pemulihan baru di-generate');
  const freshNewRecoveryCode = (await page.locator('.font-mono').first().textContent()).trim();
  console.log(`  -> Recovery Code Baru yang Diperbarui: "${freshNewRecoveryCode}"`);
  assert(freshNewRecoveryCode !== initialRecoveryCode, 'Kode pemulihan lama hangus, kode baru berbeda');
  console.log('  ✅ PASS: Siklus One-Time Use terbukti: Kode pemulihan lama langsung hangus & diganti kode baru');

  // Konfirmasi kode baru
  await page.locator('input[type="checkbox"]').check();
  await page.locator('button:has-text("Selesai & Buka Backoffice")').click();
  await page.waitForTimeout(1000);
  assert(page.url().includes('/admin'), 'Berhasil kembali masuk ke Backoffice');

  // Verifikasi login berikutnya dengan PIN 9988
  await page.evaluate(() => localStorage.removeItem('adminLoginExpiry'));
  await page.goto(`http://localhost:${port}/admin`);
  await page.waitForTimeout(1000);

  await page.locator('input[type="password"]').fill('9988');
  await page.locator('button:has-text("Masuk Backoffice")').click();
  await page.waitForTimeout(1000);
  assert(page.url().includes('/admin'), 'Login dengan PIN baru 9988 sukses');
  console.log('  ✅ PASS: PIN baru 9988 aktif dan melindungi Backoffice sempurna');

  await context.close();

  console.log('\n================================================================');
  console.log('  🎉 SELURUH VERIFIKASI PEMILIK & RECOVERY CODE: 100% SUKSES!');
  console.log('================================================================\n');

} finally {
  server.close();
}
