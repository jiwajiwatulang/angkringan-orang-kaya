// Cloudflare Pages Function: /api/owner/licenses
// Commercial License & Device Management Endpoint for Owner
import {
  getD1,
  initD1Tables,
  extractBearerToken,
  listOwnerLicenses,
  unbindOwnerLicense,
  revokeOwnerLicense,
} from "../../../src/lib/server/sakunotaServer";

export async function onRequestGet(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);

    const res = await listOwnerLicenses(db, token);
    return new Response(JSON.stringify(res), {
      status: res.success ? 200 : 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function onRequestPut(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const body = await context.request.json();
    const { action, licenseKey } = body || {};

    if (!licenseKey) {
      return new Response(JSON.stringify({ success: false, error: "Kode lisensi diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "unbind") {
      const res = await unbindOwnerLicense(db, token, licenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "revoke") {
      const res = await revokeOwnerLicense(db, token, licenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Aksi tidak dikenal." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
