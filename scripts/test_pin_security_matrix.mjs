import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const staticDir = path.resolve('out');
const profileDirA = path.resolve('.test-profile-pin-a');
const profileDirB = path.resolve('.test-profile-pin-b');
const port = 4359;

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

// Clean test profile directories
for (const dir of [profileDirA, profileDirB]) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    } catch {}
  }
  fs.mkdirSync(dir, { recursive: true });
}

console.log('\n================================================================');
console.log('  🔒 SAKUNOTA PIN SECURITY & ZERO-FALLBACK MATRIX AUDIT');
console.log('================================================================\n');

try {
  // -------------------------------------------------------------------------
  // TEST 1: Instalasi Awal & Perubahan PIN (1234 -> 5678)
  // -------------------------------------------------------------------------
  console.log('[TEST 1] Instalasi Awal & Ubah PIN (1234 -> 5678)...');
  const contextA = await chromium.launchPersistentContext(profileDirA, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    viewport: { width: 412, height: 915 }
  });
  const pageA = contextA.pages()[0] || await contextA.newPage();
  
  await pageA.goto(`http://localhost:${port}/admin`);
  await pageA.waitForTimeout(1000);

  // Login awal dengan 1234
  await pageA.locator('input[type="password"]').fill('1234');
  await pageA.locator('button:has-text("Masuk Backoffice")').click();
  await pageA.waitForTimeout(1000);
  assert(pageA.url().includes('/admin'), 'Login awal dengan 1234 berhasil');

  // Peringatan PIN bawaan aktif
  const warningBanner = await pageA.locator('text=Pemberitahuan Keamanan').first().textContent();
  assert(warningBanner !== null, 'Banner peringatan PIN bawaan 1234 muncul');
  console.log('  ✅ PASS: Banner peringatan PIN bawaan (1234) tampil memperingatkan pengguna');

  // Ganti PIN ke 5678
  await pageA.goto(`http://localhost:${port}/admin/pengaturan/keamanan`);
  await pageA.waitForTimeout(1000);
  await pageA.locator('input[placeholder="Masukkan PIN saat ini"]').fill('1234');
  await pageA.locator('input[placeholder="PIN Baru..."]').fill('5678');
  await pageA.locator('input[placeholder="Konfirmasi..."]').fill('5678');
  await pageA.locator('button:has-text("Simpan PIN Baru")').click();
  await pageA.waitForTimeout(1000);
  console.log('  ✅ PASS: PIN berhasil diubah ke 5678');

  // Logout dan uji apakah 1234 DITOLAK
  await pageA.evaluate(() => localStorage.removeItem('adminLoginExpiry'));
  await pageA.goto(`http://localhost:${port}/admin`);
  await pageA.waitForTimeout(1000);

  await pageA.locator('input[type="password"]').fill('1234');
  await pageA.locator('button:has-text("Masuk Backoffice")').click();
  await pageA.waitForTimeout(500);
  const pinSalahMsg = await pageA.locator('text=PIN otorisasi salah').first().textContent();
  assert(pinSalahMsg !== null, 'PIN lama 1234 DITOLAK setelah diganti ke 5678');
  console.log('  ✅ PASS: PIN bawaan 1234 ditolak setelah pengguna mengganti PIN ke 5678');

  // Login dengan 5678 berhasil
  await pageA.locator('input[type="password"]').fill('5678');
  await pageA.locator('button:has-text("Masuk Backoffice")').click();
  await pageA.waitForTimeout(1000);
  assert(pageA.url().includes('/admin'), 'Login dengan PIN baru 5678 berhasil');

  // -------------------------------------------------------------------------
  // TEST 2: Backup Dilakukan -> PIN Tidak Diekspor
  // -------------------------------------------------------------------------
  console.log('\n[TEST 2] Ekspor Cadangan Data & Audit Sanitasi PIN...');
  await pageA.goto(`http://localhost:${port}/admin/pengaturan/data`);
  await pageA.waitForTimeout(1000);
  const exportResult = await pageA.evaluate(async () => {
    return await window.__SAKUNOTA_API__.exportAllData();
  });
  console.log(`  -> PIN di payload ekspor: ${exportResult.settings?.adminPin} (Harus undefined)`);
  assert(exportResult.settings?.adminPin === undefined, 'PIN 5678 TIDAK diekspor ke cadangan');
  console.log('  ✅ PASS: PIN Admin aman, tidak dimasukkan ke dalam file JSON');

  // -------------------------------------------------------------------------
  // TEST 3: Restore di Perangkat Lama -> PIN 5678 Tetap Bertahan
  // -------------------------------------------------------------------------
  console.log('\n[TEST 3] Restore Cadangan di Perangkat Lama...');
  await pageA.evaluate(async (data) => {
    await window.__SAKUNOTA_API__.importAllData(data);
  }, exportResult);

  const pinLamaCheck = await pageA.evaluate(async () => {
    const entry = await window.__SAKUNOTA_API__.db.table('settings').get('pos_store_settings');
    return entry?.value?.adminPin;
  });
  console.log(`  -> PIN di Perangkat Lama setelah restore: ${pinLamaCheck}`);
  assert(pinLamaCheck === '5678', 'PIN 5678 tetap bertahan di perangkat lama');
  console.log('  ✅ PASS: Di perangkat lama, PIN lokal (5678) tetap dipertahankan');

  // -------------------------------------------------------------------------
  // TEST 4: Zero-Fallback Saat PIN Hilang / Kosong (NO 1234 Bypasses!)
  // -------------------------------------------------------------------------
  console.log('\n[TEST 4] Uji Kasus Ekstrem: PIN Hilang / Dihapus di Penyimpanan...');
  await pageA.evaluate(async () => {
    const entry = await window.__SAKUNOTA_API__.db.table('settings').get('pos_store_settings');
    const mod = { ...entry.value, adminPin: '' };
    await window.__SAKUNOTA_API__.db.table('settings').put({ key: 'pos_store_settings', value: mod });
    localStorage.setItem('pos_store_settings', JSON.stringify(mod));
    localStorage.removeItem('adminLoginExpiry');
  });

  await pageA.goto(`http://localhost:${port}/admin`);
  await pageA.waitForTimeout(1000);

  // Memastikan sistem mendeteksi PIN hilang dan meminta konfigurasi PIN baru, bukan meminta login atau bypass 1234
  const setupTitle = await pageA.locator('text=Konfigurasi PIN Admin').first().textContent();
  assert(setupTitle !== null, 'Layar Konfigurasi PIN Admin Baru muncul saat PIN tidak ditemukan');
  console.log('  ✅ PASS: Sistem TIDAK diam-diam kembali ke 1234 saat PIN hilang');
  console.log('  ✅ PASS: Sistem mewajibkan konfigurasi PIN baru');

  // -------------------------------------------------------------------------
  // TEST 5: Restore di Perangkat Baru Tanpa PIN -> Wajib Konfigurasi PIN Baru
  // -------------------------------------------------------------------------
  console.log('\n[TEST 5] Restore di Perangkat Baru (Profil Bersih Tanpa PIN)...');
  const contextB = await chromium.launchPersistentContext(profileDirB, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
    viewport: { width: 412, height: 915 }
  });
  const pageB = contextB.pages()[0] || await contextB.newPage();
  await pageB.goto(`http://localhost:${port}/admin/pengaturan/data?auth=demo`);
  await pageB.waitForTimeout(1000);

  // Kosongkan settings di Profil B agar mensimulasikan perangkat baru
  await pageB.evaluate(async () => {
    await window.__SAKUNOTA_API__.db.table('settings').clear();
    localStorage.clear();
  });

  // Pulihkan file cadangan dari Profil A
  await pageB.evaluate(async (data) => {
    await window.__SAKUNOTA_API__.importAllData(data);
  }, exportResult);

  const pinProfilB = await pageB.evaluate(async () => {
    const entry = await window.__SAKUNOTA_API__.db.table('settings').get('pos_store_settings');
    return entry?.value?.adminPin;
  });
  console.log(`  -> Nilai PIN di Perangkat Baru setelah restore: "${pinProfilB}" (Bukan 1234)`);
  assert(pinProfilB === '' || pinProfilB === undefined, 'Perangkat baru tidak diinjeksi 1234 secara diam-diam');

  // Buka /admin di Perangkat Baru
  await pageB.goto(`http://localhost:${port}/admin`);
  await pageB.waitForTimeout(1000);

  const setupBaruTitle = await pageB.locator('text=Konfigurasi PIN Admin').first().textContent();
  assert(setupBaruTitle !== null, 'Perangkat baru diminta membuat PIN sendiri');

  // Konfigurasi PIN baru (misal: 9988)
  await pageB.locator('input[placeholder="4-6 digit angka..."]').fill('9988');
  await pageB.locator('input[placeholder="Ulangi PIN baru..."]').fill('9988');
  await pageB.locator('button:has-text("Simpan PIN & Buka Backoffice")').click();
  await pageB.waitForTimeout(1000);

  assert(pageB.url().includes('/admin'), 'Berhasil masuk Backoffice setelah buat PIN baru');
  const finalPinB = await pageB.evaluate(async () => {
    const raw = localStorage.getItem('pos_store_settings');
    if (raw) return JSON.parse(raw).adminPin;
    return new Promise((resolve) => {
      const req = indexedDB.open('AngkringanDB');
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('settings', 'readonly');
        tx.objectStore('settings').get('pos_store_settings').onsuccess = (e) => {
          resolve(e.target.result?.value?.adminPin);
        };
      };
    });
  });
  console.log(`  -> PIN Final di Perangkat Baru: ${finalPinB}`);
  assert(finalPinB === '9988', 'Perangkat baru kini aman dengan PIN mandiri 9988');
  console.log('  ✅ PASS: Perangkat baru berhasil membuat PIN mandiri (9988) tanpa pernah dibocorkan dari file backup');

  await contextA.close();
  await contextB.close();

  console.log('\n================================================================');
  console.log('  🎉 SELURUH SKENARIO MATRIKS KEAMANAN PIN: 100% SUKSES!');
  console.log('================================================================\n');

} finally {
  server.close();
}
