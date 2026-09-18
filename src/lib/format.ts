/** Format bersama seluruh admin — JANGAN definisikan rp()/fmt() lokal di page. */

export function rp(n: number | null | undefined): string {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

/** ISO -> "17 Sep 2026, 21.45" */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

/** ISO -> "17 Sep 2026" */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("id-ID", { dateStyle: "medium" });
}

/** "2026-09-17" (input date) -> "17 Sep 2026" */
export function fmtDateInput(s?: string | null): string {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return s;
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d} ${bulan[m - 1]} ${y}`;
}
