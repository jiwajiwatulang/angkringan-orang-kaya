// Cloudflare Pages Function: POST /api/orders/create
import { createCustomerOrder, getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { buyerName, businessName, whatsapp, email } = body || {};

    if (!buyerName || !businessName || !whatsapp) {
      return new Response(
        JSON.stringify({ success: false, error: "Nama, Nama Usaha, dan WhatsApp wajib diisi." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const res = await createCustomerOrder(db, { buyerName, businessName, whatsapp, email });

    return new Response(JSON.stringify({ success: true, order: res.order }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
