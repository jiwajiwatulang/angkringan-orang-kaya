// Cloudflare Pages Function: GET /api/owner/orders
import { listOwnerOrders, extractBearerToken, getD1, initD1Tables } from "../../../src/lib/server/sakunotaServer";

export async function onRequestGet(context: any) {
  try {
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);

    const res = await listOwnerOrders(db, token);
    if (!res.success) {
      return new Response(JSON.stringify({ success: false, error: res.error }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, orders: res.orders }), {
      status: 200,
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
    const { getD1, initD1Tables, extractBearerToken, cancelOwnerOrder, archiveOwnerOrder } = await import("../../../src/lib/server/sakunotaServer");
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const body = await context.request.json();
    const { action, orderId } = body || {};

    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: "Nomor pesanan diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "cancel") {
      const res = await cancelOwnerOrder(db, token, orderId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "archive") {
      const res = await archiveOwnerOrder(db, token, orderId);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (action === "sync_midtrans") {
      const { syncMidtransOrderStatus } = await import("../../../src/lib/server/sakunotaServer");
      const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY;
      const res = await syncMidtransOrderStatus(db, orderId, serverKey);
      return new Response(JSON.stringify(res), {
        status: res.success ? 200 : 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: false, error: "Aksi tidak dikenal." }), {
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

export async function onRequestDelete(context: any) {
  try {
    const { getD1, initD1Tables, extractBearerToken, deleteOwnerTestOrder } = await import("../../../src/lib/server/sakunotaServer");
    const db = getD1(context.env?.DB);
    await initD1Tables(db);

    const authHeader = context.request.headers.get("Authorization") || "";
    const token = extractBearerToken(authHeader);
    const body = await context.request.json().catch(() => ({}));
    const { orderId, auditNote, passwordConfirm } = body || {};

    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: "Nomor pesanan diperlukan." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const res = await deleteOwnerTestOrder(db, token, orderId, auditNote, passwordConfirm);
    return new Response(JSON.stringify(res), {
      status: res.success ? 200 : 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ success: false, error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

