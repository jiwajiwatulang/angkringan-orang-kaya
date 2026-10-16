// Cloudflare Pages Function: POST /api/payment/snap
// Initiates Midtrans Snap Transaction for QRIS, Virtual Account, and E-Wallets
import { getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";
import { getOrderByIdD1 } from "../../../src/lib/server/d1";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { orderId, accessCode } = body || {};

    if (!orderId || !accessCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Nomor pesanan dan kode akses diperlukan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const order = await getOrderByIdD1(db, orderId.trim());
    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Pesanan tidak ditemukan di sistem D1." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    if (order.accessCode.trim().toUpperCase() !== accessCode.trim().toUpperCase()) {
      return new Response(
        JSON.stringify({ success: false, error: "Kode akses rahasia tidak cocok dengan pesanan ini." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "MIDTRANS_SERVER_KEY belum dikonfigurasi di Cloudflare Secrets. Gunakan pembayaran transfer manual BCA.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }

    const isSandbox = serverKey.startsWith("SB-");
    const snapUrl = isSandbox
      ? "https://app.sandbox.midtrans.com/snap/v1/transactions"
      : "https://app.midtrans.com/snap/v1/transactions";

    const authHeader = "Basic " + Buffer.from(serverKey + ":").toString("base64");

    const requestUrl = new URL(context.request.url);
    const hostOrigin = requestUrl.origin;
    const notificationWebhook = `${hostOrigin}/api/payment/midtrans`;

    const snapPayload: any = {
      transaction_details: {
        order_id: order.orderId,
        gross_amount: order.amount,
      },
      customer_details: {
        first_name: order.buyerName,
        phone: order.whatsapp,
        email: order.email || "buyer@sakunota.com",
      },
      item_details: [
        {
          id: "SAKUNOTA-LIFETIME-PROMO",
          price: order.amount,
          quantity: 1,
          name: "SakuNota POS Kasir Lifetime (Promo)",
        },
      ],
      callbacks: {
        finish: `${hostOrigin}/?payment=finish&orderId=${encodeURIComponent(order.orderId)}&accessCode=${encodeURIComponent(order.accessCode)}`,
      },
    };

    // If request comes from public HTTPS domain, dynamically override notification URL
    if (hostOrigin.startsWith("https://")) {
      snapPayload.override_notification_urls = [notificationWebhook];
    }

    const snapRes = await fetch(snapUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(snapPayload),
    });

    const snapJson = await snapRes.json() as any;

    if (!snapRes.ok || !snapJson.token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: snapJson.error_messages ? snapJson.error_messages.join(", ") : "Gagal menghubungi gateway Midtrans.",
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        token: snapJson.token,
        redirect_url: snapJson.redirect_url,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
