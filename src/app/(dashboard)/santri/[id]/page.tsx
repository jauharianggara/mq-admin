"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Ban,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  User,
  Wallet,
} from "lucide-react";
import { apiGet, apiGetPage, apiPatch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedRupiah } from "@/components/animated-rupiah";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AksiCell, NomorChip, RowNo, TombolAksi } from "@/components/data-table";

interface Tx {
  id: number;
  tx_type: string;
  amount: number;
  balance_after: number;
  subject_type: string | null;
  subject_id: number | null;
  created_at: string;
}

interface Khatmil {
  campaign_id: number;
  name: string;
  juz: string[] | null;
}

interface Santri {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  gender: string | null;
  created_at: string | null;
  last_login_at: string | null;
  bio: string | null;
  deposit: number;
  transactions: Tx[];
  khatmil_aktif: Khatmil[];
}

interface VisitRow {
  id: number;
  status: string;
  scheduled_at: string;
  duration_hours: number;
  price_total: number;
  ustadz: { full_name: string } | null;
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

const txLabel: Record<string, string> = {
  TOPUP: "Top-up deposit",
  PAYMENT: "Bayar kunjungan",
  REFUND: "Pengembalian dana",
  ADJUST: "Penyesuaian saldo",
  EARNING: "Penghasilan",
  PAYOUT: "Penarikan",
};

/** Kelompok filter kunjungan: [value, label, anggota status] */
const FILTER_VISIT: [string, string, string[]][] = [
  ["SEMUA", "Semua", []],
  ["CONFIRMED", "Confirmed", ["CONFIRMED"]],
  ["DECLINED", "Declined", ["DECLINED"]],
  ["IN_PROGRESS", "In Progress", ["IN_PROGRESS"]],
];

const TARGET_JUZ = 30;

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

/** 08123… → https://wa.me/628123… (null bila bukan nomor valid) */
function waLink(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "");
  if (d.length < 8) return null;
  return `https://wa.me/${d.startsWith("0") ? `62${d.slice(1)}` : d}`;
}

