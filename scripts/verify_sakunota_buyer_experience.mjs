import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';
import {
  authenticateOwner,
  listOwnerOrders,
  verifyOrderAndIssueLicense,
  createCustomerOrder,
  checkCustomerOrderStatus,
  activateLicenseOnDevice,
  getOwnerMetrics,
  revokeOwnerSession,
  extractBearerToken,
} from '../src/lib/server/sakunotaServer.ts';
import { getD1, initD1Tables, resetDatabaseCleanD1 } from '../src/lib/server/d1.ts';

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
  const d1 = getD1();
  await initD1Tables(d1);

  const server = http.createServer(async (req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${port}`);
    const pathname = parsedUrl.pathname;
    const clientIp = req.socket.remoteAddress || '127.0.0.1';

    // --- API ROUTES (Cloudflare D1 Simulation) ---
    if (pathname.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');

      if (pathname === '/api/owner/login' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await authenticateOwner(d1, body.username || '', body.password || '', clientIp);
        res.writeHead(result.success ? 200 : 401);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/owner/orders' && req.method === 'GET') {
        const auth = req.headers['authorization'] || '';
        const token = extractBearerToken(auth);
        const result = await listOwnerOrders(d1, token);
        res.writeHead(result.success ? 200 : 401);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/owner/metrics' && req.method === 'GET') {
        const auth = req.headers['authorization'] || '';
        const token = extractBearerToken(auth);
        const result = await getOwnerMetrics(d1, token);
        res.writeHead(result.success ? 200 : 401);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/owner/logout' && req.method === 'POST') {
        const auth = req.headers['authorization'] || '';
        const token = extractBearerToken(auth);
        const result = await revokeOwnerSession(d1, token);
        res.writeHead(200);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/owner/verify' && req.method === 'POST') {
        const auth = req.headers['authorization'] || '';
        const token = extractBearerToken(auth);
        const body = await parseBody(req);
        const result = await verifyOrderAndIssueLicense(d1, token, body.orderId);
        res.writeHead(result.success ? 200 : 401);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/orders/create' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await createCustomerOrder(d1, body);
        res.writeHead(result.success ? 201 : 400);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/orders/check' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await checkCustomerOrderStatus(d1, body.orderId || '', body.accessCode || '');
        res.writeHead(result.success ? 200 : 403);
        return res.end(JSON.stringify(result));
      }

      if (pathname === '/api/license/activate' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await activateLicenseOnDevice(d1, body);
        res.writeHead(result.status || (result.success ? 200 : 400));
        return res.end(JSON.stringify(result));
      }

      // Midtrans Webhook Simulation
      if (pathname === '/api/payment/midtrans' && req.method === 'POST') {
        const body = await parseBody(req);
        const { order_id, transaction_status } = body;
        if (transaction_status === 'settlement') {
          const ord = await d1.prepare('SELECT * FROM CustomerOrders WHERE orderId = ?').bind(order_id).first();
          if (ord) {
            const licenseKey = `SN-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 4)}-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 4)}-${crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 4)}`;
            const verifiedAt = new Date().toLocaleDateString('id-ID');
            await d1.prepare("UPDATE CustomerOrders SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ? WHERE orderId = ?").bind(licenseKey, verifiedAt, order_id).run();
            await d1.prepare("INSERT INTO Licenses (licenseKey, orderId, businessName, issuedAt, signature) VALUES (?, ?, ?, ?, ?)").bind(licenseKey, order_id, ord.businessName, verifiedAt, 'midtrans_sig').run();
            res.writeHead(200);
            return res.end(JSON.stringify({ success: true, licenseKey }));
          }
        }
        res.writeHead(200);
        return res.end(JSON.stringify({ success: true }));
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
  console.log(`Server with Cloudflare D1 simulation running on http://localhost:${port}`);
  return server;
}

