"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiGetPage } from "@/lib/api";
import { BadgeCheck, Download, RefreshCw, Search, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
import { StatusPill } from "@/components/status-pill";
import { AnimatedRupiah } from "@/components/animated-rupiah";
import { useAdminList } from "@/hooks/use-admin-list";
import { AksiCell, NomorChip, RowNo, TableSkeleton, EmptyRow, TombolAksi } from "@/components/data-table";
import { rp, fmtDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Ustadz {
  id: number;
  full_name: string;
  photo_url?: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  last_login_at: string | null;
  verified: boolean;
  pendidikan: string | null;
  is_accepting: boolean | null;
  price_per_hour: number | null;
  rating_avg: number | null;
  rating_count: number;
  saldo_penghasilan: number;
}

const COLS = 12;

/** Sort dropdown — peta ke whitelist sort BE /admin/ustadz (sorting.rs). */
const SORTS = [
  { value: "newest", label: "Terbaru", col: null, order: "asc" },
  { value: "name_asc", label: "Nama A-Z", col: "full_name", order: "asc" },
  { value: "saldo_desc", label: "Saldo Tertinggi", col: "saldo", order: "desc" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

const STATUS_PILLS = [
  { value: "all", label: "Semua" },
  { value: "ACTIVE", label: "Aktif", dot: "bg-emerald-500" },
  { value: "PENDING_VERIFICATION", label: "Menunggu Verifikasi", dot: "bg-amber-400" },
  { value: "SUSPENDED", label: "Ditangguhkan" },
] as const;
type StatusValue = (typeof STATUS_PILLS)[number]["value"];

/** Halaman daftar Ustadz — layout standar halaman list (header + KPI + panel filter + tabel).
 *  List utama server-side via useAdminList; KPI agregat dari full-fetch ≤100 + users-count. */
export default function UstadzPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [qServer, setQServer] = useState("");
  const [status, setStatus] = useState<StatusValue>("all");
  const [sortSel, setSortSel] = useState<SortValue>("newest");
  const perPage = 20;
  const [spin, setSpin] = useState(false);

  // debounce search -> server
  useEffect(() => {
    const t = setTimeout(() => setQServer(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const list = useAdminList<Ustadz>("/admin/ustadz", {
    params: {
      q: qServer || undefined,
      status: status === "all" ? undefined : status,
    },
    limit: perPage,
  });

  // total utk teks "dari N" (ikut q + status)
  const [totalTerfilter, setTotalTerfilter] = useState<number | null>(null);
  useEffect(() => {
    let ignore = false;
    const qs = new URLSearchParams({ role: "USTADZ" });
    if (status !== "all") qs.set("status", status);
    if (qServer.trim()) qs.set("q", qServer.trim());
    apiGet<{ total: number }>(`/admin/users-count?${qs.toString()}`)
      .then((d) => {
        if (!ignore) setTotalTerfilter(d.total);
      })
      .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [qServer, status]);

  // ---- ringkasan: full fetch (≤100) + hitungan per status ----
  const [ringkas, setRingkas] = useState<Ustadz[] | null>(null);
  const [jumlah, setJumlah] = useState<{ all: number; aktif: number; pending: number; susp: number } | null>(null);

  const muatRingkas = useCallback(() => {
    apiGetPage<Ustadz>("/admin/ustadz", { limit: 100 })
      .then((res) => setRingkas(res.items))
      .catch(() => {});
    const hitung = async (s: string) => {
      const qs = new URLSearchParams({ role: "USTADZ" });
      if (s) qs.set("status", s);
      const d = await apiGet<{ total: number }>(`/admin/users-count?${qs.toString()}`);
      return d.total;
    };
    Promise.all([hitung(""), hitung("ACTIVE"), hitung("PENDING_VERIFICATION"), hitung("SUSPENDED")])
      .then(([all, aktif, pending, susp]) => setJumlah({ all, aktif, pending, susp }))
      .catch(() => {});
  }, []);

  useEffect(() => {
    muatRingkas();
  }, [muatRingkas]);

  // ---- KPI (data nyata) ----
  const totalSaldo = useMemo(() => (ringkas ?? []).reduce((a, u) => a + u.saldo_penghasilan, 0), [ringkas]);
  const menerima = useMemo(() => (ringkas ?? []).filter((u) => u.is_accepting === true).length, [ringkas]);
  const tertutup = useMemo(() => (ringkas ?? []).filter((u) => u.is_accepting === false).length, [ringkas]);
  const rataSaldo = jumlah && jumlah.all > 0 ? Math.round(totalSaldo / jumlah.all) : 0;
  const berperingkat = useMemo(() => (ringkas ?? []).filter((u) => u.rating_count > 0), [ringkas]);
  const rataRating =
    berperingkat.length > 0
      ? berperingkat.reduce((a, u) => a + (u.rating_avg ?? 0) * u.rating_count, 0) /
        berperingkat.reduce((a, u) => a + u.rating_count, 0)
      : null;
  const totalReview = useMemo(() => berperingkat.reduce((a, u) => a + u.rating_count, 0), [berperingkat]);

  function pilihSort(v: SortValue | null) {
    const val: SortValue = v ?? "newest";
    setSortSel(val);
    const cfg = SORTS.find((s) => s.value === val) ?? SORTS[0];
    list.setSortKey(cfg.col, cfg.order);
  }

  function resetFilter() {
    setQ("");
    setQServer("");
    setStatus("all");
    pilihSort("newest");
  }

  function muatUlang() {
    setSpin(true);
    list.reload();
    muatRingkas();
    setTimeout(() => setSpin(false), 900);
  }

  /** Ekspor CSV dari baris yang sedang ditampilkan (BOM agar Excel benar). */
  function eksporCsv() {
    if (list.items.length === 0) {
      toast.info("Tidak ada baris untuk diekspor");
      return;
    }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["ID", "Nama", "Email", "Telepon", "Kota", "Status", "Pendidikan", "Tarif per Jam", "Rating", "Jumlah Review", "Saldo", "Menerima", "Login Terakhir"];
    const lines = list.items.map((u) =>
      [u.id, u.full_name, u.email ?? "", u.phone ?? "", u.city ?? "", u.status, u.pendidikan ?? "", u.price_per_hour ?? "", u.rating_avg ?? "", u.rating_count, u.saldo_penghasilan, u.is_accepting === null ? "" : u.is_accepting ? "Terima" : "Tutup", u.last_login_at ?? ""]
        .map(esc)
        .join(";"),
    );
    const blob = new Blob(["\uFEFF" + [head.join(";"), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `ustadz-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${list.items.length} baris diekspor ke CSV`);
  }

  // ⌘K / Ctrl+K fokus ke pencarian
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const entri = (delay: number) =>
    ({
      className: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500",
      style: { animationDelay: `${delay}ms` } as CSSProperties,
    }) as const;

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <section {...entri(0)} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight">Ustadz</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {jumlah ? `${jumlah.all} ustadz terdaftar` : "memuat…"}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Verifikasi, tarif per jam &amp; rating — klik baris atau tombol untuk detail &amp; penanganan ustadz
          </p>
        </div>
        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            onClick={eksporCsv}
            title="Unduh baris yang tampil sebagai CSV"
            className="inline-flex items-center gap-2 rounded-lg border bg-card px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-muted/60"
          >
            <Download className="size-4 text-muted-foreground" /> Ekspor Data
          </button>
        </div>
      </section>

      {/* ===== KPI ===== */}
      <section {...entri(50)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 p-5 text-white shadow-lg transition-transform motion-safe:hover:-translate-y-0.5">
          <span aria-hidden className="shimmer-sweep pointer-events-none absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-xs font-medium text-emerald-200">Total Saldo Penghasilan</span>
          <div className="mt-3">
            <AnimatedRupiah value={totalSaldo} className="text-2xl font-extrabold tracking-tight sm:text-3xl" />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-200/80">
              <Wallet className="size-3.5 text-emerald-400" />
              {jumlah ? `${jumlah.all} ustadz • Rata-rata ${rp(rataSaldo)}/ustadz` : "memuat…"}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Ustadz Aktif</span>
            {jumlah && jumlah.all > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {Math.round((jumlah.aktif / jumlah.all) * 100)}% Rasio
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{jumlah ? jumlah.aktif : "…"}</span>
            <span className="text-xs font-semibold text-muted-foreground">/ {jumlah ? jumlah.all : "…"} ustadz</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {jumlah ? jumlah.pending : "…"} menunggu verifikasi berkas
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Menerima Kunjungan</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <BadgeCheck className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{ringkas ? menerima : "…"}</span>
            <span className="text-base font-semibold text-muted-foreground">Ustadz</span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {ringkas ? `${tertutup} menutup · ${(ringkas ?? []).filter((u) => u.is_accepting === null).length} belum diatur` : "memuat…"}
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-5 shadow-sm transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Rating Rata-Rata</span>
            <span className="text-[10px] font-semibold text-muted-foreground">{totalReview} review</span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight text-amber-600 sm:text-3xl dark:text-amber-400">
              {rataRating !== null ? `★${rataRating.toFixed(1)}` : "—"}
            </span>
            <span className="text-base font-semibold text-muted-foreground">/ 5.0</span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {berperingkat.length > 0 ? `Dari ${berperingkat.length} ustadz berperingkat` : "Belum ada ustadz berperingkat"}
          </p>
        </div>
      </section>

      {/* ===== Panel filter ===== */}
      <section {...entri(100)} className="space-y-4 rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {STATUS_PILLS.map((p) => {
              const aktif = status === p.value;
              const n =
                p.value === "all"
                  ? jumlah?.all
                  : p.value === "ACTIVE"
                    ? jumlah?.aktif
                    : p.value === "PENDING_VERIFICATION"
                      ? jumlah?.pending
                      : jumlah?.susp;
              return (
                <button
                  key={p.value}
                  onClick={() => setStatus(p.value)}
                  aria-pressed={aktif}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
                    aktif
                      ? "bg-emerald-50 font-bold text-emerald-700 shadow-sm dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {"dot" in p && p.dot && <span className={`size-2 rounded-full ${p.dot}`} />}
                  {p.label} ({n ?? "…"})
                </button>
              );
            })}
          </div>
          <button
            onClick={resetFilter}
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-emerald-600"
          >
            <RefreshCw className="size-3.5" /> Reset Filter
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-1 md:grid-cols-12">
          <div className="relative md:col-span-7">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama / email / nomor HP… (⌘K)"
              aria-label="Cari ustadz"
              className="w-full rounded-xl bg-muted/60 py-2 pl-9 pr-14 text-xs shadow-inner transition-colors placeholder:text-muted-foreground/70 focus:bg-card focus:outline-none"
            />
            <kbd className="absolute right-3 top-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
          </div>
          <div className="md:col-span-3">
            <Select value={sortSel} onValueChange={pilihSort}>
              <SelectTrigger className="w-full rounded-xl bg-muted/60 text-xs shadow-inner focus:bg-card" aria-label="Urutkan">
                <SelectValue>{SORTS.find((s) => s.value === sortSel)?.label}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-end md:col-span-2">
            <button
              onClick={muatUlang}
              title="Muat ulang data ustadz"
              className="inline-flex h-[34px] w-full items-center justify-center gap-1.5 rounded-xl bg-muted/60 text-xs font-semibold text-muted-foreground shadow-sm transition-colors hover:text-emerald-700"
            >
              <RefreshCw className={`size-4 ${spin || list.loading ? "motion-safe:animate-spin" : ""}`} /> Muat Ulang
            </button>
          </div>
        </div>
      </section>

      {/* ===== Tabel ===== */}
      <section {...entri(150)} className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 text-[10px] uppercase tracking-wider text-muted-foreground">
                <TableHead className="w-12 text-center">No</TableHead>
                <TableHead className="w-20">Aksi</TableHead>
                <TableHead className="text-center">Status Akun</TableHead>
                <TableHead>Nomor</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Pendidikan</TableHead>
                <TableHead className="text-right">Tarif/Jam</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Menerima</TableHead>
                <TableHead>Login Terakhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading && list.items.length === 0 ? (
                <TableSkeleton rows={6} cols={COLS} />
              ) : list.items.length === 0 ? (
                <EmptyRow colSpan={COLS} message="Tidak ada ustadz sesuai filter." />
              ) : (
                list.items.map((u, i) => (
                  <TableRow
                    key={u.id}
                    className="row-accent cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/ustadz/${u.id}`)}
                  >
                    <RowNo i={i} page={list.page} perPage={perPage} />
                    <AksiCell>
                      <TombolAksi label="Detail" title={`Detail ustadz #${u.id}`} onClick={() => router.push(`/ustadz/${u.id}`)} />
                    </AksiCell>
                    <TableCell className="text-center">
                      <StatusPill status={u.status} />
                    </TableCell>
                    <NomorChip label={`#${u.id}`} title={`Nomor ustadz #${u.id}`} />
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserAvatar photoUrl={u.photo_url} name={u.full_name} />
                        <div>
                          <div className="font-medium">
                            {u.full_name}
                            {u.verified && <span className="ml-1 text-green-600" title="Terverifikasi">✓</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">{u.city ?? "-"}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{u.email ?? "-"}</div>
                      <div className="text-xs text-muted-foreground">{u.phone ?? ""}</div>
                    </TableCell>
                    <TableCell className="text-sm">{u.pendidikan ?? "-"}</TableCell>
                    <TableCell className="whitespace-nowrap text-right text-sm">
                      {u.price_per_hour ? rp(u.price_per_hour) : "-"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {u.rating_count > 0 ? (
                        <span className="font-semibold text-amber-600">★{u.rating_avg?.toFixed(1)}</span>
                      ) : (
                        <span className="text-muted-foreground">belum ada</span>
                      )}
                      <span className="ml-1 text-xs text-muted-foreground">({u.rating_count})</span>
                    </TableCell>
                    <TableCell className={`text-right font-semibold ${u.saldo_penghasilan > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                      {rp(u.saldo_penghasilan)}
                    </TableCell>
                    <TableCell>
                      {u.is_accepting === null ? (
                        <span className="text-xs text-muted-foreground">belum diatur</span>
                      ) : u.is_accepting ? (
                        <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Terima</Badge>
                      ) : (
                        <Badge variant="secondary" className="bg-gray-100 text-gray-600">Tutup</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{fmtDateTime(u.last_login_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer paginasi */}
        <div className="flex flex-col items-center justify-between gap-3 bg-muted/30 p-4 text-xs text-muted-foreground sm:flex-row">
          <span>
            Menampilkan <b className="text-foreground">{list.items.length === 0 ? 0 : (list.page - 1) * perPage + 1}–{(list.page - 1) * perPage + list.items.length}</b> dari{" "}
            <b className="text-foreground">{totalTerfilter ?? "…"}</b> ustadz
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={list.page === 1 || list.loading}
              onClick={list.goPrev}
              className="rounded-lg border bg-card px-2.5 py-1 shadow-sm transition-colors hover:text-foreground disabled:opacity-50"
            >
              Sebelumnya
            </button>
            <span className="px-2 font-semibold text-foreground">Hal. {list.page}</span>
            <button
              disabled={!list.hasMore || list.loading}
              onClick={list.goNext}
              className="rounded-lg border bg-card px-2.5 py-1 shadow-sm transition-colors hover:text-foreground disabled:opacity-50"
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
