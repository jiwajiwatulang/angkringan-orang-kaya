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
  activateLicenseOnDevice,
  getOwnerMetrics,
  revokeOwnerSession,
  extractBearerToken,
  createTesterLicense,
  listTesterLicenses,
  revokeTesterLicense,
  unbindTesterLicense,
} from '../src/lib/server/sakunotaServer.ts';
import { getD1, initD1Tables, resetDatabaseCleanD1, getMetricsD1 } from '../src/lib/server/d1.ts';

const staticDir = path.resolve('out');
const profileDir = path.resolve('.test-profile-hp-tester');
const artifactDir = path.resolve('C:\\Users\\User\\.gemini\\antigravity\\brain\\4c7a1509-3477-4c30-b661-18b9208deb22');
const port = 4455;

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

      if (pathname === '/api/owner/tester-license') {
        const auth = req.headers['authorization'] || '';
        const token = extractBearerToken(auth);

        if (req.method === 'GET') {
          const result = await listTesterLicenses(d1, token);
          console.log('  [TEST SERVER] GET /api/owner/tester-license:', { hasToken: Boolean(token), result });
          res.writeHead(result.success ? 200 : 401, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(result));
        }

        if (req.method === 'POST') {
          const body = await parseBody(req);
          const result = await createTesterLicense(d1, token, body);
          console.log('  [TEST SERVER] POST /api/owner/tester-license:', { hasToken: Boolean(token), body, result });
          res.writeHead(result.success ? 201 : 400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify(result));
        }

        if (req.method === 'PUT') {
          const body = await parseBody(req);
          if (body.action === 'unbind') {
            const result = await unbindTesterLicense(d1, token, body.licenseKey);
            res.writeHead(result.success ? 200 : 401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(result));
          }
          if (body.action === 'revoke') {
            const result = await revokeTesterLicense(d1, token, body.licenseKey);
            res.writeHead(result.success ? 200 : 401, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(result));
          }
        }
      }

      if (pathname === '/api/license/activate' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = await activateLicenseOnDevice(d1, body);
        res.writeHead(result.status || (result.success ? 200 : 400));
        return res.end(JSON.stringify(result));
      }

      res.writeHead(404);
      return res.end(JSON.stringify({ error: 'Endpoint API tidak ditemukan' }));
    }

    // Static files
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
  return server;
}

