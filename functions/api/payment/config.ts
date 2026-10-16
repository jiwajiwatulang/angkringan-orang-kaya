// Cloudflare Pages Function: GET /api/payment/config
// Returns the public Client Key dynamically from Cloudflare Environment Variables

export async function onRequestGet(context: any) {
  const clientKey = context.env?.MIDTRANS_CLIENT_KEY || process.env.MIDTRANS_CLIENT_KEY || "";
  const serverKey = context.env?.MIDTRANS_SERVER_KEY || process.env.MIDTRANS_SERVER_KEY || "";
  const isSandbox = serverKey.startsWith("SB-");

  return new Response(
    JSON.stringify({
      success: true,
      clientKey: clientKey,
      isSandbox: isSandbox,
      snapJsUrl: isSandbox
        ? "https://app.sandbox.midtrans.com/snap/snap.js"
        : "https://app.midtrans.com/snap/snap.js",
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
    }
  );
}
