// Cloudflare Pages Function: /api/owner/promos
// Owner portal endpoint for managing promo codes and discount vouchers
import {
  getD1,
  initD1Tables,
  extractBearerToken,
  listOwnerPromos,
  createOwnerPromo,
  toggleOwnerPromo,
  deleteOwnerPromo,
} from "../../../src/lib/server/sakunotaServer";

export async function onRequestGet(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);

    const res = await listOwnerPromos(db, token);
    return new Response(JSON.stringify(res), {
      status: res.success ? 200 : 401,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message || "Gagal memuat kode promo." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);

    const body = await context.request.json().catch(() => ({}));
    const { action } = body || {};

    if (!action) {
      return new Response(
        JSON.stringify({ success: false, error: "Aksi diperlukan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "create") {
      const { code, discountType, discountValue, description, maxUsage } = body;
      const res = await createOwnerPromo(db, token, {
        code,
        discountType,
        discountValue,
        description,
        maxUsage,
      });
      return new Response(JSON.stringify(res), {
        status: res.success ? 201 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "toggle") {
      const { id, active } = body;
      const res = await toggleOwnerPromo(db, token, id, active);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "delete") {
      const { id } = body;
      const res = await deleteOwnerPromo(db, token, id);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ success: false, error: "Aksi tidak dikenali." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message || "Gagal memproses permintaan." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
