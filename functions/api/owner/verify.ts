// Cloudflare Pages Function: POST /api/owner/verify
import { verifyOrderAndIssueLicense, extractBearerToken, getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);

    const body = await context.request.json();
    const { orderId } = body || {};

    const res = await verifyOrderAndIssueLicense(db, token, orderId);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, order: res.order, licenseKey: res.licenseKey }), {
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
