import { StoreSettings, getStoreSettings } from './settings';
import { Capacitor } from '@capacitor/core';
import { BluetoothSerial } from '@ascentio-it/capacitor-bluetooth-serial';
import { Printer } from '@capgo/capacitor-printer';
import { safePrintData, safePrintLogo, safePrinterText } from './printSafety';

/**
 * Format mata uang Rupiah standar Indonesia
 */
export const formatCurrency = (val: number): string => `Rp ${Math.round(val || 0).toLocaleString('id-ID')}`;

/**
 * Bungkus teks panjang menjadi baris-baris sesuai batas kolom
 */
function wrapText(text: string, maxWidth: number): string[] {
  if (!text) return [];
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (!currentLine) {
      if (word.length > maxWidth) {
        // Potong kata yang melebihi lebar maksimal
        let rem = word;
        while (rem.length > maxWidth) {
          lines.push(rem.substring(0, maxWidth));
          rem = rem.substring(maxWidth);
        }
        currentLine = rem;
      } else {
        currentLine = word;
      }
    } else if ((currentLine + ' ' + word).length <= maxWidth) {
      currentLine += ' ' + word;
    } else {
      lines.push(currentLine);
      if (word.length > maxWidth) {
        let rem = word;
        while (rem.length > maxWidth) {
          lines.push(rem.substring(0, maxWidth));
          rem = rem.substring(maxWidth);
        }
        currentLine = rem;
      } else {
        currentLine = word;
      }
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

/**
 * Deteksi kategori minuman
 */
export const isDrinkCategory = (cat: string): boolean => {
  if (!cat) return false;
  const c = cat.toLowerCase();
  return c.includes('minuman') || c.includes('kopi') || c.includes('tea') || c.includes('matcha') ||
    c.includes('drink') || c.includes('coffee') || c.includes('milkshake') || c.includes('beverage') || c.includes('juice');
};

// ============================================================================
// 1. GENERATOR ESC/POS THERMAL (UNTUK PRINTER BLUETOOTH NATIVE)
// ============================================================================

export function generateEscPosReceipt(
  receipt: any,
  mode: 'all' | 'food' | 'drink' = 'all',
  settings?: StoreSettings
): string {
  receipt = safePrinterText(receipt);
  const cfg = safePrinterText(settings || getStoreSettings());
  const width = cfg.paperWidth === '80mm' ? 48 : 32;
  const divider = "-".repeat(width) + "\n";
  const doubleDivider = "=".repeat(width) + "\n";

  const center = (text: string): string => {
    if (!text) return "";
    const lines = wrapText(text, width);
    return lines.map(l => {
      const pad = Math.max(0, Math.floor((width - l.length) / 2));
      return " ".repeat(pad) + l + "\n";
    }).join("");
  };

  const lineTwoCols = (left: string, right: string): string => {
    const space = width - left.length - right.length;
    if (space >= 0) {
      return `${left}${" ".repeat(space)}${right}\n`;
    }
    const maxLeftWidth = width - right.length - 1;
    if (maxLeftWidth > 8) {
      const firstLineLeft = left.substring(0, maxLeftWidth);
      const remainingLeft = left.substring(maxLeftWidth);
      const firstLineSpace = width - firstLineLeft.length - right.length;
      return `${firstLineLeft}${" ".repeat(Math.max(1, firstLineSpace))}${right}\n   ${remainingLeft.trim()}\n`;
    }
    return `${left}\n${right.padStart(width, " ")}\n`;
  };

  let txt = "";

  // 1. Header Struk
  if (mode === 'all') {
    txt += center(cfg.storeName || "SAKUNOTA");
    if (cfg.storeAddress) {
      const addrLines = wrapText(cfg.storeAddress, width);
      addrLines.forEach(l => { txt += center(l); });
    }
    if (cfg.storePhone) txt += center(`Telp: ${cfg.storePhone}`);
    if ((cfg as any).receiptHeader) {
      const headerLines = (cfg as any).receiptHeader.split("\n");
      headerLines.forEach((l: string) => {
        if (l.trim()) txt += center(l.trim());
      });
    }
  } else {
    const title = mode === 'food' ? "*** STRUK DAPUR (KITCHEN) ***" : "*** STRUK BAR (MINUMAN) ***";
    txt += center(title);
  }

  txt += doubleDivider;

  // 2. Info Transaksi
  const dateStr = receipt.date || (receipt.createdAt ? new Date(receipt.createdAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'));
  txt += lineTwoCols(`Tgl: ${dateStr}`, "");
  
  const orderIdLabel = receipt.orderId ? `No: A-${receipt.orderId}` : receipt.id ? `No: A-${receipt.id}` : "No: -";
  const tableOrType = receipt.tableName 
    ? `Meja: ${String(receipt.tableName).replace(/^Meja\s*/i, '')}` 
    : `[${receipt.orderType || 'Dine-in'}]`;
  txt += lineTwoCols(orderIdLabel, tableOrType);

  if (receipt.customerName) {
    txt += lineTwoCols(`Pelanggan: ${receipt.customerName}`, "");
  }
  if (receipt.operatorName || receipt.kasirName) {
    txt += lineTwoCols(`Kasir: ${receipt.operatorName || receipt.kasirName}`, "");
  }
  if (receipt.notes) {
    txt += `Catatan: ${receipt.notes}\n`;
  }

  txt += divider;

  // 3. Daftar Item
  let calculatedSubtotal = 0;
  const items = receipt.items || [];

  items.forEach((item: any) => {
    const isDrink = isDrinkCategory(item.kategori || item.kategoriMenu);
    if (mode === 'food' && isDrink) return;
    if (mode === 'drink' && !isDrink) return;

    const qty = Number(item.qty || 1);
    const harga = Number(item.harga || 0);
    const subtotal = qty * harga;
    calculatedSubtotal += subtotal;

    const itemName = item.nama || item.namaMenu || 'Item';
    const leftHeader = `${qty}x ${itemName}`;
    const rightHeader = formatCurrency(subtotal);

    if (mode === 'all') {
      txt += lineTwoCols(leftHeader, rightHeader);
    } else {
      txt += `${leftHeader}\n`;
    }

    // Rincian Modifier / Add-on
    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      item.selectedModifiers.forEach((m: any) => {
        const modPrice = m.harga > 0 ? ` (+${formatCurrency(m.harga)})` : '';
        const modLine = `   > ${m.optionName || m.nama}${modPrice}`;
        txt += wrapText(modLine, width).join('\n') + '\n';
      });
    }

    // Catatan per item jika ada
    if (item.notes) {
      txt += `   * ${item.notes}\n`;
    }
  });

  txt += divider;

  // 4. Pembayaran (Hanya mode 'all')
  if (mode === 'all') {
    const subtotal = receipt.subtotal !== undefined ? receipt.subtotal : calculatedSubtotal;
    const hasExtras = (receipt.discount && receipt.discount > 0) || 
                      (receipt.serviceCharge && receipt.serviceCharge > 0) || 
                      (receipt.tax && receipt.tax > 0);

    if (hasExtras) {
      txt += lineTwoCols("Subtotal:", formatCurrency(subtotal));
      if (receipt.discount && receipt.discount > 0) {
        const discLabel = receipt.discountType === 'percent' ? `Diskon (${receipt.discountValue}%):` : "Diskon:";
        txt += lineTwoCols(discLabel, "-" + formatCurrency(receipt.discount));
      }
      if (receipt.serviceCharge && receipt.serviceCharge > 0) {
        txt += lineTwoCols("Layanan:", formatCurrency(receipt.serviceCharge));
      }
      if (receipt.tax && receipt.tax > 0) {
        txt += lineTwoCols("Pajak PBJT:", formatCurrency(receipt.tax));
      }
      txt += divider;
    }

    const total = receipt.total !== undefined ? receipt.total : calculatedSubtotal;
    txt += lineTwoCols("TOTAL TAGIHAN:", formatCurrency(total));

    // Rincian Pembayaran
    if (receipt.payments && receipt.payments.length > 0) {
      txt += divider;
      txt += "Rincian Pembayaran:\n";
      receipt.payments.forEach((p: any, idx: number) => {
        const isRef = p.status === 'refunded';
        const pLabel = ` ${idx + 1}. ${p.paymentMethod}${isRef ? ' (REFUND)' : ''}`;
        txt += lineTwoCols(pLabel, formatCurrency(p.amount));
        if (p.itemsPaid && p.itemsPaid.length > 0) {
          p.itemsPaid.forEach((it: any) => {
            txt += `    • ${it.qty}x ${it.nama}\n`;
          });
        }
      });
      txt += divider;
      const completedTotal = receipt.payments.filter((p: any) => p.status === 'completed').reduce((sum: number, p: any) => sum + p.amount, 0);
      txt += lineTwoCols("Total Terbayar:", formatCurrency(completedTotal));
      const remaining = Math.max(0, total - completedTotal);
      if (remaining > 0) {
        txt += lineTwoCols("SISA TAGIHAN:", formatCurrency(remaining));
        txt += doubleDivider;
        txt += center(" STATUS: BELUM LUNAS");
      } else {
        txt += doubleDivider;
        txt += center(" STATUS: LUNAS");
      }
    } else {
      txt += lineTwoCols("Metode:", receipt.paymentMethod || "Tunai");
      if (receipt.cashTendered && receipt.cashTendered > 0) {
        txt += lineTwoCols("Bayar Tunai:", formatCurrency(receipt.cashTendered));
        const change = Math.max(0, receipt.cashTendered - total);
        txt += lineTwoCols("Kembalian:", formatCurrency(change));
      }
      txt += doubleDivider;
      if (receipt.isDraft) {
        txt += center(" TAGIHAN SEMENTARA (OPEN BILL)");
      } else {
        txt += center(" LUNAS");
      }
    }

    txt += divider;

    // Footer Toko
    if (cfg.receiptFooter) {
      const lines = cfg.receiptFooter.split("\n");
      lines.forEach(l => {
        if (l.trim()) txt += center(l.trim());
      });
    }

    // Watermark Promosi SakuNota
    if (cfg.enableWatermark) {
      txt += "\n" + center("[ SakuNota - Solusi Kasir UMKM ]");
    }

    const isDemoReceipt = receipt.isDemo || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sakunota_demo_mode') === 'true');
    if (isDemoReceipt) {
      txt += "\n" + center("*** STRUK SIMULASI DEMO KASIR ***");
      txt += center("BUKAN BUKTI TRANSAKSI RIIL");
    }
  }

  txt += "\n\n\n";
  return txt;
}

export function generatePartialPaymentReceipt(order: any, payment: any, settings?: StoreSettings): string {
  order = safePrinterText(order);
  payment = safePrinterText(payment);
  const cfg = safePrinterText(settings || getStoreSettings());
  const width = cfg.paperWidth === '80mm' ? 48 : 32;
  const divider = "-".repeat(width) + "\n";
  const doubleDivider = "=".repeat(width) + "\n";

  const center = (text: string): string => {
    if (!text) return "";
    const lines = wrapText(text, width);
    return lines.map(l => {
      const pad = Math.max(0, Math.floor((width - l.length) / 2));
      return " ".repeat(pad) + l + "\n";
    }).join("");
  };

  const lineTwoCols = (left: string, right: string): string => {
    const space = width - left.length - right.length;
    if (space <= 0) return `${left}\n${right.padStart(width, " ")}\n`;
    return `${left}${" ".repeat(space)}${right}\n`;
  };

  let txt = "";
  txt += center(cfg.storeName || "SAKUNOTA");
  if (cfg.storeAddress) txt += center(cfg.storeAddress);
  if (cfg.storePhone) txt += center(`Telp: ${cfg.storePhone}`);
  txt += doubleDivider;
  txt += center("BUKTI PEMBAYARAN PARSIAL / SPLIT");
  txt += divider;

  txt += lineTwoCols(`Tgl: ${payment.paidAt ? new Date(payment.paidAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}`, "");
  txt += lineTwoCols(`No: A-${order.id || '-'}`, order.tableId ? `Meja: ${order.tableId}` : `[${order.orderType || 'Dine-in'}]`);
  if (order.customerName) txt += lineTwoCols(`Pelanggan: ${order.customerName}`, "");
  txt += lineTwoCols(`Kasir: ${payment.operatorName || 'Kasir'}`, payment.shiftId ? `Shift #${payment.shiftId}` : "");
  txt += divider;

  const splitLabel = payment.splitType === 'item' ? 'Split by Item (Per Menu)' :
                     payment.splitType === 'equal' ? 'Split Equally (Bagi Rata)' : 'Pembayaran Cicil / Parsial';
  txt += `Tipe: ${splitLabel}\n`;

  if (payment.itemsPaid && payment.itemsPaid.length > 0) {
    txt += "Menu yang dibayar:\n";
    payment.itemsPaid.forEach((it: any) => {
      txt += lineTwoCols(` • ${it.qty}x ${it.nama}`, formatCurrency(it.harga * it.qty));
    });
  }

  txt += divider;
  txt += lineTwoCols("Nominal Dibayar:", formatCurrency(payment.amount));
  txt += lineTwoCols("Metode Bayar:", payment.paymentMethod || "Tunai");
  if (payment.paymentMethod === 'Cash' && payment.cashTendered) {
    txt += lineTwoCols("Uang Diterima:", formatCurrency(payment.cashTendered));
    txt += lineTwoCols("Kembalian:", formatCurrency(payment.change || 0));
  }

  txt += divider;
  txt += lineTwoCols("Total Tagihan Nota:", formatCurrency(order.total));
  const remaining = order.remainingBalance !== undefined ? order.remainingBalance : Math.max(0, order.total - (order.paidAmount || payment.amount));
  txt += lineTwoCols("SISA TAGIHAN:", formatCurrency(remaining));
  txt += doubleDivider;
  
  if (remaining > 0) {
    txt += center(" STATUS: BELUM LUNAS");
    txt += center("Harap simpan bukti pembayaran ini");
  } else {
    txt += center(" STATUS: LUNAS");
  }

  if (cfg.enableWatermark) {
    txt += "\n" + center("[ SakuNota - Solusi Kasir UMKM ]");
  }

  txt += "\n\n\n";
  return txt;
}

export function generateZReportReceipt(stats: any, settings?: StoreSettings): string {
  stats = safePrinterText(stats);
  const cfg = safePrinterText(settings || getStoreSettings());
  const width = cfg.paperWidth === '80mm' ? 48 : 32;
  const divider = "-".repeat(width) + "\n";
  const doubleDivider = "=".repeat(width) + "\n";

  const center = (text: string): string => {
    if (!text) return "";
    const lines = wrapText(text, width);
    return lines.map(l => {
      const pad = Math.max(0, Math.floor((width - l.length) / 2));
      return " ".repeat(pad) + l + "\n";
    }).join("");
  };

  const lineTwoCols = (left: string, right: string): string => {
    const space = width - left.length - right.length;
    if (space <= 0) return `${left}\n${right.padStart(width, " ")}\n`;
    return `${left}${" ".repeat(space)}${right}\n`;
  };

  let txt = "";

  txt += center(cfg.storeName || "SAKUNOTA");
  txt += center("*** LAPORAN TUTUP SHIFT (Z-REPORT) ***");
  txt += doubleDivider;

  txt += lineTwoCols("Shift ID:", `#${stats.id || '-'}`);
  txt += lineTwoCols("Kasir/Operator:", stats.operatorName || "Kasir");
  txt += lineTwoCols("Waktu Buka:", stats.startTime ? new Date(stats.startTime).toLocaleString('id-ID') : "-");
  txt += lineTwoCols("Waktu Tutup:", stats.endTime ? new Date(stats.endTime).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'));
  txt += divider;

  txt += center("--- REKONSILIASI KAS LACI ---");
  txt += lineTwoCols("1. Modal Awal:", formatCurrency(stats.startingCash || 0));
  txt += lineTwoCols("2. Penjualan Tunai:", `+${formatCurrency(stats.cashSales || 0)}`);
  if (stats.cashIn && stats.cashIn > 0) {
    txt += lineTwoCols("3. Kas Masuk:", `+${formatCurrency(stats.cashIn)}`);
  }
  if (stats.cashOut && stats.cashOut > 0) {
    txt += lineTwoCols("4. Kas Keluar:", `-${formatCurrency(stats.cashOut)}`);
  }
  if (stats.cashRefunds && stats.cashRefunds > 0) {
    txt += lineTwoCols("5. Refund Tunai:", `-${formatCurrency(stats.cashRefunds)}`);
  }
  txt += divider;
  txt += lineTwoCols("KAS FISIK SEHARUSNYA:", formatCurrency(stats.expectedCash || 0));
  txt += lineTwoCols("HASIL HITUNG FISIK:", formatCurrency(stats.actualCash !== undefined ? stats.actualCash : stats.expectedCash));
  
  const diff = stats.cashDifference !== undefined ? stats.cashDifference : 0;
  let diffLabel = "SELISIH: Rp 0 (PAS)";
  if (diff > 0) diffLabel = `SELISIH: +${formatCurrency(diff)} (LEBIH)`;
  if (diff < 0) diffLabel = `SELISIH: -${formatCurrency(Math.abs(diff))} (KURANG)`;
  txt += center(diffLabel);
  txt += doubleDivider;

  txt += center("--- NON-TUNAI (BANK / QRIS) ---");
  txt += lineTwoCols("QRIS / Transfer:", formatCurrency(stats.nonCashSales || 0));
  txt += center("(Masuk langsung ke rekening merchant)");
  txt += divider;

  if (stats.notes) {
    txt += `Catatan: ${stats.notes}\n`;
    txt += divider;
  }

  txt += center("Tanda Tangan Kasir,");
  txt += "\n\n\n";
  txt += center(`( ${stats.operatorName || "Kasir"} )`);

  if (cfg.enableWatermark) {
    txt += "\n" + center("[ SakuNota - Solusi Kasir UMKM ]");
  }

  txt += "\n\n\n";
  return txt;
}

// ============================================================================
// 2. GENERATOR DOKUMEN HTML THERMAL (UNTUK WEB / SISTEM CETAK ISOLASI)
// ============================================================================

export function generateReceiptHtml(
  receipt: any,
  mode: 'all' | 'food' | 'drink' = 'all',
  settings?: StoreSettings
): string {
  receipt = safePrintData(receipt);
  const cfg = safePrintData(settings || getStoreSettings());
  cfg.storeLogo = safePrintLogo(cfg.storeLogo);
  const is80 = cfg.paperWidth === '80mm';
  const paperWidthMm = is80 ? '80mm' : '58mm';
  const printableWidth = is80 ? '72mm' : '52mm';

  const dateStr = receipt.date || (receipt.createdAt ? new Date(receipt.createdAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'));
  const orderIdLabel = receipt.orderId ? `A-${receipt.orderId}` : receipt.id ? `A-${receipt.id}` : "-";
  const tableOrType = receipt.tableName ? receipt.tableName : `[${receipt.orderType || 'Dine-in'}]`;

  let titleHeader = cfg.storeName || "SAKUNOTA";
  if (mode === 'food') titleHeader = "DAPUR (KITCHEN)";
  if (mode === 'drink') titleHeader = "BAR (MINUMAN)";

  const items = receipt.items || [];
  let calculatedSubtotal = 0;

  const itemRowsHtml = items.map((it: any) => {
    const isDrink = isDrinkCategory(it.kategori || it.kategoriMenu);
    if (mode === 'food' && isDrink) return '';
    if (mode === 'drink' && !isDrink) return '';

    const qty = Number(it.qty || 1);
    const harga = Number(it.harga || 0);
    const subtotal = qty * harga;
    calculatedSubtotal += subtotal;

    const name = it.nama || it.namaMenu || 'Item';
    const modifiersHtml = (it.selectedModifiers && it.selectedModifiers.length > 0)
      ? it.selectedModifiers.map((m: any) => `
          <div class="item-mod">
            &gt; ${m.optionName || m.nama}${m.harga > 0 ? ` (+${formatCurrency(m.harga)})` : ''}
          </div>
        `).join('')
      : '';

    const notesHtml = it.notes ? `<div class="item-note">* ${it.notes}</div>` : '';

    return `
      <tr>
        <td class="col-item">
          <div class="item-name">${qty}x ${name}</div>
          ${modifiersHtml}
          ${notesHtml}
        </td>
        ${mode === 'all' ? `<td class="col-price">${formatCurrency(subtotal)}</td>` : ''}
      </tr>
    `;
  }).join('');

  const subtotal = receipt.subtotal !== undefined ? receipt.subtotal : calculatedSubtotal;
  const total = receipt.total !== undefined ? receipt.total : calculatedSubtotal;

  const paymentsHtml = (receipt.payments && receipt.payments.length > 0) ? `
    <div class="divider"></div>
    <div class="bold" style="margin-bottom: 2px;">Rincian Pembayaran:</div>
    ${receipt.payments.map((p: any, idx: number) => `
      <div class="row">
        <span>${idx + 1}. ${p.paymentMethod}${p.status === 'refunded' ? ' (REFUND)' : ''}</span>
        <span>${formatCurrency(p.amount)}</span>
      </div>
    `).join('')}
  ` : `
    <div class="row">
      <span>Metode Bayar:</span>
      <span>${receipt.paymentMethod || 'Tunai'}</span>
    </div>
    ${receipt.cashTendered ? `
      <div class="row">
        <span>Uang Diterima:</span>
        <span>${formatCurrency(receipt.cashTendered)}</span>
      </div>
      <div class="row">
        <span>Kembalian:</span>
        <span>${formatCurrency(Math.max(0, receipt.cashTendered - total))}</span>
      </div>
    ` : ''}
  `;

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
      <title>Struk_${orderIdLabel}</title>
      <style>
        @page {
          margin: 0;
          size: ${paperWidthMm} auto;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Courier New', Courier, monospace, system-ui;
          font-size: ${is80 ? '13px' : '11px'};
          line-height: 1.25;
          color: #000000 !important;
          background: #ffffff !important;
          width: ${printableWidth};
          margin: 0 auto;
          padding: 8px 4px 20px 4px;
        }
        .center { text-align: center; }
        .right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000000; margin: 5px 0; }
        .double-divider { border-top: 2px dashed #000000; margin: 6px 0; }
        .logo-box { text-align: center; margin-bottom: 6px; }
        .logo-box img { max-height: 48px; max-width: 120px; object-fit: contain; filter: grayscale(100%) contrast(200%); }
        .store-title { font-size: ${is80 ? '16px' : '14px'}; font-weight: 900; text-transform: uppercase; }
        .store-sub { font-size: ${is80 ? '11px' : '10px'}; }
        .order-banner { text-align: center; padding: 4px 0; }
        .order-num { font-size: ${is80 ? '24px' : '20px'}; font-weight: 900; }
        .badge { display: inline-block; padding: 1px 4px; border: 1px solid #000; font-size: 10px; font-weight: bold; }
        .row { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 2px; }
        table { width: 100%; border-collapse: collapse; }
        td { vertical-align: top; padding: 2px 0; }
        .col-item { text-align: left; word-break: break-word; }
        .col-price { text-align: right; white-space: nowrap; padding-left: 6px; }
        .item-name { font-weight: bold; }
        .item-mod { font-size: 0.9em; padding-left: 8px; color: #222; }
        .item-note { font-size: 0.85em; padding-left: 8px; font-style: italic; }
        .total-row { font-size: ${is80 ? '15px' : '13px'}; font-weight: 900; margin-top: 3px; }
        .status-box { text-align: center; font-weight: 900; padding: 4px; border: 1px dashed #000; margin: 6px 0; }
        .footer-text { font-size: 10px; text-align: center; margin-top: 8px; white-space: pre-line; }
        .watermark { font-size: 9px; text-align: center; margin-top: 8px; color: #333; }
      </style>
    </head>
    <body>
      ${cfg.storeLogo && mode === 'all' ? `
        <div class="logo-box">
          <img src="${cfg.storeLogo}" alt="Logo Toko" />
        </div>
      ` : ''}

      <div class="center">
        <div class="store-title">${titleHeader}</div>
        ${mode === 'all' ? `
          ${cfg.storeAddress ? `<div class="store-sub">${cfg.storeAddress}</div>` : ''}
          ${cfg.storePhone ? `<div class="store-sub">Telp: ${cfg.storePhone}</div>` : ''}
        ` : ''}
      </div>

      <div class="double-divider"></div>

      <div class="order-banner">
        <div class="order-num">No: ${orderIdLabel}</div>
        <div class="bold">${receipt.customerName ? `An. ${receipt.customerName}` : 'Tamu'}</div>
        <div style="margin-top: 3px;">
          <span class="badge">${tableOrType}</span>
        </div>
        ${receipt.notes ? `<div style="text-align: left; border: 1px solid #000; padding: 3px; margin-top: 4px; font-size: 10px; font-weight: bold;">Catatan: ${receipt.notes}</div>` : ''}
      </div>

      <div class="divider"></div>
      <div class="row" style="font-size: 10px;">
        <span>Tgl: ${dateStr}</span>
        <span>${receipt.operatorName || receipt.kasirName ? `Kasir: ${receipt.operatorName || receipt.kasirName}` : ''}</span>
      </div>
      <div class="divider"></div>

      <table>
        <tbody>
          ${itemRowsHtml}
        </tbody>
      </table>

      ${mode === 'all' ? `
        <div class="divider"></div>

        ${((receipt.discount && receipt.discount > 0) || (receipt.serviceCharge && receipt.serviceCharge > 0) || (receipt.tax && receipt.tax > 0)) ? `
          <div class="row">
            <span>Subtotal:</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${receipt.discount && receipt.discount > 0 ? `
            <div class="row">
              <span>Diskon:</span>
              <span>-${formatCurrency(receipt.discount)}</span>
            </div>
          ` : ''}
          ${receipt.serviceCharge && receipt.serviceCharge > 0 ? `
            <div class="row">
              <span>Layanan:</span>
              <span>${formatCurrency(receipt.serviceCharge)}</span>
            </div>
          ` : ''}
          ${receipt.tax && receipt.tax > 0 ? `
            <div class="row">
              <span>Pajak PBJT:</span>
              <span>${formatCurrency(receipt.tax)}</span>
            </div>
          ` : ''}
          <div class="divider"></div>
        ` : ''}

        <div class="row total-row">
          <span>TOTAL:</span>
          <span>${formatCurrency(total)}</span>
        </div>

        ${paymentsHtml}

        <div class="status-box">
          ${receipt.isDraft ? 'TAGIHAN SEMENTARA (OPEN BILL)' : 'LUNAS'}
        </div>

        ${receipt.isDemo || (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('sakunota_demo_mode') === 'true') ? `
          <div class="status-box" style="border: 1px dashed #b45309; background: #fffbeb; color: #92400e; font-size: 10px; margin: 4px 0;">
            *** STRUK SIMULASI DEMO KASIR ***<br />
            <span style="font-size: 9px; font-weight: normal;">BUKAN BUKTI TRANSAKSI RIIL</span>
          </div>
        ` : ''}

        ${cfg.receiptFooter ? `<div class="footer-text">${cfg.receiptFooter}</div>` : ''}
        ${cfg.enableWatermark ? `<div class="watermark">[ SakuNota - Solusi Kasir UMKM ]</div>` : ''}
      ` : `
        <div class="divider"></div>
        <div class="center bold" style="font-size: 11px; margin-top: 4px;">*** SELESAI TIKET ***</div>
      `}
    </body>
    </html>
  `;
}

export function generateZReportHtml(stats: any, settings?: StoreSettings): string {
  stats = safePrintData(stats);
  const cfg = safePrintData(settings || getStoreSettings());
  const is80 = cfg.paperWidth === '80mm';
  const paperWidthMm = is80 ? '80mm' : '58mm';
  const printableWidth = is80 ? '72mm' : '52mm';

  const diff = stats.cashDifference !== undefined ? stats.cashDifference : 0;
  let diffLabel = "SELISIH: Rp 0 (PAS)";
  if (diff > 0) diffLabel = `SELISIH: +${formatCurrency(diff)} (LEBIH)`;
  if (diff < 0) diffLabel = `SELISIH: -${formatCurrency(Math.abs(diff))} (KURANG)`;

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">
      <title>Z_Report_Shift_${stats.id || '-'}</title>
      <style>
        @page { margin: 0; size: ${paperWidthMm} auto; }
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: ${is80 ? '13px' : '11px'};
          line-height: 1.25;
          color: #000000 !important;
          background: #ffffff !important;
          width: ${printableWidth};
          margin: 0 auto;
          padding: 8px 4px 20px 4px;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 5px 0; }
        .double-divider { border-top: 2px dashed #000; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; margin-bottom: 2px; }
      </style>
    </head>
    <body>
      <div class="center bold" style="font-size: 14px;">${cfg.storeName || "SAKUNOTA"}</div>
      <div class="center bold" style="font-size: 11px;">LAPORAN TUTUP SHIFT (Z-REPORT)</div>
      <div class="double-divider"></div>

      <div class="row"><span>Shift ID:</span><span>#${stats.id || '-'}</span></div>
      <div class="row"><span>Kasir:</span><span>${stats.operatorName || 'Kasir'}</span></div>
      <div class="row"><span>Buka:</span><span>${stats.startTime ? new Date(stats.startTime).toLocaleString('id-ID') : '-'}</span></div>
      <div class="row"><span>Tutup:</span><span>${stats.endTime ? new Date(stats.endTime).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}</span></div>
      
      <div class="divider"></div>
      <div class="center bold">--- REKONSILIASI KAS LACI ---</div>
      <div class="row"><span>Modal Awal:</span><span>${formatCurrency(stats.startingCash || 0)}</span></div>
      <div class="row"><span>Penjualan Tunai:</span><span>+${formatCurrency(stats.cashSales || 0)}</span></div>
      ${stats.cashIn ? `<div class="row"><span>Kas Masuk:</span><span>+${formatCurrency(stats.cashIn)}</span></div>` : ''}
      ${stats.cashOut ? `<div class="row"><span>Kas Keluar:</span><span>-${formatCurrency(stats.cashOut)}</span></div>` : ''}
      ${stats.cashRefunds ? `<div class="row"><span>Refund Tunai:</span><span>-${formatCurrency(stats.cashRefunds)}</span></div>` : ''}
      
      <div class="divider"></div>
      <div class="row bold"><span>KAS SEHARUSNYA:</span><span>${formatCurrency(stats.expectedCash || 0)}</span></div>
      <div class="row bold"><span>HITUNG FISIK:</span><span>${formatCurrency(stats.actualCash !== undefined ? stats.actualCash : stats.expectedCash)}</span></div>
      <div class="center bold" style="margin-top: 4px; padding: 2px; border: 1px solid #000;">${diffLabel}</div>

      <div class="double-divider"></div>
      <div class="center bold">--- NON-TUNAI (BANK / QRIS) ---</div>
      <div class="row"><span>QRIS / Transfer:</span><span>${formatCurrency(stats.nonCashSales || 0)}</span></div>
      <div class="center" style="font-size: 9px;">(Masuk langsung ke rekening merchant)</div>

      ${stats.notes ? `<div class="divider"></div><div style="font-size: 10px;">Catatan: ${stats.notes}</div>` : ''}

      <div class="divider"></div>
      <div class="center" style="margin-top: 16px;">Tanda Tangan Kasir,</div>
      <div style="height: 36px;"></div>
      <div class="center bold">( ${stats.operatorName || 'Kasir'} )</div>

      ${cfg.enableWatermark ? `<div class="center" style="font-size: 9px; margin-top: 10px; color: #444;">[ SakuNota - Solusi Kasir UMKM ]</div>` : ''}
    </body>
    </html>
  `;
}

// ============================================================================
// 3. GENERATOR STRUK TEST UNTUK UJI KONEKSI PRINTER
// ============================================================================

export function generateTestReceiptData(settings?: StoreSettings) {
  const cfg = settings || getStoreSettings();
  const now = new Date();

  return {
    id: 999,
    orderId: "999",
    createdAt: now.toISOString(),
    date: now.toLocaleString("id-ID"),
    customerName: "Budi Santoso (Uji Coba)",
    tableName: "Meja Tes #01",
    orderType: "Dine-in",
    paymentMethod: "Tunai",
    operatorName: "Kasir SakuNota",
    notes: "Uji format pembungkusan teks panjang & kalkulasi",
    items: [
      {
        nama: "Nasi Goreng Spesial Babat Gongso Pedas Manis",
        qty: 2,
        harga: 28000,
        kategori: "Makanan Utama",
        selectedModifiers: [
          { optionName: "Level 3 - Ekstra Pedas Cabai Rawit", harga: 2000 },
          { optionName: "Tambah Telur Ceplok Setengah Matang", harga: 4000 }
        ]
      },
      {
        nama: "Es Kopi Susu Gula Aren Spesial Nusantara",
        qty: 2,
        harga: 18000,
        kategori: "Minuman",
        selectedModifiers: [
          { optionName: "Less Sugar (50% Manis)", harga: 0 },
          { optionName: "Extra Espresso Shot", harga: 5000 }
        ]
      }
    ],
    subtotal: 106000,
    discount: 6000,
    discountType: "fixed",
    serviceCharge: 5000,
    tax: 10500,
    total: 115500,
    cashTendered: 120000,
    change: 4500,
    isDraft: false
  };
}

// ============================================================================
// 4. PRINT EXECUTION CONTROLLER DENGAN DETEKSI CAPACITOR NATIVE & FALLBACK WEB
// ============================================================================

export interface PrintExecutionOptions {
  title: string;
  escposText: string;
  htmlContent: string;
  settings?: StoreSettings;
}

export interface PrintExecutionResult {
  success: boolean;
  platform: 'native_bluetooth' | 'native_system' | 'web_iframe' | 'web_fallback';
  message: string;
}

/**
 * Eksekusi cetak struk:
 * - Jika di perangkat native Android/Capacitor dan MAC Bluetooth tersimpan -> cetak via Bluetooth Serial
 * - Jika di native Android tanpa MAC -> gunakan Printer.printHtml bawaan Capacitor
 * - Jika di browser Web/PWA -> cetak via iframe terisolasi (TIDAK AKAN mencetak UI halaman kasir)
 */
export async function executePrintDocument(options: PrintExecutionOptions): Promise<PrintExecutionResult> {
  const { title, escposText, htmlContent } = options;
  const isNative = Capacitor.isNativePlatform();

  // 1. Jalur Native Capacitor
  if (isNative) {
    const mac = typeof window !== 'undefined' ? localStorage.getItem('bt_printer_mac') : null;

    if (mac) {
      try {
        try {
          await BluetoothSerial.connect({ address: mac });
        } catch (_) {
          // Koneksi mungkin sudah aktif
        }
        await BluetoothSerial.write({ address: mac, value: escposText });
        return {
          success: true,
          platform: 'native_bluetooth',
          message: 'Berhasil dikirim ke Printer Bluetooth Thermal!'
        };
      } catch (btErr: any) {
        console.warn('Bluetooth Serial write failed, falling back to native system printer:', btErr);
        // Fallback ke native system print jika Bluetooth gagal
        try {
          await Printer.printHtml({ html: htmlContent, name: title });
          return {
            success: true,
            platform: 'native_system',
            message: 'Bluetooth gagal, dicetak via dialog Printer Sistem Android.'
          };
        } catch (sysErr: any) {
          throw new Error(`Gagal mencetak di Android: ${btErr.message || btErr}`);
        }
      }
    } else {
      // Tidak ada MAC Bluetooth, gunakan system printer
      try {
        await Printer.printHtml({ html: htmlContent, name: title });
        return {
          success: true,
          platform: 'native_system',
          message: 'Berhasil dikirim ke Dialog Printer Sistem Android.'
        };
      } catch (err: any) {
        throw new Error(`Gagal membuka dialog printer Android: ${err.message || err}`);
      }
    }
  }

  // 2. Jalur Web Browser / PWA (Isolasi 100% menggunakan Iframe)
  if (typeof window !== 'undefined') {
    try {
      // Cari atau buat iframe khusus cetak
      let printFrame = document.getElementById('sakunota-print-iframe') as HTMLIFrameElement;
      if (!printFrame) {
        printFrame = document.createElement('iframe');
        printFrame.setAttribute('sandbox', 'allow-same-origin allow-modals');
        printFrame.id = 'sakunota-print-iframe';
        printFrame.style.position = 'fixed';
        printFrame.style.right = '0';
        printFrame.style.bottom = '0';
        printFrame.style.width = '0';
        printFrame.style.height = '0';
        printFrame.style.border = '0';
        printFrame.style.visibility = 'hidden';
        document.body.appendChild(printFrame);
      }

      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (frameDoc) {
        frameDoc.open();
        frameDoc.write(htmlContent);
        frameDoc.close();

        // Tunggu rendering selesai lalu cetak
        await new Promise((resolve) => setTimeout(resolve, 250));

        if (printFrame.contentWindow) {
          printFrame.contentWindow.focus();
          printFrame.contentWindow.print();
          return {
            success: true,
            platform: 'web_iframe',
            message: 'Dialog cetak struk terisolasi berhasil dibuka!'
          };
        }
      }
    } catch (frameErr) {
      console.warn('Iframe print error, falling back to Printer.printHtml:', frameErr);
    }

    // Fallback sekunder untuk web: Printer.printHtml
    try {
      await Printer.printHtml({ html: htmlContent, name: title });
      return {
        success: true,
        platform: 'web_fallback',
        message: 'Dialog cetak dibuka via Capacitor Web Plugin.'
      };
    } catch (pluginErr: any) {
      throw new Error(`Gagal mencetak struk di browser: ${pluginErr.message || pluginErr}`);
    }
  }

  return {
    success: false,
    platform: 'web_fallback',
    message: 'Lingkungan tanpa window tidak didukung untuk cetak.'
  };
}
