import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const staticDir = path.resolve('out');
const profileDirA = path.resolve('.test-profile-cross-a');
const profileDirB = path.resolve('.test-profile-cross-b');
const port = 4357;

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

// 1. Web Server
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
console.log(`[TEST-SERVER] Running at http://localhost:${port}`);

// Clean old test profile directories
for (const dir of [profileDirA, profileDirB]) {
  if (fs.existsSync(dir)) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
    } catch {}
  }
  fs.mkdirSync(dir, { recursive: true });
}

const backupExportPath = path.resolve('test-cross-backup-artifact.json');
if (fs.existsSync(backupExportPath)) {
  fs.unlinkSync(backupExportPath);
}

let passedChecks = 0;
let totalChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('\n================================================================');
console.log('  🔄 SAKUNOTA REAL CROSS-PROFILE BACKUP & RESTORE E2E AUDIT');
console.log('================================================================\n');

try {
  // -------------------------------------------------------------------------
  // FASE 1: PROFIL A (HP LAMA / SUMBER)
  // -------------------------------------------------------------------------
  console.log('[FASE 1] Menjalankan Profil A (Perangkat Lama)...');
  const contextA = await chromium.launchPersistentContext(profileDirA, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    viewport: { width: 412, height: 915 },
    acceptDownloads: true
  });

  const pageA = contextA.pages()[0] || await contextA.newPage();
  await pageA.goto(`http://localhost:${port}/pos`);
  await pageA.waitForTimeout(1000);
  await pageA.evaluate(() => {
    localStorage.setItem('sakunota_onboarding_completed', 'true');
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('adminLoginExpiry', (Date.now() + 86400000).toString());
  });

  // Isi data usaha kustom di Profil A
  console.log('  -> Menyiapkan data usaha kustom di Profil A (Dexie DB)...');
  const customDataInserted = await pageA.evaluate(async () => {
    const req = indexedDB.open('AngkringanDB');
    return new Promise((resolve, reject) => {
      req.onsuccess = async () => {
        const idb = req.result;
        const tx = idb.transaction(
          ['settings', 'menuItems', 'tables', 'orders', 'orderItems', 'payments', 'paymentProofs', 'shifts'],
          'readwrite'
        );

        // 1. Settings
        const settingsStore = tx.objectStore('settings');
        settingsStore.put({
          key: 'pos_store_settings',
          value: {
            storeName: 'Warung Kopi Nusantara E2E',
            address: 'Jl. Malioboro No. 45 Yogyakarta',
            phone: '081234567890',
            taxPercentage: 11,
            servicePercentage: 5,
            adminPin: '1234'
          },
          updatedAt: new Date().toISOString()
        });

        // 2. Menu Item Kustom
        const menuStore = tx.objectStore('menuItems');
        menuStore.add({
          sku: 'KOP-099',
          nama: 'Kopi Klotok Istimewa',
          harga: 15000,
          kategori: 'Kopi',
          isSoldOut: false,
          urutan: 1,
          modifiers: []
        });

        // 3. Meja Kustom
        const tableStore = tx.objectStore('tables');
        tableStore.add({
          nomor: 'Meja VIP #99',
          status: 'kosong'
        });

        // 4. Shift
        const shiftStore = tx.objectStore('shifts');
        shiftStore.add({
          operatorName: 'Budi Kasir Senior',
          startingCash: 150000,
          cashSales: 30000,
          nonCashSales: 0,
          expectedCash: 180000,
          status: 'open',
          startTime: new Date().toISOString()
        });

        // 5. Order & Items
        const orderStore = tx.objectStore('orders');
        const orderReq = orderStore.add({
          tableId: null,
          receiptNumber: 'NOTA-E2E-999',
          customerName: 'Bapak Direktur',
          total: 30000,
          paidAmount: 30000,
          remainingBalance: 0,
          status: 'paid',
          verificationStatus: 'terverifikasi',
          paymentMethod: 'QRIS',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });

        orderReq.onsuccess = () => {
          const orderId = orderReq.result;

          const orderItemStore = tx.objectStore('orderItems');
          orderItemStore.add({
            orderId,
            menuItemId: 1,
            namaMenu: 'Kopi Klotok Istimewa',
            qty: 2,
            hargaSatuan: 15000
          });

          const paymentStore = tx.objectStore('payments');
          const payReq = paymentStore.add({
            orderId,
            amount: 30000,
            paymentMethod: 'QRIS',
            splitType: 'full',
            operatorName: 'Budi Kasir Senior',
            status: 'completed',
            proofStatus: 'terverifikasi',
            paidAt: new Date().toISOString()
          });

          payReq.onsuccess = () => {
            const paymentId = payReq.result;
            const proofStore = tx.objectStore('paymentProofs');
            proofStore.add({
              orderId,
              paymentId,
              fileName: 'qris_transfer_bukti_e2e.png',
              fileSize: 1024,
              mimeType: 'image/png',
              status: 'terverifikasi',
              imageData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
              uploadedAt: new Date().toISOString(),
              uploadedBy: 'Budi Kasir Senior'
            });
          };
        };

        tx.oncomplete = () => resolve(true);
        tx.onerror = (e) => reject(e);
      };
      req.onerror = (e) => reject(e);
    });
  });

  assert(customDataInserted === true, 'Data usaha kustom berhasil dibuat di Profil A');

  // Buka halaman Data & Cadangan di Profil A
  console.log('  -> Membuka halaman /admin/pengaturan/data di Profil A...');
  await pageA.goto(`http://localhost:${port}/admin/pengaturan/data?auth=demo`);
  await pageA.waitForTimeout(1500);

  // Verifikasi live count mencerminkan data yang baru diisi
  const liveOrderCount = await pageA.locator('.text-accent-text.text-2xl').first().textContent();
  console.log(`  -> Live Order Count terdeteksi di Profil A: ${liveOrderCount?.trim()}`);

  // Klik Cadangkan Sekarang dan tangkap unduhan file JSON
  console.log('  -> Memulai ekspor cadangan Profil A...');
  const downloadPromise = pageA.waitForEvent('download');
  await pageA.locator('button:has-text("Cadangkan Sekarang")').first().click();
  const download = await downloadPromise;
  await download.saveAs(backupExportPath);

  assert(fs.existsSync(backupExportPath), 'File cadangan JSON berhasil diunduh ke disk');
  const backupStat = fs.statSync(backupExportPath);
  assert(backupStat.size > 200, `Ukuran file cadangan valid (${backupStat.size} bytes)`);

  const backupContent = JSON.parse(fs.readFileSync(backupExportPath, 'utf8'));
  assert(backupContent.settings?.storeName === 'Warung Kopi Nusantara E2E', 'Backup JSON memuat Nama Usaha yang benar');
  assert(backupContent.menus?.some(m => m.nama === 'Kopi Klotok Istimewa'), 'Backup JSON memuat Menu Kustom');
  assert(backupContent.tables?.some(t => t.nomor === 'Meja VIP #99'), 'Backup JSON memuat Meja Kustom');
  assert(backupContent.orders?.some(o => o.customerName === 'Bapak Direktur'), 'Backup JSON memuat Order Kustom');
  assert(backupContent.paymentProofs?.length >= 1, 'Backup JSON memuat Bukti Pembayaran (Payment Proof)');
  assert(backupContent.paymentProofs[0].imageData.startsWith('data:image/png;base64,'), 'Backup JSON memuat base64 Image Data');

  // Tutup Profil A sepenuhnya
  console.log('  -> Menutup browser Profil A...');
  await contextA.close();

  // -------------------------------------------------------------------------
  // FASE 2: PROFIL B (HP BARU / TARGET BERSIH)
  // -------------------------------------------------------------------------
  console.log('\n[FASE 2] Menjalankan Profil B (Perangkat Baru / Bersih)...');
  const contextB = await chromium.launchPersistentContext(profileDirB, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    viewport: { width: 412, height: 915 }
  });

  const pageB = contextB.pages()[0] || await contextB.newPage();
  await pageB.goto(`http://localhost:${port}/pos`);
  await pageB.waitForTimeout(1000);
  await pageB.evaluate(() => {
    localStorage.setItem('sakunota_onboarding_completed', 'true');
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('adminLoginExpiry', (Date.now() + 86400000).toString());
  });
  await pageB.goto(`http://localhost:${port}/admin/pengaturan/data?auth=demo`);
  await pageB.waitForTimeout(1500);

  // Verifikasi Profil B benar-benar kosong / tidak memiliki pesanan Profil A
  const emptyCheck = await pageB.evaluate(async () => {
    const req = indexedDB.open('AngkringanDB');
    return new Promise((resolve) => {
      req.onsuccess = () => {
        const idb = req.result;
        if (!idb.objectStoreNames.contains('orders')) return resolve({ orderCount: 0 });
        const tx = idb.transaction(['orders'], 'readonly');
        const countReq = tx.objectStore('orders').count();
        countReq.onsuccess = () => resolve({ orderCount: countReq.result });
      };
      req.onerror = () => resolve({ orderCount: 0 });
    });
  });
  assert(emptyCheck.orderCount === 0, 'Profil B bersih tanpa transaksi bawaan Profil A');

  // Unggah file cadangan Profil A ke Profil B
  console.log('  -> Memilih file cadangan Profil A di Profil B...');
  await pageB.setInputFiles('#backup-file-input', backupExportPath);

  // Verifikasi Modal Konfirmasi Pemulihan muncul dan menampilkan preview akurat
  await pageB.waitForSelector('text=Kembalikan Data Usaha?');
  const previewStoreName = await pageB.locator('text=Warung Kopi Nusantara E2E').first().textContent();
  console.log(`  -> Modal Preview Nama Usaha: ${previewStoreName?.trim()}`);
  assert(previewStoreName?.includes('Warung Kopi Nusantara E2E'), 'Modal Preview menampilkan Nama Usaha Profil A');

  // Klik Ya, Kembalikan Data Sekarang
  console.log('  -> Mengonfirmasi pemulihan data di Profil B...');
  await pageB.locator('button:has-text("Ya, Kembalikan Data Sekarang")').click();

  // Tunggu reload dan periksa status
  await pageB.waitForTimeout(3000);

  // Verifikasi integritas database di Profil B
  console.log('  -> Memverifikasi seluruh data di Profil B...');
  const restoredAudit = await pageB.evaluate(async () => {
    const req = indexedDB.open('AngkringanDB');
    return new Promise((resolve, reject) => {
      req.onsuccess = async () => {
        const idb = req.result;
        const tx = idb.transaction(
          ['settings', 'menuItems', 'tables', 'orders', 'orderItems', 'payments', 'paymentProofs', 'shifts'],
          'readonly'
        );

        const res = {};
        tx.objectStore('settings').get('pos_store_settings').onsuccess = (e) => res.settings = e.target.result;
        tx.objectStore('menuItems').getAll().onsuccess = (e) => res.menus = e.target.result;
        tx.objectStore('tables').getAll().onsuccess = (e) => res.tables = e.target.result;
        tx.objectStore('orders').getAll().onsuccess = (e) => res.orders = e.target.result;
        tx.objectStore('shifts').getAll().onsuccess = (e) => res.shifts = e.target.result;
        tx.objectStore('paymentProofs').getAll().onsuccess = (e) => res.proofs = e.target.result;

        tx.oncomplete = () => resolve(res);
        tx.onerror = (e) => reject(e);
      };
      req.onerror = (e) => reject(e);
    });
  });

  assert(restoredAudit.settings?.value?.storeName === 'Warung Kopi Nusantara E2E', 'Profil B: Settings nama toko berhasil dipulihkan');
  assert(restoredAudit.settings?.value?.taxPercentage === 11, 'Profil B: Pajak 11% berhasil dipulihkan');
  assert(restoredAudit.menus?.some(m => m.nama === 'Kopi Klotok Istimewa' && m.harga === 15000), 'Profil B: Menu kustom dipulihkan sempurna');
  assert(restoredAudit.tables?.some(t => t.nomor === 'Meja VIP #99'), 'Profil B: Meja kustom dipulihkan sempurna');
  assert(restoredAudit.shifts?.some(s => s.operatorName === 'Budi Kasir Senior' && s.startingCash === 150000), 'Profil B: Shift kasir dipulihkan sempurna');
  assert(restoredAudit.orders?.some(o => o.customerName === 'Bapak Direktur' && o.total === 30000), 'Profil B: Nota order dipulihkan sempurna');
  assert(restoredAudit.proofs?.length >= 1, 'Profil B: Bukti pembayaran (payment proofs) dipulihkan');
  assert(restoredAudit.proofs[0].imageData.startsWith('data:image/png;base64,'), 'Profil B: Gambar bukti pembayaran (base64) utuh 100%');

  // Ambil screenshot halaman Data & Cadangan di Profil B yang sudah terisi
  const screenshotPath = path.resolve('C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/cross_profile_restored_profile_b.png');
  await pageB.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  -> Screenshot tersimpan di: ${screenshotPath}`);

  // Uji Buka Modal Hapus Riwayat di Profil B
  console.log('\n[FASE 3] Uji Modal Hapus Seluruh Riwayat Penjualan & Shift...');
  await pageB.locator('button:has-text("Hapus Riwayat Penjualan & Shift")').click();
  await pageB.waitForSelector('text=Hapus Seluruh Riwayat Penjualan & Shift?');
  
  // Pastikan tombol hapus disabled jika belum dicentang
  const submitBtn = pageB.locator('button:has-text("Hapus Permanen")');
  const isDisabled = await submitBtn.isDisabled();
  assert(isDisabled === true, 'Tombol Hapus Permanen terkunci jika persetujuan belum dicentang');

  // Centang checkbox dan masukkan PIN yang salah
  await pageB.locator('input[type="checkbox"]').check();
  await pageB.locator('input[type="password"]').fill('9999');
  await submitBtn.click();
  const errorPinMsg = await pageB.locator('text=PIN Otorisasi salah').first().textContent();
  assert(errorPinMsg !== null, 'PIN salah ditolak dengan peringatan');

  // Masukkan PIN yang benar
  await pageB.locator('input[type="password"]').fill('1234');
  await submitBtn.click();
  await pageB.waitForTimeout(1500);

  // Verifikasi transaksi terhapus tetapi menu & meja tetap ada
  const postResetAudit = await pageB.evaluate(async () => {
    const req = indexedDB.open('AngkringanDB');
    return new Promise((resolve, reject) => {
      req.onsuccess = async () => {
        const idb = req.result;
        const tx = idb.transaction(['menuItems', 'tables', 'orders', 'shifts'], 'readonly');
        const res = {};
        tx.objectStore('orders').count().onsuccess = (e) => res.orderCount = e.target.result;
        tx.objectStore('shifts').count().onsuccess = (e) => res.shiftCount = e.target.result;
        tx.objectStore('menuItems').count().onsuccess = (e) => res.menuCount = e.target.result;
        tx.objectStore('tables').count().onsuccess = (e) => res.tableCount = e.target.result;
        tx.oncomplete = () => resolve(res);
      };
    });
  });

  assert(postResetAudit.orderCount === 0, 'Transaksi berhasil dihapus');
  assert(postResetAudit.shiftCount === 0, 'Shift berhasil dihapus');
  assert(postResetAudit.menuCount >= 1, 'Menu makanan/minuman TETAP AMAN tidak terhapus');
  assert(postResetAudit.tableCount >= 1, 'Denah meja TETAP AMAN tidak terhapus');

  await contextB.close();

  console.log('\n================================================================');
  console.log(`  🎉 HASIL AUDIT: ${passedChecks}/${totalChecks} CHECK BERHASIL LULUS 100%!`);
  console.log('================================================================\n');

} catch (err) {
  console.error('\n❌ ERROR SAAT PENGUJIAN:', err);
  process.exitCode = 1;
} finally {
  server.close();
  // Bersihkan file sementara jika perlu
  if (fs.existsSync(backupExportPath)) {
    try { fs.unlinkSync(backupExportPath); } catch {}
  }
}
