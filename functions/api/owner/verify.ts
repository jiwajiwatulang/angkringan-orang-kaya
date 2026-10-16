// Cloudflare Pages Function: POST /api/owner/verify
import { verifyOrderAndIssueLicense } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const body = await context.request.json();
    const { orderId } = body || {};

    const res = verifyOrderAndIssueLicense(token, orderId);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: res.error?.includes("Akses ditolak") ? 401 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: true, order: res.order, licenseKey: res.licenseKey }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
