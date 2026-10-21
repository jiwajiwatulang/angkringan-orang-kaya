// Cloudflare Pages Function: POST /api/promo/check
// Public endpoint for checking validity of promo codes and previewing discounts
import { getD1, initD1Tables, validatePromoCode } from "../../../src/lib/server/sakunotaServer";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json().catch(() => ({}));
    const { code } = body || {};

    if (!code || typeof code !== "string" || !code.trim()) {
      return new Response(
        JSON.stringify({ valid: false, error: "Kode promo tidak boleh kosong." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const res = await validatePromoCode(db, code);
    return new Response(JSON.stringify(res), {
      status: res.valid ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(
      JSON.stringify({ valid: false, error: e.message || "Gagal memeriksa kode promo." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
