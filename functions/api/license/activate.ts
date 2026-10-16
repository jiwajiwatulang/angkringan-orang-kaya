// Cloudflare Pages Function: POST /api/license/activate
import { activateLicenseOnDevice } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const body = await context.request.json();
    const { licenseKey, deviceId, deviceName } = body || {};

    if (!licenseKey || !deviceId) {
      return new Response(
        JSON.stringify({ success: false, error: "Nomor lisensi dan ID perangkat wajib disertakan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const res = activateLicenseOnDevice({ licenseKey, deviceId, deviceName });

    return new Response(
      JSON.stringify({
        success: res.success,
        error: res.error,
        activationToken: res.activationToken,
        activatedAt: res.activatedAt,
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
