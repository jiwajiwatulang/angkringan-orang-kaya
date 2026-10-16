// Cloudflare Pages Function: GET/POST /api/beta/status
import { getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";
import { getBetaRegistrationByIdD1, getBetaRegistrationByWhatsappD1, getBetaRegistrationByLicenseKeyD1 } from "../../../src/lib/server/d1";

export async function onRequest(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const url = new URL(context.request.url);
    let query = url.searchParams.get("q") || url.searchParams.get("registrationId") || url.searchParams.get("whatsapp") || "";

    if (!query && context.request.method === "POST") {
      try {
        const body = await context.request.json();
        query = body?.q || body?.registrationId || body?.whatsapp || body?.trialLicenseKey || "";
      } catch (_) {}
    }

    query = query.trim();
    if (!query) {
      return new Response(JSON.stringify({ success: false, error: "Parameter pencarian diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Try finding by registrationId
    let reg = await getBetaRegistrationByIdD1(db, query);

    // Try finding by trialLicenseKey
    if (!reg && query.toUpperCase().startsWith("SN-TRIAL-")) {
      reg = await getBetaRegistrationByLicenseKeyD1(db, query.toUpperCase());
    }

    // Try finding by WhatsApp
    if (!reg) {
      const cleanPhone = query.replace(/^0/, "62").replace(/[^0-9]/g, "");
      reg = await getBetaRegistrationByWhatsappD1(db, cleanPhone) || await getBetaRegistrationByWhatsappD1(db, query);
    }

    if (!reg) {
      return new Response(JSON.stringify({ success: false, error: "Data pendaftaran tidak ditemukan." }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        registration: {
          registrationId: reg.registrationId,
          businessName: reg.businessName,
          status: reg.status,
          trialLicenseKey: reg.status === "disetujui" || reg.status === "dikonversi_berbayar" ? reg.trialLicenseKey : undefined,
          boundDeviceId: reg.boundDeviceId,
          activatedAt: reg.activatedAt,
          expiresAt: reg.expiresAt,
          durationDays: reg.durationDays,
          registeredAt: reg.registeredAt,
          rejectionReason: reg.rejectionReason,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const onRequestGet = onRequest;
export const onRequestPost = onRequest;
