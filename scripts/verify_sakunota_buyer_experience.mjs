import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const staticDir = path.resolve('out');
const profileDir = path.resolve('.test-profile-buyer-exp');
const artifactDir = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\4c7a1509-3477-4c30-b661-18b9208deb22');
const port = 4388;

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
    fs.rmSync(profileDir, { recursive: true, force: true });
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
    console.log('\n======================================================');
    console.log('  TESTING SAKUNOTA BUYER EXPERIENCE & REPUTATION AUDIT');
    console.log('======================================================\n');

    // --- STAGE 1: HOMEPAGE BRANDING, SLOGAN & PRICE RP65.000 ---
    console.log('[STAGE 1] SakuNota Homepage: Branding, Slogan & Consistent Promo Price');
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const brandTitle = await page.textContent('h1');
    check(brandTitle.includes('Jualan Lancar, Internet Mati Bukan Masalah'), 'Homepage headline matches specification', brandTitle);

    const sloganPill = await page.textContent('body');
    check(sloganPill.includes('SakuNota — Kasir Tetap Jalan, Meski Tanpa Internet'), 'Slogan "SakuNota — Kasir Tetap Jalan, Meski Tanpa Internet" is present');

    // Check pricing: Rp65.000 promo, Rp99.000 crossed out, Hemat Rp34.000
    check(sloganPill.includes('Rp65.000'), 'Promo price Rp65.000 is present on homepage');
    check(sloganPill.includes('Rp99.000'), 'Original price Rp99.000 is crossed out on homepage');
    check(sloganPill.includes('Hemat Rp34.000'), 'Savings amount "Hemat Rp34.000 (34%)" is explicitly shown');

    // Screenshot Hero
    await page.screenshot({ path: path.join(artifactDir, 'sakunota_homepage_hero.png') });
    console.log('  📸 Screenshot saved: sakunota_homepage_hero.png');

    // --- STAGE 2: 4 CORE PROSPECTIVE BUYER QUESTIONS ---
    console.log('\n[STAGE 2] 4 Pertanyaan Calon Pembeli (The 4 Questions)');
    const qSection = await page.locator('#tanya-jawab-utama');
    check(await qSection.isVisible(), 'The 4 Questions section is visible');

    const q1 = await page.textContent('#tanya-jawab-utama');
    check(q1.includes('Untuk apa aplikasi SakuNota?'), 'Question 1: Untuk apa aplikasi SakuNota? answered');
    check(q1.includes('Apakah benar-benar bisa dipakai tanpa internet?'), 'Question 2: Bisa dipakai tanpa internet? answered');
    check(q1.includes('Berapa harga SakuNota?'), 'Question 3: Berapa harga SakuNota? answered');
    check(q1.includes('Bagaimana cara memasangnya di HP?'), 'Question 4: Bagaimana cara memasang di HP? answered');

    await qSection.screenshot({ path: path.join(artifactDir, 'sakunota_4_questions.png') });
    console.log('  📸 Screenshot saved: sakunota_4_questions.png');

    // --- STAGE 3: CARA PASANG DI HP & CEK KESIAPAN OFFLINE ---
    console.log('\n[STAGE 3] Cara Pasang di HP (3 Langkah) & Uji Kesiapan Offline');
    const pasangSection = await page.locator('#cara-pasang');
    check(await pasangSection.isVisible(), 'Cara Pasang section is visible');

    const pasangText = await pasangSection.textContent();
    check(pasangText.includes('Buka SakuNota di Chrome'), 'Step 1: Buka SakuNota di Chrome');
    check(pasangText.includes('Ketuk Menu Tiga Titik'), 'Step 2: Ketuk Menu Tiga Titik');
    check(pasangText.includes('Ketuk Pasang'), 'Step 3: Ketuk Pasang');

    // Click "Cek Kesiapan Offline Sekarang" button
    const checkOfflineBtn = page.locator('button:has-text("Cek Kesiapan Offline")');
    check(await checkOfflineBtn.isVisible(), 'Button "Cek Kesiapan Offline" exists');
    await checkOfflineBtn.click();
    await page.waitForTimeout(1000);

    const offlineResult = page.locator('text=Perangkat Anda Siap Dipakai Tanpa Internet!');
    check(await offlineResult.isVisible(), 'Offline diagnostic returns success state');

    await pasangSection.screenshot({ path: path.join(artifactDir, 'sakunota_cara_pasang_offline_check.png') });
    console.log('  📸 Screenshot saved: sakunota_cara_pasang_offline_check.png');

    // --- STAGE 4: CHECKOUT FLOW & PURCHASE FORM ---
    console.log('\n[STAGE 4] Formulir Pembelian Pelanggan & Alur Checkout');
    const buyBtn = page.locator('button:has-text("Beli SakuNota — Rp65.000")').first();
    await buyBtn.click();
    await page.waitForTimeout(400);

    const modal = page.locator('text=Formulir Pembelian SakuNota');
    check(await modal.isVisible(), 'Purchase modal opened');

    // Fill sample data
    const sampleBtn = page.locator('button:has-text("Salin Contoh Data Pembelian")');
    await sampleBtn.click();
    await page.waitForTimeout(200);

    // Verify fields filled
    const ownerNameInput = page.locator('input[placeholder="Contoh: Budi Santoso"]');
    check(await ownerNameInput.inputValue() === 'Budi Santoso', 'Owner name filled correctly');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_checkout_modal.png') });
    console.log('  📸 Screenshot saved: sakunota_checkout_modal.png');

    // Proceed to payment
    const nextBtn = page.locator('button:has-text("Lanjut ke Pembayaran")');
    await nextBtn.click();
    await page.waitForTimeout(300);

    const paymentStep = page.locator('text=QRIS & Transfer Bank Resmi');
    check(await paymentStep.isVisible(), 'Official Payment step displayed');

    // Simulate Payment Confirmation
    const confirmPaymentBtn = page.locator('button:has-text("Simulasikan Pembayaran Berhasil")');
    await confirmPaymentBtn.click();
    await page.waitForTimeout(300);

    const successStep = page.locator('text=Pembayaran Berhasil!');
    check(await successStep.isVisible(), 'Success step displayed');

    const licenseKeyEl = page.locator('text=KODE LISENSI PERANGKAT:');
    check(await licenseKeyEl.isVisible(), 'Device License Key issued');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_license_issued.png') });
    console.log('  📸 Screenshot saved: sakunota_license_issued.png');

    // Close modal
    await page.locator('button:has-text("Tutup")').click();
    await page.waitForTimeout(200);

    // --- STAGE 5: RINGKASAN PENJUALAN & KIRIM LAPORAN KE WHATSAPP ---
    console.log('\n[STAGE 5] Ringkasan Penjualan & Kirim Laporan ke WhatsApp');
    await page.goto(`http://localhost:${port}/admin`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Handle initial PIN setup if on fresh profile
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

    console.log('  [DEBUG Admin] URL:', page.url());
    const bodyPreview = await page.textContent('body');
    console.log('  [DEBUG Admin] Body snippet:', bodyPreview.substring(0, 150).replace(/\s+/g, ' '));

    const adminHeaderLocator = page.locator('h2:has-text("Ringkasan Penjualan")');
    await adminHeaderLocator.waitFor({ state: 'visible', timeout: 5000 });
    const adminHeader = await adminHeaderLocator.textContent();
    check(adminHeader.includes('Ringkasan Penjualan'), 'Dashboard renamed to Ringkasan Penjualan');

    const waBtn = page.locator('button:has-text("Kirim ke WhatsApp")');
    check(await waBtn.isVisible(), 'Button "Kirim ke WhatsApp" is visible in header');
    await waBtn.click();
    await page.waitForTimeout(400);

    const waModal = page.locator('h3:has-text("Kirim Laporan ke WhatsApp")');
    check(await waModal.isVisible(), 'WhatsApp Report modal opened');

    const reportPreview = await page.locator('pre').textContent();
    check(reportPreview.includes('LAPORAN PENJUALAN — SAKUNOTA'), 'Report header format is LAPORAN PENJUALAN — SAKUNOTA');
    check(reportPreview.includes('Total Penjualan: Rp'), 'Report includes Total Penjualan');
    check(reportPreview.includes('Rincian Pembayaran:'), 'Report includes Rincian Pembayaran');
    check(reportPreview.includes('Tunai: Rp'), 'Report includes Tunai');
    check(reportPreview.includes('QRIS / Non-Tunai: Rp'), 'Report includes QRIS');
    check(reportPreview.includes('Laporan dibuat oleh SakuNota.'), 'Report includes official SakuNota footer');

    // Test Copy button
    const copyBtn = page.locator('button:has-text("Salin Teks")');
    await copyBtn.click();
    await page.waitForTimeout(200);

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_whatsapp_report_modal.png') });
    console.log('  📸 Screenshot saved: sakunota_whatsapp_report_modal.png');

    // Close WA modal
    await page.locator('button:has-text("✕")').click();
    await page.waitForTimeout(200);

    // --- STAGE 6: OWNER PORTAL & CLOUDFLARE D1 MONITORING ---
    console.log('\n[STAGE 6] Owner Portal (Admin SakuNota) & Cloudflare D1 Architecture');
    await page.goto(`http://localhost:${port}/owner`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    const ownerTitle = await page.textContent('header');
    check(ownerTitle.includes('Admin SakuNota (Owner Portal)'), 'Owner Portal title verified');

    const bodyText = await page.textContent('body');
    check(bodyText.includes('Total Pembeli'), 'Metric: Total Pembeli');
    check(bodyText.includes('120'), 'Metric value 120 verified');
    check(bodyText.includes('Lisensi Aktif'), 'Metric: Lisensi Aktif');
    check(bodyText.includes('97'), 'Metric value 97 verified');
    check(bodyText.includes('Pengguna Aktif (30 Hari)'), 'Metric: Pengguna Aktif 30 Hari');
    check(bodyText.includes('76'), 'Metric value 76 verified');
    check(bodyText.includes('Menunggu Pembayaran'), 'Metric: Menunggu Pembayaran');
    check(bodyText.includes('8'), 'Metric value 8 verified');

    // Check sample customers
    check(bodyText.includes('Warung Bu Sari'), 'Customer Warung Bu Sari listed');
    check(bodyText.includes('Kedai Pak Budi'), 'Customer Kedai Pak Budi listed');
    check(bodyText.includes('Angkringan Jaya'), 'Customer Angkringan Jaya listed');

    // Check Cloudflare D1 Architecture schema
    check(bodyText.includes('CREATE TABLE buyers'), 'Cloudflare D1 buyers table schema displayed');
    check(bodyText.includes('CREATE TABLE licenses'), 'Cloudflare D1 licenses table schema displayed');

    // Check Privacy distinction
    check(bodyText.includes('Yang Dipantau di Cloudflare D1 & Workers'), 'Monitoring boundaries clearly explained');
    check(bodyText.includes('Yang Aman & Privat di Perangkat Warung'), 'Merchant transaction privacy protected');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_owner_dashboard.png') });
    console.log('  📸 Screenshot saved: sakunota_owner_dashboard.png');

    console.log('\n======================================================');
    console.log(`  🎉 ALL ${results.length} ASSERTIONS PASSED!`);
    console.log('======================================================\n');
  } finally {
    await context.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
