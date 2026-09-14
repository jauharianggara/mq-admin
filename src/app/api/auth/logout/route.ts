import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ logged_out: true });
  res.headers.append("set-cookie", "mq_at=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  res.headers.append("set-cookie", "mq_rt=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return res;
}
