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

    if (!query.startsWith('REG-') && !query.toUpperCase().startsWith('SN-TRIAL-')) return Response.json({success:false,error:'Gunakan nomor pendaftaran rahasia atau kode trial. Pencarian lewat nomor WhatsApp dinonaktifkan demi privasi.'},{status:400,headers:{'Cache-Control':'no-store'}});
    // These identifiers are receipt secrets; phone numbers are never authentication.
    let reg = await getBetaRegistrationByIdD1(db, query);

    // Try finding by trialLicenseKey
    if (!reg && query.toUpperCase().startsWith("SN-TRIAL-")) {
      reg = await getBetaRegistrationByLicenseKeyD1(db, query.toUpperCase());
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
          status: reg.status,
          activatedAt: reg.activatedAt,
          expiresAt: reg.expiresAt,
          durationDays: reg.durationDays,
          registeredAt: reg.registeredAt,
          rejectionReason: reg.rejectionReason,
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json", 'Cache-Control':'no-store' } }
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
