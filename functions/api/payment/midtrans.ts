// Cloudflare Pages Function: /api/payment/midtrans
// Hardened Midtrans Webhook Handler with Mandatory Signature Validation & Atomic D1 Transactions
import crypto from "node:crypto";
import {
  getD1,
  initD1Tables,
  generateGenuineLicenseKey,
  signLicenseKey,
} from "../../../src/lib/server/sakunotaServer";
import { getOrderByIdD1 } from "../../../src/lib/server/d1";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Kunci server Midtrans (MIDTRANS_SERVER_KEY) belum dikonfigurasi pada Cloudflare Secrets.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await context.request.json();
    const {
      order_id,
      status_code,
      gross_amount,
      signature_key,
      transaction_status,
      fraud_status,
    } = body || {};

    if (!order_id) {
      return new Response(JSON.stringify({ success: false, error: "order_id diperlukan" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // MANDATORY SIGNATURE VERIFICATION: Reject any request without signature_key
    if (!signature_key) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Akses ditolak: signature_key wajib disertakan pada notifikasi webhook Midtrans.",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify SHA-512 Signature against official Midtrans algorithm
    const payload = `${order_id}${status_code}${gross_amount}${serverKey}`;
    const expectedSig = crypto.createHash("sha512").update(payload).digest("hex");

    if (signature_key !== expectedSig) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Signature Midtrans tidak valid. Notifikasi pembayaran ditolak demi keamanan lisensi.",
        }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const order = await getOrderByIdD1(db, order_id);
    if (!order) {
      return new Response(JSON.stringify({ success: false, error: "Pesanan tidak ditemukan di sistem D1." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Strict validation: gross_amount must strictly match order amount
    const parsedAmount = Math.round(Number(gross_amount));
    if (parsedAmount !== order.amount) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Nominal pembayaran (Rp ${parsedAmount}) tidak sesuai dengan tagihan pesanan (Rp ${order.amount}).`,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle payment settlement
    const isSuccess =
      status_code === "200" &&
      (transaction_status === "settlement" ||
        (transaction_status === "capture" && fraud_status === "accept"));

    if (isSuccess) {
      // Idempotency check: if order is already paid, do not reissue
      if (order.status === "lunas_lisensi_terbit" && order.licenseKey) {
        return new Response(
          JSON.stringify({ success: true, message: "Pesanan sudah berstatus lunas sebelumnya (Idempotent)." }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }

      const licenseKey = generateGenuineLicenseKey(order_id);
      const verifiedAt = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      // ATOMIC TRANSACTION: update CustomerOrders AND insert into Licenses in a single D1 batch
      const stmtOrder = db.prepare(`
        UPDATE CustomerOrders 
        SET status = 'lunas_lisensi_terbit', licenseKey = ?, verifiedAt = ?
        WHERE orderId = ?
      `).bind(licenseKey, verifiedAt, order_id);

      const stmtLicense = db.prepare(`
        INSERT OR REPLACE INTO Licenses (
          licenseKey, orderId, businessName, issuedAt, signature
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(licenseKey, order_id, order.businessName, verifiedAt, signLicenseKey(licenseKey));

      await db.batch([stmtOrder, stmtLicense]);

      // SECURITY RULE: Never return the secret licenseKey in public webhook response!
      return new Response(
        JSON.stringify({
          success: true,
          message: "Pembayaran Midtrans berhasil diverifikasi. Lisensi resmi telah diterbitkan secara atomik di Cloudflare D1.",
          orderId: order_id,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle cancellation / expiration
    if (["cancel", "deny", "expire"].includes(transaction_status)) {
      await db.prepare(`UPDATE CustomerOrders SET status = 'batal' WHERE orderId = ?`).bind(order_id).run();
      return new Response(JSON.stringify({ success: true, message: `Status pesanan diubah ke ${transaction_status}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: `Status transaksi dicatat: ${transaction_status}` }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestGet() {
  return new Response(
    JSON.stringify({
      gateway: "Midtrans Payment Gateway",
      target: "Cloudflare D1 Edge Relational Database (09a2c118-5c9d-49e8-a199-d14e930d02f2)",
      status: "ONLINE & ENFORCED",
      signatureVerification: "SHA-512 Mandatory",
      webhookUrl: "/api/payment/midtrans",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
