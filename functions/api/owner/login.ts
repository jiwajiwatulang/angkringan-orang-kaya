// Cloudflare Pages Function: POST /api/owner/login
import { authenticateOwner } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { username, password } = body || {};

    const res = authenticateOwner(username || "", password || "");
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
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
