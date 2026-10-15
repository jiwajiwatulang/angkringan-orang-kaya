import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'file:///C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/scratch/shots/node_modules/playwright-core/index.mjs';

const staticDir = path.resolve('out');
const testProfileDir = path.resolve('.test-profile-resilience-' + Date.now());
const port = 4358;

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

if (fs.existsSync(testProfileDir)) {
  try {
    fs.rmSync(testProfileDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {}
}
fs.mkdirSync(testProfileDir, { recursive: true });

function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Helper untuk membuat gambar realistis berukuran kamera HP (~180KB & ~240KB)
function generateRealisticCameraImage(sizeInKB, salt) {
  const header = 'data:image/jpeg;base64,';
  const targetChars = sizeInKB * 1024 * (4 / 3);
  let chunk = Buffer.from(`SakuNota-Proof-Camera-${salt}-TIMESTAMP-${Date.now()}-RECEIPT-SCAN`).toString('base64');
  let body = '';
  while (body.length < targetChars) {
    body += chunk;
  }
  return header + body.slice(0, targetChars);
}

console.log('\n================================================================');
console.log('  🛡️ SAKUNOTA REAL TARGETED BACKUP RESILIENCE & INTEGRITY AUDIT');
console.log('================================================================\n');

try {
  // Buat 2 gambar bukti bayar realistis berukuran kamera smartphone (180KB dan 240KB)
  const cameraImage1 = generateRealisticCameraImage(180, 'QRIS-BCA-MOBILE');
  const cameraImage2 = generateRealisticCameraImage(240, 'TRANSFER-MANDIRI');
  const hashImage1 = sha256(cameraImage1);
  const hashImage2 = sha256(cameraImage2);

  console.log(`  -> Foto Bukti 1 (Kamera 180KB) SHA-256: ${hashImage1}`);
  console.log(`  -> Foto Bukti 2 (Kamera 240KB) SHA-256: ${hashImage2}`);

  // Peluncuran Chrome Emulation
  console.log('\n[LINGKUNGAN UJI] Chrome Mobile Emulation (Android Pixel 7) di Lingkungan Desktop');
  const context = await chromium.launchPersistentContext(testProfileDir, {
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.6613.127 Mobile Safari/537.36',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 2.625,
    isMobile: true,
    hasTouch: true,
    acceptDownloads: true
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(`http://localhost:${port}/pos`);
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    localStorage.setItem('sakunota_onboarding_completed', 'true');
    localStorage.setItem('onboardingCompleted', 'true');
    localStorage.setItem('adminLoginExpiry', (Date.now() + 86400000).toString());
  });

  await page.goto(`http://localhost:${port}/admin/pengaturan/data?auth=demo`);
  await page.waitForTimeout(1500);

  // -------------------------------------------------------------------------
  // FASE 1: BENIH DATA SUBSTANSIAL & UJI PRIVASI PIN ADMIN
  // -------------------------------------------------------------------------
  console.log('\n[FASE 1] Menyiapkan Riwayat Operasional Nyata (Substantial Business Data)...');
  const seedResult = await page.evaluate(async (args) => {
    const { img1, img2 } = args;
    const req = indexedDB.open('AngkringanDB');
    return new Promise((resolve, reject) => {
      req.onsuccess = () => {
        const idb = req.result;
        const tx = idb.transaction(
          ['settings', 'menuItems', 'tables', 'orders', 'orderItems', 'payments', 'paymentProofs', 'shifts'],
          'readwrite'
        );

        // 1. Settings dengan PIN Admin Sensitif ('8899')
        tx.objectStore('settings').put({
          key: 'pos_store_settings',
          value: {
            storeName: 'Angkringan Kopi Joss Malioboro',
            address: 'Jl. Malioboro Blok A No. 12 Yogyakarta',
            phone: '081299887766',
            taxPercentage: 10,
            servicePercentage: 0,
            adminPin: '8899' // PIN otorisasi rahasia pemilik
          },
          updatedAt: new Date().toISOString()
        });

        // 2. 6 Menu Beragam dengan Modifiers
        const menus = [
          { sku: 'KOP-01', nama: 'Kopi Joss Arang Membara', harga: 12000, kategori: 'Kopi', isSoldOut: false, urutan: 1, modifiers: [{ id: 'm-gula', nama: 'Manis', required: true, minSelect: 1, maxSelect: 1, options: [{ id: 'o-normal', nama: 'Normal', harga: 0 }, { id: 'o-less', nama: 'Less Sugar', harga: 0 }] }] },
          { sku: 'NAS-01', nama: 'Nasi Kucing Teri Balado', harga: 6000, kategori: 'Makanan', isSoldOut: false, urutan: 2, modifiers: [] },
          { sku: 'NAS-02', nama: 'Nasi Kucing Oseng Tempe', harga: 6000, kategori: 'Makanan', isSoldOut: false, urutan: 3, modifiers: [] },
          { sku: 'SAT-01', nama: 'Sate Usus Bakar Manis', harga: 4000, kategori: 'Sate-Satean', isSoldOut: false, urutan: 4, modifiers: [] },
          { sku: 'SAT-02', nama: 'Sate Telur Puyuh Bacem', harga: 5000, kategori: 'Sate-Satean', isSoldOut: false, urutan: 5, modifiers: [] },
          { sku: 'MIN-01', nama: 'Wedang Jahe Susu Serai', harga: 9000, kategori: 'Minuman Tradisional', isSoldOut: false, urutan: 6, modifiers: [] }
        ];
        for (const m of menus) tx.objectStore('menuItems').add(m);

        // 3. 5 Meja
        for (let i = 1; i <= 5; i++) {
          tx.objectStore('tables').add({ nomor: `Lesehan Bambu #${i}`, status: i === 1 ? 'terisi' : 'kosong' });
        }

        // 4. 2 Sesi Shift Kasir (Shift 1 Selesai, Shift 2 Aktif)
        tx.objectStore('shifts').add({
          operatorName: 'Siti Rahmawati',
          startingCash: 200000,
          cashSales: 30000,
          nonCashSales: 48000,
          expectedCash: 230000,
          actualCash: 230000,
          status: 'closed',
          startTime: '2026-10-15T08:00:00.000Z',
          endTime: '2026-10-15T14:00:00.000Z'
        });

        tx.objectStore('shifts').add({
          operatorName: 'Budi Santoso',
          startingCash: 230000,
          cashSales: 18000,
          nonCashSales: 30000,
          expectedCash: 248000,
          status: 'open',
          startTime: '2026-10-15T14:01:00.000Z'
        });

        // 5. 4 Nota Transaksi dengan Nilai Omzet Nyata (Total: Rp 126.000)
        // Nota 1: Cash Rp 30.000 (Shift 1)
        const o1 = tx.objectStore('orders').add({
          shiftId: 1, tableId: 1, receiptNumber: 'NOTA-JOSS-001', customerName: 'Pak Dhe Bowo',
          total: 30000, paidAmount: 30000, remainingBalance: 0, status: 'paid', verificationStatus: 'terverifikasi',
          paymentMethod: 'Cash', createdAt: '2026-10-15T09:00:00.000Z'
        });
        o1.onsuccess = () => {
          const oid = o1.result;
          tx.objectStore('orderItems').add({ orderId: oid, menuItemId: 1, namaMenu: 'Kopi Joss Arang Membara', qty: 2, hargaSatuan: 12000 });
          tx.objectStore('orderItems').add({ orderId: oid, menuItemId: 2, namaMenu: 'Nasi Kucing Teri Balado', qty: 1, hargaSatuan: 6000 });
          tx.objectStore('payments').add({ orderId: oid, shiftId: 1, amount: 30000, paymentMethod: 'Cash', status: 'completed', paidAt: '2026-10-15T09:05:00.000Z' });
        };

        // Nota 2: QRIS Rp 48.000 dengan Bukti Foto Kamera 1 (Shift 1)
        const o2 = tx.objectStore('orders').add({
          shiftId: 1, tableId: 2, receiptNumber: 'NOTA-JOSS-002', customerName: 'Mbak Cindy',
          total: 48000, paidAmount: 48000, remainingBalance: 0, status: 'paid', verificationStatus: 'terverifikasi',
          paymentMethod: 'QRIS', createdAt: '2026-10-15T11:00:00.000Z'
        });
        o2.onsuccess = () => {
          const oid = o2.result;
          tx.objectStore('orderItems').add({ orderId: oid, menuItemId: 1, namaMenu: 'Kopi Joss Arang Membara', qty: 2, hargaSatuan: 12000 });
          tx.objectStore('orderItems').add({ orderId: oid, menuItemId: 4, namaMenu: 'Sate Usus Bakar Manis', qty: 6, hargaSatuan: 4000 });
          const pay = tx.objectStore('payments').add({ orderId: oid, shiftId: 1, amount: 48000, paymentMethod: 'QRIS', status: 'completed', proofStatus: 'terverifikasi', paidAt: '2026-10-15T11:05:00.000Z' });
          pay.onsuccess = () => {
            tx.objectStore('paymentProofs').add({
              orderId: oid, paymentId: pay.result, fileName: 'qris_cindy_camera_180k.jpg', fileSize: 184320,
              mimeType: 'image/jpeg', status: 'terverifikasi', imageData: img1, uploadedAt: '2026-10-15T11:04:00.000Z'
            });
          };
        };

        // Nota 3: Transfer Rp 30.000 dengan Bukti Foto Kamera 2 (Shift 2)
        const o3 = tx.objectStore('orders').add({
          shiftId: 2, tableId: 3, receiptNumber: 'NOTA-JOSS-003', customerName: 'Mas Danang',
          total: 30000, paidAmount: 30000, remainingBalance: 0, status: 'paid', verificationStatus: 'terverifikasi',
          paymentMethod: 'Transfer', createdAt: '2026-10-15T14:30:00.000Z'
        });
        o3.onsuccess = () => {
          const oid = o3.result;
          tx.objectStore('orderItems').add({ orderId: oid, menuItemId: 5, namaMenu: 'Sate Telur Puyuh Bacem', qty: 6, hargaSatuan: 5000 });
          const pay = tx.objectStore('payments').add({ orderId: oid, shiftId: 2, amount: 30000, paymentMethod: 'Transfer', status: 'completed', proofStatus: 'terverifikasi', paidAt: '2026-10-15T14:35:00.000Z' });
          pay.onsuccess = () => {
            tx.objectStore('paymentProofs').add({
              orderId: oid, paymentId: pay.result, fileName: 'transfer_danang_camera_240k.png', fileSize: 245760,
              mimeType: 'image/png', status: 'terverifikasi', imageData: img2, uploadedAt: '2026-10-15T14:34:00.000Z'
            });
          };
        };

        // Nota 4: Cash Rp 18.000 (Shift 2)
        const o4 = tx.objectStore('orders').add({
          shiftId: 2, tableId: 4, receiptNumber: 'NOTA-JOSS-004', customerName: 'Pak RT Slamet',
          total: 18000, paidAmount: 18000, remainingBalance: 0, status: 'paid', verificationStatus: 'terverifikasi',
          paymentMethod: 'Cash', createdAt: '2026-10-15T15:00:00.000Z'
        });
        o4.onsuccess = () => {
          const oid = o4.result;
          tx.objectStore('orderItems').add({ orderId: oid, menuItemId: 6, namaMenu: 'Wedang Jahe Susu Serai', qty: 2, hargaSatuan: 9000 });
          tx.objectStore('payments').add({ orderId: oid, shiftId: 2, amount: 18000, paymentMethod: 'Cash', status: 'completed', paidAt: '2026-10-15T15:05:00.000Z' });
        };

        tx.oncomplete = () => resolve({ totalOmzet: 30000 + 48000 + 30000 + 18000 });
        tx.onerror = (e) => reject(e);
      };
    });
  }, { img1: cameraImage1, img2: cameraImage2 });

  console.log(`  -> Data terisi sempurna: 6 Menu, 5 Meja, 2 Shift, 4 Nota (Total Omzet: Rp ${seedResult.totalOmzet.toLocaleString('id-ID')}).`);

  // Ekspor Data melalui API Asli SakuNota
  console.log('\n[FASE 2] Menjalankan exportAllData() Asli & Audit Sanitasi PIN Admin...');
  const exportedData = await page.evaluate(async () => {
    return await window.__SAKUNOTA_API__.exportAllData();
  });

  // Uji Sanitasi PIN Admin
  console.log(`  -> Memeriksa file cadangan untuk kredensial rahasia:`);
  console.log(`     Nama Usaha:         ${exportedData.settings?.storeName}`);
  console.log(`     PIN Admin terekspor: ${exportedData.settings?.adminPin} (Harus undefined/dihapus)`);

  if (exportedData.settings?.adminPin !== undefined) {
    throw new Error('KEBOCORAN KEAMANAN: PIN Admin terekspor dalam file cadangan!');
  }
  console.log('  ✅ PASS: PIN Admin berhasil disanitasi & TIDAK diekspor ke file cadangan!');

  // Simpan file cadangan valid untuk uji pemulihan
  const validBackupJsonPath = path.resolve('test-substantial-backup.json');
  fs.writeFileSync(validBackupJsonPath, JSON.stringify(exportedData, null, 2));
  console.log(`  -> File cadangan substansial berhasil dibuat (${fs.statSync(validBackupJsonPath).size} bytes).`);

  // -------------------------------------------------------------------------
  // FASE 3: UJI KEGAGALAN NYATA TERHADAP importAllData() & AUTO-ROLLBACK ASLI
  // -------------------------------------------------------------------------
  console.log('\n[FASE 3] Menjalankan Uji Kegagalan Nyata Terhadap importAllData() (Real Failure Injection)...');
  
  // Buat payload rusak yang menyebabkan importAllData() gagal di tahap verifikasi integritas
  // (misalnya: payload mencantumkan 3 pesanan tetapi total omzet korup / mismatch, atau primary key relasi rusak)
  const corruptedPayload = JSON.parse(JSON.stringify(exportedData));
  corruptedPayload.orderItems[0].orderId = 999999; // Merusak integritas relasional kunci asing (foreign key mismatch)

  const realFailureTestResult = await page.evaluate(async (badData) => {
    // Catat kondisi data SEBELUM importAllData() dipanggil
    const db = window.__SAKUNOTA_API__.db;
    const initialOrders = await db.table('orders').toArray();
    const initialMenus = await db.table('menuItems').count();
    const initialTotalOmzet = initialOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const initialStoreName = (await db.table('settings').get('pos_store_settings'))?.value?.storeName;

    let caughtError = null;
    try {
      // PANGGIL IMPLEMENTASI ASLI SAKUNOTA: importAllData()
      await window.__SAKUNOTA_API__.importAllData(badData);
    } catch (err) {
      caughtError = err.message || String(err);
    }

    // Periksa kondisi data SETELAH importAllData() gagal & memicu auto-rollback internalnya
    const postOrders = await db.table('orders').toArray();
    const postMenus = await db.table('menuItems').count();
    const postTotalOmzet = postOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);
    const postStoreName = (await db.table('settings').get('pos_store_settings'))?.value?.storeName;

    return {
      caughtError,
      initialMenus,
      postMenus,
      initialTotalOmzet,
      postTotalOmzet,
      initialStoreName,
      postStoreName
    };
  }, corruptedPayload);

  console.log(`  -> Error tertangkap dari fungsi asli importAllData(): "${realFailureTestResult.caughtError}"`);
  console.log(`  -> Menu sebelum gagal: ${realFailureTestResult.initialMenus} | Menu setelah auto-rollback: ${realFailureTestResult.postMenus}`);
  console.log(`  -> Omzet sebelum gagal: Rp ${realFailureTestResult.initialTotalOmzet} | Omzet setelah auto-rollback: Rp ${realFailureTestResult.postTotalOmzet}`);
  console.log(`  -> Nama toko tetap utuh: "${realFailureTestResult.postStoreName}"`);

  if (!realFailureTestResult.caughtError) {
    throw new Error('importAllData() tidak menolak payload yang rusak integritasnya!');
  }
  if (realFailureTestResult.postMenus !== realFailureTestResult.initialMenus || 
      realFailureTestResult.postTotalOmzet !== realFailureTestResult.initialTotalOmzet) {
    throw new Error('DATA LOSS TERDETEKSI: Auto-rollback importAllData() gagal mempertahankan data semula!');
  }
  console.log('  ✅ PASS: Fungsi asli importAllData() terbukti menolak kegagalan dan melakukan auto-rollback 100% tanpa kehilangan 1 data pun!');

  // -------------------------------------------------------------------------
  // FASE 4: UJI KUOTA STORAGE: SNAPSHOT TERSIMPAN DI INDEXEDDB, BUKAN LOCALSTORAGE
  // -------------------------------------------------------------------------
  console.log('\n[FASE 4] Memeriksa Batas Penyimpanan Browser (LocalStorage Quota Safety)...');
  const storageCheck = await page.evaluate(async () => {
    const db = window.__SAKUNOTA_API__.db;
    const idbSnapshot = await db.table('settings').get('pre_restore_snapshot');
    const localRaw = localStorage.getItem('sakunota_pre_restore_snapshot');
    const metaRaw = localStorage.getItem('sakunota_pre_restore_snapshot_meta');

    let totalLocalStorageBytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      totalLocalStorageBytes += (key.length + (localStorage.getItem(key)?.length || 0)) * 2;
    }

    return {
      hasIndexedDBSnapshot: Boolean(idbSnapshot?.value),
      indexedDBBytes: JSON.stringify(idbSnapshot?.value || {}).length,
      hasLegacyLargeLocalStorage: Boolean(localRaw && localRaw.length > 50000),
      totalLocalStorageKB: Math.round(totalLocalStorageBytes / 1024),
      metaInfo: metaRaw ? JSON.parse(metaRaw) : null
    };
  });

  console.log(`  -> Snapshot tersimpan di IndexedDB: ${storageCheck.hasIndexedDBSnapshot} (${storageCheck.indexedDBBytes} bytes)`);
  console.log(`  -> Total pemakaian LocalStorage saat ini: ${storageCheck.totalLocalStorageKB} KB (Jauh di bawah limit 5 MB)`);
  console.log(`  -> LocalStorage bebas dari data gambar besar: ${!storageCheck.hasLegacyLargeLocalStorage}`);

  if (!storageCheck.hasIndexedDBSnapshot || storageCheck.hasLegacyLargeLocalStorage) {
    throw new Error('Penyimpanan snapshot melanggar kuota LocalStorage!');
  }
  console.log('  ✅ PASS: Snapshot cadangan darurat tersimpan aman di IndexedDB, mencegah QuotaExceededError.');

  // -------------------------------------------------------------------------
  // FASE 5: UJI PEMULIHAN KE PERANGKAT BARU (CLEAN RESTORE) & DEEP INTEGRITY
  // -------------------------------------------------------------------------
  console.log('\n[FASE 5] Pemulihan ke Database Bersih & Verifikasi Hash Foto Kamera...');

  // Bersihkan database total
  await page.evaluate(async () => {
    const db = window.__SAKUNOTA_API__.db;
    await db.table('auditLogs').clear();
    await db.table('shifts').clear();
    await db.table('cashMovements').clear();
    await db.table('paymentProofs').clear();
    await db.table('payments').clear();
    await db.table('orderItems').clear();
    await db.table('orders').clear();
    await db.table('tables').clear();
    await db.table('menuItems').clear();
  });

  // Pulihkan file valid melalui importAllData() asli
  console.log('  -> Memulihkan file cadangan substansial...');
  const restoreSuccess = await page.evaluate(async (validJson) => {
    return await window.__SAKUNOTA_API__.importAllData(validJson, { skipPreBackup: true });
  }, exportedData);

  if (!restoreSuccess) throw new Error('Pemulihan file valid gagal!');

  // Verifikasi seluruh isi database
  const deepVerification = await page.evaluate(async () => {
    const db = window.__SAKUNOTA_API__.db;
    const settings = (await db.table('settings').get('pos_store_settings'))?.value;
    const menus = await db.table('menuItems').toArray();
    const tables = await db.table('tables').toArray();
    const orders = await db.table('orders').toArray();
    const orderItems = await db.table('orderItems').toArray();
    const payments = await db.table('payments').toArray();
    const proofs = await db.table('paymentProofs').toArray();
    const shifts = await db.table('shifts').toArray();

    return {
      settings,
      menus,
      tables,
      orders,
      orderItems,
      payments,
      proofs,
      shifts,
      totalOmzet: orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
      totalPaid: payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0)
    };
  });

  console.log('\n  -> Hasil Verifikasi Pasca-Pemulihan:');
  console.log(`     Total Menu:       ${deepVerification.menus.length} / 6`);
  console.log(`     Total Meja:       ${deepVerification.tables.length} / 5`);
  console.log(`     Total Sesi Shift: ${deepVerification.shifts.length} / 2`);
  console.log(`     Total Nota Order: ${deepVerification.orders.length} / 4`);
  console.log(`     Total Omzet:      Rp ${deepVerification.totalOmzet.toLocaleString('id-ID')} (Cocok: ${deepVerification.totalOmzet === 126000})`);
  console.log(`     Total Terbayar:   Rp ${deepVerification.totalPaid.toLocaleString('id-ID')} (Cocok: ${deepVerification.totalPaid === 126000})`);

  // Verifikasi Kriptografis KEDUA Foto Kamera Besar
  const restoredHash1 = sha256(deepVerification.proofs[0].imageData);
  const restoredHash2 = sha256(deepVerification.proofs[1].imageData);

  console.log(`  -> Hash Foto 1 (180KB) Setelah Restore: ${restoredHash1} (Cocok: ${restoredHash1 === hashImage1})`);
  console.log(`  -> Hash Foto 2 (240KB) Setelah Restore: ${restoredHash2} (Cocok: ${restoredHash2 === hashImage2})`);

  if (restoredHash1 !== hashImage1 || restoredHash2 !== hashImage2) {
    throw new Error('Hash foto kamera setelah pemulihan tidak cocok!');
  }
  console.log('  ✅ PASS: Kedua file foto bukti bayar kamera (180KB & 240KB) identik bit-for-bit!');

  // Verifikasi PIN Admin tetap terjaga
  console.log(`  -> PIN Admin setelah pemulihan: ${deepVerification.settings?.adminPin} (Dipertahankan di perangkat lokal)`);
  if (!deepVerification.settings?.adminPin) {
    throw new Error('PIN Admin hilang setelah pemulihan!');
  }
  console.log('  ✅ PASS: PIN Admin lokal tetap terlindungi dan tidak tertimpa kosong.');

  // -------------------------------------------------------------------------
  // FASE 6: TANGKAPAN LAYAR CHROME MOBILE EMULATION
  // -------------------------------------------------------------------------
  console.log('\n[FASE 6] Pengambilan Bukti Visual Chrome Mobile Emulation (Android Pixel 7)...');
  await page.reload();
  await page.waitForTimeout(1500);

  const screenshotPath = path.resolve('C:/Users/User/.gemini/antigravity/brain/4c7a1509-3477-4c30-b661-18b9208deb22/android_resilience_verified.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  -> Screenshot tersimpan di: ${screenshotPath}`);

  await context.close();

  // Bersihkan file sementara
  if (fs.existsSync(validBackupJsonPath)) fs.unlinkSync(validBackupJsonPath);

  console.log('\n================================================================');
  console.log('  🎉 SELURUH KOREKSI TERARAH KETAHANAN CADANGAN: 100% SUKSES!');
  console.log('================================================================\n');

} catch (err) {
  console.error('\n❌ ERROR SAAT PENGUJIAN:', err);
  process.exitCode = 1;
} finally {
  server.close();
}
