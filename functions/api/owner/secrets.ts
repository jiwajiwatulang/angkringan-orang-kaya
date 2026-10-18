// Cloudflare Pages / Worker Function: GET /api/owner/secrets
// Configuration health only. Runtime credentials must never be exported to a browser.
import { extractBearerToken, getD1, initD1Tables, verifyOwnerSession } from "../../../src/lib/server/sakunotaServer";

export async function onRequestGet(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);

    const auth = await verifyOwnerSession(db, token);
    if (!auth.valid) {
      return new Response(JSON.stringify({ success: false, error: "Akses ditolak. Sesi Owner tidak valid." }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const names = ['MIDTRANS_SERVER_KEY', 'MIDTRANS_CLIENT_KEY', 'MIDTRANS_MERCHANT_ID', 'SAKUNOTA_OWNER_USERNAME', 'SAKUNOTA_OWNER_PASSWORD', 'SAKUNOTA_OWNER_JWT_SECRET', 'SAKUNOTA_SERVER_SECRET', 'SAKUNOTA_OWNER_SALT'];
    const configured = Object.fromEntries(names.map(name => [name, Boolean(context.env?.[name])]));

    return new Response(JSON.stringify({ success: true, configured }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