async function run() {
  const d1 = getD1();
  await initD1Tables(d1);
  await resetDatabaseCleanD1(d1);

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
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 1.5,
  });

  const page = await context.newPage();
  page.on('console', (msg) => console.log('  [BROWSER]', msg.text()));

  try {
    console.log('\n================================================================');
    console.log('  🚀 TESTING HOMEPAGE REDESIGN & OWNER TESTER LICENSES');
    console.log('================================================================\n');

    // --- PART 1: HOMEPAGE REDESIGN AUDIT ---
    console.log('[PART 1] Homepage UX, Nav Links, Hero, Mini Simulator, & 4 Jenis Usaha');
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);

    // Verify Clean Navigation Links (Fitur, Jenis Usaha, Harga, Panduan, Bantuan)
    const navText = await page.locator('nav').textContent();
    check(navText.includes('Fitur'), 'Nav link Fitur present');
    check(navText.includes('Jenis Usaha'), 'Nav link Jenis Usaha present');
    check(navText.includes('Harga'), 'Nav link Harga present');
    check(navText.includes('Panduan'), 'Nav link Panduan present');
    check(navText.includes('Bantuan'), 'Nav link Bantuan present');

    // Verify Hero Headings & Badges
    const heroH1 = await page.locator('h1').textContent();
    check(heroH1.includes('Kasir Simpel, Tetap Offline.') || heroH1.includes('Jualan Lebih Mudah, Kasir Tetap Jalan.'), 'H1 contains primary slogan');
    check(heroH1.includes('Jualan Lancar, Internet Mati Bukan Masalah.'), 'H1 contains offline reassurance');

    const heroBody = await page.locator('body').textContent();
    check(heroBody.includes('Kasir offline'), 'Badge Kasir offline is rendered');
    check(heroBody.includes('Cetak struk'), 'Badge Cetak struk is rendered');
    check(heroBody.includes('Pasang di HP'), 'Badge Pasang di HP is rendered');

    // Verify Interactive Simulator (Coba Kasir)
    console.log('\n[PART 2] Interactive Mini POS Simulator on Homepage');
    const simTitle = page.locator('text=Coba Kasir SakuNota Langsung di Sini');
    check(await simTitle.isVisible(), 'Simulator section is visible');

    // Click "+ Tambah" or change quantity
    const addBtn = page.locator('button:has-text("+ Tambah")').first();
    if (await addBtn.isVisible()) {
      await addBtn.click();
      await page.waitForTimeout(200);
    }

    // Toggle receipt preview
    const receiptBtn = page.locator('button:has-text("Lihat Simulasi Struk")');
    check(await receiptBtn.isVisible(), 'Receipt preview toggle button is visible');
    await receiptBtn.click();
    await page.waitForTimeout(300);

    const receiptContent = page.locator('text=SAKUNOTA POS OFFICIAL');
    check(await receiptContent.isVisible(), 'Mini thermal receipt simulated successfully');

    // Verify 4 Jenis Usaha interactive switching
    console.log('\n[PART 3] 4 Jenis Usaha Interactive Switcher');
    const restoTab = page.locator('button:has-text("Rumah Makan & Restoran")').first();
    check(await restoTab.isVisible(), 'Restoran tab button visible');
    await restoTab.click();
    await page.waitForTimeout(300);

    const restoDesc = page.locator('text=Mode Denah Meja & Open Bill').first();
    check(await restoDesc.isVisible(), 'Restoran mode description displayed');

    const kafeTab = page.locator('button:has-text("Kafe & Kedai Minuman")').first();
    await kafeTab.click();
    await page.waitForTimeout(300);
    check(await page.locator('text=Pilihan Tambahan & Modifiers').isVisible(), 'Kafe mode description displayed');

    const retailTab = page.locator('button:has-text("Retail")').first();
    await retailTab.click();
    await page.waitForTimeout(300);
    check(await page.locator('text=Kelola Stok Barang & Kode SKU').first().isVisible(), 'Retail mode description displayed');

    // Screenshot of redesigned homepage
    await page.screenshot({ path: path.join(artifactDir, 'sakunota_homepage_redesign.png'), fullPage: false });
    console.log('  📸 Screenshot saved: sakunota_homepage_redesign.png');

    // --- PART 4: OWNER TESTER LICENSE WORKFLOW ---
    console.log('\n[PART 4] Owner Portal: Tester License Generation & 1-Device Enforcement');
    await page.goto(`http://localhost:${port}/owner`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    // Login Owner
    const testOwnerUser = process.env.TEST_OWNER_USER || 'OwnerSakuNota';
    const testOwnerPass = process.env.TEST_OWNER_PASS || 'Test-Owner-Password-2026!';
    await page.locator('input[placeholder*="username"]').fill(testOwnerUser);
    await page.locator('input[placeholder*="password"]').fill(testOwnerPass);
    await page.locator('button:has-text("Masuk ke Dashboard Owner")').click();
    await page.waitForTimeout(600);

    // Switch to Tester Tab
    const testerTabBtn = page.locator('button:has-text("🧪 Lisensi Tester")');
    check(await testerTabBtn.isVisible(), 'Lisensi Tester tab button is visible');
    await testerTabBtn.click();
    await page.waitForTimeout(400);

    // Empty state verified
    const emptyTesterText = page.locator('text=Belum ada lisensi tester yang diterbitkan');
    check(await emptyTesterText.isVisible(), 'Initial empty tester list verified');

    // Fill tester issuance form
    await page.locator('input[placeholder*="Mas Joko"]').fill('Mas Joko - Warung Sleman');
    await page.locator('input[placeholder*="081234567891"]').fill('081234567891');
    await page.locator('select').selectOption('14'); // 14 Hari
    await page.locator('input[placeholder*="Pengujian printer"]').fill('Uji coba kasir warung kopi');

    await page.locator('button:has-text("Terbitkan Lisensi Tester (Gratis)")').click();
    await page.waitForTimeout(1000);
    const issuedRow = page.locator('strong:has-text("Mas Joko")').first();
    check(await issuedRow.isVisible(), 'Tester license issued and visible in table');

    const licenseBadge = page.locator('span.font-mono:has-text("SN-TEST-")').first();
    const generatedTestKey = (await licenseBadge.textContent()).trim();
    check(generatedTestKey.startsWith('SN-TEST-'), `Generated key format correct (${generatedTestKey})`);

    const validityBadge = page.locator('text=Aktif (14 Hari)');
    check(await validityBadge.isVisible(), 'Validity duration shows Aktif (14 Hari)');

    // Verify that metrics in D1 remain ZERO omzet / 0 paid buyers
    const metricsVal = await getMetricsD1(d1);
    check(metricsVal.totalPembeli === 0, 'Total Pembeli strictly remains 0 (tester does not inflate buyer counts)');
    check(metricsVal.menungguVerifikasi === 0, 'Menunggu Verifikasi strictly remains 0');

    // Test Device 1 activation of Tester License
    console.log('\n[PART 5] Tester License Device Activation & 1-Device Rule');
    const act1 = await activateLicenseOnDevice(d1, {
      licenseKey: generatedTestKey,
      deviceId: 'DEVICE-PHONE-JOKO-1',
      deviceName: 'HP Mas Joko'
    });
    check(act1.success, 'Device 1 successfully activated tester license');

    // Device 2 attempt (Must be rejected with 409 Conflict)
    const act2 = await activateLicenseOnDevice(d1, {
      licenseKey: generatedTestKey,
      deviceId: 'DEVICE-PHONE-OTHER-2',
      deviceName: 'HP Teman Joko'
    });
    check(!act2.success && act2.status === 409, 'Device 2 rejected under strict 1-Device Rule for tester license (409)');

    // Refresh tester tab to see device binding
    await testerTabBtn.click();
    await page.waitForTimeout(400);

    const deviceBoundText = page.locator('text=Terikat pada HP Mas Joko');
    check(await deviceBoundText.isVisible(), 'Device binding status visible in Owner table');

    // Screenshot of Owner Tester License Dashboard
    await page.screenshot({ path: path.join(artifactDir, 'sakunota_owner_tester_licenses.png') });
    console.log('  📸 Screenshot saved: sakunota_owner_tester_licenses.png');

    // Test Unbind Device
    const unbindBtn = page.locator('button:has-text("Lepas Perangkat")').first();
    check(await unbindBtn.isVisible(), 'Lepas Perangkat button is visible');
    await unbindBtn.click();
    await page.waitForTimeout(500);

    // Device 2 can now bind after unbind
    const act3 = await activateLicenseOnDevice(d1, {
      licenseKey: generatedTestKey,
      deviceId: 'DEVICE-PHONE-OTHER-2',
      deviceName: 'HP Baru Mas Joko'
    });
    check(act3.success, 'After unbind, new device successfully binds to tester license');

    console.log('\n================================================================');
    console.log(`  🎉 ALL ${results.length} HOMEPAGE & TESTER VERIFICATIONS PASSED!`);
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
