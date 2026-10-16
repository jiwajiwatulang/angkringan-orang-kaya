// Cloudflare Pages Function: GET /api/owner/metrics
import { getOwnerMetrics } from "../../../src/lib/server/sakunotaServer";

export async function onRequestGet(context: any) {
  try {
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const res = getOwnerMetrics(token);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, metrics: res.metrics }), {
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
