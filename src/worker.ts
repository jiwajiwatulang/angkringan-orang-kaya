// Cloudflare Worker Entrypoint with Static Assets & API Routing for SakuNota Production
import * as licenseActivate from "../functions/api/license/activate";
import * as licenseVerify from "../functions/api/license/verify";
import * as ordersCheck from "../functions/api/orders/check";
import * as ordersCreate from "../functions/api/orders/create";
import * as ordersUploadProof from "../functions/api/orders/upload-proof";
import * as ownerDevices from "../functions/api/owner/devices";
import * as ownerLicenses from "../functions/api/owner/licenses";
import * as ownerLogin from "../functions/api/owner/login";
import * as ownerLogout from "../functions/api/owner/logout";
import * as ownerMetrics from "../functions/api/owner/metrics";
import * as ownerOrders from "../functions/api/owner/orders";
import * as ownerTesterLicense from "../functions/api/owner/tester-license";
import * as ownerSecrets from "../functions/api/owner/secrets";
import * as ownerVerify from "../functions/api/owner/verify";
import * as ownerBeta from "../functions/api/owner/beta";
import * as betaRegister from "../functions/api/beta/register";
import * as betaStatus from "../functions/api/beta/status";
import * as paymentConfig from "../functions/api/payment/config";
import * as paymentMidtrans from "../functions/api/payment/midtrans";
import * as paymentSnap from "../functions/api/payment/snap";
import * as promoCheck from "../functions/api/promo/check";
import * as ownerPromos from "../functions/api/owner/promos";
import { verifyOwnerSession, getD1 } from './lib/server/sakunotaServer';
import { handleMultiDevice } from './lib/server/multideviceHttp';

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
  SAKUNOTA_SERVER_SECRET?: string;
  SAKUNOTA_OWNER_SALT?: string;
  SAKUNOTA_OWNER_USERNAME?: string;
  SAKUNOTA_LICENSE_PRIVATE_JWK?: string;
  SAKUNOTA_MULTI_DEVICE?: string;
  PUBLIC_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
  MULTI_DEVICE_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
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
  newHeaders.set('Cache-Control', 'no-store');
  newHeaders.set('X-Content-Type-Options', 'nosniff');
  newHeaders.set('Referrer-Policy', 'no-referrer');
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
    if(new URL(request.url).pathname.replace(/\/$/,'')==='/api/store') {
      return handleMultiDevice(request,env);
    }
    if (env) {
      if (env.SAKUNOTA_SERVER_SECRET) process.env.SAKUNOTA_SERVER_SECRET = env.SAKUNOTA_SERVER_SECRET;
      if (env.SAKUNOTA_OWNER_SALT) process.env.SAKUNOTA_OWNER_SALT = env.SAKUNOTA_OWNER_SALT;
      if (env.SAKUNOTA_OWNER_PASSWORD) process.env.SAKUNOTA_OWNER_PASSWORD = env.SAKUNOTA_OWNER_PASSWORD;
      if (env.SAKUNOTA_OWNER_USERNAME) process.env.SAKUNOTA_OWNER_USERNAME = env.SAKUNOTA_OWNER_USERNAME;
      if (env.SAKUNOTA_OWNER_JWT_SECRET) process.env.SAKUNOTA_OWNER_JWT_SECRET = env.SAKUNOTA_OWNER_JWT_SECRET;
      if (env.SAKUNOTA_LICENSE_PRIVATE_JWK) process.env.SAKUNOTA_LICENSE_PRIVATE_JWK = env.SAKUNOTA_LICENSE_PRIVATE_JWK;
    }

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
      const publicAction = /^\/api\/(license|orders|beta|promo)\//.test(pathname) || pathname === '/api/owner/login' || pathname === '/api/payment/snap';
      if (publicAction && env.PUBLIC_RATE_LIMITER) {
        try {
          const result = await env.PUBLIC_RATE_LIMITER.limit({key:`${pathname}:${request.headers.get('CF-Connecting-IP') || 'local'}`});
          if (!result.success) return withCors(Response.json({success:false,error:'Terlalu banyak permintaan. Coba lagi dalam satu menit.'},{status:429,headers:{'Retry-After':'60'}}));
        } catch {
          return withCors(Response.json({success:false,error:'Layanan sementara sibuk. Coba lagi.'},{status:503}));
        }
      }
      // Internal service overloads used by local tests are never an HTTP auth bypass.
      if (pathname.startsWith('/api/owner/') && pathname !== '/api/owner/login' && !/^Bearer\s+\S+\s*$/i.test(request.headers.get('Authorization') || '')) {
        return withCors(Response.json({ success: false, error: 'Sesi Owner diperlukan. Silakan login terlebih dahulu.' }, { status: 401, headers: { 'Cache-Control': 'no-store' } }));
      }
      if (pathname.startsWith('/api/owner/') && pathname !== '/api/owner/login') {
        try {
          const database = getD1(env.DB);
          const token = request.headers.get('Authorization')!.replace(/^Bearer\s+/i, '').trim();
          // Verify cryptographic authenticity before any handler or action is selected.
          const auth = await verifyOwnerSession(database, token);
          if (!auth.valid) return withCors(Response.json({ success: false, error: 'Sesi Owner tidak sah atau telah berakhir.' }, { status: 401 }));
        } catch {
          return withCors(Response.json({ success: false, error: 'Sesi Owner belum dapat diverifikasi.' }, { status: 503 }));
        }
      }
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
          else if (method === "GET") response = await paymentMidtrans.onRequestGet();
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

        // Route: /api/orders/upload-proof
        else if (pathname === "/api/orders/upload-proof") {
          if (method === "POST") response = await ordersUploadProof.onRequestPost(context);
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
        else if (pathname === "/api/owner/devices") {
          response = method === "GET" ? await ownerDevices.onRequestGet(context) : new Response(null, {status:405});
        }
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

        // Route: /api/owner/secrets
        else if (pathname === "/api/owner/secrets") {
          if (method === "GET") response = await ownerSecrets.onRequestGet(context);
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

        // Route: /api/promo/check
        else if (pathname === "/api/promo/check") {
          if (method === "POST") response = await promoCheck.onRequestPost(context);
          else response = new Response(JSON.stringify({ success: false, error: "Method Not Allowed" }), { status: 405 });
        }

        // Route: /api/owner/promos
        else if (pathname === "/api/owner/promos") {
          if (method === "GET") response = await ownerPromos.onRequestGet(context);
          else if (method === "POST") response = await ownerPromos.onRequestPost(context);
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

    // 3. Normalize Next.js App Router RSC prefetch path if generated as nested folder on Windows
    // e.g. /pos/__next.pos.__PAGE__.txt -> /pos/__next.pos/__PAGE__.txt
    let assetRequest = request;
    if (url.pathname.endsWith('.__PAGE__.txt')) {
      const idx = url.pathname.indexOf('/__next.');
      if (idx !== -1) {
        const prefix = url.pathname.substring(0, idx);
        const suffix = url.pathname.substring(idx).replace(/\.__PAGE__\.txt$/, '/__PAGE__.txt');
        const normalizedSuffix = suffix.replace(/(?<=__next)[^/]*\./g, (m) => m.slice(0, -1) + '/');
        const normalizedPath = prefix + normalizedSuffix;
        if (normalizedPath !== url.pathname) {
          const newUrl = new URL(request.url);
          newUrl.pathname = normalizedPath;
          assetRequest = new Request(newUrl.toString(), request);
        }
      }
    }

    try {
      const response = await env.ASSETS.fetch(assetRequest);
      if (response.status === 404 && url.pathname.endsWith('.__PAGE__.txt')) {
        return new Response("", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      const headers = new Headers(response.headers);
      headers.set('X-Content-Type-Options','nosniff');
      headers.set('Referrer-Policy','no-referrer');
      headers.set('X-Frame-Options','DENY');
      headers.set('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; object-src 'none'");
      return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
    } catch (err: any) {
      if (url.pathname.endsWith('.__PAGE__.txt')) {
        return new Response("", {
          status: 200,
          headers: { "Content-Type": "text/plain; charset=utf-8" }
        });
      }
      return new Response("Not Found", { status: 404 });
    }
  },
};
