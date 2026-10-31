"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, RefreshCw } from "lucide-react";
import { apiGetPage } from "@/lib/api";
import { AnimatedRupiah } from "@/components/animated-rupiah";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payment {
  id: number;
  external_id: string;
  provider: string;
  channel: string | null;
  amount: number;
  status: string;
  subject_type: string; // ustadz_visit | wallet_topup
  subject_id: number;
  subject_label: string;
  created_at: string;
  paid_at: string | null;
}

const jenisLabel: Record<string, string> = {
  ustadz_visit: "Kunjungan",
  wallet_topup: "Top-up deposit",
};

/** Tab status + agregat nominal dihitung dari SELURUH invoice (cursor loop). */
const TABS: { key: string; label: string; status: string[] | null }[] = [
  { key: "ALL", label: "Semua", status: null },
  { key: "PAID", label: "Lunas", status: ["PAID"] },
  { key: "PENDING", label: "Menunggu ACC", status: ["PENDING"] },
  { key: "REFUNDED", label: "Dikembalikan ke deposit", status: ["REFUNDED"] },
  { key: "EXPIRED", label: "Kedaluwarsa", status: ["EXPIRED"] },
  { key: "FAILED", label: "Gagal", status: ["FAILED"] },
];

export default function PaymentsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("ALL");
  const [tab, setTab] = useState("ALL");
  const [total, setTotal] = useState<number | null>(null);
  const [agg, setAgg] = useState<{
    perStatus: Record<string, { n: number; nominal: number }>;
    bulanIni: number;
    deltaPct: number | null;
    rata2: number;
    hariIniNominal: number;
    hariIniCount: number;
  } | null>(null);
  const [kpiNonce, setKpiNonce] = useState(0);

  const list = useAdminList<Payment>("/admin/payments", {
    params: {
      status: tab === "ALL" ? undefined : tab,
      subject_type: jenis === "ALL" ? undefined : jenis,
    },
    limit: 50,
  });

  // KPI nominal — dihitung dari SELURUH invoice (cursor loop, guard 10 halaman = 500),
  // bukan dari halaman aktif. Count per status ikut, sehingga /admin/count tidak diperlukan.
  useEffect(() => {
    let ignore = false;
    (async () => {
      const out: Payment[] = [];
      let cursor: string | null = null;
      for (let hal = 0; hal < 10; hal++) {
        const qs = new URLSearchParams({ limit: "50" });
        if (cursor) qs.set("cursor", cursor);
        const res = await apiGetPage<Payment>("/admin/payments", Object.fromEntries(qs));
        out.push(...res.items);
        if (!res.hasMore || !res.nextCursor) break;
        cursor = res.nextCursor;
      }
      if (ignore) return;

      const perStatus: Record<string, { n: number; nominal: number }> = {};
      for (const p of out) {
        const s = (perStatus[p.status] ??= { n: 0, nominal: 0 });
        s.n += 1;
        s.nominal += p.amount ?? 0;
      }
      const now = new Date();
      const kunci = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;
      const bulanIniKey = kunci(now);
      const blnLaluKey = kunci(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const sumBulan = (key: string) =>
        out
          .filter((p) => kunci(new Date(p.created_at)) === key)
          .reduce((a, p) => a + (p.amount ?? 0), 0);
      const bulanIni = sumBulan(bulanIniKey);
      const blnLalu = sumBulan(blnLaluKey);
      const kini0 = new Date();
      kini0.setHours(0, 0, 0, 0);
      const besok = new Date(kini0);
      besok.setDate(besok.getDate() + 1);
      const hariIni = out.filter((p) => {
        const d = new Date(p.paid_at ?? p.created_at);
        return d >= kini0 && d < besok && p.status === "PAID";
      });

      setTotal(out.length);
      setAgg({
        perStatus,
        bulanIni,
        deltaPct: blnLalu > 0 ? Number((((bulanIni - blnLalu) / blnLalu) * 100).toFixed(1)) : null,
        rata2: out.length ? Math.round(out.reduce((a, p) => a + (p.amount ?? 0), 0) / out.length) : 0,
        hariIniNominal: hariIni.reduce((a, p) => a + (p.amount ?? 0), 0),
        hariIniCount: hariIni.length,
      });
    })();
    return () => {
      ignore = true;
    };
  }, [kpiNonce]);

  const items = q.trim()
    ? list.items.filter(
        (p) =>
          p.subject_label?.toLowerCase().includes(q.toLowerCase()) ||
          p.external_id?.toLowerCase().includes(q.toLowerCase()) ||
          String(p.id) === q.trim().replace(/^#INV-0*/i, ""),
      )
    : list.items;

  const kpi = [
    {
      label: "Total Pemasukan (bulan ini)",
      nilai: agg?.bulanIni ?? 0,
      sub: `Akumulasi dari ${total ?? "—"} invoice • Rata-rata ~${agg ? rp(agg.rata2) : "—"}`,
      delta: agg?.deltaPct ?? null,
      tone: "bg-gradient-to-br from-emerald-900 to-emerald-600 text-white border-transparent",
      subTone: "text-emerald-100",
    },
    {
      label: "Pemasukan Hari Ini",
      nilai: agg?.hariIniNominal ?? 0,
      sub: `${agg?.hariIniCount ?? 0} transaksi berhasil (Lunas)`,
      delta: null,
      tone: "border bg-card",
      subTone: "text-muted-foreground",
    },
    {
      label: "Perlu Verifikasi / Pending",
      nilai: agg?.perStatus.PENDING?.nominal ?? 0,
      sub: `${agg?.perStatus.PENDING?.n ?? 0} invoice menunggu ACC`,
      delta: null,
      tone: "border border-amber-200 bg-amber-50/40 dark:border-amber-800 dark:bg-amber-950/20",
      subTone: "text-amber-700 dark:text-amber-400",
    },
    {
      label: "Dikembalikan ke Deposit",
      nilai: agg?.perStatus.REFUNDED?.nominal ?? 0,
      sub: `${agg?.perStatus.REFUNDED?.n ?? 0} invoice ter-refund • otomatis ke saldo santri`,
      delta: null,
      tone: "border bg-card",
      subTone: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Pembayaran (Xendit)"
        total={total}
        totalSuffix="invoice tercatat"
        subtitle="Semua invoice: pembayaran kunjungan dan top-up deposit. Pengembalian dana selalu otomatis masuk ke deposit santri."
      />

      {/* KPI nominal — dari seluruh invoice */}
      <section className="grid grid-cols-1 gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 sm:grid-cols-2 lg:grid-cols-4">
        {kpi.map((k) => (
          <div
            key={k.label}
            className={`flex flex-col justify-between rounded-2xl border p-5 shadow-sm transition-transform motion-safe:hover:-translate-y-0.5 ${k.tone}`}
          >
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-medium ${k.tone.includes("gradient") ? "text-emerald-100" : "text-muted-foreground"}`}>
                  {k.label}
                </span>
                {k.delta != null && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      k.delta >= 0 ? "bg-white/20 text-white" : "bg-black/10 text-foreground/70"
                    }`}
                  >
                    {k.delta >= 0 ? "+" : ""}
                    {k.delta}% vs bln lalu
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-2xl font-bold tabular-nums tracking-tight">
                <AnimatedRupiah value={k.nilai} />
              </h3>
            </div>
            <p className={`mt-4 border-t pt-3 text-[11px] ${k.tone.includes("gradient") ? "border-white/20" : "border-border"} ${k.subTone}`}>
              {k.sub}
            </p>
          </div>
        ))}
      </section>

      {/* Tab status + nominal + filter jenis & cari */}
      <div className="space-y-3.5 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5 border-b pb-3.5 text-xs">
          {TABS.map((t) => {
            const aktif = tab === t.key;
            const stat = t.status ? agg?.perStatus[t.status[0]] : { n: total ?? 0, nominal: null as number | null };
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                aria-pressed={aktif}
                className={`rounded-lg px-3.5 py-1.5 font-semibold transition ${
                  aktif ? "border border-primary/30 bg-primary/10 text-primary" : "border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t.label}
                {stat && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 font-semibold">
                    {stat.n}
                    {stat.nominal != null ? ` · ${rp(stat.nominal)}` : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={q} onChange={setQ} placeholder="Cari pihak terkait / santri / no. invoice #INV…" />
          <Select
            value={jenis}
            items={{ ALL: "Semua jenis", ustadz_visit: "Kunjungan", wallet_topup: "Top-up deposit" }}
            onValueChange={(v) => setJenis(v ?? "ALL")}
          >
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua jenis</SelectItem>
              <SelectItem value="ustadz_visit">Kunjungan</SelectItem>
              <SelectItem value="wallet_topup">Top-up deposit</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              list.reload();
              setKpiNonce((n) => n + 1);
            }}
          >
            <RefreshCw className={`size-4 ${list.loading ? "motion-safe:animate-spin" : ""}`} /> Muat Ulang
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
              <SortHead label="Nomor" col="id" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="Jenis" />
              <Head label="Untuk / Keterangan" />
              <SortHead label="Nominal" col="amount" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-right" />
              <Head label="Metode" />
              <SortHead label="Dibuat" col="created_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <SortHead label="Dibayar" col="paid_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={6} cols={10} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={10} message="Tidak ada pembayaran sesuai filter." />
            ) : (
              items.map((p, i) => {
                const nomor = p.external_id || `#INV-${p.id}`;
                return (
                <TableRow
                  key={p.id}
                  className={p.subject_type === "ustadz_visit" ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}
                  onClick={() => p.subject_type === "ustadz_visit" && router.push(`/visits/${p.subject_id}`)}
                >
                  <RowNo i={i} page={list.page} perPage={50} />
                  <AksiCell>
                    {p.subject_type === "ustadz_visit" ? (
                      <TombolAksi href={`/visits/${p.subject_id}`} title={`Detail kunjungan #${p.subject_id}`} />
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </AksiCell>
                  <TableCell>
                    <StatusPill status={p.status} />
                    {p.status === "PENDING" && (
                      <span className="motion-safe:animate-pulse ml-1.5 inline-block size-1.5 rounded-full bg-amber-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span
                        className="inline-block max-w-40 truncate rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
                        title={`${nomor}${p.external_id ? ` (invoice #${p.id})` : ""}`}
                      >
                        {nomor}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard
                            .writeText(nomor)
                            .then(() => toast.success("Nomor transaksi disalin"))
                            .catch(() => toast.error("Gagal menyalin"));
                        }}
                        className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                        title={`Salin ${nomor}`}
                        aria-label={`Salin nomor transaksi ${nomor}`}
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="rounded border bg-muted px-2 py-0.5 text-[11px] font-medium">
                      {jenisLabel[p.subject_type] ?? p.subject_type}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-72">
                    <span className="line-clamp-1 text-sm" title={p.subject_label}>
                      {p.subject_label}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                    {rp(p.amount)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {p.channel === "DEPOSIT" ? "Saldo (deposit)" : p.channel ? `Xendit (${p.channel})` : "Xendit"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(p.created_at)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {p.paid_at ? fmtDateTime(p.paid_at) : "—"}
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
