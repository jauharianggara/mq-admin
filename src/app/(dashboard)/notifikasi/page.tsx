import NotifikasiClient from "./client";

/// force-dynamic: halaman ini murni form admin (client) — jangan di-prerender/ISR,
/// supaya HTML lama dengan referensi chunk lama tidak pernah tersaji setelah deploy.
export const dynamic = "force-dynamic";

export default function NotifikasiPage() {
  return <NotifikasiClient />;
}
