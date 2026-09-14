"use client";

import { apiGet, apiPost } from "./api";

export interface MqUser {
  id: number;
  email: string | null;
  phone: string | null;
  account_type: string;
  status: string;
  roles: string[];
  full_name: string | null;
}

export async function login(email: string, password: string): Promise<MqUser> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.message ?? json?.code ?? "Login gagal");
  }
  return json.user as MqUser;
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
}

export async function me(): Promise<MqUser | null> {
  try {
    return await apiGet<MqUser>("/me");
  } catch {
    return null;
  }
}
