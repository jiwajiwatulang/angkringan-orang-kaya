// Cloudflare Pages Function: /api/payment/midtrans
// Midtrans Payment Gateway Integration & Webhook Handler for Cloudflare D1
import crypto from "node:crypto";
import {
  getD1,
  initD1Tables,
  generateGenuineLicenseKey,
  signLicenseKey,
} from "../../../src/lib/server/sakunotaServer";
import { getOrderByIdD1, updateOrderStatusAndLicenseD1, insertLicenseD1 } from "../../../src/lib/server/d1";

const MIDTRANS_SERVER_KEY = process.env.MIDTRANS_SERVER_KEY || "SB-Mid-server-sakunota-test-key";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

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

    // Verify Midtrans Signature if signature_key is provided
    if (signature_key && MIDTRANS_SERVER_KEY) {
      const payload = `${order_id}${status_code}${gross_amount}${MIDTRANS_SERVER_KEY}`;
      const expectedSig = crypto.createHash("sha512").update(payload).digest("hex");
      if (signature_key !== expectedSig) {
        return new Response(JSON.stringify({ success: false, error: "Signature Midtrans tidak valid" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    const order = await getOrderByIdD1(db, order_id);
    if (!order) {
      return new Response(JSON.stringify({ success: false, error: "Pesanan tidak ditemukan" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Handle payment settlement (Success)
    const isSuccess =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (isSuccess) {
      if (order.status === "lunas_lisensi_terbit" && order.licenseKey) {
        return new Response(JSON.stringify({ success: true, message: "Pesanan sudah lunas", licenseKey: order.licenseKey }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }

      const licenseKey = generateGenuineLicenseKey(order_id);
      const verifiedAt = new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });

      await updateOrderStatusAndLicenseD1(db, order_id, licenseKey, verifiedAt);

      await insertLicenseD1(db, {
        licenseKey,
        orderId: order_id,
        businessName: order.businessName,
        issuedAt: verifiedAt,
        signature: signLicenseKey(licenseKey),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Pembayaran berhasil diverifikasi. Lisensi SakuNota telah diterbitkan di D1.",
          orderId: order_id,
          licenseKey,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Handle expired / cancelled
    if (["cancel", "deny", "expire"].includes(transaction_status)) {
      await db.prepare(`UPDATE CustomerOrders SET status = 'batal' WHERE orderId = ?`).bind(order_id).run();
      return new Response(JSON.stringify({ success: true, message: `Status pesanan diubah ke ${transaction_status}` }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, message: `Status transaksi: ${transaction_status}` }), {
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
      target: "Cloudflare D1 Edge Relational Database",
      status: "ONLINE & READY",
      webhookUrl: "/api/payment/midtrans",
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
}
