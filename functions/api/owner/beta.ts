// Cloudflare Pages Function: /api/owner/beta
import {
  getD1,
  initD1Tables,
  extractBearerToken,
  listBetaRegistrations,
  approveBetaRegistration,
  rejectBetaRegistration,
  extendBetaTrial,
  revokeBetaTrial,
  unbindBetaTrialDevice,
  convertBetaTrialToPaid,
} from "../../../src/lib/server/sakunotaServer";

export async function onRequestGet(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);

    const res = await listBetaRegistrations(db, token);
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

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const body = await context.request.json();
    const { action, registrationId, trialLicenseKey, extraDays, reason } = body || {};

    if (!action) {
      return new Response(JSON.stringify({ success: false, error: "Aksi diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const res = await approveBetaRegistration(db, token, registrationId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "reject") {
      const res = await rejectBetaRegistration(db, token, registrationId, reason);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "extend") {
      const res = await extendBetaTrial(db, token, registrationId, extraDays, reason);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "revoke") {
      const res = await revokeBetaTrial(db, token, trialLicenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "unbind") {
      const res = await unbindBetaTrialDevice(db, token, trialLicenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "convert") {
      const res = await convertBetaTrialToPaid(db, token, registrationId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Aksi tidak dikenali." }), {
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
