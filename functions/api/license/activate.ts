// Cloudflare Pages Function: POST /api/license/activate
import { getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";
import { extractRequestTelemetry } from "../../../src/lib/server/d1";
import { activateSecureDevice } from '../../../src/lib/server/licenseDeviceAccess';

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { licenseKey, deviceId, deviceName, deviceModel, token, deviceProof } = body || {};

    if (typeof licenseKey !== 'string' || typeof deviceId !== 'string' || !licenseKey.trim() || !deviceId.trim() || !deviceProof || licenseKey.length > 200 || deviceId.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: "Nomor lisensi dan ID perangkat wajib disertakan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const telemetry = extractRequestTelemetry(context.request, deviceModel);
    const res = await activateSecureDevice(db, {
      licenseKey: licenseKey.trim().toUpperCase(),
      deviceId: deviceId.trim(),
      deviceName,
      deviceModel: telemetry.deviceModel || undefined,
      location: telemetry.location || undefined,
      ipAddress: telemetry.ipAddress || undefined,
      token,
      deviceProof,
    });

    return new Response(
      JSON.stringify({
        success: res.success,
        error: res.error,
        activationToken: res.activationToken,
        activatedAt: res.activatedAt,
        licenseType: res.licenseType,
        businessName: res.businessName,
        expiresAt: res.expiresAt,
      }),
      {
        status: res.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
