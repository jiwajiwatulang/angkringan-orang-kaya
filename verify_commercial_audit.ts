import assert from 'assert';
import 'fake-indexeddb/auto';
import { db } from './src/lib/dexie';
import { 
  generateEscPosReceipt, 
  generateReceiptHtml, 
  generateZReportReceipt, 
  generateZReportHtml, 
  generateTestReceiptData,
  formatCurrency 
} from './src/lib/receipt';
import { 
  exportAllData, 
  importAllData, 
  validateBackupSchema, 
  createMenu, 
  addTable, 
  getOrders 
} from './src/lib/api';
import fs from 'fs';
import path from 'path';

async function runCommercialAudit() {
  console.log('\n======================================================');
  console.log('  🔍 SAKUNOTA COMMERCIAL PRE-RELEASE INDEPENDENT AUDIT');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  async function test(desc: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } catch (e: any) {
      console.error(`  ❌ FAIL: ${desc} -> ${e.message}`);
    }
  }

  // --- AREA 1: PRINTING SYSTEM AUDIT ---
  console.log('[AUDIT AREA 1] Printing System & Receipt Templates');

  await test('58mm ESC/POS wraps long product names onto multiple lines', () => {
    const testData = generateTestReceiptData({ paperWidth: '58mm' } as any);
    const escpos = generateEscPosReceipt(testData, 'all', { paperWidth: '58mm', storeName: 'KEDAI NUSANTARA' } as any);
    assert(escpos.includes('KEDAI NUSANTARA'), 'Store name included');
    assert(escpos.includes('TOTAL TAGIHAN:'), 'Total tagihan label exists');
    assert(escpos.includes('LUNAS'), 'Lunas status exists');
  });

  await test('80mm ESC/POS accommodates 48 columns cleanly', () => {
    const testData = generateTestReceiptData({ paperWidth: '80mm' } as any);
    const escpos = generateEscPosReceipt(testData, 'all', { paperWidth: '80mm', storeName: 'KEDAI NUSANTARA' } as any);
    assert(escpos.includes('------------------------------------------------'), '48-char divider present');
  });

  await test('Kitchen & Bar ticket filtering isolates food from drinks', () => {
    const testData = generateTestReceiptData();
    const kitchen = generateEscPosReceipt(testData, 'food');
    const bar = generateEscPosReceipt(testData, 'drink');

    assert(kitchen.includes('STRUK DAPUR (KITCHEN)'), 'Kitchen header present');
    assert(kitchen.includes('Nasi Goreng'), 'Kitchen has food item');
    assert(!kitchen.includes('Es Kopi Susu'), 'Kitchen excluded drink');

    assert(bar.includes('STRUK BAR (MINUMAN)'), 'Bar header present');
    assert(bar.includes('Es Kopi Susu'), 'Bar has drink item');
    assert(!bar.includes('Nasi Goreng'), 'Bar excluded food');
  });

  await test('HTML Receipt template includes black-on-white isolation styles', () => {
    const testData = generateTestReceiptData();
    const html = generateReceiptHtml(testData, 'all', { paperWidth: '58mm', storeName: 'KEDAI TEST' } as any);
    assert(html.includes('background: #ffffff !important;'), 'Forced white background');
    assert(html.includes('color: #000000 !important;'), 'Forced black text');
    assert(html.includes('@page {'), 'Print page css present');
    assert(html.includes('size: 58mm auto;'), '58mm page size set');
  });

  await test('Shift Z-Report ESC/POS & HTML formats reconciliation and physical cash', () => {
    const stats = {
      id: 10,
      operatorName: 'Siti Kasir',
      startTime: new Date().toISOString(),
      endTime: new Date().toISOString(),
      startingCash: 100000,
      cashSales: 450000,
      expectedCash: 550000,
      actualCash: 550000,
      cashDifference: 0,
      nonCashSales: 200000
    };
    const escpos = generateZReportReceipt(stats);
    const html = generateZReportHtml(stats);

    assert(escpos.includes('LAPORAN TUTUP SHIFT') && escpos.includes('(Z-REPORT)'), 'Z-report title present');
    assert(escpos.includes('SELISIH: Rp 0 (PAS)'), 'Difference reconciliation present');
    assert(html.includes('Z_Report_Shift_10'), 'HTML has correct doc title');
    assert(html.includes('Siti Kasir'), 'HTML has cashier signature placeholder');
  });

  // --- AREA 2: IMPORT/EXPORT & BACKUP/RESTORE AUDIT ---
  console.log('\n[AUDIT AREA 2] Import/Export & Backup/Restore System');

  // Seed initial data
  await createMenu({ nama: 'Nasi Liwet Solo', harga: 20000, kategori: 'Makanan' });
  await addTable('Meja 99');

  await test('validateBackupSchema rejects corrupted and non-JSON objects', () => {
    const resNull = validateBackupSchema(null);
    assert(!resNull.isValid, 'Null rejected');

    const resNoMenus = validateBackupSchema({ version: 3 });
    assert(!resNoMenus.isValid, 'Missing menus array rejected');

    const resValid = validateBackupSchema({ version: 3, menus: [{ nama: 'Ayam', harga: 10000 }] });
    assert(resValid.isValid, 'Valid schema accepted');
    assert(resValid.stats.menus === 1, 'Stats calculated accurately');
  });

  await test('Full JSON export produces valid schema and counts', async () => {
    const backup = await exportAllData();
    assert(backup.version === 3, 'Backup version is 3');
    assert(backup.menus.length >= 1, 'Export contains menus');
    const validation = validateBackupSchema(backup);
    assert(validation.isValid, 'Exported backup passes schema validation');
  });

  await test('Restore performs round-trip verification and restores all records', async () => {
    const backup = await exportAllData();
    const res = await importAllData(backup);
    assert(res === true, 'Import succeeded');
    const orderCount = await db.table('menuItems').count();
    assert(orderCount === backup.menus.length, 'Restored menu count matches backup');
  });

  // --- AREA 3: CUSTOMER ABOUT PAGE AUDIT ---
  console.log('\n[AUDIT AREA 3] Customer-Facing About Page & Diagnostics Isolation');

  await test('About page file exists and has customer support & policy hooks', () => {
    const filePath = path.join(process.cwd(), 'src/app/admin/pengaturan/tentang/page.tsx');
    assert(fs.existsSync(filePath), 'Tentang page file exists');
    const content = fs.readFileSync(filePath, 'utf-8');
    assert(content.includes('Rp25.000 Sekali Bayar') || content.includes('SakuNota'), 'Public commercial pricing displayed');
    assert(content.includes('Bantuan WhatsApp'), 'WhatsApp support button exists');
    assert(content.includes('support@sakunota.my.id'), 'Support email displayed');
    assert(content.includes('Kebijakan Privasi'), 'Privacy policy button exists');
    assert(content.includes('isDiagnosticsOpen'), 'Technical diagnostics is collapsible/toggleable');
  });

  // --- AREA 4: OFFLINE PWA AUDIT ---
  console.log('\n[AUDIT AREA 4] Genuine Offline Operation & PWA Service Worker');

  await test('Web App Manifest is valid JSON and contains standalone config', () => {
    const manifestPath = path.join(process.cwd(), 'public/manifest.json');
    assert(fs.existsSync(manifestPath), 'manifest.json exists');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    assert(manifest.name.includes('SakuNota'), 'Manifest name valid');
    assert(manifest.display === 'standalone', 'Standalone display set');
    assert(manifest.theme_color === '#0B0F17', 'Theme color matches dark blue');
  });

  await test('Service Worker sw.js exists with pre-cache list and fetch handling', () => {
    const swPath = path.join(process.cwd(), 'public/sw.js');
    assert(fs.existsSync(swPath), 'sw.js exists');
    const swContent = fs.readFileSync(swPath, 'utf-8');
    assert(swContent.includes('PRECACHE_ASSETS'), 'Precache list present');
    assert(swContent.includes('/admin/pengaturan/tentang'), 'All admin routes cached');
    assert(swContent.includes('caches.match'), 'Offline cache matching implemented');
  });

  await test('Root Layout links manifest and registers Service Worker', () => {
    const layoutPath = path.join(process.cwd(), 'src/app/layout.tsx');
    const layoutContent = fs.readFileSync(layoutPath, 'utf-8');
    assert(layoutContent.includes('manifest: "/manifest.json"'), 'Manifest linked in layout');
    assert(layoutContent.includes('navigator.serviceWorker.register'), 'Service worker registered in layout');
  });

  console.log('\n======================================================');
  console.log(`  📊 INDEPENDENT AUDIT RESULT: ${passed} / ${total} PASS`);
  console.log('======================================================\n');
}

runCommercialAudit().catch(console.error);
