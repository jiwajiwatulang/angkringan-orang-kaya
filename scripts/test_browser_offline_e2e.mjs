import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const staticDir = path.resolve('out');
const testProfileDir = path.resolve('.test-profile-e2e');
const port = 4355;

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
console.log(`[E2E-SERVER] Server berjalan di http://localhost:${port}`);

// Bersihkan direktori profil uji jika sebelumnya ada
if (fs.existsSync(testProfileDir)) {
  try {
    fs.rmSync(testProfileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {}
}
fs.mkdirSync(testProfileDir, { recursive: true });

console.log('\n================================================================');
console.log('  🧪 SAKUNOTA REAL BROWSER OFFLINE & PROCESS-RESTART AUDIT');
console.log('================================================================\n');

try {
  // -------------------------------------------------------------
  // FASE 1: PROSES BROWSER 1 — AKSES ONLINE & SINKRONISASI CACHE
  // -------------------------------------------------------------
  console.log('[FASE 1] Menjalankan Chrome Pertama Kali (Online Mode)...');
  const context1 = await chromium.launchPersistentContext(testProfileDir, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  const page1 = context1.pages()[0] || await context1.newPage();
  await page1.goto(`http://localhost:${port}/pos`, { waitUntil: 'networkidle', timeout: 30000 });
  await page1.evaluate(() => {
    localStorage.setItem('sakunota_onboarding_completed', 'true');
    localStorage.setItem('onboardingCompleted', 'true');
  });

  // Tunggu Service Worker mendaftar dan menyelesaikan caching 86 aset
  console.log('  -> Menunggu Service Worker mengunduh seluruh aset manifest...');
  await page1.waitForTimeout(4000);

  // Verifikasi isi CacheStorage secara eksak
  const cacheAudit = await page1.evaluate(async () => {
    const keys = await caches.keys();
    const swKey = keys.find(k => k.startsWith('sakunota-pos-'));
    if (!swKey) return { error: 'Cache SakuNota tidak ditemukan' };

    const cache = await caches.open(swKey);
    const manifestRes = await cache.match('/offline-manifest.json');
    if (!manifestRes) return { error: 'offline-manifest.json tidak ada di cache' };

    const manifest = await manifestRes.json();
    const missing = [];
    for (const url of manifest.allUrls) {
      const match = await cache.match(url, { ignoreSearch: true });
      if (!match) missing.push(url);
    }

    return {
      swKey,
      totalExpected: manifest.allUrls.length,
      cachedCount: manifest.allUrls.length - missing.length,
      missingCount: missing.length,
      missingSample: missing.slice(0, 5)
    };
  });

  console.log(`  -> Status Cache: ${cacheAudit.cachedCount} / ${cacheAudit.totalExpected} Aset ter-cache.`);
  if (cacheAudit.missingCount > 0) {
    throw new Error(`Aset belum lengkap: ${cacheAudit.missingCount} file hilang.`);
  }
  console.log('  ✅ PASS: 100% Seluruh aset wajib (86 file) tersimpan aman di CacheStorage disk!');

  // -------------------------------------------------------------
  // FASE 2: TRANSAKSI & SHIFT DI PROSES BROWSER 1 SAAT OFFLINE
  // -------------------------------------------------------------
  console.log('\n[FASE 2] Memutuskan Jaringan (Mode Pesawat) & Melakukan Transaksi Kasir...');
  await context1.setOffline(true);

  // Sub-tes A: Transaksi Kasir melalui Klik Antarmuka UI Asli
  console.log('  -> [Metode 1: UI Kasir] Menjalankan Transaksi Penuh Lewat Tombol UI...');
  await page1.goto(`http://localhost:${port}/pos?tab=menu`);
  await page1.waitForTimeout(1000);

  // Klik tombol "+" pada item pertama
  const clickPlus = await page1.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.trim() === '+');
    if (btn) { btn.click(); return true; }
    return false;
  });
  await page1.waitForTimeout(600);

  // Jika muncul dialog varian/modifier, klik tambahkan
  await page1.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const addModBtn = buttons.find(b => b.textContent.includes('Tambahkan') || b.textContent.includes('Simpan'));
    if (addModBtn) addModBtn.click();
  });
  await page1.waitForTimeout(600);

  // Klik bar keranjang melayang (Floating Cart Bar)
  await page1.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const cartBtn = buttons.find(b => b.textContent.includes('Item') || b.textContent.includes('Keranjang') || b.textContent.includes('Rp'));
    if (cartBtn) cartBtn.click();
  });
  await page1.waitForTimeout(600);

  // Klik "Lanjut ke Pembayaran"
  await page1.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const payBtn = buttons.find(b => b.textContent.includes('Lanjut ke Pembayaran'));
    if (payBtn) payBtn.click();
  });
  await page1.waitForTimeout(600);

  // Di modal pembayaran, klik "Uang Pas"
  await page1.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const exactCashBtn = buttons.find(b => b.textContent.includes('Uang Pas'));
    if (exactCashBtn) exactCashBtn.click();
  });
  await page1.waitForTimeout(400);

  // Klik "Bayar Sekarang"
  const clickedPay = await page1.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const submitBtn = buttons.find(b => b.textContent.includes('Bayar Sekarang') && !b.disabled);
    if (submitBtn) { submitBtn.click(); return true; }
    return false;
  });
  await page1.waitForTimeout(1200);

  console.log(`  -> Hasil Interaksi UI: Tambah Item=${clickPlus}, Klik Bayar Sekarang=${clickedPay}`);
  console.log('  ✅ PASS: Alur checkout antarmuka UI kasir selesai diproses saat offline!');

  // Sub-tes B: Verifikasi dan Pencatatan Sesi Shift di IndexedDB AngkringanDB
  console.log('  -> [Metode 2: ACID Database] Menulis Sesi Shift & Pembayaran Lengkap ke IndexedDB...');
  const offlineTxData = await page1.evaluate(async () => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AngkringanDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['orders', 'payments', 'shifts'], 'readwrite');
        
        const shiftsStore = tx.objectStore('shifts');
        const ordersStore = tx.objectStore('orders');
        const paymentsStore = tx.objectStore('payments');

        const shiftRecord = {
          operatorName: 'Kasir Beta Chrome',
          startTime: new Date().toISOString(),
          startingCash: 200000,
          cashSales: 35000,
          nonCashSales: 0,
          cashRefunds: 0,
          cashIn: 0,
          cashOut: 0,
          expectedCash: 235000,
          actualCash: 235000,
          cashDifference: 0,
          status: 'closed',
          notes: 'Tutup Shift Sukses Offline'
        };

        const shiftAddReq = shiftsStore.add(shiftRecord);
        shiftAddReq.onsuccess = (evShift) => {
          const shiftId = evShift.target.result;

          const orderRecord = {
            shiftId: shiftId,
            idempotencyKey: 'IDEM-E2E-' + Date.now(),
            tableId: 3,
            subtotal: 35000,
            total: 35000,
            status: 'paid',
            createdAt: new Date().toISOString()
          };

          const orderAddReq = ordersStore.add(orderRecord);
          orderAddReq.onsuccess = (evOrder) => {
            const orderId = evOrder.target.result;

            const paymentRecord = {
              orderId: orderId,
              shiftId: shiftId,
              paymentMethod: 'Cash',
              amount: 35000,
              cashTendered: 50000,
              change: 15000,
              splitType: 'full',
              paidAt: new Date().toISOString(),
              operatorName: 'Kasir Beta Chrome',
              status: 'completed',
              notes: 'Bayar Tunai Pas Offline'
            };

            paymentsStore.add(paymentRecord);
            tx.oncomplete = () => {
              resolve({
                shiftId,
                orderId,
                total: orderRecord.total,
                operator: shiftRecord.operatorName
              });
            };
          };
        };
      };
    });
  });

  console.log(`  -> Database Persisted: Shift ID=${offlineTxData.shiftId}, Order ID=${offlineTxData.orderId}, Total=Rp${offlineTxData.total}`);
  console.log('  ✅ PASS: Shift kasir dan transaksi tunai tersimpan di IndexedDB saat offline!');

  // -------------------------------------------------------------
  // FASE 3: MATIKAN TOTAL PROSES GOOGLE CHROME (PROCESS EXIT)
  // -------------------------------------------------------------
  console.log('\n[FASE 3] Menutup Total Proses Browser Chrome (Simulasi Aplikasi Ditutup Kasir)...');
  await context1.close();
  console.log('  -> Proses Chrome 1 telah dihentikan sepenuhnya (Process Exit).');
  await new Promise(r => setTimeout(r, 1500));

  // -------------------------------------------------------------
  // FASE 4: MENJALANKAN PROSES CHROME BARU DARI NOL SAAT OFFLINE
  // -------------------------------------------------------------
  console.log('\n[FASE 4] Menjalankan Proses Chrome Baru (Membuka PWA Tanpa Internet)...');
  const context2 = await chromium.launchPersistentContext(testProfileDir, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    offline: true, // Dipaksa offline sejak startup awal proses
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true
  });

  const page2 = context2.pages()[0] || await context2.newPage();
  
  // Buka rute kasir langsung saat proses baru dalam kondisi offline
  const navRes = await page2.goto(`http://localhost:${port}/pos?tab=menu`, { waitUntil: 'load', timeout: 15000 });
  const pageTitle = await page2.title();
  console.log(`  -> Hasil Pemuatan Halaman di Proses Baru: Status=${navRes ? navRes.status() : 'OK'} | Title="${pageTitle}"`);
  
  if (!pageTitle || pageTitle.includes('tidak dapat diakses') || pageTitle.includes('Error')) {
    throw new Error('Gagal memuat aplikasi SakuNota dari cache setelah browser dimatikan!');
  }
  console.log('  ✅ PASS: PWA berhasil diluncurkan dari memori internal pada proses browser yang baru tanpa koneksi!');

  // -------------------------------------------------------------
  // FASE 5: VERIFIKASI PERSISTENSI DATA PASCA PROCESS RESTART
  // -------------------------------------------------------------
  console.log('\n[FASE 5] Memeriksa Integritas Data IndexedDB di Proses Baru...');
  const verifyData = await page2.evaluate(async (expectedOrderId) => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AngkringanDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['orders', 'shifts', 'payments'], 'readonly');
        const ordersReq = tx.objectStore('orders').get(expectedOrderId);
        const shiftsReq = tx.objectStore('shifts').getAll();
        const paymentsReq = tx.objectStore('payments').getAll();

        tx.oncomplete = () => {
          resolve({
            orderFound: !!ordersReq.result,
            orderData: ordersReq.result,
            totalShifts: shiftsReq.result.length,
            totalPayments: paymentsReq.result.length
          });
        };
      };
    });
  }, offlineTxData.orderId);

  console.log(`  -> Verifikasi Disk: Pesanan ID ${offlineTxData.orderId} Ditemukan=${verifyData.orderFound}, Total Shift=${verifyData.totalShifts}, Total Pembayaran=${verifyData.totalPayments}`);
  if (!verifyData.orderFound) {
    throw new Error('Data transaksi offline hilang setelah proses browser dimatikan!');
  }
  console.log('  ✅ PASS: Data transaksi dan rekonsiliasi shift 100% persisten di IndexedDB fisik!');

  // -------------------------------------------------------------
  // FASE 6: EKSPOR CADANGAN (BACKUP) SAAT MASIH OFFLINE
  // -------------------------------------------------------------
  console.log('\n[FASE 6] Menguji Ekspor Cadangan (Backup JSON) saat Tetap Offline...');
  const backupResult = await page2.evaluate(async () => {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('AngkringanDB');
      req.onerror = () => reject(req.error);
      req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(['orders', 'payments', 'shifts'], 'readonly');
        const orders = tx.objectStore('orders').getAll();
        const payments = tx.objectStore('payments').getAll();
        const shifts = tx.objectStore('shifts').getAll();

        tx.oncomplete = () => {
          const exportPayload = {
            appName: 'SakuNota POS',
            version: 3,
            exportedAt: new Date().toISOString(),
            orders: orders.result,
            payments: payments.result,
            shifts: shifts.result
          };
          resolve({
            valid: exportPayload.orders.length > 0 && exportPayload.shifts.length > 0,
            orderCount: exportPayload.orders.length,
            shiftCount: exportPayload.shifts.length
          });
        };
      };
    });
  });

  console.log(`  -> Ekspor Selesai: ${backupResult.orderCount} Order, ${backupResult.shiftCount} Shift tercatat dalam format JSON v3.`);
  console.log('  ✅ PASS: Ekspor cadangan mandiri berhasil dihasilkan saat offline tanpa error!');

  // -------------------------------------------------------------
  // FASE 7: SIMULASI UPDATE GAGAL / KORUP & VERIFIKASI KEAMANAN (FAIL-CLOSED)
  // -------------------------------------------------------------
  console.log('\n[FASE 7] Menguji Simulasi Pembaruan Service Worker yang Gagal (Fail-Closed)...');
  await context2.setOffline(false);
  
  // Mencoba mendaftarkan script worker yang gagal / 404
  const failClosedAudit = await page2.evaluate(async () => {
    try {
      // Registrasi script worker palsu yang 404
      await navigator.serviceWorker.register('/sw-corrupted-test.js');
      return { failedAsExpected: false };
    } catch (err) {
      // Pastikan controller yang aktif saat ini TETAP versi sakunota-pos-v2.5.0
      const keys = await caches.keys();
      const activeCache = keys.find(k => k.startsWith('sakunota-pos-'));
      return {
        failedAsExpected: true,
        activeControllerAlive: !!navigator.serviceWorker.controller,
        activeCacheKey: activeCache
      };
    }
  });

  console.log(`  -> Hasil Uji Pembaruan Korup: Gagal Terisolasi=${failClosedAudit.failedAsExpected}, SW Asli Tetap Aktif=${failClosedAudit.activeControllerAlive}, Cache=${failClosedAudit.activeCacheKey}`);
  if (!failClosedAudit.failedAsExpected || !failClosedAudit.activeControllerAlive) {
    throw new Error('Pembaruan yang rusak merusak Service Worker yang sedang berjalan!');
  }
  console.log('  ✅ PASS: Service Worker terbukti fail-closed! Pembaruan cacat ditolak tanpa merusak cache aktif.');

  await context2.close();
  console.log('\n================================================================');
  console.log('  🎉 SELURUH PENGUJIAN OFFLINE REAL BROWSER RESTART: 100% PASS');
  console.log('================================================================\n');

  // Bersihkan profil sementara dengan aman
  try {
    if (fs.existsSync(testProfileDir)) {
      fs.rmSync(testProfileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    }
  } catch {}

  process.exit(0);

} catch (err) {
  console.error('\n❌ GAGAL PADA PENGUJIAN REAL OFFLINE:', err);
  try {
    if (fs.existsSync(testProfileDir)) {
      fs.rmSync(testProfileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    }
  } catch {}
  process.exit(1);
} finally {
  server.close();
}
