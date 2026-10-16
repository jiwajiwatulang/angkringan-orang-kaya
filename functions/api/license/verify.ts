// Cloudflare Pages Function: POST /api/license/verify
import { getD1, initD1Tables, verifyDeviceLicense } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { licenseKey, deviceId, token } = body || {};

    if (!licenseKey) {
      return new Response(JSON.stringify({ valid: false, status: "unregistered", error: "Nomor lisensi diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await verifyDeviceLicense(db, { licenseKey, deviceId, token });

    return new Response(JSON.stringify(res), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ valid: false, status: "unregistered", error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
