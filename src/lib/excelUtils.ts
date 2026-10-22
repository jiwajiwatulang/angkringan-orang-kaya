import { quantityLabel } from './weight';
import * as XLSX from 'xlsx';

/**
 * Utilitas Parser & Generator Excel (.xlsx) / CSV SakuNota POS
 * Berjalan 100% offline di browser / client-side.
 */

export interface ParsedMenuRow {
  sku?: string;
  nama: string;
  harga: number;
  kategori?: string;
  isSoldOut?: boolean;
}

export interface MenuImportValidationResult {
  validRows: ParsedMenuRow[];
  invalidRows: { row: number; raw: any; reason: string }[];
  duplicateSkus: string[];
  totalRows: number;
}

/**
 * Download file buffer ke perangkat pengguna
 */
export function downloadFile(buffer: any, fileName: string, mimeType: string) {
  if (typeof window === 'undefined') return;
  const blob = new Blob([buffer], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * 1. Generate & Download Template Resmi Import Menu (.xlsx / .csv)
 */
export function downloadMenuTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const sampleData = [
    {
      'SKU / Kode': 'AYM-001',
      'Nama Menu': 'Ayam Panggang Paha',
      'Harga (Rp)': 25000,
      'Kategori': 'Makanan Utama',
      'Status Stok (Tersedia/Habis)': 'Tersedia'
    },
    {
      'SKU / Kode': 'NAS-001',
      'Nama Menu': 'Nasi Bakar Ayam Suwir',
      'Harga (Rp)': 15000,
      'Kategori': 'Makanan Utama',
      'Status Stok (Tersedia/Habis)': 'Tersedia'
    },
    {
      'SKU / Kode': 'ES-001',
      'Nama Menu': 'Es Teh Manis Jumbo',
      'Harga (Rp)': 5000,
      'Kategori': 'Minuman',
      'Status Stok (Tersedia/Habis)': 'Tersedia'
    },
    {
      'SKU / Kode': 'SAT-001',
      'Nama Menu': 'Sate Kulit Bakar',
      'Harga (Rp)': 4000,
      'Kategori': 'Lauk & Pelengkap',
      'Status Stok (Tersedia/Habis)': 'Habis'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // Atur lebar kolom agar rapi
  ws['!cols'] = [
    { wch: 15 },
    { wch: 30 },
    { wch: 15 },
    { wch: 20 },
    { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Menu');

  if (format === 'csv') {
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    downloadFile(csvOutput, 'template_menu_sakunota.csv', 'text/csv;charset=utf-8;');
  } else {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(wbout, 'template_menu_sakunota.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

/**
 * 2. Parse File Excel/CSV Menu yang diunggah
 */
export async function parseMenuFile(file: File): Promise<MenuImportValidationResult> {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('File tidak memiliki lembar kerja (sheet).');
  }

  const ws = wb.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  if (rawRows.length === 0) {
    throw new Error('Lembar kerja kosong, tidak ada baris data yang ditemukan.');
  }

  const validRows: ParsedMenuRow[] = [];
  const invalidRows: { row: number; raw: any; reason: string }[] = [];
  const seenSkus = new Set<string>();
  const duplicateSkus: string[] = [];

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2; // header baris 1, data mulai baris 2

    // Normalisasi nama kolom fleksibel (case-insensitive & whitespace tolerant)
    let sku = '';
    let nama = '';
    let hargaRaw = '';
    let kategori = 'Umum';
    let statusStokRaw = 'Tersedia';

    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase();
      const val = row[key];

      if (cleanKey.includes('sku') || cleanKey.includes('kode')) {
        sku = String(val).trim();
      } else if (cleanKey.includes('nama') || cleanKey.includes('produk') || cleanKey.includes('item') || cleanKey.includes('menu')) {
        nama = String(val).trim();
      } else if (cleanKey.includes('harga') || cleanKey.includes('price')) {
        hargaRaw = String(val).trim();
      } else if (cleanKey.includes('kategori') || cleanKey.includes('category')) {
        kategori = String(val).trim() || 'Umum';
      } else if (cleanKey.includes('stok') || cleanKey.includes('status') || cleanKey.includes('sold')) {
        statusStokRaw = String(val).trim();
      }
    }

    if (!nama) {
      invalidRows.push({ row: rowNum, raw: row, reason: 'Nama menu wajib diisi' });
      return;
    }

    // Pembersihan harga dari simbol seperti "Rp", titik, atau koma
    const cleanHargaStr = hargaRaw.replace(/[^0-9.-]/g, '');
    const harga = Number(cleanHargaStr);

    if (isNaN(harga) || harga < 0) {
      invalidRows.push({ row: rowNum, raw: row, reason: `Harga tidak valid: "${hargaRaw}" (harus angka >= 0)` });
      return;
    }

    if (sku) {
      if (seenSkus.has(sku.toLowerCase())) {
        duplicateSkus.push(sku);
      } else {
        seenSkus.add(sku.toLowerCase());
      }
    }

    const isSoldOut = statusStokRaw.toLowerCase().includes('habis') || 
                      statusStokRaw.toLowerCase().includes('sold') || 
                      statusStokRaw === 'false' || 
                      statusStokRaw === '0';

    validRows.push({
      sku: sku || undefined,
      nama,
      harga,
      kategori: kategori || 'Umum',
      isSoldOut
    });
  });

  return {
    validRows,
    invalidRows,
    duplicateSkus: Array.from(new Set(duplicateSkus)),
    totalRows: rawRows.length
  };
}

/**
 * 3. Export Seluruh Menu ke File Excel/CSV
 */
export function exportMenusToExcel(menus: any[], format: 'xlsx' | 'csv' = 'xlsx') {
  const exportData = menus.map(m => ({
    'SKU / Kode': m.sku || `SKU-${String(m.urutan || m.id).padStart(3, '0')}`,
    'Nama Menu': m.nama,
    'Harga (Rp)': m.harga,
    'Kategori': m.kategori || 'Umum',
    'Status Stok': m.isSoldOut ? 'Habis' : 'Tersedia'
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 15 },
    { wch: 32 },
    { wch: 15 },
    { wch: 20 },
    { wch: 15 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Katalog Menu');

  const dateStr = new Date().toISOString().split('T')[0];
  if (format === 'csv') {
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    downloadFile(csvOutput, `katalog_menu_sakunota_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(wbout, `katalog_menu_sakunota_${dateStr}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

/**
 * 4. Export Transaksi ke Excel/CSV
 */
export function exportOrdersToExcel(orders: any[], format: 'xlsx' | 'csv' = 'xlsx') {
  const exportData = orders.map(o => {
    const itemsSummary = (o.items || []).map((i: any) => `${i.nama || i.namaMenu} (${quantityLabel(i)})`).join(', ');
    return {
      'No. Nota': `#${o.id}`,
      'Tanggal': new Date(o.createdAt).toLocaleString('id-ID'),
      'Pelanggan': o.customerName || 'Pelanggan Umum',
      'Tipe Pesanan': o.orderType || 'Dine-in',
      'Metode Bayar': o.paymentMethod || 'Cash',
      'Status Nota': o.status === 'paid' ? 'LUNAS' : o.status === 'void' ? 'VOID' : 'BELUM LUNAS',
      'Status Verifikasi': o.verificationStatus || (o.paymentMethod === 'Cash' ? 'Terverifikasi' : 'Menunggu'),
      'Subtotal (Rp)': o.subtotal || o.total,
      'Diskon (Rp)': o.discount || 0,
      'Pajak PBJT (Rp)': o.tax || 0,
      'Service (Rp)': o.serviceCharge || 0,
      'Total Akhir (Rp)': o.total,
      'Pengembalian Timbang (Rp)': o.weightRefundAmount ?? 0,
      'Penjualan Bersih (Rp)': o.total - (o.weightRefundAmount ?? 0),
      'Daftar Menu': itemsSummary,
      'Catatan': o.notes || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  ws['!cols'] = [
    { wch: 10 },
    { wch: 20 },
    { wch: 22 },
    { wch: 14 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 16 },
    { wch: 45 },
    { wch: 25 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Riwayat Transaksi');

  const dateStr = new Date().toISOString().split('T')[0];
  if (format === 'csv') {
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    downloadFile(csvOutput, `laporan_transaksi_sakunota_${dateStr}.csv`, 'text/csv;charset=utf-8;');
  } else {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(wbout, `laporan_transaksi_sakunota_${dateStr}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

/**
 * 5. Template & Parser Transaksi Historis Migrasi
 */
export function downloadHistoricalTransactionTemplate(format: 'xlsx' | 'csv' = 'xlsx') {
  const sample = [
    {
      'Nomor Nota / Referensi': 'INV-2025-001',
      'Tanggal (YYYY-MM-DD HH:mm)': '2025-12-01 19:30',
      'Nama Pelanggan': 'Pak Rahmat',
      'Tipe Pesanan': 'Dine-in',
      'Metode Bayar (Cash/QRIS/Transfer)': 'Cash',
      'Total Nominal (Rp)': 85000,
      'Daftar Item (Nama x Qty)': 'Ayam Panggang x 2, Es Teh x 3'
    },
    {
      'Nomor Nota / Referensi': 'INV-2025-002',
      'Tanggal (YYYY-MM-DD HH:mm)': '2025-12-02 20:15',
      'Nama Pelanggan': 'Mbak Siska',
      'Tipe Pesanan': 'Takeaway',
      'Metode Bayar (Cash/QRIS/Transfer)': 'QRIS',
      'Total Nominal (Rp)': 45000,
      'Daftar Item (Nama x Qty)': 'Nasi Bakar x 2, Es Jeruk x 1'
    }
  ];

  const ws = XLSX.utils.json_to_sheet(sample);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 26 },
    { wch: 20 },
    { wch: 15 },
    { wch: 30 },
    { wch: 20 },
    { wch: 40 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Transaksi Historis');

  if (format === 'csv') {
    const csvOutput = XLSX.utils.sheet_to_csv(ws);
    downloadFile(csvOutput, 'template_transaksi_historis.csv', 'text/csv;charset=utf-8;');
  } else {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(wbout, 'template_transaksi_historis.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

export async function parseHistoricalTransactionsFile(file: File) {
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: 'array' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

  const validTransactions: any[] = [];
  const invalidRows: { row: number; raw: any; reason: string }[] = [];

  rawRows.forEach((row, idx) => {
    const rowNum = idx + 2;
    let receiptNumber = '';
    let createdAt = '';
    let customerName = 'Pelanggan Migrasi';
    let orderType = 'Takeaway';
    let paymentMethod: 'Cash' | 'QRIS' | 'Transfer' = 'Cash';
    let totalRaw = '';
    let itemsRaw = '';

    for (const key of Object.keys(row)) {
      const k = key.toLowerCase();
      const val = row[key];
      if (k.includes('nota') || k.includes('referensi') || k.includes('invoice')) receiptNumber = String(val).trim();
      else if (k.includes('tanggal') || k.includes('waktu') || k.includes('date')) createdAt = String(val).trim();
      else if (k.includes('pelanggan') || k.includes('customer')) customerName = String(val).trim() || customerName;
      else if (k.includes('tipe') || k.includes('pesanan')) orderType = String(val).trim() || orderType;
      else if (k.includes('metode') || k.includes('bayar') || k.includes('payment')) {
        const pm = String(val).trim().toUpperCase();
        if (pm.includes('QRIS')) paymentMethod = 'QRIS';
        else if (pm.includes('TRANSFER') || pm.includes('BANK')) paymentMethod = 'Transfer';
        else paymentMethod = 'Cash';
      }
      else if (k.includes('total') || k.includes('nominal') || k.includes('amount')) totalRaw = String(val).trim();
      else if (k.includes('item') || k.includes('menu') || k.includes('daftar')) itemsRaw = String(val).trim();
    }

    const total = Number(totalRaw.replace(/[^0-9.-]/g, ''));
    if (isNaN(total) || total <= 0) {
      invalidRows.push({ row: rowNum, raw: row, reason: `Total nominal tidak valid: "${totalRaw}"` });
      return;
    }

    // Parsing item sederhana
    const items = itemsRaw ? itemsRaw.split(',').map(part => {
      const sub = part.trim();
      const qtyMatch = sub.match(/(\d+)\s*x/i) || sub.match(/x\s*(\d+)/i);
      const qty = qtyMatch ? parseInt(qtyMatch[1]) : 1;
      const cleanName = sub.replace(/(\d+)\s*x/i, '').replace(/x\s*(\d+)/i, '').trim() || sub;
      return {
        nama: cleanName,
        qty: qty,
        harga: Math.round(total / (qty || 1))
      };
    }) : [{ nama: 'Transaksi Historis', qty: 1, harga: total }];

    let validDate = new Date().toISOString();
    if (createdAt) {
      const parsedD = new Date(createdAt);
      if (!isNaN(parsedD.getTime())) {
        validDate = parsedD.toISOString();
      }
    }

    validTransactions.push({
      receiptNumber: receiptNumber || `HIST-${rowNum}`,
      customerName,
      orderType,
      createdAt: validDate,
      total,
      paymentMethod,
      items
    });
  });

  return { validTransactions, invalidRows, totalRows: rawRows.length };
}
