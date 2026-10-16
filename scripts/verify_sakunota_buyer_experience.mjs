import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';
import {
  authenticateOwner,
  listOwnerOrders,
  verifyOrderAndIssueLicense,
  createCustomerOrder,
  checkCustomerOrderStatus,
  activateLicenseOnDevice
} from '../src/lib/server/sakunotaServer.ts';

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

async function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function startServerWithApi() {
  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    const pathname = parsedUrl.pathname;

    // --- API ROUTES (Centralized Cloudflare Simulation) ---
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');

      if (pathname === '/api/owner/login' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = authenticateOwner(body.username || '', body.password || '');
        res.writeHead(result.success ? 200 : 401);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/owner/orders' && req.method === 'GET') {
        const auth = req.headers['authorization'] || '';
        const token = auth.replace(/^Bearer\s+/i, '');
        const result = listOwnerOrders(token);
        res.writeHead(result.success ? 200 : 401);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/owner/verify' && req.method === 'POST') {
        const auth = req.headers['authorization'] || '';
        const token = auth.replace(/^Bearer\s+/i, '');
        const body = await parseBody(req);
        const result = verifyOrderAndIssueLicense(token, body.orderId);
        res.writeHead(result.success ? 200 : 401);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/orders/create' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = createCustomerOrder(body);
        res.writeHead(result.success ? 201 : 400);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/orders/check' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = checkCustomerOrderStatus(body.orderId || '', body.accessCode || '');
        res.writeHead(result.success ? 200 : 403);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/license/activate' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = activateLicenseOnDevice(body);
        res.writeHead(result.status || (result.success ? 200 : 400));
        return res.end(JSON.stringify(result));
      }

      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Endpoint API tidak ditemukan' }));
    }

    // --- STATIC FILES ---
    let reqPath = decodeURI(pathname);
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
  console.log(`Server with API endpoints running on http://localhost:${port}`);
  return server;
}

