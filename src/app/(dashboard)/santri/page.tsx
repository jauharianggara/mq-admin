"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, BookOpen, Download, RefreshCw, Search, ShieldCheck, UserPlus, Wallet } from "lucide-react";
import { apiGet, apiGetPage } from "@/lib/api";
import { toast } from "sonner";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Santri {
  id: number;
  full_name: string;
  photo_url?: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  last_login_at: string | null;
  deposit: number;
  khatmil_aktif: number;
  kunjungan_selesai: number;
}

const COLS = 11;

/** Sort dropdown — peta ke whitelist sort BE /admin/santri (sorting.rs). */
const SORTS = [
  { value: "newest", label: "Terbaru", col: null, order: "asc" },
  { value: "name_asc", label: "Nama A-Z", col: "full_name", order: "asc" },
  { value: "deposit_desc", label: "Deposit Tertinggi", col: "deposit", order: "desc" },
] as const;
type SortValue = (typeof SORTS)[number]["value"];

const STATUS_PILLS = [
  { value: "all", label: "Semua" },
  { value: "ACTIVE", label: "Aktif", dot: "bg-emerald-500" },
  { value: "PENDING_VERIFICATION", label: "Menunggu Verifikasi", dot: "bg-amber-400" },
  { value: "SUSPENDED", label: "Ditangguhkan" },
] as const;
type StatusValue = (typeof STATUS_PILLS)[number]["value"];

const PAGE_SIZES = [10, 20, 50];

/** Halaman daftar Santri — layout sesuai mockup (header KPI, pil filter, kota, ekspor CSV).
 *  List utama tetap server-side via useAdminList (q/status/sort/kursor).
 *  Filter kota & KPI agregat memakai satu full-fetch (limit 100) karena BE
 *  belum punya filter kota; aktif hanya saat kota dipilih (mode lokal). */
