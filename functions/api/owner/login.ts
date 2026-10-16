// Cloudflare Pages Function: POST /api/owner/login
import { authenticateOwner, getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { username, password } = body || {};
    const clientIp =
      context.request.headers.get("CF-Connecting-IP") ||
      context.request.headers.get("x-forwarded-for") ||
      "127.0.0.1";

    const res = await authenticateOwner(db, username || "", password || "", clientIp);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error, remainingLockSec: res.remainingLockSec }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, token: res.token }), {
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
