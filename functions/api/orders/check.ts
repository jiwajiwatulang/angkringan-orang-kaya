// Cloudflare Pages Function: POST /api/orders/check
import { checkCustomerOrderStatus, getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { orderId, accessCode } = body || {};

    if (!orderId || !accessCode) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Nomor Pesanan dan Kode Akses Rahasia Pembeli wajib disertakan demi keamanan lisensi Anda.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
    const res = await checkCustomerOrderStatus(db, orderId, accessCode, serverKey);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: res.error?.includes("tidak cocok") ? 403 : 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, order: res.order }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