export default function SantriPage() {
  const router = useRouter();
  const searchRef = useRef<HTMLInputElement>(null);

  const [q, setQ] = useState("");
  const [qServer, setQServer] = useState(""); // debounce 350ms utk query server
  const [status, setStatus] = useState<StatusValue>("all");
  const [sortSel, setSortSel] = useState<SortValue>("newest");
  const [kota, setKota] = useState("all");
  const [perPage, setPerPage] = useState(10);
  const [localPage, setLocalPage] = useState(1);
  const [spin, setSpin] = useState(false);

  // debounce search -> server
  useEffect(() => {
    const t = setTimeout(() => setQServer(q), 350);
    return () => clearTimeout(t);
  }, [q]);

  const list = useAdminList<Santri>("/admin/santri", {
    params: {
      q: qServer || undefined,
      status: status === "all" ? undefined : status,
    },
    limit: perPage,
  });

  // total utk teks "dari N" (mengikuti q + status aktif) — pola halaman lama
  const [totalTerfilter, setTotalTerfilter] = useState<number | null>(null);
  useEffect(() => {
    let ignore = false;
    const qs = new URLSearchParams({ role: "SANTRI" });
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
  const [ringkas, setRingkas] = useState<Santri[] | null>(null);
  const [jumlah, setJumlah] = useState<{ all: number; aktif: number; pending: number; susp: number } | null>(null);

  const muatRingkas = useCallback(() => {
    apiGetPage<Santri>("/admin/santri", { limit: 100 })
      .then((res) => setRingkas(res.items))
      .catch(() => {});
    const hitung = async (s: string) => {
      const qs = new URLSearchParams({ role: "SANTRI" });
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

  // ---- turunan KPI (data nyata, tanpa angka rekaan) ----
  const totalDeposit = useMemo(() => (ringkas ?? []).reduce((a, s) => a + s.deposit, 0), [ringkas]);
  const khatmilSantri = useMemo(() => (ringkas ?? []).filter((s) => s.khatmil_aktif > 0).length, [ringkas]);
  const khatmilTotal = useMemo(() => (ringkas ?? []).reduce((a, s) => a + s.khatmil_aktif, 0), [ringkas]);
  const kunjunganTotal = useMemo(() => (ringkas ?? []).reduce((a, s) => a + s.kunjungan_selesai, 0), [ringkas]);
  const rataDeposit = jumlah && jumlah.all > 0 ? Math.round(totalDeposit / jumlah.all) : 0;

  const kotaList = useMemo(() => {
    const set = new Set<string>();
    for (const s of ringkas ?? []) if (s.city) set.add(s.city);
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [ringkas]);

  // ---- mode lokal (kota dipilih): filter+sort+paginasi di klien atas full fetch ----
  const lokal = kota !== "all";
  const localRows = useMemo(() => {
    if (!lokal) return [];
    const ql = qServer.trim().toLowerCase();
    const rows = (ringkas ?? [])
      .filter((s) => (s.city ?? "") === kota)
      .filter((s) => status === "all" || s.status === status)
      .filter(
        (s) =>
          !ql ||
          [s.full_name, s.email ?? "", s.phone ?? ""].some((t) => t.toLowerCase().includes(ql)),
      );
    if (sortSel === "name_asc") rows.sort((a, b) => a.full_name.localeCompare(b.full_name));
    else if (sortSel === "deposit_desc") rows.sort((a, b) => b.deposit - a.deposit);
    else rows.sort((a, b) => b.id - a.id);
    return rows;
  }, [lokal, ringkas, kota, status, qServer, sortSel]);

  const localPageCount = Math.max(1, Math.ceil(localRows.length / perPage));
  const localPageSafe = Math.min(localPage, localPageCount - 1);
  const localTampil = lokal ? localRows.slice(localPageSafe * perPage, localPageSafe * perPage + perPage) : [];
  const rows = lokal ? localTampil : list.items;

  // ---- aksi ----
  function pilihSort(v: SortValue | null) {
    const val: SortValue = v ?? "newest";
    setSortSel(val);
    setLocalPage(1);
    const cfg = SORTS.find((s) => s.value === val) ?? SORTS[0];
    list.setSortKey(cfg.col, cfg.order);
  }

  function resetFilter() {
    setQ("");
    setQServer("");
    setStatus("all");
    setKota("all");
    setLocalPage(1);
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
    if (rows.length === 0) {
      toast.info("Tidak ada baris untuk diekspor");
      return;
    }
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["ID", "Nama", "Email", "Telepon", "Kota", "Status", "Deposit", "Khatmil Aktif", "Kunjungan Selesai", "Login Terakhir"];
    const lines = rows.map((s) =>
      [s.id, s.full_name, s.email ?? "", s.phone ?? "", s.city ?? "", s.status, s.deposit, s.khatmil_aktif, s.kunjungan_selesai, s.last_login_at ?? ""]
        .map(esc)
        .join(";"),
    );
    const blob = new Blob(["\uFEFF" + [head.join(";"), ...lines].join("\r\n")], {
      type: "text/csv;charset=utf-8",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `santri-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success(`${rows.length} baris diekspor ke CSV`);
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

  const x = lokal ? localPageSafe * perPage + 1 : (list.page - 1) * perPage + 1;
  const y = x - 1 + rows.length;
  const totalTampil = lokal ? localRows.length : totalTerfilter;

  return (
    <div className="space-y-6">
      {/* ===== Header ===== */}
      <section {...entri(0)} className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-2xl font-bold tracking-tight">Santri</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {jumlah ? `${jumlah.all} santri terdaftar` : "memuat…"}
            </span>
          </div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground sm:text-sm">
            Deposit, khatmil aktif &amp; riwayat kunjungan — klik baris atau tombol untuk detail &amp; penanganan santri
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
          <button
            onClick={() => toast.info("Belum tersedia — butuh dukungan backend")}
            title="Butuh endpoint buat santri di backend"
            className="relative inline-flex items-center gap-2 overflow-hidden rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
          >
            <span
              aria-hidden
              className="shimmer-sweep pointer-events-none absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            />
            <UserPlus className="size-4" /> Tambah Santri Baru
          </button>
        </div>
      </section>

      {/* ===== KPI ===== */}
      <section {...entri(50)} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Kartu gelap: total deposit */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-900 to-slate-900 p-5 text-white shadow-lg transition-transform motion-safe:hover:-translate-y-0.5">
          <span aria-hidden className="shimmer-sweep pointer-events-none absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <span className="text-xs font-medium text-emerald-200">Total Deposit Santri</span>
          <div className="mt-3">
            <AnimatedRupiah value={totalDeposit} className="text-2xl font-extrabold tracking-tight sm:text-3xl" />
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-200/80">
              <Wallet className="size-3.5 text-emerald-400" />
              {jumlah ? `${jumlah.all} santri • Rata-rata ${rp(rataDeposit)}/santri` : "memuat…"}
            </p>
          </div>
        </div>

        {/* Santri aktif */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Santri Aktif</span>
            {jumlah && jumlah.all > 0 && (
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                {Math.round((jumlah.aktif / jumlah.all) * 100)}% Rasio
              </span>
            )}
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{jumlah ? jumlah.aktif : "…"}</span>
            <span className="text-xs font-semibold text-muted-foreground">/ {jumlah ? jumlah.all : "…"} santri</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <span className="size-1.5 rounded-full bg-amber-500" />
            {jumlah ? jumlah.pending : "…"} menunggu verifikasi berkas
          </p>
        </div>

        {/* Khatmil berjalan */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Khatmil Sedang Berjalan</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              <BookOpen className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{ringkas ? khatmilSantri : "…"}</span>
            <span className="text-base font-semibold text-muted-foreground">Santri</span>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <BookOpen className="size-3.5 text-amber-500" />
            Total {khatmilTotal} khatmil aktif diikuti
          </p>
        </div>

        {/* Kunjungan selesai */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm transition-all motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Kunjungan Selesai</span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <BadgeCheck className="size-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl font-extrabold tracking-tight sm:text-3xl">{ringkas ? kunjunganTotal : "…"}</span>
            <span className="text-base font-semibold text-muted-foreground">Sesi</span>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            {ringkas && jumlah && jumlah.all > 0
              ? `Rata-rata ${(kunjunganTotal / jumlah.all).toFixed(1)} kunjungan per santri`
              : "Akumulasi seluruh santri"}
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
                  onClick={() => {
                    setStatus(p.value);
                    setLocalPage(1);
                  }}
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
          <div className="relative md:col-span-6">
            <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <input
              ref={searchRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama / email / nomor HP… (⌘K)"
              aria-label="Cari santri"
              className="w-full rounded-xl bg-muted/60 py-2 pl-9 pr-14 text-xs shadow-inner transition-colors placeholder:text-muted-foreground/70 focus:bg-card focus:outline-none"
            />
            <kbd className="absolute right-3 top-2 rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">⌘K</kbd>
          </div>
          <div className="md:col-span-3">
            <Select
              value={kota}
              onValueChange={(v) => {
                setKota(v ?? "all");
                setLocalPage(1);
              }}
            >
              <SelectTrigger className="w-full rounded-xl bg-muted/60 text-xs shadow-inner focus:bg-card" aria-label="Filter kota">
                <SelectValue>
                  {kota === "all" ? `Semua Kota${kotaList.length > 0 ? ` (${kotaList.length} Kota)` : ""}` : kota}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Kota{kotaList.length > 0 ? ` (${kotaList.length} Kota)` : ""}</SelectItem>
                {kotaList.map((k) => (
                  <SelectItem key={k} value={k}>
                    {k}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
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
          <div className="flex items-center justify-end md:col-span-1">
            <button
              onClick={muatUlang}
              title="Muat ulang data santri"
              className="flex h-[34px] w-full items-center justify-center rounded-xl bg-muted/60 text-muted-foreground shadow-sm transition-colors hover:text-emerald-700"
            >
              <RefreshCw className={`size-4 ${spin || list.loading ? "motion-safe:animate-spin" : ""}`} />
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
                <TableHead>Santri</TableHead>
                <TableHead>Kontak</TableHead>
                <TableHead>Kota / Asal</TableHead>
                <TableHead className="text-right">Saldo Deposit</TableHead>
                <TableHead className="text-center">Khatmil</TableHead>
                <TableHead className="text-center">Kunjungan</TableHead>
                <TableHead>Login Terakhir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.loading && rows.length === 0 ? (
                <TableSkeleton rows={6} cols={COLS} />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={COLS} message={lokal ? "Tidak ada santri di kota ini sesuai filter." : "Tidak ada santri sesuai filter."} />
              ) : (
                rows.map((s, i) => (
                  <TableRow
                    key={s.id}
                    className="row-accent cursor-pointer transition-colors hover:bg-muted/50"
                    onClick={() => router.push(`/santri/${s.id}`)}
                  >
                    <RowNo i={i} page={lokal ? localPageSafe + 1 : list.page} perPage={perPage} />
                    <AksiCell>
                      <TombolAksi
                        label="Detail"
                        title={`Detail santri #${s.id}`}
                        onClick={() => router.push(`/santri/${s.id}`)}
                      />
                    </AksiCell>
                    <TableCell className="text-center">
                      <StatusPill status={s.status} />
                    </TableCell>
                    <NomorChip label={`#${s.id}`} title={`Nomor santri #${s.id}`} />
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <UserAvatar
                          photoUrl={s.photo_url}
                          name={s.full_name === "(tanpa nama)" ? "?" : s.full_name}
                        />
                        <div className="min-w-0">
                          <div className="truncate font-semibold">{s.full_name}</div>
                          <span className={`text-[10px] font-medium ${s.status === "PENDING_VERIFICATION" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>
                            {s.status === "PENDING_VERIFICATION" ? "Verifikasi Berkas Tertunda" : s.city ?? "—"}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-44 truncate font-mono text-xs" title={s.email ?? ""}>
                        {s.email ?? "-"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">{s.phone ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <span className="rounded bg-muted px-2 py-0.5 text-[11px] font-medium">{s.city ?? "-"}</span>
                    </TableCell>
                    <TableCell className={`text-right font-bold ${s.deposit > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}`}>
                      {rp(s.deposit)}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={`inline-flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                        s.khatmil_aktif > 0
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                          : "text-muted-foreground"
                      }`}>
                        {s.khatmil_aktif}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                        {s.kunjungan_selesai}
                      </span>
                    </TableCell>
                    <TableCell className="text-[11px] text-muted-foreground">{fmtDateTime(s.last_login_at)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Footer paginasi */}
        <div className="flex flex-col items-center justify-between gap-3 bg-muted/30 p-4 text-xs text-muted-foreground sm:flex-row">
          <div className="flex flex-wrap items-center gap-2">
            <span>
              Menampilkan <b className="text-foreground">{rows.length === 0 ? 0 : x}–{y}</b> dari{" "}
              <b className="text-foreground">{totalTampil ?? "…"}</b> santri
              {lokal && " (filter kota — data ≤100)"}
            </span>
            <span className="text-border">•</span>
            <div className="flex items-center gap-1.5">
              <span>Baris per halaman:</span>
              <Select
                value={String(perPage)}
                onValueChange={(v) => {
                  setPerPage(Number(v) || 10);
                  setLocalPage(1);
                }}
              >
                <SelectTrigger className="h-7 w-16 rounded-lg bg-card text-xs font-semibold shadow-sm" aria-label="Baris per halaman">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZES.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {lokal ? (
            <div className="flex items-center gap-1">
              <button
                disabled={localPageSafe === 0}
                onClick={() => setLocalPage(localPageSafe - 1)}
                className="rounded-lg border bg-card px-2.5 py-1 shadow-sm transition-colors hover:text-foreground disabled:opacity-50"
              >
                Sebelumnya
              </button>
              {Array.from({ length: localPageCount }, (_, i) => i).map((p) => (
                <button
                  key={p}
                  onClick={() => setLocalPage(p)}
                  aria-current={p === localPageSafe ? "page" : undefined}
                  className={`rounded-lg px-3 py-1 shadow-sm transition-colors ${
                    p === localPageSafe
                      ? "bg-emerald-600 font-bold text-white"
                      : "border bg-card font-medium hover:bg-muted"
                  }`}
                >
                  {p + 1}
                </button>
              ))}
              <button
                disabled={localPageSafe >= localPageCount - 1}
                onClick={() => setLocalPage(localPageSafe + 1)}
                className="rounded-lg border bg-card px-2.5 py-1 shadow-sm transition-colors hover:text-foreground disabled:opacity-50"
              >
                Berikutnya
              </button>
            </div>
          ) : (
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
          )}
        </div>
      </section>

      {/* ===== Banner kepatuhan ===== */}
      <section
        {...entri(200)}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-5 text-white shadow-md sm:p-6"
      >
        <span aria-hidden className="shimmer-sweep pointer-events-none absolute inset-y-0 left-0 w-3/5 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div className="flex items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
              <ShieldCheck className="size-7" />
            </span>
            <div className="space-y-1">
              <h3 className="text-base font-bold tracking-tight">Verifikasi &amp; Kepatuhan Data Santri</h3>
              <p className="max-w-2xl text-xs leading-relaxed text-slate-300">
                Pastikan nomor WhatsApp dan identitas wali santri terverifikasi aktif sebelum penagihan khatmil massal
                ataupun automasi Virtual Account Xendit, demi mencegah gagal kirim invoice.
              </p>
            </div>
          </div>
          <Link
            href="/pengaturan/audit"
            className="self-start rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold shadow-sm transition-colors hover:bg-white/20 md:self-auto"
          >
            Lihat Log Verifikasi
          </Link>
        </div>
      </section>
    </div>
  );
}
