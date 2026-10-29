import {csvCell} from './reportExport';
import * as XLSX from 'xlsx';
import {readImportRows} from './spreadsheetImport';
import {importRupiah,importDate} from './importLimits';

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
    const csvOutput = worksheetCsv(ws);
    downloadFile(csvOutput, 'template_menu_sakunota.csv', 'text/csv;charset=utf-8;');
  } else {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(wbout, 'template_menu_sakunota.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

/**
 * 2. Parse File Excel/CSV Menu yang diunggah
 */
export async function parseMenuFile(file: File, signal?:AbortSignal): Promise<MenuImportValidationResult> {
  const rawRows=await readImportRows(file,signal);

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
    let hargaRaw:unknown = '';
    let kategori = 'Umum';
    let statusStokRaw = 'Tersedia';

    for (const key of Object.keys(row)) {
      const cleanKey = key.trim().toLowerCase();
      const val = row[key];

      if (cleanKey.includes('sku') || cleanKey.includes('kode')) {
        sku = String(val??'').trim();
      } else if (cleanKey.includes('nama') || cleanKey.includes('produk') || cleanKey.includes('item') || cleanKey.includes('menu')) {
        nama = String(val??'').trim();
      } else if (cleanKey.includes('harga') || cleanKey.includes('price')) {
        hargaRaw = val;
      } else if (cleanKey.includes('kategori') || cleanKey.includes('category')) {
        kategori = String(val??'').trim() || 'Umum';
      } else if (cleanKey.includes('stok') || cleanKey.includes('status') || cleanKey.includes('sold')) {
        statusStokRaw = String(val??'').trim();
      }
    }

    if (!nama || nama.length > 120) {
      invalidRows.push({ row: rowNum, raw: row, reason: 'Nama produk wajib diisi, maksimal 120 karakter.' });
      return;
    }

    // Pembersihan harga dari simbol seperti "Rp", titik, atau koma
    const harga = importRupiah(hargaRaw);

    if (harga === undefined) {
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
    const csvOutput = worksheetCsv(ws);
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
    const itemsSummary = (o.items || []).map((i: any) => `${i.nama || i.namaMenu} (${i.qty}x)`).join(', ');
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
    const csvOutput = worksheetCsv(ws);
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
    const csvOutput = worksheetCsv(ws);
    downloadFile(csvOutput, 'template_transaksi_historis.csv', 'text/csv;charset=utf-8;');
  } else {
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    downloadFile(wbout, 'template_transaksi_historis.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  }
}

export async function parseHistoricalTransactionsFile(file: File, signal?:AbortSignal) {
  const rawRows=await readImportRows(file,signal);
  const validTransactions: any[] = [],invalidRows: {row:number;raw:any;reason:string}[]=[];
  const seen=new Set<string>();
  rawRows.forEach((row,idx)=>{
    const rowNum=idx+2;
    let receiptNumber='',createdAt:unknown='',customerName='Pelanggan Migrasi',orderType='Takeaway',method='Cash',totalRaw:unknown='',itemsRaw='';
    for(const [key,value] of Object.entries(row)){
      const k=key.trim().toLowerCase(),text=String(value??'').trim();
      if(k.includes('nota')||k.includes('referensi')||k.includes('invoice'))receiptNumber=text;
      else if(k.includes('tanggal')||k.includes('waktu')||k.includes('date'))createdAt=value;
      else if(k.includes('pelanggan')||k.includes('customer'))customerName=text||customerName;
      else if(k.includes('tipe')||k.includes('pesanan'))orderType=text||orderType;
      else if(k.includes('metode')||k.includes('bayar')||k.includes('payment'))method=text||method;
      else if(k.includes('total')||k.includes('nominal')||k.includes('amount'))totalRaw=value;
      else if(k.includes('item')||k.includes('menu')||k.includes('daftar'))itemsRaw=text;
    }
    const total=importRupiah(totalRaw),date=importDate(createdAt);
    const methods:Record<string,'Cash'|'QRIS'|'Transfer'>={cash:'Cash',tunai:'Cash',qris:'QRIS',transfer:'Transfer',bank:'Transfer'};
    const paymentMethod=methods[method.toLowerCase()];
    const fail=(reason:string)=>invalidRows.push({row:rowNum,raw:row,reason});
    if(itemsRaw.length>3991)return fail('Rincian nota terlalu panjang. Maksimal 3.991 karakter.');
    if(!receiptNumber||receiptNumber.length>128)return fail('Nomor nota wajib diisi, maksimal 128 karakter.');
    if(total===undefined||total<=0)return fail('Total harus berupa rupiah utuh lebih dari 0.');
    if(!date)return fail('Tanggal tidak valid. Gunakan YYYY-MM-DD HH:mm.');
    if(!paymentMethod)return fail('Metode bayar harus Cash, QRIS, atau Transfer.');
    const identity=receiptNumber+'|'+date;
    if(seen.has(identity))return fail('Nomor nota dan tanggal berulang dalam file.');
    seen.add(identity);
    // The old template contains no item prices. Preserve its description without
    // inventing unit prices that multiply the receipt total for each product.
    const items=[{nama:itemsRaw?'Rincian: '+itemsRaw:'Transaksi Historis',qty:1,harga:total}];
    validTransactions.push({receiptNumber,customerName,orderType,createdAt:date,total,paymentMethod,items});
  });
  return {validTransactions,invalidRows,totalRows:rawRows.length};
}

// Export strings as data, even when a product name or note resembles a spreadsheet formula.
function worksheetCsv(sheet:XLSX.WorkSheet){
  const rows=XLSX.utils.sheet_to_json<unknown[]>(sheet,{header:1,raw:true,defval:''});
  return '\uFEFF'+rows.map(row=>row.map(csvCell).join(',')).join('\r\n');
}
