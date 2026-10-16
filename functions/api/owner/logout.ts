// Cloudflare Pages Function: POST /api/owner/logout
import { revokeOwnerSession, extractBearerToken, getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);

    const res = await revokeOwnerSession(db, token);
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
