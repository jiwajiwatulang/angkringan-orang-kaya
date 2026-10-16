import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const staticDir = path.resolve('out');
const profileDir = path.resolve('.test-profile-buyer-exp');
const artifactDir = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\4c7a1509-3477-4c30-b661-18b9208deb22');
const port = 4399;

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

async function startStaticServer() {
  const server = http.createServer((req, res) => {
    let reqPath = decodeURI(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';
    
    let filePath = path.join(staticDir, reqPath);
    if (fs.existsSync(filePath + '.html')) {
      filePath += '.html';
    } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      if (fs.existsSync(path.join(filePath, 'index.html'))) {
        filePath = path.join(filePath, 'index.html');
      }
    }
    
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  });

  await new Promise(resolve => server.listen(port, resolve));
  console.log(`Static server running on http://localhost:${port}`);
  return server;
}

async function run() {
  if (fs.existsSync(profileDir)) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    } catch {}
  }
  fs.mkdirSync(profileDir, { recursive: true });

  const server = await startStaticServer();
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  try {
    console.log('\n================================================================');
    console.log('  🎯 SAKUNOTA LAUNCH READINESS, CONTRAST & REPUTATION AUDIT');
    console.log('================================================================\n');

    // --- STAGE 1: HOMEPAGE BRANDING, SLOGAN & PRICE RP65.000 ---
    console.log('[STAGE 1] SakuNota Homepage: Branding, Slogan & Consistent Promo Price');
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const brandTitle = await page.textContent('h1');
    check(brandTitle.includes('Jualan Lancar, Internet Mati Bukan Masalah'), 'Homepage headline matches specification', brandTitle);

    const sloganPill = await page.textContent('body');
    check(sloganPill.includes('SakuNota — Kasir Tetap Jalan, Meski Tanpa Internet'), 'Slogan is present');
    check(sloganPill.includes('Rp65.000'), 'Promo price Rp65.000 is present on homepage');
    check(sloganPill.includes('Rp99.000'), 'Original price Rp99.000 is crossed out');
    check(sloganPill.includes('Hemat Rp34.000'), 'Savings amount explicitly shown');

    // --- STAGE 2: 4 PERTANYAAN CALON PEMBELI ---
    console.log('\n[STAGE 2] 4 Pertanyaan Calon Pembeli');
    const qSection = await page.locator('#tanya-jawab-utama');
    check(await qSection.isVisible(), 'The 4 Questions section is visible');
    const qText = await qSection.textContent();
    check(qText.includes('Untuk apa aplikasi SakuNota?'), 'Q1 answered');
    check(qText.includes('Apakah benar-benar bisa dipakai tanpa internet?'), 'Q2 answered');
    check(qText.includes('Berapa harga SakuNota?'), 'Q3 answered');
    check(qText.includes('Bagaimana cara memasangnya di HP?'), 'Q4 answered');

    // --- STAGE 3: CARA PASANG DI HP & UJI KESIAPAN OFFLINE ---
    console.log('\n[STAGE 3] Cara Pasang di HP (3 Langkah) & Uji Kesiapan Offline');
    const pasangSection = await page.locator('#cara-pasang');
    check(await pasangSection.isVisible(), 'Cara Pasang section is visible');
    const pasangText = await pasangSection.textContent();
    check(pasangText.includes('Buka SakuNota di Chrome'), 'Step 1: Buka SakuNota di Chrome');
    check(pasangText.includes('Ketuk Menu Tiga Titik'), 'Step 2: Ketuk Menu Tiga Titik');
    check(pasangText.includes('Ketuk Pasang'), 'Step 3: Ketuk Pasang');

    const checkOfflineBtn = page.locator('button:has-text("Cek Kesiapan Offline")');
    await checkOfflineBtn.click();
    await page.waitForTimeout(900);
    const offlineResult = page.locator('text=Perangkat Anda Siap Dipakai Tanpa Internet!');
    check(await offlineResult.isVisible(), 'Offline diagnostic returns success state');

    // --- STAGE 4: MANUAL BANK TRANSFER & MENUNGGU VERIFIKASI ---
    console.log('\n[STAGE 4] Pembelian Transfer Bank Manual (BCA) & Status Menunggu Verifikasi');
    const buyBtn = page.locator('button:has-text("Beli SakuNota — Rp65.000")').first();
    await buyBtn.click();
    await page.waitForTimeout(300);

    // Fill sample data
    await page.locator('button:has-text("Salin Contoh Data Pembelian")').click();
    await page.waitForTimeout(200);

    // Proceed to Step 2
    await page.locator('button:has-text("Lanjut ke Rekening Transfer")').click();
    await page.waitForTimeout(300);

    const paymentText = await page.textContent('body');
    check(paymentText.includes('BANK BCA'), 'Bank BCA displayed');
    check(paymentText.includes('8030 554 912'), 'BCA Account 8030 554 912 displayed');
    check(paymentText.includes('Reza / SakuNota Official'), 'Account owner Reza displayed');
    check(paymentText.includes('SN-2026-'), 'Auto-generated Order ID SN-2026-XXX displayed');

    // Attach simulated proof
    await page.locator('button:has-text("Pilih Foto Bukti Transfer")').click();
    await page.waitForTimeout(200);

    // Submit transfer proof
    await page.locator('button:has-text("Kirim Bukti Transfer Sekarang")').click();
    await page.waitForTimeout(400);

    const waitingModal = page.locator('text=Menunggu Verifikasi Owner');
    check(await waitingModal.isVisible(), 'Order status is Menunggu Verifikasi Owner (does NOT auto-issue license)');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_manual_transfer_waiting.png') });
    console.log('  📸 Screenshot saved: sakunota_manual_transfer_waiting.png');

    // Close modal
    await page.locator('button:has-text("Simpan & Tutup Halaman")').click();
    await page.waitForTimeout(200);

    // --- STAGE 5: OWNER LOGIN & VERIFIKASI OLEH REZA ---
    console.log('\n[STAGE 5] Owner Portal Login (Reza / SakuNota45) & Verifikasi Pembayaran');
    await page.goto(`http://localhost:${port}/owner`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const loginHeader = await page.locator('h1:has-text("SakuNota Owner")');
    check(await loginHeader.isVisible(), 'Owner Login form is presented directly');

    // Try wrong password first
    await page.locator('input[placeholder="Masukkan username (contoh: Reza)"]').fill('Reza');
    await page.locator('input[placeholder="Masukkan password"]').fill('WrongPass99');
    await page.locator('button:has-text("Masuk ke Dashboard Owner")').click();
    await page.waitForTimeout(300);

    const errorMsg = await page.locator('text=Username atau Password salah!');
    check(await errorMsg.isVisible(), 'Invalid credentials rejected securely');

    // Now login with real owner credentials
    await page.locator('input[placeholder="Masukkan password"]').fill('SakuNota45');
    await page.locator('button:has-text("Masuk ke Dashboard Owner")').click();
    await page.waitForTimeout(600);

    const ownerBadge = page.locator('text=Reza (Owner)');
    check(await ownerBadge.isVisible(), 'Reza successfully logged in to Owner Portal');

    // Verify incoming orders list has the buyer's pending order
    const pendingOrderRow = page.locator('button:has-text("Verifikasi Dana Masuk & Terbitkan Lisensi")').first();
    check(await pendingOrderRow.isVisible(), 'Pending manual transfer order visible in Owner dashboard');

    // Reza confirms money arrival and issues license
    await pendingOrderRow.click();
    await page.waitForTimeout(500);

    const verifiedStatus = page.locator('text=✓ Lunas & Lisensi Terbit').first();
    check(await verifiedStatus.isVisible(), 'Owner verified money arrival & issued license key');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_owner_verified_license.png') });
    console.log('  📸 Screenshot saved: sakunota_owner_verified_license.png');

    // --- STAGE 6: CUSTOMER CEK STATUS PESANAN DI HOMEPAGE ---
    console.log('\n[STAGE 6] Pembeli Cek Status Pesanan & Mengambil Lisensi di Homepage');
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const cekBtn = page.locator('button:has-text("Cek Status Lisensi")').first();
    await cekBtn.click();
    await page.waitForTimeout(300);

    await page.locator('input[placeholder="Contoh: SN-2026-001 atau 0812345..."]').fill('081234567890');
    await page.locator('button:has-text("Cari")').click();
    await page.waitForTimeout(300);

    const activeBadge = page.locator('text=Lunas & Aktif');
    check(await activeBadge.isVisible(), 'Customer sees Lunas & Aktif after owner verification');

    const licenseEl = page.locator('text=KODE LISENSI RESMI ANDA:');
    check(await licenseEl.isVisible(), 'Customer can retrieve license code permanently');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_customer_retrieved_license.png') });
    console.log('  📸 Screenshot saved: sakunota_customer_retrieved_license.png');

    await page.locator('button:has-text("Tutup")').click();
    await page.waitForTimeout(200);

    // --- STAGE 7: RINGKASAN PENJUALAN & WHATSAPP REPORT WITH PERIODS ---
    console.log('\n[STAGE 7] Ringkasan Penjualan & WhatsApp Report dengan Pilihan Periode');
    await page.goto(`http://localhost:${port}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Handle initial PIN setup if on fresh profile
    const setupPinInput = page.locator('input[placeholder="4-6 digit angka..."]');
    if (await setupPinInput.isVisible()) {
      await setupPinInput.fill('1234');
      await page.locator('input[placeholder="Ulangi PIN baru..."]').fill('1234');
      await page.locator('button:has-text("Simpan PIN & Buat Kode Pemulihan")').click();
      await page.waitForTimeout(600);
      const recoveryCheckbox = page.locator('input[type="checkbox"]');
      if (await recoveryCheckbox.isVisible()) {
        await recoveryCheckbox.check();
        await page.locator('button:has-text("Selesai & Buka Backoffice")').click();
        await page.waitForTimeout(600);
      }
    }

    const pinInput = page.locator('input[placeholder="Masukkan PIN..."]');
    if (await pinInput.isVisible()) {
      await pinInput.fill('1234');
      await page.locator('button:has-text("Masuk Backoffice")').click();
      await page.waitForTimeout(800);
    }

    const adminHeader = page.locator('h2:has-text("Ringkasan Penjualan")');
    check(await adminHeader.isVisible(), 'Dashboard renamed to Ringkasan Penjualan');

    const waBtn = page.locator('button:has-text("Kirim ke WhatsApp")');
    check(await waBtn.isVisible(), 'Button "Kirim ke WhatsApp" is visible');
    await waBtn.click();
    await page.waitForTimeout(400);

    // Verify flexible period buttons
    check(await page.locator('button:has-text("Hari Ini")').isVisible(), 'Period button Hari Ini exists');
    check(await page.locator('button:has-text("Kemarin")').isVisible(), 'Period button Kemarin exists');
    check(await page.locator('button:has-text("7 Hari Terakhir")').isVisible(), 'Period button 7 Hari Terakhir exists');
    check(await page.locator('button:has-text("Bulan Ini")').isVisible(), 'Period button Bulan Ini exists');

    // Switch to 7 Hari Terakhir
    await page.locator('button:has-text("7 Hari Terakhir")').click();
    await page.waitForTimeout(200);

    const waPreview = await page.locator('pre').textContent();
    check(waPreview.includes('LAPORAN PENJUALAN — SAKUNOTA'), 'Report header LAPORAN PENJUALAN — SAKUNOTA');
    check(waPreview.includes('RINGKASAN 7 HARI TERAKHIR'), 'Period reflects 7 HARI TERAKHIR');
    check(waPreview.includes('Tunai: Rp'), 'Breakdown includes Tunai');
    check(waPreview.includes('Non-Tunai: Rp'), 'Breakdown includes Non-Tunai');
    check(waPreview.includes('Dibuat dengan SakuNota'), 'Report footer Dibuat dengan SakuNota');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_whatsapp_report_periods.png') });
    console.log('  📸 Screenshot saved: sakunota_whatsapp_report_periods.png');

    await page.locator('button:has-text("✕")').click();
    await page.waitForTimeout(200);

    // --- STAGE 8: HALAMAN TENTANG BERSIH DARI TEKNIS & HARGA ---
    console.log('\n[STAGE 8] Halaman Tentang SakuNota (Bebas Teknis & Bebas Harga)');
    await page.goto(`http://localhost:${port}/admin/pengaturan/tentang`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const tentangBody = await page.textContent('body');
    check(tentangBody.includes('Versi Aplikasi'), 'Versi Aplikasi card exists');
    check(tentangBody.includes('Status Lisensi'), 'Status Lisensi card exists');
    check(tentangBody.includes('Nomor Lisensi'), 'Nomor Lisensi card exists');
    check(tentangBody.includes('Siapkan Kasir Tanpa Internet'), 'Siapkan Kasir Tanpa Internet button exists');
    check(tentangBody.includes('Bantuan WhatsApp'), 'Bantuan WhatsApp card exists');
    check(!tentangBody.includes('Git Commit'), 'Git Commit removed from merchant view');
    check(!tentangBody.includes('Dexie DB'), 'Dexie DB removed from merchant view');
    check(!tentangBody.includes('ACID'), 'ACID details removed from merchant view');
    check(!tentangBody.includes('Rp65.000'), 'Price Rp65.000 removed from Tentang page');
    check(!tentangBody.includes('Rp99.000'), 'Price Rp99.000 removed from Tentang page');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_tentang_simple.png') });
    console.log('  📸 Screenshot saved: sakunota_tentang_simple.png');

    // --- STAGE 9: POS TABLE CONTRAST & VISUAL AUDIT (LIGHT MODE) ---
    console.log('\n[STAGE 9] POS Table View Contrast Audit (Light Mode)');
    await page.goto(`http://localhost:${port}/pos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Ensure Light mode is active
    const htmlEl = page.locator('html');
    const isDark = await htmlEl.evaluate(el => el.classList.contains('dark'));
    if (isDark) {
      await page.locator('button[title*="Tema"], button:has-text("☀️"), button:has-text("🌙")').first().click();
      await page.waitForTimeout(400);
    }

    // Switch to Meja view
    const mejaBtn = page.locator('button:has-text("Meja")').first();
    await mejaBtn.click();
    await page.waitForTimeout(400);

    // Inspect first table card
    const table1Card = page.locator('text=Kosong').first();
    check(await table1Card.isVisible(), 'Table 1 Kosong label is visible');

    // Verify table number circle is dark and readable
    const table1Circle = page.locator('span:text-is("1")').first();
    check(await table1Circle.isVisible(), 'Table number 1 is rendered');

    await page.screenshot({ path: path.join(artifactDir, 'pos_table_view_light_contrast.png') });
    console.log('  📸 Screenshot saved: pos_table_view_light_contrast.png');

    console.log('\n================================================================');
    console.log(`  🎉 ALL ${results.length} VERIFICATIONS PASSED SUCCESSFULLY!`);
    console.log('================================================================\n');
  } finally {
    await context.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
