// Cloudflare Pages Function: POST /api/orders/upload-proof
import { getD1, initD1Tables, updateOrderProofD1 } from "../../../src/lib/server/sakunotaServer";
import { getOrderByIdD1 } from "../../../src/lib/server/d1";

export async function onRequestPost(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const body = await context.request.json();
    const { orderId, accessCode, transferProofName, transferProofData } = body || {};

    if (!orderId || !accessCode || !transferProofData) {
      return new Response(
        JSON.stringify({ success: false, error: "Order ID, kode akses, dan data foto bukti transfer wajib dilampirkan." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const order = await getOrderByIdD1(db, orderId.trim());
    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Pesanan tidak ditemukan." }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Verify access code
    if (order.accessCode.toUpperCase() !== accessCode.trim().toUpperCase()) {
      return new Response(
        JSON.stringify({ success: false, error: "Kode akses rahasia tidak cocok." }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    const updatedOrder = await updateOrderProofD1(
      db,
      order.orderId,
      transferProofName || "bukti_transfer.jpg",
      transferProofData
    );

    return new Response(
      JSON.stringify({ success: true, order: updatedOrder }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ success: false, error: e.message || "Gagal mengunggah bukti transfer." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
