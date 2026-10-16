import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const PORT = 4599;
const staticDir = path.resolve('out');
const ARTIFACT_DIR = 'C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22';

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

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function startServer() {
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://localhost:${PORT}`);
    let reqPath = decodeURI(parsedUrl.pathname);
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

  return new Promise((resolve) => {
    server.listen(PORT, () => {
      console.log(`📡 Static server running on http://localhost:${PORT}`);
      resolve(server);
    });
  });
}

async function run() {
  const server = await startServer();

  try {
    console.log('📱 Launching Chrome in mobile landscape viewport (844 x 390)...');
    const browser = await chromium.launch({ headless: true, channel: 'chrome' });
    const context = await browser.newContext({
      viewport: { width: 844, height: 390 }, // iPhone Landscape
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    console.log(`🌐 Navigating to http://localhost:${PORT}/pos`);
    await page.goto(`http://localhost:${PORT}/pos`, { waitUntil: 'networkidle' });
    await wait(1200);

    // If shift modal is open, click Mulai Shift or Buka Shift
    const mulaiShiftBtn = await page.$('button:has-text("Mulai Shift")');
    if (mulaiShiftBtn && await mulaiShiftBtn.isVisible()) {
      console.log('Mulai Shift submitted');
      await mulaiShiftBtn.click();
      await wait(1000);
    } else {
      const shiftButtons = await page.$$('button:has-text("Buka Shift")');
      for (const btn of shiftButtons) {
        if (await btn.isVisible()) {
          console.log('Visible Buka Shift clicked');
          await btn.click();
          await wait(500);
          const confirmBtn = await page.$('button:has-text("Mulai Shift")');
          if (confirmBtn && await confirmBtn.isVisible()) {
            await confirmBtn.click();
            await wait(1000);
          }
          break;
        }
      }
    }

    // Go to catalog screen: click Transaksi Baru / Buka Katalog button
    console.log('Navigating to Catalog...');
    const catalogBtn = await page.$('button:has-text("Transaksi Baru"), button:has-text("Katalog")');
    if (catalogBtn && await catalogBtn.isVisible()) {
      await catalogBtn.click();
      await wait(800);
    } else {
      // Or bottom nav Menu button
      const menuNav = await page.$('button:has-text("Menu")');
      if (menuNav && await menuNav.isVisible()) {
        await menuNav.click();
        await wait(800);
      }
    }

    // Add items by clicking "+" buttons on the menu catalog
    console.log('Adding items by clicking "+" buttons...');
    const plusButtons = await page.$$('button:text-is("+")');
    console.log(`Found ${plusButtons.length} plus buttons.`);
    let added = 0;
    for (const btn of plusButtons) {
      if (await btn.isVisible()) {
        await btn.click();
        added++;
        await wait(600);

        // If modifier modal appeared, click "+ Tambahkan"
        const addModifierBtn = await page.$('button:has-text("+ Tambahkan")');
        if (addModifierBtn && await addModifierBtn.isVisible()) {
          console.log('Confirmed modifier modal with + Tambahkan');
          await addModifierBtn.click();
          await wait(600);
        }

        if (added >= 2) break;
      }
    }
    console.log(`Added ${added} items to cart.`);

    // Find and click the floating cart button to open the mobile cart
    console.log('Opening mobile cart via Floating Cart Bar...');
    const cartButton = await page.waitForSelector('button:has-text("Keranjang"):visible', { timeout: 5000 });
    if (cartButton) {
      await cartButton.click();
      await wait(1000);
    }

    // Wait for cart to be visible
    await page.waitForSelector('h2:has-text("Pesanan Anda"):visible', { timeout: 5000 });
    console.log('✅ Cart modal is open in landscape!');

    // Check for 2-column landscape layout elements
    const leftPane = await page.$('.landscape\\:flex-row');
    if (leftPane) {
      console.log('✅ PASS: Landscape flex-row active container found!');
    }

    // Check Bayar button
    const bayarBtn = await page.$('button:has-text("Bayar")');
    const isBayarVisible = bayarBtn ? await bayarBtn.isVisible() : false;
    console.log(`✅ Bayar button visible: ${isBayarVisible}`);

    // Take a screenshot of the landscape cart
    const screenshotPath = path.join(ARTIFACT_DIR, 'pos_cart_mobile_landscape.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`📸 Screenshot saved: ${screenshotPath}`);

    // Now test portrait orientation (390 x 844)
    console.log('📱 Testing mobile portrait viewport (390 x 844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(800);
    const portraitScreenshotPath = path.join(ARTIFACT_DIR, 'pos_cart_mobile_portrait.png');
    await page.screenshot({ path: portraitScreenshotPath });
    console.log(`📸 Portrait screenshot saved: ${portraitScreenshotPath}`);

    await browser.close();
  } finally {
    server.close();
    console.log('🛑 Server stopped.');
  }
}

run().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
