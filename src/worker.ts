// Cloudflare Worker Entrypoint with Static Assets & API Routing for SakuNota Production
import * as licenseActivate from "../functions/api/license/activate";
import * as licenseVerify from "../functions/api/license/verify";
import * as ordersCheck from "../functions/api/orders/check";
import * as ordersCreate from "../functions/api/orders/create";
import * as ownerLicenses from "../functions/api/owner/licenses";
import * as ownerLogin from "../functions/api/owner/login";
import * as ownerLogout from "../functions/api/owner/logout";
import * as ownerMetrics from "../functions/api/owner/metrics";
import * as ownerOrders from "../functions/api/owner/orders";
import * as ownerTesterLicense from "../functions/api/owner/tester-license";
import * as ownerVerify from "../functions/api/owner/verify";
import * as ownerBeta from "../functions/api/owner/beta";
import * as betaRegister from "../functions/api/beta/register";
import * as betaStatus from "../functions/api/beta/status";
import * as paymentConfig from "../functions/api/payment/config";
import * as paymentMidtrans from "../functions/api/payment/midtrans";
import * as paymentSnap from "../functions/api/payment/snap";

export interface Env {
  DB: any;
  ASSETS: {
    fetch: (request: Request | string) => Promise<Response>;
  };
  MIDTRANS_SERVER_KEY?: string;
  MIDTRANS_CLIENT_KEY?: string;
  MIDTRANS_MERCHANT_ID?: string;
  SAKUNOTA_OWNER_PASSWORD?: string;
  SAKUNOTA_OWNER_JWT_SECRET?: string;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function withCors(response: Response): Response {
  const newHeaders = new Headers(response.headers);
  const cors = corsHeaders();
  for (const [key, val] of Object.entries(cors)) {
    if (!newHeaders.has(key)) {
      newHeaders.set(key, val);
    }
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const pathname = url.pathname.replace(/\/$/, "");
    const method = request.method.toUpperCase();

    // 1. Handle CORS preflight
    if (method === "OPTIONS" && pathname.startsWith("/api/")) {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    // 2. Handle /api/ routes
    if (pathname.startsWith("/api/")) {
      const context = {
        request,
        env,
        params: {},
        waitUntil: (promise: Promise<any>) => {
          if (ctx && typeof ctx.waitUntil === "function") {
            ctx.waitUntil(promise);
          }
        },
        next: () => env.ASSETS.fetch(request),
        data: {},
      };

      try {
        let response: Response | null = null;

        // Route: /api/payment/config
        if (pathname === "/api/payment/config") {
          if (method === "GET") response = await paymentConfig.onRequestGet(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/payment/snap
        else if (pathname === "/api/payment/snap") {
          if (method === "POST") response = await paymentSnap.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/payment/midtrans
        else if (pathname === "/api/payment/midtrans") {
          if (method === "POST") response = await paymentMidtrans.onRequestPost(context);
          else if (method === "GET") response = await paymentMidtrans.onRequestGet(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/orders/create
        else if (pathname === "/api/orders/create") {
          if (method === "POST") response = await ordersCreate.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/orders/check
        else if (pathname === "/api/orders/check") {
          if (method === "POST") response = await ordersCheck.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/license/activate
        else if (pathname === "/api/license/activate") {
          if (method === "POST") response = await licenseActivate.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/login
        else if (pathname === "/api/owner/login") {
          if (method === "POST") response = await ownerLogin.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/logout
        else if (pathname === "/api/owner/logout") {
          if (method === "POST") response = await ownerLogout.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/verify
        else if (pathname === "/api/owner/verify") {
          if (method === "POST") response = await ownerVerify.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/metrics
        else if (pathname === "/api/owner/metrics") {
          if (method === "GET") response = await ownerMetrics.onRequestGet(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/orders
        else if (pathname === "/api/owner/orders") {
          if (method === "GET") response = await ownerOrders.onRequestGet(context);
          else if (method === "PUT") response = await ownerOrders.onRequestPut(context);
          else if (method === "DELETE") response = await ownerOrders.onRequestDelete(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/licenses
        else if (pathname === "/api/owner/licenses") {
          if (method === "GET") response = await ownerLicenses.onRequestGet(context);
          else if (method === "PUT") response = await ownerLicenses.onRequestPut(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/tester-license
        else if (pathname === "/api/owner/tester-license") {
          if (method === "GET") response = await ownerTesterLicense.onRequestGet(context);
          else if (method === "POST") response = await ownerTesterLicense.onRequestPost(context);
          else if (method === "PUT") response = await ownerTesterLicense.onRequestPut(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/beta
        else if (pathname === "/api/owner/beta") {
          if (method === "GET") response = await ownerBeta.onRequestGet(context);
          else if (method === "POST") response = await ownerBeta.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/beta/register
        else if (pathname === "/api/beta/register") {
          if (method === "POST") response = await betaRegister.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/beta/status
        else if (pathname === "/api/beta/status") {
          if (method === "GET") response = await betaStatus.onRequestGet(context);
          else if (method === "POST") response = await betaStatus.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/license/verify
        else if (pathname === "/api/license/verify") {
          if (method === "POST") response = await licenseVerify.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        if (response) {
          return withCors(response);
        }

        return withCors(
          new Response(JSON.stringify({ success: false, error: "Endpoint not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          })
        );
      } catch (err: any) {
        return withCors(
          new Response(JSON.stringify({ success: false, error: err?.message || "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          })
        );
      }
    }

    // 3. Serve Next.js static assets from ./out via env.ASSETS
    return env.ASSETS.fetch(request);
  },
};
