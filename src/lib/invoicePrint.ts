import { CustomerOrder } from "./ordersClient";
import {
  PAYMENT_BANK_NAME,
  PAYMENT_ACCOUNT_NUMBER,
  PAYMENT_ACCOUNT_NAME,
} from "./config";
import { escapePrintText } from "./printSafety";

function formatIdDate(dateInput?: string | null): string {
  if (!dateInput) {
    return new Date().toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }
  const parsed = Date.parse(dateInput);
  if (Number.isNaN(parsed)) {
    return dateInput;
  }
  return new Date(parsed).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatRupiah(amount?: number | null): string {
  const n = typeof amount === "number" && !Number.isNaN(amount) ? amount : 50000;
  return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
}

export function generateOfficialInvoiceHtml(order: CustomerOrder): string {
  const isPaid = order.status === "lunas_lisensi_terbit";
  const isCancelled = order.status === "batal";

  const orderId = escapePrintText(order.orderId || "-");
  const invoiceNumber = `INV-${orderId}`;
  const createdDate = escapePrintText(formatIdDate(order.createdAt));
  const verifiedDate = order.verifiedAt ? escapePrintText(formatIdDate(order.verifiedAt)) : "";
  const businessName = escapePrintText(order.businessName || "-");
  const buyerName = escapePrintText(order.buyerName || "-");
  const whatsapp = escapePrintText(order.whatsapp || "-");
  const email = order.email ? escapePrintText(order.email) : "";
  const npwp = order.npwp ? escapePrintText(order.npwp) : "";
  const accessCode = escapePrintText(order.accessCode || "-");
  const paymentMethod = escapePrintText(
    order.paymentMethod || (isPaid ? "Midtrans / Transfer Terverifikasi" : "Transfer Bank BCA / QRIS")
  );
  const licenseKey = order.licenseKey ? escapePrintText(order.licenseKey) : "";
  const promoCode = order.promoCode ? escapePrintText(order.promoCode) : "";
  const paymentLink = order.paymentLink ? escapePrintText(order.paymentLink) : "";

  const originalAmount = order.originalAmount || 50000;
  const discountAmount = order.discountAmount || 0;
  const finalAmount = order.amount ?? Math.max(0, originalAmount - discountAmount);

  // Pajak PPN 11% include: Final amount is 50.000 already including PPN 11%
  const dppAmount = Math.round(finalAmount / 1.11);
  const ppnAmount = finalAmount - dppAmount;
  const dppOriginal = Math.round(originalAmount / 1.11);

  const statusText = isPaid
    ? "LUNAS / PAID"
    : isCancelled
    ? "DIBATALKAN / CANCELLED"
    : "MENUNGGU PEMBAYARAN / UNPAID";

  const statusColor = isPaid ? "#047857" : isCancelled ? "#be123c" : "#b45309";
  const statusBg = isPaid ? "#ecfdf5" : isCancelled ? "#fff1f2" : "#fffbeb";
  const statusBorder = isPaid ? "#6ee7b7" : isCancelled ? "#fda4af" : "#fcd34d";

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Faktur Resmi SakuNota - ${invoiceNumber}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      width: 100%;
      background: #ffffff;
      color: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      line-height: 1.5;
    }
    .invoice-page {
      max-width: 760px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 14px;
      padding: 28px 30px;
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding-bottom: 18px;
      border-bottom: 2px solid #0f172a;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: #0f172a;
    }
    .brand-sub {
      font-size: 12px;
      font-weight: 700;
      color: #2563eb;
      margin-top: 2px;
    }
    .company-meta {
      font-size: 11px;
      color: #475569;
      margin-top: 6px;
      line-height: 1.45;
    }
    .invoice-meta {
      text-align: right;
    }
    .doc-label {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #475569;
    }
    .inv-number {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 16px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 3px;
    }
    .inv-date {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .status-badge {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 12px;
      border-radius: 999px;
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: ${statusColor};
      background-color: ${statusBg};
      border: 1px solid ${statusBorder};
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 18px;
    }
    .info-box {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .info-box-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #64748b;
      margin-bottom: 8px;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 4px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      padding: 2.5px 0;
      font-size: 11.5px;
    }
    .info-label {
      color: #64748b;
      flex-shrink: 0;
    }
    .info-val {
      color: #0f172a;
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }
    .info-val.mono {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-weight: 700;
    }
    .items-section {
      margin-top: 18px;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      overflow: hidden;
    }
    table.invoice-table {
      width: 100%;
      border-collapse: collapse;
    }
    table.invoice-table thead th {
      background-color: #f1f5f9;
      color: #334155;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding: 10px 14px;
      border-bottom: 1px solid #cbd5e1;
      text-align: left;
    }
    table.invoice-table tbody td {
      padding: 14px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
      font-size: 12px;
    }
    .item-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 12.5px;
    }
    .item-desc {
      font-size: 11px;
      color: #475569;
      margin-top: 3px;
    }
    .col-center {
      text-align: center !important;
      white-space: nowrap;
    }
    .col-right {
      text-align: right !important;
      white-space: nowrap;
    }
    .summary-row td {
      padding: 8px 14px;
      font-size: 11.5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .promo-row td {
      background-color: #ecfdf5;
      color: #047857;
      font-weight: 700;
    }
    .total-row td {
      background-color: #f8fafc;
      padding: 12px 14px;
      font-size: 13.5px;
      font-weight: 800;
      color: #0f172a;
      border-top: 2px solid #cbd5e1;
      border-bottom: none;
    }
    .total-amount {
      color: #1d4ed8;
      font-size: 15px;
    }
    .payment-box {
      margin-top: 18px;
      background-color: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 10px;
      padding: 14px 16px;
    }
    .payment-box-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      padding-bottom: 6px;
      border-bottom: 1px solid #fde68a;
    }
    .payment-box-title {
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      color: #92400e;
      letter-spacing: 0.04em;
    }
    .payment-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px 20px;
      font-size: 11.5px;
    }
    .license-box {
      margin-top: 18px;
      background-color: #eff6ff;
      border: 1px solid #93c5fd;
      border-radius: 10px;
      padding: 14px 16px;
      text-align: center;
    }
    .license-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: #1e40af;
    }
    .license-code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 16px;
      font-weight: 800;
      color: #1d4ed8;
      letter-spacing: 0.08em;
      margin-top: 4px;
      padding: 6px 12px;
      background: #ffffff;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      display: inline-block;
    }
    .footer-row {
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 20px;
      font-size: 10.5px;
      color: #64748b;
    }
    .stamp-box {
      text-align: right;
      flex-shrink: 0;
    }
    .stamp-title {
      font-weight: 800;
      color: #0f172a;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="invoice-page">
    <div class="header-row">
      <div>
        <div class="brand-title">SakuNota POS</div>
        <div class="brand-sub">Kasir Jalan Tanpa Internet</div>
        <div class="company-meta">
          <strong>PT Pemuda Gaya Bebas</strong><br />
          NPWP: 125383232617000<br />
          sakunota.my.id
        </div>
      </div>
      <div class="invoice-meta">
        <div class="doc-label">Faktur / Invoice Resmi</div>
        <div class="inv-number">${invoiceNumber}</div>
        <div class="inv-date">Tanggal Terbit: ${createdDate}</div>
        ${verifiedDate ? `<div class="inv-date">Tanggal Lunas: ${verifiedDate}</div>` : ""}
        <div class="status-badge">${statusText}</div>
      </div>
    </div>

    <div class="info-grid">
      <div class="info-box">
        <div class="info-box-title">Diterbitkan Untuk (Pelanggan)</div>
        <div class="info-row">
          <span class="info-label">Nama Usaha:</span>
          <span class="info-val">${businessName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nama Pemilik:</span>
          <span class="info-val">${buyerName}</span>
        </div>
        <div class="info-row">
          <span class="info-label">No. WhatsApp:</span>
          <span class="info-val mono">${whatsapp}</span>
        </div>
        ${
          email
            ? `<div class="info-row">
          <span class="info-label">Email:</span>
          <span class="info-val">${email}</span>
        </div>`
            : ""
        }
        ${
          npwp
            ? `<div class="info-row">
          <span class="info-label">NPWP Pelanggan:</span>
          <span class="info-val mono">${npwp}</span>
        </div>`
            : ""
        }
      </div>

      <div class="info-box">
        <div class="info-box-title">Rincian Pesanan &amp; Akses</div>
        <div class="info-row">
          <span class="info-label">Nomor Pesanan:</span>
          <span class="info-val mono">${orderId}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Kode Akses Rahasia:</span>
          <span class="info-val mono" style="color: #1d4ed8;">${accessCode}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Metode Pembayaran:</span>
          <span class="info-val">${paymentMethod}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Tipe Lisensi:</span>
          <span class="info-val">Sekali Bayar (Aktif Permanen)</span>
        </div>
      </div>
    </div>

    <div class="items-section">
      <table class="invoice-table">
        <thead>
          <tr>
            <th style="width: 42px;" class="col-center">No</th>
            <th>Deskripsi Produk &amp; Layanan</th>
            <th style="width: 55px;" class="col-center">Qty</th>
            <th style="width: 130px;" class="col-right">Harga Satuan</th>
            <th style="width: 130px;" class="col-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="col-center" style="font-weight: 700; color: #475569;">1</td>
            <td>
              <div class="item-title">Lisensi SakuNota</div>
              <div class="item-desc">
                Akses 1 perangkat, tanpa biaya langganan bulanan
              </div>
            </td>
            <td class="col-center" style="font-weight: 700;">1</td>
            <td class="col-right">${formatRupiah(dppOriginal)}</td>
            <td class="col-right" style="font-weight: 700;">${formatRupiah(dppOriginal)}</td>
          </tr>
          <tr class="summary-row">
            <td colspan="4" class="col-right">Dasar Pengenaan Pajak (DPP):</td>
            <td class="col-right">${formatRupiah(dppAmount)}</td>
          </tr>
          ${
            promoCode
              ? `<tr class="summary-row promo-row">
            <td colspan="4" class="col-right">Potongan Diskon Promo (${promoCode}):</td>
            <td class="col-right">-${formatRupiah(discountAmount)}</td>
          </tr>`
              : ""
          }
          <tr class="summary-row">
            <td colspan="4" class="col-right">PPN 11% (Termasuk / Included):</td>
            <td class="col-right">${formatRupiah(ppnAmount)}</td>
          </tr>
          <tr class="total-row">
            <td colspan="4" class="col-right">TOTAL TAGIHAN (Termasuk PPN 11%):</td>
            <td class="col-right total-amount">${formatRupiah(finalAmount)}</td>
          </tr>
        </tbody>
      </table>
    </div>

    ${
      !isPaid && !isCancelled
        ? `<div class="payment-box">
      <div class="payment-box-header">
        <span class="payment-box-title">Instruksi Pembayaran Transfer Bank</span>
        <span style="font-size: 10px; font-weight: 800; color: #92400e;">CANTUMKAN NOMOR PESANAN PADA BERITA TRANSFER</span>
      </div>
      <div class="payment-grid">
        <div class="info-row">
          <span class="info-label">Bank Tujuan:</span>
          <span class="info-val">${escapePrintText(PAYMENT_BANK_NAME)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nominal Transfer:</span>
          <span class="info-val" style="color: #047857; font-weight: 800;">${formatRupiah(finalAmount)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Nomor Rekening:</span>
          <span class="info-val mono" style="font-size: 13px;">${escapePrintText(PAYMENT_ACCOUNT_NUMBER)}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Berita Transfer:</span>
          <span class="info-val mono">${orderId}</span>
        </div>
        <div class="info-row" style="grid-column: span 2;">
          <span class="info-label">Atas Nama Rekening:</span>
          <span class="info-val">${escapePrintText(PAYMENT_ACCOUNT_NAME)}</span>
        </div>
        ${
          paymentLink
            ? `<div class="info-row" style="grid-column: span 2; padding-top: 4px; border-top: 1px dashed #fde68a;">
          <span class="info-label">Link Pembayaran QRIS / Digital:</span>
          <span class="info-val mono" style="font-size: 10.5px; color: #1d4ed8;">${paymentLink}</span>
        </div>`
            : ""
        }
      </div>
    </div>`
        : ""
    }

    ${
      licenseKey
        ? `<div class="license-box">
      <div class="license-label">Kode Lisensi Resmi SakuNota POS</div>
      <div class="license-code">${licenseKey}</div>
      <div style="font-size: 10.5px; color: #334155; margin-top: 6px;">
        Masukkan kode lisensi di atas pada menu <strong>Aktivasi Lisensi</strong> di aplikasi SakuNota POS perangkat kasir Anda.
      </div>
    </div>`
        : ""
    }

    <div class="footer-row">
      <div style="max-width: 480px;">
        <strong>Catatan Resmi:</strong><br />
        Faktur / Invoice ini diterbitkan secara elektronik oleh sistem SakuNota POS dan merupakan bukti pembayaran yang sah termasuk PPN 11% tanpa memerlukan tanda tangan basah.
      </div>
      <div class="stamp-box">
        <div class="stamp-title">PT Pemuda Gaya Bebas</div>
        <div>NPWP: 125383232617000</div>
        <div>sakunota.my.id</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function printOfficialInvoice(order: CustomerOrder): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const htmlContent = generateOfficialInvoiceHtml(order);

  try {
    let printFrame = document.getElementById("sakunota-invoice-print-iframe") as HTMLIFrameElement | null;
    if (!printFrame) {
      printFrame = document.createElement("iframe");
      printFrame.id = "sakunota-invoice-print-iframe";
      printFrame.setAttribute("sandbox", "allow-same-origin allow-modals");
      printFrame.style.position = "fixed";
      printFrame.style.right = "0";
      printFrame.style.bottom = "0";
      printFrame.style.width = "0";
      printFrame.style.height = "0";
      printFrame.style.border = "0";
      printFrame.style.visibility = "hidden";
      document.body.appendChild(printFrame);
    }

    const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
    if (frameDoc && printFrame.contentWindow) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      setTimeout(() => {
        try {
          printFrame?.contentWindow?.focus();
          printFrame?.contentWindow?.print();
        } catch (err) {
          console.error("Gagal mencetak invoice via iframe:", err);
        }
      }, 250);
    }
  } catch (err) {
    console.error("Gagal menyiapkan dokumen invoice:", err);
  }
}