export default function SantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [s, setS] = useState<Santri | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [filter, setFilter] = useState("SEMUA");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await apiGet<Santri>(`/admin/santri/${id}`);
      setS(d);
      const v = await apiGetPage<VisitRow>("/admin/visits", { user_id: id, limit: 10 }).catch(() => ({ items: [], nextCursor: null, hasMore: false }));
      setVisits(v.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat santri");
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

  const visitsTampil = useMemo(() => {
    if (filter === "SEMUA") return visits;
    const grp = FILTER_VISIT.find((f) => f[0] === filter);
    return grp ? visits.filter((v) => grp[2].includes(v.status)) : visits;
  }, [visits, filter]);

  async function setStatus(newStatus: string) {
    if (!s) return;
    if (!confirm(`Ubah status ${s.full_name} menjadi ${newStatus}?`)) return;
    setBusy(true);
    try {
      await apiPatch(`/admin/users/${s.id}`, { status: newStatus });
      toast.success(`Status → ${newStatus}`);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    if (!s) return;
    const pw = prompt(`Kata sandi baru untuk ${s.full_name} (min. 8 karakter):`);
    if (pw === null) return;
    if (pw.length < 8) {
      toast.error("Kata sandi minimal 8 karakter");
      return;
    }
    if (!confirm(`Reset kata sandi ${s.full_name}? Semua sesi perangkatnya akan dipaksa keluar.`)) return;
    setBusy(true);
    try {
      await apiPatch(`/admin/users/${s.id}`, { password: pw });
      toast.success("Kata sandi direset — sampaikan kata sandi baru ke pengguna");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  function salinEmail() {
    if (!s?.email) return;
    navigator.clipboard
      .writeText(s.email)
      .then(() => toast.success("Email disalin"))
      .catch(() => toast.error("Gagal menyalin"));
  }

  const wa = waLink(s?.phone ?? null);

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* Header: kembali + judul + status + muat ulang */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <Button variant="outline" size="icon" className="mt-0.5" onClick={() => router.back()} title="Kembali">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {s?.full_name ?? "Santri"} #{id}
              </h1>
              {s && (
                <Badge variant="secondary" className={`gap-1.5 ${statusVariant[s.status] ?? ""}`}>
                  {s.status === "ACTIVE" && <span className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />}
                  {s.status}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Detail santri — profil, mutasi deposit, khatmil & kunjungan ngaji</p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={load} title="Muat ulang">
          <RefreshCw className={`h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : !s ? (
        <div className="rounded-xl border bg-card p-10 text-center text-muted-foreground">Santri tidak ditemukan.</div>
      ) : (
        <>
          {/* ===== Profil ===== */}
          <section className="rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b p-5 pb-4">
              <div className="flex items-center gap-4">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-xl font-bold text-white shadow-sm">
                  {inisial(s.full_name)}
                </span>
                <div>
                  <h2 className="text-base font-bold">{s.full_name}</h2>
                  <p className="text-xs text-muted-foreground">
                    Bergabung sejak{" "}
                    {s.created_at
                      ? new Date(s.created_at).toLocaleDateString("id-ID", { month: "long", year: "numeric" })
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-x-8 p-5 sm:grid-cols-2">
              <DetailRow icon={<Mail className="size-4" />} label="Email">
                {s.email ? (
                  <span className="flex items-center gap-1">
                    <span className="break-all font-medium">{s.email}</span>
                    <button
                      onClick={salinEmail}
                      title="Salin email"
                      aria-label={`Salin email ${s.email}`}
                      className="shrink-0 rounded p-1 text-muted-foreground transition hover:text-foreground"
                    >
                      <Copy className="size-3.5" />
                    </button>
                  </span>
                ) : (
                  <span className="italic text-muted-foreground">-</span>
                )}
              </DetailRow>
              <DetailRow icon={<Phone className="size-4" />} label="Telepon">
                {s.phone ? (
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono font-semibold">{s.phone}</span>
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
              <DetailRow icon={<MapPin className="size-4" />} label="Kota">
                {s.city ?? <span className="italic text-muted-foreground">- (Belum diatur)</span>}
              </DetailRow>
              <DetailRow icon={<User className="size-4" />} label="Jenis Kelamin">
                {s.gender === "M" ? "Laki-laki" : s.gender === "F" ? "Perempuan" : <span className="italic text-muted-foreground">-</span>}
              </DetailRow>
              <DetailRow icon={<CalendarDays className="size-4" />} label="Terdaftar">
                <span className="font-medium">{fmt(s.created_at)}</span>
              </DetailRow>
              <DetailRow icon={<Clock className="size-4" />} label="Login Terakhir">
                <span className="font-medium">{fmt(s.last_login_at)}</span>
              </DetailRow>
              {s.bio && (
                <div className="sm:col-span-2">
                  <p className="mt-2 border-t pt-3 text-sm text-muted-foreground">{s.bio}</p>
                </div>
              )}
            </div>
          </section>

          {/* ===== Deposit & mutasi ===== */}
          <section className="rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:75ms]">
            <div className="flex items-start justify-between gap-3 p-5 pb-1">
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deposit & Saldo Santri</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Saldo aktif untuk reservasi bimbingan ngaji</p>
              </div>
              <span
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-bold ${
                  s.deposit > 0
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-border bg-muted text-muted-foreground"
                }`}
              >
                {s.deposit > 0 ? "Deposit Tersedia" : "Deposit Kosong"}
              </span>
            </div>
            <div className="px-5">
              <div className="rounded-2xl bg-gradient-to-br from-emerald-900 to-emerald-600 p-5 text-white shadow-sm sm:p-6">
                <span className="text-xs font-medium text-emerald-100">Saldo saat ini</span>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    <AnimatedRupiah value={s.deposit} animateOnMount />
                  </span>
                  <span className="text-xs font-normal text-emerald-200">IDR</span>
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <Wallet className="size-4 text-primary" /> Mutasi Terakhir
                </h3>
                <span className="text-[11px] text-muted-foreground">{s.transactions.length} transaksi tercatat</span>
              </div>
              {s.transactions.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">Belum ada mutasi.</p>
              ) : (
                <div className="divide-y">
                  {s.transactions.map((t) => {
                    const masuk = ["TOPUP", "REFUND", "EARNING"].includes(t.tx_type);
                    return (
                      <div key={t.id} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <span
                            className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                              masuk
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            {masuk ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                          </span>
                          <div>
                            <div className="text-sm font-medium">
                              {txLabel[t.tx_type] ?? t.tx_type}
                              {t.subject_type && (
                                <span className="ml-1 font-mono text-xs text-muted-foreground">
                                  {t.subject_type} #{t.subject_id}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-muted-foreground">{fmt(t.created_at)}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${masuk ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                            {masuk ? "+" : "−"}
                            <AnimatedRupiah value={t.amount} animateOnMount />
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Saldo akhir: <span className="font-semibold text-foreground">{rp(t.balance_after)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t pt-3">
                <span className="text-xs text-muted-foreground">Butuh koreksi saldo atau penyesuaian manual?</span>
                <Button size="sm" variant="outline" render={<Link href="/deposit" />}>
                  Kelola saldo & penyesuaian
                </Button>
              </div>
            </div>
          </section>

          {/* ===== Khatmil aktif ===== */}
          <section className="rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:150ms]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b p-5 pb-4">
              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-primary dark:bg-emerald-950/40">
                  <BookOpen className="size-5" />
                </span>
                <div>
                  <h2 className="text-base font-bold">Khatmil Aktif</h2>
                  <p className="text-xs text-muted-foreground">Kelompok pembacaan Al-Qur&apos;an berseri yang sedang diikuti santri</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                {s.khatmil_aktif.length} Program Aktif
              </Badge>
            </div>
            <div className="p-5">
              {s.khatmil_aktif.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak sedang mengikuti khatmil aktif.</p>
              ) : (
                <div className="space-y-4">
                  {s.khatmil_aktif.map((k) => {
                    const selesai = (k.juz ?? []).map(Number).sort((a, b) => a - b);
                    const next = Array.from({ length: TARGET_JUZ }, (_, i) => i + 1).find((n) => !selesai.includes(n));
                    const pct = Math.round((selesai.length / TARGET_JUZ) * 100);
                    return (
                      <div key={k.campaign_id} className="rounded-xl border bg-muted/30 p-4">
                        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <Button variant="link" className="h-auto p-0 font-bold" render={<Link href={`/khatmil/${k.campaign_id}`} />}>
                                {k.name}
                              </Button>
                              <span className="rounded bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                                Target: {TARGET_JUZ} Juz
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">Juz yang telah selesai dibaca dan disetorkan ke Ustadz pembimbing:</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-xs font-bold">
                                {selesai.length} dari {TARGET_JUZ} Juz
                              </div>
                              <div className="text-[10px] font-semibold text-primary">{pct}% Selesai</div>
                            </div>
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                              <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {selesai.map((n) => (
                            <span
                              key={n}
                              className="flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100/90 px-3 py-1 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                            >
                              Juz {n}
                            </span>
                          ))}
                          {next != null && (
                            <span className="rounded-full border border-dashed px-3 py-1 text-xs font-medium text-muted-foreground">
                              Juz {next} (Menunggu Setoran)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* ===== Kunjungan ngaji ===== */}
          <section className="overflow-hidden rounded-xl border bg-card shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:225ms]">
            <div className="flex flex-col justify-between gap-3 border-b p-5 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold">Kunjungan Ngaji (terakhir)</h2>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">{visits.length} Riwayat</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">Daftar permintaan kunjungan ngaji privat dengan Ustadz pendamping</p>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                {FILTER_VISIT.map(([v, label]) => {
                  const n = v === "SEMUA" ? visits.length : visits.filter((x) => FILTER_VISIT.find((f) => f[0] === v)?.[2].includes(x.status)).length;
                  return (
                    <button
                      key={v}
                      onClick={() => setFilter(v)}
                      aria-pressed={filter === v}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 font-semibold transition ${
                        filter === v ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {label} ({n})
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">No</TableHead>
                    <TableHead className="w-20">Aksi</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Ustadz</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visitsTampil.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Belum ada kunjungan sesuai filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visitsTampil.map((v, i) => (
                      <TableRow key={v.id} className="row-accent hover:bg-muted/50">
                        <RowNo i={i} />
                        <AksiCell>
                          <TombolAksi href={`/visits/${v.id}`} title={`Buka kunjungan #KJ-${String(v.id).padStart(4, "0")}`} />
                        </AksiCell>
                        <TableCell className="text-center">
                          <Badge variant="secondary" className={visitStatusColor[v.status] ?? ""}>
                            {v.status}
                          </Badge>
                        </TableCell>
                        <NomorChip label={`#KJ-${String(v.id).padStart(4, "0")}`} title={`Nomor kunjungan #${v.id}`} />
                        <TableCell>{v.ustadz?.full_name ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmt(v.scheduled_at)}</TableCell>
                        <TableCell>{v.duration_hours} jam</TableCell>
                        <TableCell className="text-right font-semibold">{rp(v.price_total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>

          {/* ===== Tindakan admin ===== */}
          <section className="rounded-xl border border-red-200 bg-card p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:[animation-delay:300ms] dark:border-red-900/50">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-red-100 p-1 text-red-700 dark:bg-red-950/40 dark:text-red-300">
                    <ShieldAlert className="size-4" />
                  </span>
                  <h2 className="text-base font-bold">Tindakan Admin</h2>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Operasi khusus untuk pembekuan akses atau penyetelan ulang kredensial santri
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {s.status === "ACTIVE" ? (
                  <Button variant="destructive" disabled={busy} onClick={() => setStatus("SUSPENDED")}>
                    <Ban className="size-4" /> Suspend akun
                  </Button>
                ) : (
                  <Button disabled={busy} onClick={() => setStatus("ACTIVE")}>
                    <CheckCircle2 className="size-4" /> Aktifkan akun
                  </Button>
                )}
                <Button variant="outline" disabled={busy} onClick={resetPassword}>
                  <KeyRound className="size-4" /> Reset Kata Sandi
                </Button>
              </div>
            </div>
          </section>
        </>
      )}
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
