"use client";

import { useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, Clock, Copy, ListFilter, RefreshCw, XCircle } from "lucide-react";
import { apiGetPage } from "@/lib/api";
import { AnimatedRupiah } from "@/components/animated-rupiah";
import { Button } from "@/components/ui/button";
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
  TombolAksi,
} from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { useAdminList } from "@/hooks/use-admin-list";
import { rp, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Visit {
  id: number;
  status: string;
  scheduled_at: string;
  duration_hours: number;
  price_total: number;
  requester: { full_name: string } | null;
  ustadz: { full_name: string } | null;
  payment: { status: string; channel: string | null; refunded_amount: number } | null;
}

/** KPI: [label, status (null = semua), gaya kartu, ikon] */
const KPI: { label: string; status: string | null; tone: string; icon: React.ReactNode }[] = [
  { label: "Total Kunjungan", status: null, tone: "border-slate-200", icon: <ListFilter className="size-4" /> },
  { label: "Menunggu Bayar", status: "REQUESTED", tone: "border-amber-200 bg-amber-50/30", icon: <Clock className="size-4" /> },
  { label: "Terjadwal", status: "CONFIRMED", tone: "border-indigo-100 bg-indigo-50/30", icon: <CalendarDays className="size-4" /> },
  { label: "Selesai & Dinilai", status: "REVIEWED", tone: "border-emerald-200/80 bg-emerald-50/30", icon: <CheckCircle2 className="size-4" /> },
  {
    label: "Dibatalkan / Ditolak",
    status: "BURUK",
    tone: "border-rose-200/70 bg-rose-50/20",
    icon: <XCircle className="size-4" />,
  },
];

const inisial = (nama: string | null | undefined) =>
  (nama ?? "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "–";

function metodeLabel(v: Visit) {
  if (!v.payment) return "-";
  const ch =
    v.payment.channel === "DEPOSIT"
      ? "Saldo Deposit"
      : v.payment.channel
        ? `Xendit (${v.payment.channel})`
        : "Xendit";
  return v.payment.refunded_amount > 0 ? `${ch} (-${rp(v.payment.refunded_amount)})` : ch;
}

function labelBuruk(v: Visit) {
  if (v.status === "DECLINED") return "Ditolak Ustadz";
  if (v.status === "CANCELED") return "Dibatalkan Santri";
  if (v.status === "PAYMENT_EXPIRED") return "Kedaluwarsa Bayar";
  return null;
}

export default function VisitsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [kpiNonce, setKpiNonce] = useState(0);
  const [total, setTotal] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [fin, setFin] = useState<{
    bruto: number;
    pendingNominal: number;
    pendingChannel: string[];
    terjadwalNominal: number;
    netSelesai: number;
    refund: number;
    bulanIni: number;
    deltaPct: number | null;
    rata2: number;
    hariIniNominal: number;
    hariIniSelesai: number;
    hariIniMendatang: number;
  } | null>(null);

  const list = useAdminList<Visit>("/admin/visits", {
    params: { status: filter === "ALL" ? undefined : filter },
    limit: 20,
  });

  // Agregasi finansial dari SELURUH pesanan (cursor loop) — angka nominal akurat, bukan halaman aktif.
  useEffect(() => {
    let ignore = false;
    (async () => {
      const out: Visit[] = [];
      let cursor: string | null = null;
      for (let hal = 0; hal < 25; hal++) {
        const qs = new URLSearchParams({ limit: "50" });
        if (cursor) qs.set("cursor", cursor);
        const res = await apiGetPage<Visit>("/admin/visits", Object.fromEntries(qs));
        out.push(...res.items);
        if (!res.hasMore || !res.nextCursor) break;
        cursor = res.nextCursor;
      }
      if (ignore) return;
      const jumlah = (arr: Visit[], f: (v: Visit) => boolean) =>
        arr.filter(f).reduce((a, v) => a + (v.price_total ?? 0), 0);
      const now = new Date();
      const bulanIniKey = `${now.getFullYear()}-${now.getMonth()}`;
      const blnLaluKey = `${now.getFullYear()}-${now.getMonth() - 1}`;
      const sumBulan = (key: string) =>
        out
          .filter((v) => {
            const d = new Date(v.scheduled_at);
            return `${d.getFullYear()}-${d.getMonth()}` === key;
          })
          .reduce((a, v) => a + (v.price_total ?? 0), 0);
      const bulanIni = sumBulan(bulanIniKey);
      const blnLalu = sumBulan(blnLaluKey);
      const pending = out.filter((v) => v.status === "REQUESTED");
      const ch = new Map<string, number>();
      for (const v of pending) {
        const label = v.payment?.channel === "DEPOSIT" ? "Deposit" : v.payment?.channel ? `Xendit ${v.payment.channel}` : "Xendit";
        ch.set(label, (ch.get(label) ?? 0) + 1);
      }
      const kini0 = new Date(); kini0.setHours(0, 0, 0, 0);
      const besok = new Date(kini0); besok.setDate(besok.getDate() + 1);
      const hariIni = out.filter((v) => {
        const d = new Date(v.scheduled_at);
        return d >= kini0 && d < besok;
      });
      setCounts({
        ALL: out.length,
        REQUESTED: out.filter((v) => v.status === "REQUESTED").length,
        CONFIRMED: out.filter((v) => v.status === "CONFIRMED").length,
        REVIEWED: out.filter((v) => v.status === "REVIEWED").length,
        BURUK: out.filter((v) => ["DECLINED", "CANCELED", "PAYMENT_EXPIRED"].includes(v.status)).length,
      });
      setTotal(out.length);
      setFin({
        bruto: jumlah(out, () => true),
        pendingNominal: jumlah(out, (v) => v.status === "REQUESTED"),
        pendingChannel: [...ch.entries()].map(([label, n]) => `${n} ${label}`),
        terjadwalNominal: jumlah(out, (v) => v.status === "CONFIRMED"),
        netSelesai: out
          .filter((v) => v.status === "REVIEWED")
          .reduce((a, v) => a + (v.price_total ?? 0) - (v.payment?.refunded_amount ?? 0), 0),
        refund: out.reduce((a, v) => a + (v.payment?.refunded_amount ?? 0), 0),
        bulanIni,
        deltaPct: blnLalu > 0 ? Number((((bulanIni - blnLalu) / blnLalu) * 100).toFixed(1)) : null,
        rata2: out.length ? Math.round(jumlah(out, () => true) / out.length) : 0,
        hariIniNominal: hariIni.reduce((a, v) => a + (v.price_total ?? 0), 0),
        hariIniSelesai: hariIni.filter((v) => v.status === "COMPLETED" || v.status === "REVIEWED").length,
        hariIniMendatang: hariIni.filter((v) => !["COMPLETED", "REVIEWED"].includes(v.status)).length,
      });
    })();
    return () => {
      ignore = true;
    };
  }, [kpiNonce]);

  const items = q.trim()
    ? list.items.filter(
        (v) =>
          v.requester?.full_name?.toLowerCase().includes(q.toLowerCase()) ||
          v.ustadz?.full_name?.toLowerCase().includes(q.toLowerCase()) ||
          String(v.id) === q.trim().replace(/^#KJ-0*/i, ""),
      )
    : list.items;

  function salinId(id: number) {
    navigator.clipboard
      .writeText(`#KJ-${String(id).padStart(4, "0")}`)
      .then(() => toast.success("ID pesanan disalin"))
      .catch(() => toast.error("Gagal menyalin"));
  }

  return (
    <div className="@container space-y-5">
      <PageHeader
        title="Kunjungan"
        total={total}
        totalSuffix="pesanan tercatat"
        subtitle="Pesanan ngaji ke rumah santri — klik Buka untuk detail, chat & tindakan admin"
      />

      {/* Finansial: bulan ini / hari ini / pending — dari seluruh pesanan */}
      <section className="grid grid-cols-1 gap-3.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 md:grid-cols-2 @[1024px]:grid-cols-3">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-xl bg-gradient-to-br from-emerald-900 to-emerald-600 p-4 text-white shadow-sm transition-transform motion-safe:hover:-translate-y-0.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-100">Total Pendapatan (bulan ini)</span>
            {fin?.deltaPct != null && (
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ${fin.deltaPct >= 0 ? "bg-white/20" : "bg-black/20"}`}>
                {fin.deltaPct >= 0 ? "+" : ""}
                {fin.deltaPct}% vs bln lalu
              </span>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold tracking-tight">
              <AnimatedRupiah value={fin?.bulanIni ?? 0} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-emerald-100">
              <span>Akumulasi dari {counts.ALL ?? "—"} pesanan</span>
              <span className="whitespace-nowrap font-medium">
                Rata-rata ~{fin ? rp(fin.rata2) : "—"}/sesi
              </span>
            </p>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-transform motion-safe:hover:-translate-y-0.5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <CalendarDays className="size-4 text-primary" /> Pendapatan Hari Ini
            </span>
            <span className="whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40">
              {(fin?.hariIniSelesai ?? 0) + (fin?.hariIniMendatang ?? 0)} Sesi
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight">
              <AnimatedRupiah value={fin?.hariIniNominal ?? 0} />
            </div>
            <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
              <span className="font-medium text-emerald-700 dark:text-emerald-400">
                {fin?.hariIniSelesai ?? 0} Selesai
              </span>
              <span className="text-border">•</span>
              <span className="font-medium text-indigo-600 dark:text-indigo-400">
                {fin?.hariIniMendatang ?? 0} Mendatang
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col justify-between rounded-xl border border-amber-200 bg-amber-50/30 p-4 shadow-sm transition-transform motion-safe:hover:-translate-y-0.5 dark:border-amber-800 dark:bg-amber-950/20">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="flex items-center gap-1.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              <Clock className="size-4 text-amber-600" /> Menunggu Pembayaran
            </span>
            <span className="motion-safe:animate-pulse whitespace-nowrap rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900">
              Perlu Verifikasi
            </span>
          </div>
          <div className="mt-3">
            <div className="text-xl font-bold tracking-tight text-amber-900 dark:text-amber-300">
              <AnimatedRupiah value={fin?.pendingNominal ?? 0} />
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-amber-700 dark:text-amber-400">
              <span>{counts.REQUESTED ?? 0} pesanan pending gateway</span>
              <span className="whitespace-nowrap font-medium">{fin?.pendingChannel.join(", ") || "—"}</span>
            </p>
          </div>
        </div>
      </section>

      {/* KPI per status + nominal */}
      <section className="grid grid-cols-2 gap-3.5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:[animation-delay:75ms] motion-safe:duration-500 md:grid-cols-3 @[1100px]:grid-cols-5">
        {KPI.map((k) => {
          const aktif =
            k.status === null ? filter === "ALL" : k.status === "BURUK" ? ["DECLINED", "CANCELED", "PAYMENT_EXPIRED"].includes(filter) : filter === k.status;
          const n = counts[k.status ?? "ALL"];
          const nominal =
            k.status === "BURUK"
              ? fin?.refund
              : k.status === "REQUESTED"
                ? fin?.pendingNominal
                : k.status === "CONFIRMED"
                  ? fin?.terjadwalNominal
                  : k.status === "REVIEWED"
                    ? fin?.netSelesai
                    : fin?.bruto;
          const nominalLabel =
            k.status === "BURUK" ? "Refund:" : k.status === "REVIEWED" ? "Net Selesai:" : k.status === null ? "Bruto:" : "Nominal:";
          return (
            <button
              key={k.label}
              onClick={() => setFilter(k.status ?? "ALL")}
              aria-pressed={aktif}
              className={`rounded-xl border p-3.5 text-left shadow-sm transition-all active:scale-[0.98] motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-md ${
                aktif ? "border-primary/50 ring-1 ring-primary/30" : k.tone
              } bg-card`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="min-w-0 text-xs font-medium text-muted-foreground">{k.label}</span>
                <span className="shrink-0 rounded-lg bg-muted p-1.5 text-muted-foreground">{k.icon}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="text-xl font-bold tabular-nums">{n ?? "—"}</span>
              </div>
              <div className="mt-1 flex flex-col items-start gap-y-0.5 border-t pt-1 text-[11px] font-semibold @[1100px]:flex-row @[1100px]:items-center @[1100px]:justify-between @[1100px]:gap-x-2">
                <span className="whitespace-nowrap font-normal text-muted-foreground">{nominalLabel}</span>
                <AnimatedRupiah value={nominal ?? 0} className="whitespace-nowrap tabular-nums" />
              </div>
            </button>
          );
        })}
      </section>

      {/* Filter: cari + segmented status dengan count + refresh */}
      <div className="space-y-3.5 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              onClick={() => setFilter("ALL")}
              aria-pressed={filter === "ALL"}
              className={`rounded-lg px-3 py-1.5 font-semibold transition ${
                filter === "ALL" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Semua ({counts.ALL ?? total ?? 0})
            </button>
            {[
              ["REQUESTED", "Menunggu Bayar"],
              ["CONFIRMED", "Terjadwal"],
              ["REVIEWED", "Selesai & Dinilai"],
            ].map(([v, label]) => (
              <button
                key={v}
                onClick={() => setFilter(v)}
                aria-pressed={filter === v}
                className={`rounded-lg px-3 py-1.5 font-medium transition ${
                  filter === v ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}{" "}
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 font-semibold">{counts[v] ?? 0}</span>
              </button>
            ))}
            <button
              onClick={() => setFilter("BURUK")}
              aria-pressed={["DECLINED", "CANCELED", "PAYMENT_EXPIRED"].includes(filter)}
              className={`rounded-lg px-3 py-1.5 font-medium transition ${
                ["DECLINED", "CANCELED", "PAYMENT_EXPIRED"].includes(filter)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              Dibatalkan / Ditolak ({counts.BURUK ?? 0})
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Cari santri / ustadz / nomor order #KJ..." />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              list.reload();
              setKpiNonce((n) => n + 1);
            }}
          >
            <RefreshCw className={`size-4 ${list.loading ? "animate-spin" : ""}`} /> Muat Ulang
          </Button>
        </div>
      </div>

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <Head label="No." className="w-12" />
              <Head label="Aksi" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="Nomor" className="w-28" />
              <Head label="Santri" />
              <Head label="Ustadz Pembimbing" />
              <SortHead label="Jadwal & Sesi" col="scheduled_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="Biaya & Metode" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={5} cols={8} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={8} message="Belum ada kunjungan sesuai filter." />
            ) : (
              items.map((v, i) => {
                const buruk = labelBuruk(v);
                return (
                  <TableRow key={v.id} className="visits-row hover:bg-muted/40">
                    <RowNo i={i} page={list.page} perPage={20} />
                    <AksiCell>
                      <TombolAksi href={`/visits/${v.id}`} title={`Buka kunjungan #KJ-${String(v.id).padStart(4, "0")}`} />
                    </AksiCell>
                    <TableCell>
                      {buruk ? (
                        <span className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700 shadow-sm dark:border-rose-800 dark:bg-rose-950/40">
                          {buruk}
                        </span>
                      ) : (
                        <StatusPill status={v.status} />
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
                          title={`Nomor pesanan #KJ-${String(v.id).padStart(4, "0")}`}
                        >
                          #KJ-{String(v.id).padStart(4, "0")}
                        </span>
                        <button
                          onClick={() => salinId(v.id)}
                          className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                          title={`Salin ID #KJ-${String(v.id).padStart(4, "0")}`}
                          aria-label={`Salin ID pesanan ${v.id}`}
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                          {inisial(v.requester?.full_name)}
                        </span>
                        <span className="text-sm font-semibold">{v.requester?.full_name ?? "-"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {v.ustadz?.full_name ? (
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border bg-muted text-[10px] font-semibold text-muted-foreground">
                            {inisial(v.ustadz.full_name)}
                          </span>
                          <span className="text-sm font-medium">{v.ustadz.full_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">Menunggu penetapan</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="whitespace-nowrap text-sm font-medium">{fmtDateTime(v.scheduled_at)}</div>
                      <span className="mt-0.5 inline-flex items-center rounded bg-muted px-1.5 py-0.2 text-[10px] font-medium text-muted-foreground">
                        {v.duration_hours} Jam
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="whitespace-nowrap text-xs font-bold">{rp(v.price_total)}</div>
                      <span
                        className={`mt-0.5 inline-flex items-center rounded border px-1.5 py-0.2 text-[10px] font-medium ${
                          v.payment && v.payment.refunded_amount > 0
                            ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-800 dark:bg-rose-950/40"
                            : "border-border bg-muted text-muted-foreground"
                        }`}
                      >
                        {metodeLabel(v)}
                      </span>
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
