import { StoreSettings, getStoreSettings } from './settings';

export function generateEscPosReceipt(receipt: any, mode: 'all' | 'food' | 'drink' = 'all', settings?: StoreSettings): string {
  const cfg = settings || getStoreSettings();
  const width = cfg.paperWidth === '80mm' ? 48 : 32; // Karakter per baris (58mm = 32 col, 80mm = 48 col)
  const divider = "-".repeat(width) + "\n";
  const doubleDivider = "=".repeat(width) + "\n";

  const center = (text: string): string => {
    if (text.length >= width) return text.substring(0, width) + "\n";
    const pad = Math.floor((width - text.length) / 2);
    return " ".repeat(pad) + text + "\n";
  };

  const lineTwoCols = (left: string, right: string): string => {
    const space = width - left.length - right.length;
    if (space <= 0) {
      return `${left}\n${right.padStart(width, " ")}\n`;
    }
    return `${left}${" ".repeat(space)}${right}\n`;
  };

  const formatCurrency = (val: number): string => `Rp ${val.toLocaleString('id-ID')}`;

  let txt = "";

  // 1. Header Struk
  if (mode === 'all') {
    txt += center(cfg.storeName || "SAKUNOTA");
    if (cfg.storeAddress) txt += center(cfg.storeAddress);
    if (cfg.storePhone) txt += center(`Telp: ${cfg.storePhone}`);
    if ((cfg as any).receiptHeader) {
      const headerLines = (cfg as any).receiptHeader.split("\n");
      headerLines.forEach((l: string) => {
        if (l.trim()) txt += center(l.trim());
      });
    }
  } else {
    // Mode Dapur atau Bar
    const title = mode === 'food' ? "*** STRUK DAPUR (KITCHEN) ***" : "*** STRUK BAR (MINUMAN) ***";
    txt += center(title);
  }

  txt += doubleDivider;

  // 2. Info Transaksi
  txt += lineTwoCols(`Tgl: ${receipt.date || new Date().toLocaleString('id-ID')}`, "");
  txt += lineTwoCols(
    `No: A-${receipt.orderId || '-'}`,
    receipt.tableName ? `Meja: ${receipt.tableName.replace(/^Meja\s*/i, '')}` : `[${receipt.orderType || 'Dine-in'}]`
  );
  if (receipt.customerName) {
    txt += lineTwoCols(`Pelanggan: ${receipt.customerName}`, "");
  }
  if (receipt.notes) {
    txt += `Catatan: ${receipt.notes}\n`;
  }

  txt += divider;

  // 3. Daftar Item
  let calculatedSubtotal = 0;
  const isDrinkCategory = (cat: string) => {
    if (!cat) return false;
    const c = cat.toLowerCase();
    return c.includes('minuman') || c.includes('kopi') || c.includes('tea') || c.includes('matcha') ||
      c.includes('drink') || c.includes('coffee') || c.includes('milkshake') || c.includes('beverage') || c.includes('juice');
  };

  (receipt.items || []).forEach((item: any) => {
    const isDrink = isDrinkCategory(item.kategori || item.kategoriMenu);
    if (mode === 'food' && isDrink) return;
    if (mode === 'drink' && !isDrink) return;

    const subtotal = item.qty * item.harga;
    calculatedSubtotal += subtotal;

    if (mode === 'all') {
      const left = `${item.qty}x ${item.nama || item.namaMenu}`;
      const right = formatCurrency(subtotal);
      txt += lineTwoCols(left, right);
    } else {
      txt += `${item.qty}x ${item.nama || item.namaMenu}\n`;
    }

    // Cetak rincian Modifier / Add-on (Level pedas, extra topping, es, dll)
    if (item.selectedModifiers && item.selectedModifiers.length > 0) {
      item.selectedModifiers.forEach((m: any) => {
        const modPrice = m.harga > 0 ? ` (+${formatCurrency(m.harga)})` : '';
        txt += `   > ${m.optionName}${modPrice}\n`;
      });
    }
  });

  txt += divider;

  // 4. Pembayaran (Hanya mode 'all')
  if (mode === 'all') {
    const subtotal = receipt.subtotal || calculatedSubtotal;
    const hasExtras = (receipt.discount && receipt.discount > 0) || (receipt.serviceCharge && receipt.serviceCharge > 0) || (receipt.tax && receipt.tax > 0);

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
        txt += lineTwoCols("Pajak:", formatCurrency(receipt.tax));
      }
      txt += divider;
    }

    const total = receipt.total || calculatedSubtotal;
    txt += lineTwoCols("TOTAL TAGIHAN:", formatCurrency(total));

    // Rincian Pembayaran (Dukungan Split Bill & Mixed Payments)
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
        txt += center("⏳ STATUS: BELUM LUNAS");
      } else {
        txt += doubleDivider;
        txt += center("✅ LUNAS");
      }
    } else {
      txt += lineTwoCols("Metode:", receipt.paymentMethod || "Tunai");
      if (receipt.cashTendered && receipt.cashTendered > 0) {
        txt += lineTwoCols("Bayar Tunai:", formatCurrency(receipt.cashTendered));
        const change = Math.max(0, receipt.cashTendered - total);
        txt += lineTwoCols("Kembalian:", formatCurrency(change));
      }
      txt += doubleDivider;
      txt += center("✅ LUNAS");
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
      txt += "\n" + center("[ SakuNota - Kasir Pintar UMKM ]");
    }
  }

  txt += "\n\n\n"; // Feed paper
  return txt;
}

