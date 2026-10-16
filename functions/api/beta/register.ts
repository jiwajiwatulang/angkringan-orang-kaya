// Cloudflare Pages Function: POST /api/beta/register
import { registerBetaAccount, getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { ownerName, businessName, whatsapp, email, notes, honeypot } = body || {};

    if (!ownerName || !businessName || !whatsapp) {
      return new Response(
        JSON.stringify({ success: false, error: "Nama Pemilik, Nama Usaha, dan Nomor WhatsApp wajib diisi." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const res = await registerBetaAccount(db, {
      ownerName,
      businessName,
      whatsapp,
      email,
      notes,
      honeypot,
    });

    return new Response(JSON.stringify(res), {
      status: res.success ? 201 : 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
