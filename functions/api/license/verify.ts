// Cloudflare Pages Function: POST /api/license/verify
import { getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";
import { extractRequestTelemetry } from "../../../src/lib/server/d1";
import { verifySecureDevice } from '../../../src/lib/server/licenseDeviceAccess';

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { licenseKey, deviceId, deviceModel, token, deviceProof } = body || {};

    if (typeof licenseKey !== 'string' || typeof deviceId !== 'string' || typeof token !== 'string' || !licenseKey.trim() || !deviceId.trim() || !token || !deviceProof || licenseKey.length > 200 || deviceId.length > 200 || token.length > 8192) {
      return new Response(JSON.stringify({ valid: false, status: "unregistered", error: "Nomor lisensi diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const telemetry = extractRequestTelemetry(context.request, deviceModel);
    const res = await verifySecureDevice(db, {
      licenseKey: licenseKey.trim().toUpperCase(),
      deviceId: deviceId.trim(),
      deviceModel: telemetry.deviceModel || undefined,
      location: telemetry.location || undefined,
      ipAddress: telemetry.ipAddress || undefined,
      token,
      deviceProof,
    });

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