export function generatePartialPaymentReceipt(order: any, payment: any, settings?: StoreSettings): string {
  const cfg = settings || getStoreSettings();
  const width = cfg.paperWidth === '80mm' ? 48 : 32;
  const divider = "-".repeat(width) + "\n";
  const doubleDivider = "=".repeat(width) + "\n";

  const center = (text: string): string => {
    if (text.length >= width) return text.substring(0, width) + "\n";
    const pad = Math.floor((width - text.length) / 2);
    return " ".repeat(pad) + text + "\n";
  };

  const lineTwoCols = (left: string, right: string): string => {
    const space = width - left.length - right.length;
    if (space <= 0) return `${left}\n${right.padStart(width, " ")}\n`;
    return `${left}${" ".repeat(space)}${right}\n`;
  };

  const formatCurrency = (val: number): string => `Rp ${val.toLocaleString('id-ID')}`;

  let txt = "";
  txt += center(cfg.storeName || "SAKUNOTA");
  if (cfg.storeAddress) txt += center(cfg.storeAddress);
  if (cfg.storePhone) txt += center(`Telp: ${cfg.storePhone}`);
  txt += doubleDivider;
  txt += center("BUKTI PEMBAYARAN PARSIAL");
  txt += divider;

  txt += lineTwoCols(`Tgl: ${payment.paidAt ? new Date(payment.paidAt).toLocaleString('id-ID') : new Date().toLocaleString('id-ID')}`, "");
  txt += lineTwoCols(`No: A-${order.id || '-'}`, order.tableId ? `Meja: ${order.tableId}` : `[${order.orderType || 'Dine-in'}]`);
  if (order.customerName) txt += lineTwoCols(`Pelanggan: ${order.customerName}`, "");
  txt += lineTwoCols(`Kasir: ${payment.operatorName || 'Kasir'}`, payment.shiftId ? `Shift #${payment.shiftId}` : "");
  txt += divider;

  // Tipe Split
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
  txt += lineTwoCols("Metode Bayar:", payment.paymentMethod);
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
    txt += center("⏳ STATUS: BELUM LUNAS");
    txt += center("Harap simpan bukti pembayaran ini");
  } else {
    txt += center("✅ STATUS: LUNAS");
  }

  if (cfg.enableWatermark) {
    txt += "\n" + center("[ SakuNota - Kasir Pintar UMKM ]");
  }

  txt += "\n\n\n";
  return txt;
}

export function generateZReportReceipt(stats: any, settings?: StoreSettings): string {
  const cfg = settings || getStoreSettings();
  const width = cfg.paperWidth === '80mm' ? 48 : 32;
  const divider = "-".repeat(width) + "\n";
  const doubleDivider = "=".repeat(width) + "\n";

  const center = (text: string): string => {
    if (text.length >= width) return text.substring(0, width) + "\n";
    const pad = Math.floor((width - text.length) / 2);
    return " ".repeat(pad) + text + "\n";
  };

  const lineTwoCols = (left: string, right: string): string => {
    const space = width - left.length - right.length;
    if (space <= 0) {
      return `${left}\n${right.padStart(width, " ")}\n`;
    }
    return `${left}${" ".repeat(space)}${right}\n`;
  };

  const formatCurrency = (val: number): string => `Rp ${val.toLocaleString('id-ID')}`;

  let txt = "";

  txt += center(cfg.storeName || "SAKUNOTA");
  txt += center("*** LAPORAN TUTUP SHIFT (Z-REPORT) ***");
  txt += doubleDivider;

  txt += lineTwoCols("Shift ID:", `#${stats.id || '-'}`);
  txt += lineTwoCols("Kasir/Operator:", stats.operatorName || "Kasir");
  txt += lineTwoCols("Waktu Buka:", stats.startTime ? new Date(stats.startTime).toLocaleString('id-ID') : "-");
  txt += lineTwoCols("Waktu Tutup:", stats.endTime ? new Date(stats.endTime).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'));
  txt += divider;

  // Rincian Kas Fisik Laci
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

  // Info Non-Tunai (Rekonsiliasi Bank/Merchant)
  txt += center("--- NON-TUNAI (BANK / QRIS) ---");
  txt += lineTwoCols("QRIS / Transfer:", formatCurrency(stats.nonCashSales || 0));
  txt += center("(Langsung masuk rekening/bank)");
  txt += divider;

  if (stats.notes) {
    txt += `Catatan: ${stats.notes}\n`;
    txt += divider;
  }

  txt += center("Tanda Tangan Kasir,");
  txt += "\n\n\n";
  txt += center(`( ${stats.operatorName || "Kasir"} )`);

  if (cfg.enableWatermark) {
    txt += "\n" + center("[ SakuNota - Kasir Pintar UMKM ]");
  }

  txt += "\n\n\n";
  return txt;
}