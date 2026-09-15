/** API client — semua via proxy /api/v1 (token di-inject HttpOnly server-side). */

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 401) {
    // rev 3.4: TIDAK mengusir user ke /login otomatis (proxy auto-refresh menangani
    // token kedaluwarsa). Error ditampilkan sebagai pesan; user tetap di halaman.
    throw new ApiError("unauthorized", "Sesi berakhir — silakan muat ulang halaman", 401);
  }

  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.code ?? "error", json?.message ?? `Gagal (${res.status})`, res.status);
  }
  // envelope { data, meta } -> data (meta dikembalikan lewat fetchList)
  return json?.data as T;
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>("GET", path);
}

export async function apiGetPage<T>(
  path: string,
  params?: Record<string, string | number | undefined | null>,
): Promise<{ items: T[]; nextCursor: string | null; hasMore: boolean }> {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== "") qs.set(k, String(v));
  }
  const q = qs.toString();
  const res = await fetch(`/api/v1${path}${q ? `?${q}` : ""}`, {
    headers: { "content-type": "application/json" },
    cache: "no-store",
  });
  if (res.status === 401) {
    throw new ApiError("unauthorized", "Sesi berakhir — silakan muat ulang halaman", 401);
  }
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(json?.code ?? "error", json?.message ?? `Gagal (${res.status})`, res.status);
  }
  return {
    items: (json?.data ?? []) as T[],
    nextCursor: json?.meta?.pagination?.next_cursor ?? null,
    hasMore: Boolean(json?.meta?.pagination?.has_more),
  };
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("POST", path, body);
}
export function apiPut<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("PUT", path, body);
}
export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>("PATCH", path, body);
}
export function apiDelete<T>(path: string): Promise<T> {
  return request<T>("DELETE", path);
}
