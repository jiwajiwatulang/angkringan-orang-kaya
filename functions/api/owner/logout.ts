// Cloudflare Pages Function: POST /api/owner/logout
import { revokeOwnerSession } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const authHeader = context.request.headers.get("Authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    const res = revokeOwnerSession(token);
    return new Response(JSON.stringify(res), {
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
