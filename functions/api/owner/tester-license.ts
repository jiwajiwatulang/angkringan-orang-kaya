// Cloudflare Pages Function: /api/owner/tester-license
import {
  getD1,
  initD1Tables,
  createTesterLicense,
  listTesterLicenses,
  revokeTesterLicense,
  unbindTesterLicense,
  extractBearerToken,
} from "../../../src/lib/server/sakunotaServer";

export async function onRequestGet(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const auth = context.request.headers.get("authorization") || "";
    const token = extractBearerToken(auth);

    const res = await listTesterLicenses(db, token);
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

    const auth = context.request.headers.get("authorization") || "";
    const token = extractBearerToken(auth);
    const body = await context.request.json();

    const res = await createTesterLicense(db, token, body);
    return new Response(JSON.stringify(res), {
      status: res.success ? 201 : 400,
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

    const auth = context.request.headers.get("authorization") || "";
    const token = extractBearerToken(auth);
    const body = await context.request.json();
    const { action, licenseKey } = body || {};

    if (!licenseKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Nomor lisensi wajib diisi." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "unbind") {
      const res = await unbindTesterLicense(db, token, licenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "revoke") {
      const res = await revokeTesterLicense(db, token, licenseKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: "Aksi tidak dikenali." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
