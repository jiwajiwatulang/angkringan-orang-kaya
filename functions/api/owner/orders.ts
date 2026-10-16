// Cloudflare Pages Function: GET /api/owner/orders
import { listOwnerOrders } from "../../../src/lib/server/sakunotaServer";

export async function onRequestGet(context: any) {
  try {
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const res = listOwnerOrders(token);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, orders: res.orders }), {
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
