import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL || "https://mq-api.jagodigital.online";

/**
 * Proxy (Next 16 pengganti middleware): semua /api/v1/* di-forward ke BE MQ
 * dengan Authorization di-inject dari HttpOnly cookie `mq_at` (v11: token
 * TIDAK pernah menyentuh JS klien).
 */
export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const path = pathname.replace(/^\/api\/v1/, "");

  const headers = new Headers(req.headers);
  headers.delete("cookie");
  headers.delete("host");
  const at = req.cookies.get("mq_at")?.value;
  if (at) headers.set("authorization", `Bearer ${at}`);

  const upstream = await fetch(`${API_BASE}/api/v1${path}${search}`, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : await req.text(),
    cache: "no-store",
  });

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
