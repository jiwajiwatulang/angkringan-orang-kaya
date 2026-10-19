// Cloudflare Pages Function: POST /api/license/verify
import { getD1, initD1Tables, verifyDeviceLicense } from "../../../src/lib/server/sakunotaServer";
import { verifySecureDevice } from '../../../src/lib/server/licenseDeviceAccess';

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { licenseKey, deviceId, token, deviceProof } = body || {};

    if (typeof licenseKey !== 'string' || typeof deviceId !== 'string' || typeof token !== 'string' || !licenseKey.trim() || !deviceId.trim() || !token || !deviceProof || licenseKey.length > 200 || deviceId.length > 200 || token.length > 8192) {
      return new Response(JSON.stringify({ valid: false, status: "unregistered", error: "Nomor lisensi diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await verifySecureDevice(db, { licenseKey:licenseKey.trim().toUpperCase(), deviceId:deviceId.trim(), token, deviceProof });

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
