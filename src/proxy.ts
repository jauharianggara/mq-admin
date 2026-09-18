import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL || "https://mq-api.jagodigital.online";

/**
 * Proxy (Next 16 pengganti middleware): semua /api/v1/* di-forward ke BE MQ
 * dengan Authorization di-inject dari HttpOnly cookie `mq_at` (v11: token
 * TIDAK pernah menyentuh JS klien).
 *
 * rev 3.4: AUTO-REFRESH TRANSPARAN — kalau BE balas 401 (access token
 * kedaluwarsa / BE sempat restart) dan ada cookie `mq_rt`, proxy refresh
 * ke /auth/refresh, perbarui cookie, lalu ULANGI request asli. Tidak ada
 * lagi logout otomatis; user hanya diarahkan ke /login kalau refresh
 * token-nya memang sudah mati (30 hari tidak aktif).
 */

const COOKIE_AT = "mq_at";
const COOKIE_RT = "mq_rt";

function cookieOpts(maxAge: number, secure: boolean) {
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

async function tryRefresh(rt: string): Promise<{ at: string; rt: string } | null> {
  try {
    const r = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refresh_token: rt }),
      cache: "no-store",
    });
    if (!r.ok) return null;
    const j = await r.json().catch(() => null);
    const at = j?.data?.access_token;
    if (!at) return null;
    return { at, rt: j.data.refresh_token ?? rt };
  } catch {
    return null;
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const path = pathname.replace(/^\/api\/v1/, "");

  const headers = new Headers(req.headers);
  headers.delete("cookie");
  headers.delete("host");
  // KRITIS: jangan teruskan accept-encoding browser — Cloudflare tunnel bisa membalas
  // zstd/br yang TIDAK otomatis didekompres runtime fetch, sehingga body JSON sampai
  // ke klien sebagai byte terkompresi (json parse gagal diam-diam). Paksa identity.
  headers.delete("accept-encoding");
  const at = req.cookies.get(COOKIE_AT)?.value;
  const rt = req.cookies.get(COOKIE_RT)?.value;
  if (at) headers.set("authorization", `Bearer ${at}`);

  const hasBody = !["GET", "HEAD"].includes(req.method);
  const bodyText = hasBody ? await req.text() : undefined;
  if (bodyText !== undefined) headers.set("content-length", String(Buffer.byteLength(bodyText)));

  let upstream = await fetch(`${API_BASE}/api/v1${path}${search}`, {
    method: req.method,
    headers,
    body: bodyText,
    cache: "no-store",
  });

  const secure = req.nextUrl.protocol === "https:";

  // 401 + ada refresh token + bukan endpoint auth → refresh lalu ulangi SEKALI
  if (upstream.status === 401 && rt && !path.startsWith("/auth/")) {
    const refreshed = await tryRefresh(rt);
    if (refreshed) {
      const retryHeaders = new Headers(headers);
      retryHeaders.set("authorization", `Bearer ${refreshed.at}`);
      upstream = await fetch(`${API_BASE}/api/v1${path}${search}`, {
        method: req.method,
        headers: retryHeaders,
        body: bodyText,
        cache: "no-store",
      });
      const retryRes = new NextResponse(upstream.body, {
        status: upstream.status,
        headers: {
          "content-type": upstream.headers.get("content-type") ?? "application/json",
          "set-cookie": `${COOKIE_AT}=${encodeURIComponent(refreshed.at)}; ${cookieOpts(15 * 60, secure)}`,
        },
      });
      if (refreshed.rt !== rt) {
        retryRes.headers.append(
          "set-cookie",
          `${COOKIE_RT}=${encodeURIComponent(refreshed.rt)}; ${cookieOpts(30 * 86400, secure)}`
        );
      }
      return retryRes;
    }
  }

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/json",
    },
  });
  return res;
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