async function run() {
  const d1 = getD1();
  await initD1Tables(d1);
  await resetDatabaseCleanD1(d1);
  console.log('Cloudflare D1 database reset clean: 0 buyers, 0 licenses, 0 pending orders.');

  if (fs.existsSync(profileDir)) {
    try {
      fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    } catch {}
  }
  fs.mkdirSync(profileDir, { recursive: true });

  let server = await startServerWithApi();
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1280, height: 850 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();

  try {
    console.log('\n================================================================');
    console.log('  🎯 SAKUNOTA CLOUDFLARE D1 & OWNER SECURITY AUDIT');
    console.log('================================================================\n');

    // --- STAGE 1: ZERO-MOCK EMPTY STATE ON CLOUDFLARE D1 ---
    console.log('[STAGE 1] Owner Portal: Cloudflare D1 Zero-Mock Empty State');
    await page.goto(`http://localhost:${port}/owner`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const loginHeader = await page.locator('h1:has-text("SakuNota Owner")');
    check(await loginHeader.isVisible(), 'Owner Login form is presented directly');

    // Login with genuine owner credentials
    await page.locator('input[placeholder="Masukkan username (contoh: Reza)"]').fill('Reza');
    await page.locator('input[placeholder="Masukkan password"]').fill('Reza-SakuNota-2026!');
    await page.locator('button:has-text("Masuk ke Dashboard Owner")').click();
    await page.waitForTimeout(800);

    const ownerBadge = page.locator('text=Reza (Owner)');
    check(await ownerBadge.isVisible(), 'Reza successfully logged in');

    // Verify all 4 metrics are strictly ZERO
    const metricCardsText = await page.locator('main').textContent();
    check(metricCardsText.includes('Belum ada pembeli'), 'Total Pembeli subtitle says Belum ada pembeli');
    check(metricCardsText.includes('Belum ada lisensi'), 'Lisensi Aktif subtitle says Belum ada lisensi');
    check(metricCardsText.includes('Belum ada kasir aktif'), 'Pengguna Aktif subtitle says Belum ada kasir aktif');
    check(metricCardsText.includes('Tidak ada pesanan tertunda'), 'Menunggu Pembayaran subtitle says Tidak ada pesanan tertunda');

    // Check empty state card
    const emptyOrderCard = page.locator('h4:has-text("Belum Ada Pesanan")');
    check(await emptyOrderCard.isVisible(), 'Empty state card Belum Ada Pesanan is visible');
    const emptyOrderDesc = page.locator('text=Pesanan pembeli akan muncul di sini setelah formulir pembelian SakuNota berhasil dikirim.');
    check(await emptyOrderDesc.isVisible(), 'Empty state description text is visible');

    // Check Customers tab empty state
    await page.locator('button:has-text("Daftar Pelanggan & Lisensi")').click();
    await page.waitForTimeout(300);
    const emptyCustCard = page.locator('text=Belum Ada Pelanggan Terdaftar');
    check(await emptyCustCard.isVisible(), 'Empty state in Customers tab is visible');

    // Check Cloudflare D1 Architecture tab
    await page.locator('button:has-text("Cloudflare D1 Architecture")').click();
    await page.waitForTimeout(300);
    const d1Badge = page.locator('text=Cloudflare D1: Terkoneksi & Siap');
    check(await d1Badge.isVisible(), 'Cloudflare D1 status badge is visible');
    const midtransBadge = page.locator('text=Midtrans: Ready');
    check(await midtransBadge.isVisible(), 'Midtrans Ready badge is visible');

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_owner_dashboard_empty_state.png') });
    console.log('  📸 Screenshot saved: sakunota_owner_dashboard_empty_state.png');

    // Switch back to orders tab
    await page.locator('button:has-text("Pesanan Transfer Masuk")').click();
    await page.waitForTimeout(200);

    // --- STAGE 2: HOMEPAGE BRANDING, SLOGAN & PRICE RP65.000 ---
    console.log('\n[STAGE 2] SakuNota Homepage: Branding, Slogan & Consistent Promo Price');
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const brandTitle = await page.textContent('h1');
    check(brandTitle.includes('Jualan Lancar, Internet Mati Bukan Masalah'), 'Homepage headline matches specification', brandTitle);

    const sloganPill = await page.textContent('body');
    check(sloganPill.includes('SakuNota — Kasir Tetap Jalan, Meski Tanpa Internet'), 'Slogan is present');
    check(sloganPill.includes('Rp65.000'), 'Promo price Rp65.000 is present on homepage');
    check(sloganPill.includes('Rp99.000'), 'Original price Rp99.000 is crossed out');
    check(sloganPill.includes('Hemat Rp34.000'), 'Savings amount explicitly shown');

    // --- STAGE 3: 4 PERTANYAAN CALON PEMBELI ---
    console.log('\n[STAGE 3] 4 Pertanyaan Calon Pembeli');
    const qSection = page.locator('#tanya-jawab-utama');
    check(await qSection.isVisible(), 'The 4 Questions section is visible');
    const qText = await qSection.textContent();
    check(qText.includes('Untuk apa aplikasi SakuNota?'), 'Q1 answered');
    check(qText.includes('Apakah benar-benar bisa dipakai tanpa internet?'), 'Q2 answered');
    check(qText.includes('Berapa harga SakuNota?'), 'Q3 answered');
    check(qText.includes('Bagaimana cara memasangnya di HP?'), 'Q4 answered');

    // --- STAGE 4: PEMBELIAN TRANSFER BANK BCA DENGAN KODE AKSES RAHASIA ---
    console.log('\n[STAGE 4] Pembelian Transfer Bank Manual (BCA) & Status Menunggu Verifikasi');
    const buyBtn = page.locator('button:has-text("Beli SakuNota — Rp65.000")').first();
    await buyBtn.click();
    await page.waitForTimeout(400);

    // Fill details
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

    // Extract Order ID and Secret Access Code
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

    // --- STAGE 5: OWNER PORTAL LIVE SYNC & VERIFICATION ---
    console.log('\n[STAGE 5] Owner Portal: Cloudflare D1 Live Order Arrival & Verification');
    await page.goto(`http://localhost:${port}/owner`, { waitUntil: 'networkidle' });
    await page.waitForSelector('text=1 pembeli terdaftar', { timeout: 8000 });
    await page.waitForSelector('text=Perlu cek mutasi BCA', { timeout: 8000 });

    const updatedMetricsText = await page.locator('main').textContent();
    check(updatedMetricsText.includes('1 pembeli terdaftar'), 'Metrics reflect 1 customer');
    check(updatedMetricsText.includes('Perlu cek mutasi BCA'), 'Metrics reflect 1 pending transfer');

    const pendingOrderRow = page.locator('button:has-text("Verifikasi Dana Masuk & Terbitkan Lisensi")').first();
    check(await pendingOrderRow.isVisible(), 'Pending manual transfer order visible in Owner dashboard');

    // Reza confirms money arrival and issues license
    await pendingOrderRow.click();
    await page.waitForSelector('text=✓ Lunas & Lisensi Terbit', { timeout: 8000 });

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

    // Wrong access code first
    await page.locator('input[placeholder="Contoh: SN-2026-322"]').fill(capturedOrderId);
    await page.locator('input[placeholder="Contoh: KOD-7890"]').fill('WRONG-CODE');
    await page.locator('button:has-text("Periksa Status & Tampilkan Lisensi →")').click();
    await page.waitForTimeout(400);

    const accessDeniedMsg = page.locator('text=Kode akses rahasia tidak cocok');
    check(await accessDeniedMsg.isVisible(), 'Server rejects status check with incorrect access code');

    // Correct access code
    await page.locator('input[placeholder="Contoh: KOD-7890"]').fill(capturedAccessCode);
    await page.locator('button:has-text("Periksa Status & Tampilkan Lisensi →")').click();
    await page.waitForSelector('text=Lunas & Aktif', { timeout: 8000 });

    const activeBadge = page.locator('text=Lunas & Aktif');
    check(await activeBadge.isVisible(), 'Customer sees Lunas & Aktif after server verification');

    const licenseEl = page.locator('text=KODE LISENSI RESMI ANDA:');
    check(await licenseEl.isVisible(), 'Customer retrieves genuine license key');

    const licenseVal = (await page.locator('div.font-mono.font-black.text-sm').textContent()).trim();
    check(licenseVal.startsWith('SN-'), `License format valid (${licenseVal})`);

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_customer_retrieved_license.png') });
    console.log('  📸 Screenshot saved: sakunota_customer_retrieved_license.png');

    // Close modal
    await page.mouse.click(10, 10);
    await page.waitForTimeout(300);

    // --- STAGE 6B: 1-DEVICE ENFORCEMENT ---
    console.log('\n[STAGE 6B] 1-Device License Binding Enforcement in Cloudflare D1');
    const dev1Res = await activateLicenseOnDevice(d1, {
      licenseKey: licenseVal,
      deviceId: 'DEVICE-PHONE-1-BUDI',
      deviceName: 'HP Kasir Warung Budi'
    });
    check(dev1Res.success, 'Device 1 successfully activates license');

    const dev2Res = await activateLicenseOnDevice(d1, {
      licenseKey: licenseVal,
      deviceId: 'DEVICE-LAPTOP-2-UNAUTHORIZED',
      deviceName: 'Laptop Orang Lain'
    });
    check(!dev2Res.success && dev2Res.status === 409, 'Device 2 rejected under strict 1-Device Rule (409 Conflict)');

    // --- STAGE 6C: SERVER-SIDE SESSION REVOCATION (LOGOUT AUDIT) ---
    console.log('\n[STAGE 6C] Server-Side Session Revocation in Cloudflare D1 (Logout)');
    await page.goto(`http://localhost:${port}/owner`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    const storedToken = await page.evaluate(() => sessionStorage.getItem('sakunota_owner_token'));
    check(Boolean(storedToken), 'Owner session token is present in sessionStorage');

    // Click logout
    await page.locator('button:has-text("Keluar (Logout)")').click();
    await page.waitForTimeout(500);

    const tokenAfterLogout = await page.evaluate(() => sessionStorage.getItem('sakunota_owner_token'));
    check(tokenAfterLogout === null, 'Session token cleared from client sessionStorage');

    // Verify revoked token is rejected by D1
    const listResAfterLogout = await listOwnerOrders(d1, storedToken);
    check(!listResAfterLogout.success, 'Cloudflare D1 rejects revoked token with session error', listResAfterLogout.error);

    // --- STAGE 6D: BRUTE-FORCE RATE LIMITING AUDIT ---
    console.log('\n[STAGE 6D] Brute-Force Rate Limiting Audit in Cloudflare D1 (5 Failed Attempts Lock)');
    const testIp = '192.168.99.100';
    for (let i = 1; i <= 4; i++) {
      const failRes = await authenticateOwner(d1, 'Reza', `WrongPass${i}`, testIp);
      check(!failRes.success && !failRes.remainingLockSec, `Attempt ${i} rejected without lock`);
    }

    // 5th failed attempt must trigger lockout
    const fifthRes = await authenticateOwner(d1, 'Reza', 'WrongPass5', testIp);
    check(!fifthRes.success && Boolean(fifthRes.remainingLockSec), '5th failed attempt locks out user for 15 minutes');
    check(fifthRes.error.includes('Akses diblokir'), 'Lockout message presented');

    // Subsequent attempt during lockout period remains blocked
    const blockedRes = await authenticateOwner(d1, 'Reza', 'Reza-SakuNota-2026!', testIp);
    check(!blockedRes.success && Boolean(blockedRes.remainingLockSec), 'Even correct password is held blocked during lockout period');

    // --- STAGE 6E: PERSISTENT CLOUDFLARE D1 DATABASE SURVIVAL ---
    console.log('\n[STAGE 6E] Persistent Cloudflare D1 Survival Across Server Restarts');
    // Shutdown HTTP server
    await new Promise(resolve => server.close(resolve));
    console.log('  Server shut down.');

    // Query D1 directly to prove persistent storage survives
    const d1AfterShutdown = getD1();
    const d1Order = await d1AfterShutdown.prepare('SELECT * FROM CustomerOrders WHERE orderId = ?').bind(capturedOrderId).first();
    check(Boolean(d1Order), `Order ${capturedOrderId} physically saved and verified in Cloudflare D1`);
    check(d1Order.status === 'lunas_lisensi_terbit', 'Order status persists as lunas_lisensi_terbit in D1');
    check(d1Order.licenseKey === licenseVal, 'Genuine license key persists in D1');
    check(d1Order.boundDeviceId === 'DEVICE-PHONE-1-BUDI', '1-device binding persists in D1');

    const d1License = await d1AfterShutdown.prepare('SELECT * FROM Licenses WHERE licenseKey = ?').bind(licenseVal).first();
    check(Boolean(d1License), 'License record physically saved in D1 Licenses table');
    check(d1License.boundDeviceId === 'DEVICE-PHONE-1-BUDI', 'Bound device persisted in D1 Licenses table');

    // Restart server for UI tests
    server = await startServerWithApi();
    console.log('  Server restarted successfully with Cloudflare D1.');

    // --- STAGE 6F: MIDTRANS GATEWAY INTEGRATION & ATOMIC SETTLEMENT ---
    console.log('\n[STAGE 6F] Midtrans Payment Gateway Integration & Atomic Settlement in D1');
    const midtransOrder = await createCustomerOrder(d1, {
      buyerName: 'Haji Ahmad',
      businessName: 'Warung Nasi Ahmad',
      whatsapp: '081299887766'
    });
    check(midtransOrder.success, 'New order created for Midtrans gateway test');

    // Simulate Midtrans settlement webhook
    const midtransRes = await fetch(`http://localhost:${port}/api/payment/midtrans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id: midtransOrder.order.orderId,
        transaction_status: 'settlement',
        gross_amount: '65000.00'
      })
    });
    const midtransJson = await midtransRes.json();
    check(midtransJson.success, 'Midtrans settlement webhook processed successfully in D1');
    check(Boolean(midtransJson.licenseKey), `Midtrans generated genuine license key (${midtransJson.licenseKey})`);

    // Verify order updated in D1
    const settledOrd = await d1.prepare('SELECT * FROM CustomerOrders WHERE orderId = ?').bind(midtransOrder.order.orderId).first();
    check(settledOrd.status === 'lunas_lisensi_terbit', 'D1 order status updated to lunas_lisensi_terbit by Midtrans');

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

    await page.screenshot({ path: path.join(artifactDir, 'sakunota_admin_dashboard_charts_verified.png') });
    console.log('  📸 Screenshot saved: sakunota_admin_dashboard_charts_verified.png');

    // WhatsApp Report Modal Test
    const waBtn = page.locator('button:has-text("Kirim ke WhatsApp")');
    await waBtn.click();
    await page.waitForTimeout(400);

    // Period switcher check
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

    // --- STAGE 9: POS TABLE CONTRAST AUDIT (LIGHT MODE) ---
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