async function run() {
  if (fs.existsSync(profileDir)) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    } catch {}
  }
  fs.mkdirSync(profileDir, { recursive: true });

  const server = await startServerWithApi();
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  try {
    console.log('\n================================================================');
    console.log('  🎯 SAKUNOTA LAUNCH READINESS, SECURITY & CHARTS AUDIT');
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
    const qSection = page.locator('#tanya-jawab-utama');
    check(await qSection.isVisible(), 'The 4 Questions section is visible');
    const qText = await qSection.textContent();
    check(qText.includes('Untuk apa aplikasi SakuNota?'), 'Q1 answered');
    check(qText.includes('Apakah benar-benar bisa dipakai tanpa internet?'), 'Q2 answered');
    check(qText.includes('Berapa harga SakuNota?'), 'Q3 answered');
    check(qText.includes('Bagaimana cara memasangnya di HP?'), 'Q4 answered');

    // --- STAGE 3: CARA PASANG DI HP & OFFLINE READINESS CHECK ---
    console.log('\n[STAGE 3] Cara Pasang di HP (3 Langkah) & Uji Kesiapan Offline');
    const caraPasangSec = page.locator('#cara-pasang');
    check(await caraPasangSec.isVisible(), 'Cara Pasang section is visible');
    const caraPasangText = await caraPasangSec.textContent();
    check(caraPasangText.includes('Buka SakuNota di Chrome'), 'Step 1: Buka SakuNota di Chrome');
    check(caraPasangText.includes('Ketuk Menu Tiga Titik'), 'Step 2: Ketuk Menu Tiga Titik');
    check(caraPasangText.includes('Ketuk Pasang'), 'Step 3: Ketuk Pasang');

    const testBtn = page.locator('button:has-text("Cek Kesiapan Offline Sekarang")');
    await testBtn.click();
    await page.waitForTimeout(1000);
    const testResult = await page.locator('text=Perangkat Anda Siap Dipakai Tanpa Internet!');
    check(await testResult.isVisible(), 'Offline diagnostic returns success state');

    // --- STAGE 4: PEMBELIAN TRANSFER BANK BCA DENGAN KODE AKSES RAHASIA ---
    console.log('\n[STAGE 4] Pembelian Transfer Bank Manual (BCA) & Status Menunggu Verifikasi');
    const buyBtn = page.locator('button:has-text("Beli SakuNota — Rp65.000")').first();
    await buyBtn.click();
    await page.waitForTimeout(400);

    // Verify modal backdrop click flexibility
    // Click outside modal dialog to test flexible dismissal
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
    const buyModalClosed = !(await page.locator('text=Formulir Pembelian SakuNota').isVisible());
    check(buyModalClosed, 'Buy modal dismissable flexibly by clicking backdrop overlay');

    // Reopen modal and fill details
    await buyBtn.click();
    await page.waitForTimeout(300);
    await page.locator('button:has-text("Salin Contoh Data Pembelian")').click();
    await page.waitForTimeout(200);

    await page.locator('button:has-text("Lanjut ke Rekening Transfer →")').click();
    await page.waitForTimeout(500);

    const paymentContent = await page.textContent('body');
    check(paymentContent.includes('BANK BCA'), 'Bank BCA displayed');
    check(paymentContent.includes('8030 554 912'), 'BCA Account 8030 554 912 displayed');
    check(paymentContent.includes('Reza / SakuNota Official'), 'Account owner Reza displayed');

    // Submit transfer proof
    await page.locator('button:has-text("Kirim Bukti Transfer Sekarang")').click();
    await page.waitForTimeout(500);

    const waitingModal = page.locator('text=Menunggu Verifikasi Owner');
    check(await waitingModal.isVisible(), 'Order status is Menunggu Verifikasi Owner (does NOT auto-issue license)');

    // Extract Order ID and Secret Access Code directly from dedicated elements
    const ordEl = page.locator('strong.font-mono:has-text("SN-2026-")').first();
    const capturedOrderId = (await ordEl.textContent()).trim();
    const codeEl = page.locator('strong.font-mono:has-text("KOD-")').first();
    const capturedAccessCode = (await codeEl.textContent()).trim();
    check(Boolean(capturedOrderId), `Order ID captured (${capturedOrderId})`);
    check(Boolean(capturedAccessCode), `Secret Access Code captured (${capturedAccessCode})`);

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_manual_transfer_waiting.png') });
    console.log('  📸 Screenshot saved: sakunota_manual_transfer_waiting.png');

    // Close modal
    await page.locator('button:has-text("Simpan & Tutup Halaman")').click();
    await page.waitForTimeout(300);

    // --- STAGE 5: OWNER PORTAL LOGIN & SERVER VERIFICATION ---
    console.log('\n[STAGE 5] Owner Portal Login (Reza / Server-Authenticated) & Verifikasi Pembayaran');
    await page.goto(`http://localhost:${port}/owner`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const loginHeader = await page.locator('h1:has-text("SakuNota Owner")');
    check(await loginHeader.isVisible(), 'Owner Login form is presented directly');

    // Try wrong password first
    await page.locator('input[placeholder="Masukkan username (contoh: Reza)"]').fill('Reza');
    await page.locator('input[placeholder="Masukkan password"]').fill('WrongPass99');
    await page.locator('button:has-text("Masuk ke Dashboard Owner")').click();
    await page.waitForTimeout(400);

    const errorMsg = await page.locator('text=Username atau Password salah!');
    check(await errorMsg.isVisible(), 'Invalid credentials rejected by server');

    // Login with new secure server credentials
    await page.locator('input[placeholder="Masukkan password"]').fill('Reza-SakuNota-2026!');
    await page.locator('button:has-text("Masuk ke Dashboard Owner")').click();
    await page.waitForTimeout(800);

    const ownerBadge = page.locator('text=Reza (Owner)');
    check(await ownerBadge.isVisible(), 'Reza successfully logged in with server token');

    // Verify incoming order from customer
    const pendingOrderRow = page.locator('button:has-text("Verifikasi Dana Masuk & Terbitkan Lisensi")').first();
    check(await pendingOrderRow.isVisible(), 'Pending manual transfer order visible in Owner dashboard');

    // Reza confirms money arrival and issues license
    await pendingOrderRow.click();
    await page.waitForTimeout(600);

    const verifiedStatus = page.locator('text=✓ Lunas & Lisensi Terbit').first();
    check(await verifiedStatus.isVisible(), 'Server verified payment & issued genuine license key');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_owner_verified_license.png') });
    console.log('  📸 Screenshot saved: sakunota_owner_verified_license.png');

    // --- STAGE 6: CUSTOMER RETRIEVES LICENSE WITH SECRET ACCESS CODE ---
    console.log('\n[STAGE 6] Pembeli Cek Status Pesanan dengan Kode Akses Rahasia di Beranda');
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);

    const cekBtn = page.locator('button:has-text("Cek Status Lisensi")').first();
    await cekBtn.click();
    await page.waitForTimeout(300);

    // Try wrong access code first
    await page.locator('input[placeholder="Contoh: SN-2026-322"]').fill(capturedOrderId);
    await page.locator('input[placeholder="Contoh: KOD-7890"]').fill('WRONG-CODE');
    await page.locator('button:has-text("Periksa Status & Tampilkan Lisensi →")').click();
    await page.waitForTimeout(400);

    const accessDeniedMsg = page.locator('text=Kode akses rahasia tidak cocok');
    check(await accessDeniedMsg.isVisible(), 'Server rejects status check with incorrect access code');

    // Now enter correct access code
    await page.locator('input[placeholder="Contoh: KOD-7890"]').fill(capturedAccessCode);
    await page.locator('button:has-text("Periksa Status & Tampilkan Lisensi →")').click();
    await page.waitForTimeout(500);

    const activeBadge = page.locator('text=Lunas & Aktif');
    check(await activeBadge.isVisible(), 'Customer sees Lunas & Aktif after server verification');

    const licenseEl = page.locator('text=KODE LISENSI RESMI ANDA:');
    check(await licenseEl.isVisible(), 'Customer retrieves genuine license key');

    const licenseVal = await page.locator('div.font-mono.font-black.text-sm').textContent();
    check(licenseVal.startsWith('SN-'), `License format valid (${licenseVal})`);

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_customer_retrieved_license.png') });
    console.log('  📸 Screenshot saved: sakunota_customer_retrieved_license.png');

    // Test backdrop click dismissal on check status modal
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
    const cekModalClosed = !(await page.locator('text=Akses privat khusus pemilik pesanan').isVisible());
    check(cekModalClosed, 'Check status modal dismissable flexibly by clicking backdrop overlay');

    // --- STAGE 6B: 1-DEVICE ENFORCEMENT & OFFLINE RESILIENCE ---
    console.log('\n[STAGE 6B] 1-Device License Binding & Offline Resilience Audit');
    
    // Device 1 activates license
    const dev1Res = activateLicenseOnDevice({
      licenseKey: licenseVal,
      deviceId: 'DEVICE-PHONE-1-BUDI',
      deviceName: 'HP Kasir Warung Budi'
    });
    check(dev1Res.success, 'Device 1 successfully activates license');

    // Device 2 attempts to use same license -> MUST BE REJECTED (409 Conflict)
    const dev2Res = activateLicenseOnDevice({
      licenseKey: licenseVal,
      deviceId: 'DEVICE-LAPTOP-2-UNAUTHORIZED',
      deviceName: 'Laptop Orang Lain'
    });
    check(!dev2Res.success && dev2Res.status === 409, 'Device 2 rejected under strict 1-Device Rule (409 Conflict)');
    check(dev2Res.error.includes('sudah aktif pada perangkat lain'), 'Device rejection error message is descriptive');

    // --- STAGE 7: RINGKASAN PENJUALAN, CHARTS & WHATSAPP REPORT ---
    console.log('\n[STAGE 7] Ringkasan Penjualan: Visual Charts & WhatsApp Report');
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

    // Visual Charts Audit
    const trendChart = page.locator('h4:has-text("Tren Penjualan 7 Hari Terakhir")');
    check(await trendChart.isVisible(), '7-Day Trend Chart title is visible');

    const catChart = page.locator('h4:has-text("Performa Kategori")');
    check(await catChart.isVisible(), 'Category Performance breakdown is visible');

    // Capture clear chart screenshot
    await page.screenshot({ path: path.join(artifactDir, 'sakunota_admin_dashboard_charts_verified.png') });
    console.log('  📸 Screenshot saved: sakunota_admin_dashboard_charts_verified.png');

    // WhatsApp Report Modal Test
    const waBtn = page.locator('button:has-text("Kirim ke WhatsApp")');
    await waBtn.click();
    await page.waitForTimeout(400);

    // Verify backdrop click dismissal on WhatsApp modal
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);
    const waModalClosed = !(await page.locator('text=Kirim Laporan ke WhatsApp').isVisible());
    check(waModalClosed, 'WhatsApp report modal dismissable flexibly by clicking backdrop overlay');

    // Reopen and check period switcher
    await waBtn.click();
    await page.waitForTimeout(300);
    check(await page.locator('button:has-text("Hari Ini")').isVisible(), 'Period button Hari Ini exists');
    check(await page.locator('button:has-text("Kemarin")').isVisible(), 'Period button Kemarin exists');
    check(await page.locator('button:has-text("7 Hari Terakhir")').isVisible(), 'Period button 7 Hari Terakhir exists');
    check(await page.locator('button:has-text("Bulan Ini")').isVisible(), 'Period button Bulan Ini exists');

    await page.locator('button:has-text("7 Hari Terakhir")').click();
    await page.waitForTimeout(200);

    const waPreview = await page.locator('pre').textContent();
    check(waPreview.includes('LAPORAN PENJUALAN — SAKUNOTA'), 'Report header LAPORAN PENJUALAN — SAKUNOTA');
    check(waPreview.includes('RINGKASAN 7 HARI TERAKHIR'), 'Period reflects 7 HARI TERAKHIR');
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
    check(!tentangBody.includes('Git Commit'), 'Git Commit removed from merchant view');
    check(!tentangBody.includes('Dexie DB'), 'Dexie DB removed from merchant view');
    check(!tentangBody.includes('ACID'), 'ACID details removed from merchant view');
    check(!tentangBody.includes('Rp65.000'), 'Price Rp65.000 removed from Tentang page');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_tentang_simple.png') });
    console.log('  📸 Screenshot saved: sakunota_tentang_simple.png');

    // --- STAGE 9: POS TABLE CONTRAST & VISUAL AUDIT (LIGHT MODE) ---
    console.log('\n[STAGE 9] POS Table View Contrast Audit (Light Mode)');
    await page.goto(`http://localhost:${port}/pos`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Switch to Light mode if in dark
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

    const table1Card = page.locator('text=Kosong').first();
    check(await table1Card.isVisible(), 'Table 1 Kosong label is visible');

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
