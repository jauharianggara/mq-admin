import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.API_BASE_URL || "https://mq-api.jagodigital.online";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { code: "unprocessable", message: "email dan password wajib" },
      { status: 422 },
    );
  }

  const upstream = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: body.email, password: body.password }),
    cache: "no-store",
  });

  const data = await upstream.json().catch(() => null);

  if (!upstream.ok || !data?.data?.access_token) {
    return NextResponse.json(
      data ?? { code: "unauthorized", message: "login gagal" },
      { status: upstream.status },
    );
  }

  const res = NextResponse.json({
    user: data.data.user,
    // access token TIDAK dikirim ke klien — hanya cookie HttpOnly (v11)
  });

  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.headers.append(
    "set-cookie",
    `mq_at=${encodeURIComponent(data.data.access_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${15 * 60}${secure}`,
  );
  res.headers.append(
    "set-cookie",
    `mq_rt=${encodeURIComponent(data.data.refresh_token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${30 * 86400}${secure}`,
  );
  return res;
}
