import { StoreSettings, getStoreSettings } from './settings';

export function formatCurrency(amount: number): string {
  return "Rp " + Math.round(amount).toLocaleString('id-ID');
}

export function generateEscPosReceipt(receipt: any, mode: 'all' | 'food' | 'drink', settings?: StoreSettings): string {
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
      return left + "\n" + " ".repeat(Math.max(0, width - right.length)) + right + "\n";
    }
    return left + " ".repeat(space) + right + "\n";
  };

  let txt = "";

  // 1. Header Toko
  if (mode === 'all') {
    txt += center(cfg.storeName.toUpperCase());
    if (cfg.storeAddress) txt += center(cfg.storeAddress);
    if (cfg.storePhone) txt += center("Telp: " + cfg.storePhone);
  } else if (mode === 'food') {
    txt += center("*** DAPUR - MAKANAN ***");
  } else {
    txt += center("*** BAR - MINUMAN ***");
  }

  txt += doubleDivider;

  // Indikator status VOID
  if (receipt.status === 'void') {
    txt += center("!!! NOTA BATAL / VOID !!!");
    if (receipt.voidReason) txt += center("Alasan: " + receipt.voidReason);
    txt += divider;
  }

  // 2. Info Pesanan
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
    const isDrink = isDrinkCategory(item.kategori);
    if (mode === 'food' && isDrink) return;
    if (mode === 'drink' && !isDrink) return;

    const subtotal = item.qty * item.harga;
    calculatedSubtotal += subtotal;

    if (mode === 'all') {
      const left = `${item.qty}x ${item.nama}`;
      const right = formatCurrency(subtotal);
      txt += lineTwoCols(left, right);
    } else {
      txt += `${item.qty}x ${item.nama}\n`;
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
    txt += lineTwoCols("TOTAL:", formatCurrency(total));
    txt += lineTwoCols("Metode:", receipt.paymentMethod || "Tunai");

    if (receipt.cashTendered && receipt.cashTendered > 0) {
      txt += lineTwoCols("Bayar Tunai:", formatCurrency(receipt.cashTendered));
      const change = Math.max(0, receipt.cashTendered - total);
      txt += lineTwoCols("Kembalian:", formatCurrency(change));
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
      txt += "\n" + center("[ Aplikasi Kasir Gratis - SakuNota ]");
    }
  }

  txt += "\n\n\n"; // Feed paper
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
      return left + "\n" + " ".repeat(Math.max(0, width - right.length)) + right + "\n";
    }
    return left + " ".repeat(space) + right + "\n";
  };

  let txt = "";
  txt += center(cfg.storeName.toUpperCase());
  if (cfg.storeAddress) txt += center(cfg.storeAddress);
  txt += doubleDivider;
  txt += center("LAPORAN TUTUP SHIFT");
  txt += center("(Z-REPORT)");
  txt += doubleDivider;

  txt += lineTwoCols("Operator:", stats.operatorName || 'Kasir');
  txt += lineTwoCols("Buka:", new Date(stats.startTime).toLocaleString('id-ID'));
  txt += lineTwoCols("Tutup:", stats.endTime ? new Date(stats.endTime).toLocaleString('id-ID') : new Date().toLocaleString('id-ID'));
  txt += lineTwoCols("Jml Transaksi:", (stats.totalTransactions || 0) + " nota");
  txt += divider;

  txt += lineTwoCols("Modal Awal Kas:", formatCurrency(stats.startingCash || 0));
  txt += lineTwoCols("Penjualan Tunai:", formatCurrency(stats.cashSales || 0));
  txt += lineTwoCols("Penjualan Non-Tunai:", formatCurrency(stats.nonCashSales || 0));
  if (stats.cashIn > 0) txt += lineTwoCols("Kas Masuk (+):", formatCurrency(stats.cashIn));
  if (stats.cashOut > 0) txt += lineTwoCols("Kas Keluar (-):", "-" + formatCurrency(stats.cashOut));
  if (stats.cashRefunds > 0) txt += lineTwoCols("Refund Tunai (-):", "-" + formatCurrency(stats.cashRefunds));
  txt += divider;

  txt += lineTwoCols("Kas Seharusnya:", formatCurrency(stats.expectedCash || 0));
  txt += lineTwoCols("Fisik Dihitung:", formatCurrency(stats.actualCash || 0));
  txt += divider;

  const diff = stats.cashDifference || 0;
  const statusStr = diff === 0 ? "[ PAS ]" : diff > 0 ? ("+ " + formatCurrency(diff)) : ("- " + formatCurrency(Math.abs(diff)));
  txt += lineTwoCols("SELISIH KAS:", statusStr);
  txt += doubleDivider;

  if (stats.notes) {
    txt += "Catatan: " + stats.notes + "\n";
    txt += divider;
  }

  txt += center("Kasir / Supervisor:");
  txt += "\n\n\n";
  txt += center("( " + (stats.operatorName || 'Kasir') + " )");
  txt += "\n\n\n";

  return txt;
}