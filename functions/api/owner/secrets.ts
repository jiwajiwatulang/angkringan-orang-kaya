// Cloudflare Pages / Worker Function: GET /api/owner/secrets
// Secure endpoint to export environment secrets for Owner backup / migration
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

    const secrets = {
      MIDTRANS_SERVER_KEY: context.env?.MIDTRANS_SERVER_KEY || "",
      MIDTRANS_CLIENT_KEY: context.env?.MIDTRANS_CLIENT_KEY || "",
      MIDTRANS_MERCHANT_ID: context.env?.MIDTRANS_MERCHANT_ID || "",
      SAKUNOTA_OWNER_USERNAME: context.env?.SAKUNOTA_OWNER_USERNAME || "",
      SAKUNOTA_OWNER_PASSWORD: context.env?.SAKUNOTA_OWNER_PASSWORD || "",
      SAKUNOTA_OWNER_JWT_SECRET: context.env?.SAKUNOTA_OWNER_JWT_SECRET || "",
      SAKUNOTA_SERVER_SECRET: context.env?.SAKUNOTA_SERVER_SECRET || "",
      SAKUNOTA_OWNER_SALT: context.env?.SAKUNOTA_OWNER_SALT || "",
    };

    return new Response(JSON.stringify({ success: true, secrets }), {
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
