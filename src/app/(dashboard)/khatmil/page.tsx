"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGetPage, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Download, Ellipsis, Pencil, Plus, RefreshCw, Ban } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  SearchInput,
  TableShell,
  SortHead,
  Head,
  TableSkeleton,
  EmptyRow,
  Pager,
  RowNo,
  AksiCell,
  NomorChip,
  TombolAksi,
} from "@/components/data-table";
import { useAdminList } from "@/hooks/use-admin-list";
import { fmtDateInput } from "@/lib/format";
import { Campaign, groupProgressList, patchCampaign, StatusBadge } from "./shared";

const STATUS_TABS = [
  { v: "ALL", label: "Semua Status" },
  { v: "ACTIVE", label: "Aktif" },
  { v: "SCHEDULED", label: "Terjadwal" },
  { v: "COMPLETED", label: "Selesai" },
  { v: "CANCELED", label: "Dibatalkan" },
  { v: "DRAFT", label: "Draf" },
];

const COLS = 9;

const inisial = (nama: string) =>
  nama
    .split(/\s+/)
    .filter((w) => !/^\d+$/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

export default function KhatmilPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ACTIVE");
  const [total, setTotal] = useState<number | null>(null);
  const [kpiNonce, setKpiNonce] = useState(0);
  const [agg, setAgg] = useState<{
    perStatus: Record<string, number>;
    totalJuz: number;
    totalSet: number;
    khatamPenuh: number;
    peserta: number;
    rataJuz: number | null;
    terdekat: { name: string; period_end: string; sisaHari: number } | null;
  } | null>(null);
  const [exporting, setExporting] = useState(false);

  const list = useAdminList<Campaign>("/khatmil/campaigns", {
    params: { status: filter === "ALL" ? undefined : filter },
    limit: 20,
  });

  // Agregat KPI + count tab dari SELURUH campaign (cursor loop) — angka akurat seluruh data.
  useEffect(() => {
    let ignore = false;
    (async () => {
      const out: Campaign[] = [];
      let cursor: string | null = null;
      for (let hal = 0; hal < 10; hal++) {
        const qs = new URLSearchParams({ limit: "50" });
        if (cursor) qs.set("cursor", cursor);
        const res = await apiGetPage<Campaign>("/khatmil/campaigns", Object.fromEntries(qs));
        out.push(...res.items);
        if (!res.hasMore || !res.nextCursor) break;
        cursor = res.nextCursor;
      }
      if (ignore) return;

      const perStatus: Record<string, number> = {};
      let totalJuz = 0;
      let totalSet = 0;
      let khatamPenuh = 0;
      let peserta = 0;
      let terdekat: { name: string; period_end: string; sisaHari: number } | null = null;
      const hariIni0 = new Date();
      hariIni0.setHours(0, 0, 0, 0);
      for (const c of out) {
        perStatus[c.status] = (perStatus[c.status] ?? 0) + 1;
        const set = (c.group_count ?? 1) * 30;
        totalJuz += c.juz_completed ?? 0;
        totalSet += set;
        if ((c.juz_completed ?? 0) >= set && set > 0) khatamPenuh += c.group_count ?? 1;
        peserta += c.participants ?? 0;
        if (["ACTIVE", "SCHEDULED"].includes(c.status) && c.period_end) {
          const sisa = Math.round((new Date(c.period_end).getTime() - hariIni0.getTime()) / 86_400_000);
          const masihMendekat = sisa >= 0 && (!terdekat || sisa < terdekat.sisaHari);
          if (masihMendekat) terdekat = { name: c.name, period_end: c.period_end, sisaHari: sisa };
        }
      }

      setTotal(out.length);
      setAgg({
        perStatus,
        totalJuz,
        totalSet,
        khatamPenuh,
        peserta,
        rataJuz: peserta > 0 ? Number((totalJuz / peserta).toFixed(1)) : null,
        terdekat,
      });
    })();
    return () => {
      ignore = true;
    };
  }, [kpiNonce]);

  async function exportRekap() {
    setExporting(true);
    try {
      const out: Campaign[] = [];
      let cursor: string | null = null;
      for (let hal = 0; hal < 10; hal++) {
        const qs = new URLSearchParams({ limit: "50" });
        if (cursor) qs.set("cursor", cursor);
        const res = await apiGetPage<Campaign>("/khatmil/campaigns", Object.fromEntries(qs));
        out.push(...res.items);
        if (!res.hasMore || !res.nextCursor) break;
        cursor = res.nextCursor;
      }
      const head = ["id", "nama", "slug", "status", "peserta", "juz_selesai", "progress_pct", "periode"];
      const lines = out.map((c) =>
        [
          c.id,
          `"${c.name.replace(/"/g, '""')}"`,
          c.slug,
          c.status,
          c.participants ?? 0,
          c.juz_completed ?? 0,
          c.progress_pct ?? 0,
          c.period_start ? `${c.period_start} s.d. ${c.period_end ?? "-"}` : "-",
        ].join(",")
      );
      const csv = "\uFEFF" + [head.join(","), ...lines].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `rekap-khatmil-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${out.length} campaign diunduh`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengekspor");
    } finally {
      setExporting(false);
    }
  }

  const items = q.trim()
    ? list.items.filter(
        (c) =>
          c.name?.toLowerCase().includes(q.toLowerCase()) ||
          c.slug?.toLowerCase().includes(q.toLowerCase()),
      )
    : list.items;

  const pctTotal = agg && agg.totalSet > 0 ? Math.round((agg.totalJuz / agg.totalSet) * 100) : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Khatmil"
        total={total}
        totalSuffix="campaign"
        subtitle="Khataman Al-Quran bersama — klik baris untuk progres, kelompok & peserta"
        actions={
          <>
            <Button variant="outline" disabled={exporting} onClick={exportRekap}>
              <Download className="mr-1 h-4 w-4" /> Export Rekap
            </Button>
            <Button onClick={() => router.push("/khatmil/baru")}>
              <Plus className="mr-1 h-4 w-4" /> Campaign Baru
            </Button>
          </>
        }
      />

      {/* KPI — agregat seluruh campaign */}
      <section className="grid grid-cols-1 gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative overflow-hidden rounded-xl border border-emerald-600/40 bg-gradient-to-br from-emerald-700 via-teal-800 to-emerald-900 p-5 text-white shadow-sm transition-transform motion-safe:hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-medium text-emerald-100">
            <span>Total Juz Khatam (Semua Siklus)</span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight">{agg?.totalJuz ?? 0}</span>
              <span className="text-sm font-medium text-emerald-200">dari {agg?.totalSet ?? 0} Juz</span>
            </div>
            <div className="mt-2.5 flex items-center justify-between text-[11px] text-emerald-100">
              <span>{agg?.khatamPenuh ?? 0} campaign khatam penuh</span>
              <span className="font-bold text-emerald-300">{pctTotal}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-emerald-950/60">
              <div className="h-full rounded-full bg-emerald-300" style={{ width: `${pctTotal}%` }} />
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-2xs transition-transform motion-safe:hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Campaign Aktif</span>
            <span className="rounded-lg bg-emerald-50 p-1.5 text-emerald-600 dark:bg-emerald-950/40">
              ⚡
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{agg?.perStatus.ACTIVE ?? 0}</span>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40">
              Berjalan
            </span>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Sedang tilawah harian serentak
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-2xs transition-transform motion-safe:hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Peserta Tilawah</span>
            <span className="rounded-lg bg-teal-50 p-1.5 text-teal-600 dark:bg-teal-950/40">👥</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold">
              {(agg?.perStatus.ACTIVE ?? 0) + (agg?.perStatus.SCHEDULED ?? 0) + (agg?.perStatus.COMPLETED ?? 0) + (agg?.perStatus.CANCELED ?? 0)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">Santri &amp; Ustadz</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Rata-rata capaian:{" "}
            <b>{agg && agg.peserta > 0 ? `${(agg.totalJuz / agg.peserta).toFixed(1)} juz/peserta` : "—"}</b>
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-2xs transition-transform motion-safe:hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
            <span>Target Selesai Terdekat</span>
            <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600 dark:bg-indigo-950/40">🗓️</span>
          </div>
          <div className="mt-3">
            <span className="text-xl font-bold">
              {agg?.terdekat
                ? new Date(agg.terdekat.period_end).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })
                : "—"}
            </span>
          </div>
          <p className="mt-2 truncate text-xs font-medium text-amber-600 dark:text-amber-400">
            {agg?.terdekat ? `${agg.terdekat.name} (sisa ${agg.terdekat.sisaHari} hari)` : "Belum ada campaign berjalan"}
          </p>
        </div>
      </section>

      {/* Toolbar: tab status count + cari + refresh */}
      <div className="space-y-3.5 rounded-xl border bg-card p-4 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium">
            {STATUS_TABS.map((t) => {
              const aktif = filter === (t.v === "ALL" ? "ALL" : t.v);
              const n = t.v === "ALL" ? total : agg?.perStatus[t.v];
              return (
                <button
                  key={t.v}
                  onClick={() => setFilter(t.v)}
                  aria-pressed={aktif}
                  className={`rounded-lg px-3 py-1.5 font-semibold transition-all active:scale-[0.98] ${
                    aktif ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {t.label}
                  {n != null && (
                    <span className={`ml-1.5 rounded-full px-1.5 py-0.2 font-bold ${aktif ? "bg-primary-foreground/20" : "bg-muted"}`}>
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              list.reload();
              setKpiNonce((n) => n + 1);
            }}
          >
            <RefreshCw className={`mr-1 h-4 w-4 ${list.loading ? "motion-safe:animate-spin" : ""}`} /> Muat Ulang
          </Button>
        </div>
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / slug…" />
      </div>

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <Head label="No." className="w-12 text-center" />
              <Head label="Aksi" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-center" />
              <Head label="Nomor" />
              <Head label="Nama Khatmil" />
              <Head label="Mode" className="text-center" />
              <SortHead label="Peserta" col="participants" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-center" />
              <Head label="Juz Selesai per Kelompok" />
              <SortHead label="Progress" col="progress" sort={list.sort} order={list.order} onSort={list.toggleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={5} cols={COLS} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Belum ada khatmil sesuai filter." />
            ) : (
              items.map((c, i) => {
                              const bisaTulis = c.status !== "COMPLETED" && c.status !== "CANCELLED";
                return (
                  <TableRow key={c.id} className="row-accent hover:bg-muted/40">
                    <RowNo i={i} page={list.page} perPage={20} />
                    <AksiCell>
                      <div className="flex items-center gap-1">
                        <TombolAksi href={`/khatmil/${c.id}`} title={`Detail ${c.name}`} />
                        {(bisaTulis || c.status === "ACTIVE" || c.status === "SCHEDULED") && (
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button
                                  size="icon-xs"
                                  variant="ghost"
                                  aria-label={`Aksi lain untuk ${c.name}`}
                                  title="Aksi lain"
                                >
                                  <Ellipsis className="size-3.5" />
                                </Button>
                              }
                            />
                            <DropdownMenuContent align="end" className="w-44">
                              {bisaTulis && (
                                <DropdownMenuItem onClick={() => router.push(`/khatmil/${c.id}/edit`)}>
                                  <Pencil className="size-3.5" /> Ubah
                                </DropdownMenuItem>
                              )}
                              {(c.status === "ACTIVE" || c.status === "SCHEDULED") && (
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`Batalkan campaign "${c.name}"? Tindakan ini permanen.`))
                                      patchCampaign(c, { status: "CANCELLED" }, "Campaign dibatalkan").then((ok) => ok && list.reload());
                                  }}
                                >
                                  <Ban className="size-3.5" /> Batalkan
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </div>
                    </AksiCell>
                    <TableCell className="text-center">
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <NomorChip label={`#${c.id}`} title={`Nomor campaign #${c.id}`} />
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-emerald-50 text-xs font-bold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {inisial(c.name)}
                        </span>
                        <div className="min-w-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/khatmil/${c.id}`);
                            }}
                            className="block truncate text-left text-sm font-bold hover:text-primary"
                          >
                            {c.name}
                          </button>
                          <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <code className="rounded bg-muted px-1 font-mono text-[10px]">{c.slug}</code>
                            {c.period_start && (
                              <span>
                                {fmtDateInput(c.period_start)}
                                {c.period_end ? ` – ${fmtDateInput(c.period_end)}` : ""}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="rounded border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        {c.mode === "SEQUENTIAL" ? "Bergiliran" : "Paralel"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-sm font-semibold">{c.participants}</TableCell>
                    <TableCell>
                      <div className="max-w-56 space-y-0.5 text-[11px]">
                        {groupProgressList(c).map((g) => (
                          <div key={g.group_no} className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Kelompok {g.group_no}:</span>
                            <span className={`font-semibold ${g.completed_juz >= 30 ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                              {g.completed_juz} dari 30 juz selesai
                            </span>
                            {g.completed_juz >= 30 && (
                              <span className="rounded bg-emerald-50 px-1 text-[9px] font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                                KHATAM
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${c.progress_pct >= 100 ? "bg-emerald-600" : "bg-emerald-500"}`}
                            style={{ width: `${c.progress_pct ?? 0}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${c.progress_pct >= 100 ? "text-emerald-700 dark:text-emerald-400" : ""}`}>
                          {c.progress_pct}%
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableShell>

      <Pager page={list.page} hasMore={list.hasMore} loading={list.loading} onPrev={list.goPrev} onNext={list.goNext} />
    </div>
  );
}
