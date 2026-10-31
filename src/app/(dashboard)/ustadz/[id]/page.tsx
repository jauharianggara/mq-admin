"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  Ban,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { apiGet, apiGetPage, apiPatch, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber, AnimatedRupiah } from "@/components/animated-rupiah";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Slot {
  id: number;
  weekday: number;
  start_minute: number;
  end_minute: number;
}

interface Payout {
  id: number;
  amount: number;
  fee: number;
  bank_name: string;
  account_no: string;
  account_name: string;
  status: string;
  created_at: string;
}

interface Ustadz {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  bio: string | null;
  pendidikan: string | null;
  last_login_at: string | null;
  verified_at: string | null;
  is_accepting: boolean;
  price_per_hour: number | null;
  rating_avg: number | null;
  rating_count: number;
  saldo_penghasilan: number;
  slots: Slot[];
  blackouts: { off_date: string; note: string | null }[];
  payouts: Payout[];
}

interface VisitRow {
  id: number;
  status: string;
  scheduled_at: string;
  duration_hours: number;
  price_total: number;
  requester: { full_name: string } | null;
}

const statusVariant: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
  DEACTIVATED: "bg-gray-100 text-gray-600",
};

const visitStatusColor: Record<string, string> = {
  REQUESTED: "bg-sky-100 text-sky-700",
  WAITING_CONFIRM: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  REVIEWED: "bg-purple-100 text-purple-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-200 text-gray-700",
  PAYMENT_EXPIRED: "bg-gray-200 text-gray-600",
};

const payoutStatusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-sky-100 text-sky-700",
  TRANSFERRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const hariPendek = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function mm(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

const inisial = (nama: string | null | undefined) =>
  (nama ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "–";

/** 089123… → https://wa.me/6289123… (null bila bukan nomor valid) */
function waLink(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length < 8) return null;
  return `https://wa.me/${d.startsWith("0") ? `62${d.slice(1)}` : d}`;
}

/** "CIMB Niaga" → "CIMB"; "BSI" → "BSI" */
function inisialBank(nama: string) {
  const kata = nama.trim().split(/\s+/);
  if (kata.length > 1) return kata.map((k) => k[0]).join("").slice(0, 3).toUpperCase();
  return nama.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase() || "BK";
}

export default function UstadzDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [u, setU] = useState<Ustadz | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [cari, setCari] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await apiGet<Ustadz>(`/admin/ustadz/${id}`);
      setU(d);
      const v = await apiGetPage<VisitRow>("/admin/visits", { ustadz_id: id, limit: 10 }).catch(() => ({ items: [], nextCursor: null, hasMore: false }));
      setVisits(v.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat ustadz");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // satu frame berikutnya — aturan react-hooks melarang setState sinkron di body effect
    const raf = requestAnimationFrame(() => {
      if (id) load();
    });
    return () => cancelAnimationFrame(raf);
  }, [id, load]);

  const visitsTampil = useMemo(
    () =>
      cari.trim() === ""
        ? visits
        : visits.filter((v) => (v.requester?.full_name ?? "").toLowerCase().includes(cari.trim().toLowerCase())),
    [visits, cari],
  );

  async function setStatus(newStatus: string) {
    if (!u) return;
    if (!confirm(`Ubah status ${u.full_name} menjadi ${newStatus}?`)) return;
    setBusy(true);
    try {
      await apiPatch(`/admin/users/${u.id}`, { status: newStatus });
      toast.success(`Status → ${newStatus}`);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  async function setVerified(verified: boolean) {
    if (!u) return;
    if (!confirm(verified
      ? `Verifikasi ${u.full_name} sebagai ustadz? Akun mendapat role USTADZ dan akan muncul di pencarian santri.`
      : `Batalkan verifikasi ${u.full_name}? Ustadz tidak lagi muncul di pencarian santri.`)) return;
    setBusy(true);
    try {
      await apiPost(`/admin/ustadz/${u.id}/verify`, { verified });
      toast.success(verified ? "Ustadz terverifikasi" : "Verifikasi dibatalkan");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!u) return;
    const pw = prompt(`Kata sandi baru untuk ${u.full_name} (min. 8 karakter):`);
    if (pw === null) return;
    if (pw.length < 8) {
      toast.error("Kata sandi minimal 8 karakter");
      return;
    }
    if (!confirm(`Reset kata sandi ${u.full_name}? Semua sesi perangkatnya akan dipaksa keluar.`)) return;
    setBusy(true);
    try {
      await apiPatch(`/admin/users/${u.id}`, { password: pw });
      toast.success("Kata sandi direset — sampaikan kata sandi baru ke pengguna");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  function salinEmail() {
    if (!u?.email) return;
    navigator.clipboard
      .writeText(u.email)
      .then(() => toast.success("Email disalin"))
      .catch(() => toast.error("Gagal menyalin"));
  }

  const wa = waLink(u?.phone ?? null);
  const hariAktif = u ? new Set(u.slots.map((s) => s.weekday)) : new Set<number>();
  const pendingPayout = u ? u.payouts.filter((p) => p.status === "PENDING").length : 0;

  return (
    <div className="@container mx-auto max-w-5xl space-y-5">
      {/* Header: kembali + identitas + status + muat ulang */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="mt-0.5" onClick={() => router.back()} title="Kembali">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {u?.full_name ?? "Ustadz"} #{id}
              </h1>
              {u?.verified_at && (
                <Badge variant="secondary" className="gap-1 border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-300">
                  <BadgeCheck className="size-3.5" /> Terverifikasi
                </Badge>
              )}
              {u && (
                <Badge variant="secondary" className={statusVariant[u.status] ?? ""}>
                  {u.status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Detail ustadz — profil, layanan &amp; tarif, ketersediaan jadwal, penghasilan &amp; kunjungan</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={load} title="Muat ulang">
          <RefreshCw className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !u ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Ustadz tidak ditemukan.</div>
      ) : (
        <>
          {/* ===== Ringkasan KPI ===== */}
          <section className="grid grid-cols-1 gap-3.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 sm:grid-cols-2 @[900px]:grid-cols-4">
            <KpiCard label="Saldo Tersedia" icon={<Wallet className="size-4" />} tone="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40">
              <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
                <AnimatedRupiah value={u.saldo_penghasilan} animateOnMount className="whitespace-nowrap" />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                {pendingPayout > 0 ? (
                  <>
                    <span className="whitespace-nowrap rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                      {pendingPayout} Menunggu ACC
                    </span>
                    <span className="text-muted-foreground">Penarikan aktif</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">Tidak ada penarikan aktif</span>
                )}
              </div>
            </KpiCard>
            <KpiCard label="Infaq / Tarif Jam" icon={<Coins className="size-4" />} tone="bg-blue-50 text-blue-600 dark:bg-blue-950/40">
              <div className="text-2xl font-extrabold tracking-tight">
                {u.price_per_hour ? <AnimatedRupiah value={u.price_per_hour} animateOnMount className="whitespace-nowrap" /> : <span className="text-muted-foreground">Belum diatur</span>}
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold">
                {u.is_accepting ? (
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" /> Aktif di pencarian santri
                  </span>
                ) : (
                  <span className="text-muted-foreground">Nonaktif — tidak muncul di pencarian</span>
                )}
              </div>
            </KpiCard>
            <KpiCard label="Total Kunjungan" icon={<BookOpen className="size-4" />} tone="bg-purple-50 text-purple-600 dark:bg-purple-950/40">
              <div className="text-2xl font-extrabold tracking-tight">
                <AnimatedNumber value={visits.length} animateOnMount />{" "}
                <span className="text-sm font-semibold text-muted-foreground">Sesi</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Star className="size-3.5 text-amber-500" />
                <span>
                  {u.rating_count > 0
                    ? `Rating ${u.rating_avg?.toFixed(1)} (${u.rating_count} ulasan)`
                    : "Belum ada ulasan"}
                </span>
              </div>
            </KpiCard>
            <KpiCard label="Ketersediaan" icon={<CalendarDays className="size-4" />} tone="bg-teal-50 text-teal-600 dark:bg-teal-950/40">
              <div className="text-2xl font-extrabold tracking-tight">
                <AnimatedNumber value={hariAktif.size} animateOnMount />{" "}
                <span className="text-sm font-semibold text-muted-foreground">Hari Aktif</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium">
                {u.slots.length > 0 ? (
                  <span className="flex items-center gap-1 text-teal-700 dark:text-teal-400">
                    <span className="size-1.5 rounded-full bg-teal-500" /> Jadwal reguler siap dipesan santri
                  </span>
                ) : (
                  <span className="text-muted-foreground">Belum mengatur ketersediaan</span>
                )}
              </div>
            </KpiCard>
          </section>

          {/* ===== Profil & data pribadi ===== */}
          <section className="rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:75ms]">
            <div className="flex items-center justify-between gap-3 border-b p-5 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <User className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold">Profil &amp; Data Pribadi</h2>
                  <p className="text-xs text-muted-foreground">Informasi identitas dan autentikasi akun ustadz</p>
                </div>
              </div>
              <span className="whitespace-nowrap rounded-md border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                ID Akun: #{u.id}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-x-8 p-5 md:grid-cols-2">
              <DetailRow icon={<Mail className="size-4" />} label="Email">
                {u.email ? (
                  <span className="flex items-center gap-1">
                    <span className="break-all font-medium">{u.email}</span>
                    <button
                      onClick={salinEmail}
                      title="Salin email"
                      aria-label={`Salin email ${u.email}`}
                      className="shrink-0 rounded p-1 text-muted-foreground transition hover:text-foreground"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="italic text-muted-foreground">-</span>
                )}
              </DetailRow>
              <DetailRow icon={<Phone className="size-4" />} label="Telepon / WhatsApp">
                {u.phone ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold">{u.phone}</span>
                    {wa && (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener"
                        className="shrink-0 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 transition hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                      >
                        WA
                      </a>
                    )}
                  </span>
                ) : (
                  <span className="italic text-muted-foreground">-</span>
                )}
              </DetailRow>
              <DetailRow icon={<MapPin className="size-4" />} label="Kota Domisili">
                {u.city ?? <span className="italic text-muted-foreground">- (Belum diatur)</span>}
              </DetailRow>
              <DetailRow icon={<BadgeCheck className="size-4" />} label="Pendidikan Terakhir">
                {u.pendidikan ? (
                  <span className="whitespace-nowrap rounded bg-muted px-2.5 py-0.5 text-xs font-bold">{u.pendidikan}</span>
                ) : (
                  <span className="italic text-muted-foreground">-</span>
                )}
              </DetailRow>
              <DetailRow icon={<CalendarDays className="size-4" />} label="Terverifikasi Pada">
                <span className="font-medium">{u.verified_at ? fmt(u.verified_at) : <span className="italic text-muted-foreground">Belum terverifikasi</span>}</span>
              </DetailRow>
              <DetailRow icon={<Clock className="size-4" />} label="Login Terakhir">
                <span className="font-medium">{fmt(u.last_login_at)}</span>
              </DetailRow>
              {u.bio && (
                <div className="md:col-span-2">
                  <p className="mt-2 border-t pt-3 text-sm text-muted-foreground">{u.bio}</p>
                </div>
              )}
            </div>
          </section>

          {/* ===== Layanan ngaji & keuangan ===== */}
          <section className="rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:150ms]">
            <div className="flex flex-col justify-between gap-3 border-b p-5 pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <Coins className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold">Layanan Ngaji &amp; Keuangan</h2>
                  <p className="text-xs text-muted-foreground">Tarif bimbingan, saldo penghasilan, dan mutasi penarikan dana</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold sm:self-auto ${
                  u.is_accepting
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                <span className={`size-2 rounded-full ${u.is_accepting ? "bg-emerald-500 motion-safe:animate-pulse" : "bg-muted-foreground"}`} />
                {u.is_accepting ? "Menerima Pesanan" : "Tidak Menerima Pesanan"}
              </span>
            </div>
            <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-12">
              <div className="space-y-4 md:col-span-5">
                <div className="grid grid-cols-2 gap-3.5 rounded-xl border bg-muted/30 p-4">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Infaq per Jam</p>
                    <p className="mt-0.5 text-lg font-bold">{u.price_per_hour ? rp(u.price_per_hour) : "Belum diatur"}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">Rating Santri</p>
                    <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      <Star className="size-3.5 text-amber-500" />
                      {u.rating_count > 0 ? `${u.rating_avg?.toFixed(1)} (${u.rating_count} ulasan)` : "Belum ada"}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-4 dark:border-emerald-900 dark:from-emerald-950/30 dark:to-teal-950/20">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Saldo Tersimpan</p>
                  <div className="text-3xl font-black tracking-tight text-emerald-700 dark:text-emerald-300">
                    <AnimatedRupiah value={u.saldo_penghasilan} />
                  </div>
                  <p className="mt-1 text-[11px] text-emerald-600 dark:text-emerald-400">Dapat dicairkan ke rekening bank terdaftar</p>
                </div>
              </div>
              <div className="flex flex-col justify-between md:col-span-7">
                <div>
                  <div className="mb-2.5 flex items-center justify-between text-xs font-semibold text-muted-foreground">
                    <span>Penarikan Rekening Terakhir</span>
                    <span className="font-normal">{Math.min(u.payouts.length, 2)} Penarikan Terbaru</span>
                  </div>
                  {u.payouts.length === 0 ? (
                    <p className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">Belum ada pengajuan penarikan.</p>
                  ) : (
                    <div className="space-y-2 text-xs">
                      {u.payouts.slice(0, 2).map((p) => (
                        <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                          <div className="flex items-center gap-3">
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-[10px] font-bold text-red-700 dark:bg-red-950/40 dark:text-red-300">
                              {inisialBank(p.bank_name)}
                            </span>
                            <div>
                              <p className="font-semibold">
                                #{p.id} {p.bank_name} {p.account_no}
                              </p>
                              <p className="text-[11px] text-muted-foreground">a.n. {p.account_name}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <AnimatedRupiah value={p.amount} animateOnMount className="font-bold" />
                            <Badge variant="secondary" className={`mt-0.5 text-[10px] ${payoutStatusColor[p.status] ?? ""}`}>
                              {p.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end border-t p-5 pt-3.5">
              <Button variant="link" className="h-auto p-0 text-xs font-semibold" render={<Link href="/payouts" />}>
                Kelola Penarikan &amp; Rekening
              </Button>
            </div>
          </section>

          {/* ===== Ketersediaan mingguan & libur ===== */}
          <section className="rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:225ms]">
            <div className="flex flex-col justify-between gap-3 border-b p-5 pb-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
                  <CalendarDays className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold">Ketersediaan Mingguan &amp; Tanggal Libur</h2>
                  <p className="text-xs text-muted-foreground">Jadwal operasional yang dapat dipesan oleh santri</p>
                </div>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-full border px-3 py-1 text-xs font-semibold sm:self-auto ${
                  hariAktif.size === 7
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {hariAktif.size === 7 ? (
                  <>
                    <CheckCircle2 className="size-3.5" /> Tersedia Penuh (7 Hari)
                  </>
                ) : (
                  <>Aktif {hariAktif.size} dari 7 Hari</>
                )}
              </span>
            </div>
            <div className="p-5">
              {u.slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum mengatur ketersediaan — santri tidak dapat memesan ustadz ini.</p>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 @[1000px]:grid-cols-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const rows = u.slots.filter((s) => s.weekday === d);
                    return (
                      <div key={d} className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 rounded-xl border bg-muted/30 p-3.5 transition-colors hover:bg-muted/50">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold ${
                              d === 0
                                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300"
                                : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                            }`}
                          >
                            {hariPendek[d]}
                          </span>
                          <span className="text-sm font-semibold">{hari[d]}</span>
                        </div>
                        {rows.length > 0 ? (
                          <span className="whitespace-nowrap rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 font-mono text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            {rows.map((s) => `${mm(s.start_minute)}–${mm(s.end_minute)}`).join(", ")}
                          </span>
                        ) : (
                          <span className="rounded-md border bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Libur</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {u.blackouts.length > 0 && (
                <div className="mt-4 border-t pt-3">
                  <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Tanggal libur</p>
                  <div className="flex flex-wrap gap-1.5">
                    {u.blackouts.map((b) => (
                      <Badge key={b.off_date} className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        {b.off_date}
                        {b.note ? ` · ${b.note}` : ""}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ===== Kunjungan ditangani ===== */}
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:300ms]">
            <div className="flex flex-col justify-between gap-3 border-b p-5 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                  <BookOpen className="size-4" />
                </span>
                <div>
                  <h2 className="text-base font-bold">Kunjungan Ditangani (Terakhir)</h2>
                  <p className="text-xs text-muted-foreground">Daftar riwayat bimbingan mengaji bersama santri</p>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <input
                  value={cari}
                  onChange={(e) => setCari(e.target.value)}
                  placeholder="Cari santri…"
                  className="h-9 w-full rounded-lg border bg-background pl-8 pr-3 text-xs outline-none focus:ring-2 focus:ring-ring sm:w-44"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead>Santri</TableHead>
                    <TableHead>Jadwal Bimbingan</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead className="text-right">Total Biaya</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitsTampil.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        {visits.length === 0 ? "Belum ada kunjungan." : "Tidak ada kunjungan sesuai pencarian."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    visitsTampil.map((v, i) => (
                      <TableRow key={v.id} className="row-accent hover:bg-muted/50">
                        <TableCell className="text-center font-mono text-muted-foreground">{i + 1}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-2">
                            <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                              {inisial(v.requester?.full_name)}
                            </span>
                            {v.requester?.full_name ?? "-"}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">{fmt(v.scheduled_at)}</TableCell>
                        <TableCell>{v.duration_hours} jam</TableCell>
                        <TableCell className="text-right font-semibold">{rp(v.price_total)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={visitStatusColor[v.status] ?? ""}>
                            {v.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button size="sm" variant="outline" render={<Link href={`/visits/${v.id}`} />}>
                            Buka
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="border-t bg-muted/30 p-4 text-xs text-muted-foreground">
              Menampilkan <b className="text-foreground">{visitsTampil.length}</b> dari {visits.length} riwayat kunjungan terakhir
            </div>
          </section>

          {/* ===== Tindakan admin ===== */}
          <section className="rounded-xl border border-red-200 bg-card p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:375ms] dark:border-red-900/50">
            <div className="mb-2 flex items-center gap-2.5">
              <span className="flex size-8 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-300">
                <ShieldAlert className="size-4" />
              </span>
              <div>
                <h2 className="text-base font-bold">Tindakan Admin</h2>
                <p className="text-xs text-muted-foreground">Kelola status operasional akun, verifikasi, dan kredensial akses ustadz</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t pt-4">
              {u.status === "ACTIVE" ? (
                <Button
                  variant="destructive"
                  disabled={busy}
                  onClick={() => setStatus("SUSPENDED")}
                  className="border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                >
                  <Ban className="size-4" /> Suspend Akun
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => setStatus("ACTIVE")}>
                  <CheckCircle2 className="size-4" /> Aktifkan akun
                </Button>
              )}
              {u.verified_at ? (
                <Button variant="outline" disabled={busy} onClick={() => setVerified(false)}>
                  <XCircle className="size-4" /> Batalkan Verifikasi
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => setVerified(true)}>
                  <BadgeCheck className="size-4" /> Verifikasi Ustadz
                </Button>
              )}
              <Button variant="outline" disabled={busy} onClick={resetPassword}>
                <KeyRound className="size-4" /> Reset Kata Sandi
              </Button>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function KpiCard({
  label,
  icon,
  tone,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  tone: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-lg ${tone}`}>{icon}</span>
      </div>
      {children}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="@container border-b py-2 last:border-b-0">
      <div className="flex flex-col items-start gap-1 @[380px]:flex-row @[380px]:items-center @[380px]:justify-between @[380px]:gap-4">
        <span className="flex shrink-0 items-center gap-2 text-sm font-medium text-muted-foreground">
          {icon}
          {label}
        </span>
        <span className="text-sm">{children}</span>
      </div>
    </div>
  );
}
