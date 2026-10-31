"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Download, History, Plus, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { apiGet, apiGetPage, apiPost, ApiError } from "@/lib/api";
import { AnimatedRupiah } from "@/components/animated-rupiah";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  PageHeader,
  Toolbar,
  SearchInput,
  RefreshButton,
  TableShell,
  Head,
  TableSkeleton,
  EmptyRow,
  Pager,
  RowNo,
  AksiCell,
  NomorChip,
  TombolAksi,
} from "@/components/data-table";
import { StatusPill, statusLabel } from "@/components/status-pill";
import { useAdminList } from "@/hooks/use-admin-list";
import { rp, fmtDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BalanceRow {
  user_id: number;
  full_name: string;
  balance: number;
}

interface Tx {
  id: number;
  tx_type: string; // TOPUP | PAYMENT | REFUND | EARNING | PAYOUT | ADJUST
  amount: number;
  balance_after: number;
  subject_type: string | null;
  subject_id: number | null;
  created_at: string;
}

interface Adjustment {
  id: number;
  user_id: number;
  user_name: string;
  admin_email: string | null;
  amount: number;
  reason: string;
  status: string; // PENDING | ACCEPTED | REJECTED
  created_at: string;
  handled_at: string | null;
}

const txLabel: Record<string, string> = {
  TOPUP: "Top-up deposit",
  PAYMENT: "Bayar kunjungan",
  REFUND: "Pengembalian dana",
  EARNING: "Penghasilan kunjungan",
  PAYOUT: "Penarikan dana",
  ADJUST: "Penyesuaian saldo",
};

const txCredit: Record<string, boolean> = {
  TOPUP: true,
  REFUND: true,
  EARNING: true,
  PAYMENT: false,
  PAYOUT: false,
};

const ADJ_STATUS = ["PENDING", "ACCEPTED", "REJECTED"];

export default function DepositPage() {
  const [tab, setTab] = useState<"SANTRI" | "USTADZ" | "ADJ">("SANTRI");
  const [q, setQ] = useState("");
  const [nomFilter, setNomFilter] = useState("semua");
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BalanceRow | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [kpiNonce, setKpiNonce] = useState(0);
  const [kpi, setKpi] = useState<{
    santri: { sum: number; n: number; zero: number };
    ustadz: { sum: number; n: number; zero: number };
  } | null>(null);

  const [adjFilter, setAdjFilter] = useState("ALL");
  const adjList = useAdminList<Adjustment>("/admin/wallet-adjustments", {
    params: { status: adjFilter === "ALL" ? undefined : adjFilter },
    limit: 50,
  });

  // KPI dari seluruh rekening kedua role — bukan hanya tab aktif.
  useEffect(() => {
    let ignore = false;
    (async () => {
      const ambil = async (role: string) => {
        try {
          const d = await apiGet<{ items: BalanceRow[] }>(`/admin/wallet?role=${role}`);
          return d.items ?? [];
        } catch {
          return [] as BalanceRow[];
        }
      };
      const [santri, ustadz] = await Promise.all([ambil("SANTRI"), ambil("USTADZ")]);
      if (ignore) return;
      const sum = (arr: BalanceRow[]) => arr.reduce((a, r) => a + (r.balance ?? 0), 0);
      setKpi({
        santri: { sum: sum(santri), n: santri.length, zero: santri.filter((r) => (r.balance ?? 0) === 0).length },
        ustadz: { sum: sum(ustadz), n: ustadz.length, zero: ustadz.filter((r) => (r.balance ?? 0) === 0).length },
      });
    })();
    return () => {
      ignore = true;
    };
  }, [kpiNonce]);

  // reload dari handler (tombol Muat Ulang / setelah penyesuaian)
  function muatRows() {
    setLoading(true);
    const qs = new URLSearchParams({ role: tab });
    if (q.trim()) qs.set("q", q.trim());
    apiGet<{ items: BalanceRow[] }>(`/admin/wallet?${qs.toString()}`)
      .then((d) => setRows(d.items ?? []))
      .catch((e: unknown) => toast.error(e instanceof ApiError ? e.message : "Gagal memuat data saldo"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (tab === "ADJ") return;
    let ignore = false;
    const qs = new URLSearchParams({ role: tab });
    if (q.trim()) qs.set("q", q.trim());
    apiGet<{ items: BalanceRow[] }>(`/admin/wallet?${qs.toString()}`)
      .then((d) => {
        if (!ignore) {
          setRows(d.items ?? []);
          setSelected(null); // reset detail — jalur async, bukan sinkron di effect
        }
      })
      .catch((e: unknown) => {
        if (!ignore) toast.error(e instanceof ApiError ? e.message : "Gagal memuat data saldo");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [tab, q]);

  async function openUser(row: BalanceRow) {
    setSelected(row);
    setTxLoading(true);
    try {
      const d = await apiGetPage<Tx>(`/admin/wallet/${row.user_id}/transactions`);
      setTxs(d.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat mutasi");
    } finally {
      setTxLoading(false);
    }
  }

  async function submitAdjustment() {
    if (!selected) return;
    const amount = Number.parseInt(adjAmount.replace(/[^\d-]/g, ""), 10);
    if (!Number.isInteger(amount) || amount === 0) {
      toast.error("Nominal harus angka (boleh minus utk pengurangan)");
      return;
    }
    if (adjReason.trim().length < 5) {
      toast.error("Alasan wajib diisi (min 5 karakter)");
      return;
    }
    setSubmitting(true);
    try {
      await apiPost(`/admin/wallet/${selected.user_id}/adjustment`, {
        amount,
        reason: adjReason.trim(),
      });
      toast.success("Penyesuaian diajukan — menunggu ACC santri/ustadz di aplikasi (saldo belum berubah)");
      setAdjOpen(false);
      setAdjAmount("");
      setAdjReason("");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengajukan");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Saldo & Mutasi"
        subtitle="Deposit santri & penghasilan ustadz. Saldo hanya berubah melalui mutasi — koreksi membutuhkan ACC pihak terkait di aplikasi."
        actions={
          <div className="flex items-center gap-2.5">
            <Tabs value={tab} onValueChange={(v) => { setTab(v as typeof tab); setNomFilter("semua"); }}>
              <TabsList>
                <TabsTrigger value="SANTRI">Saldo Santri</TabsTrigger>
                <TabsTrigger value="USTADZ">Saldo Ustadz</TabsTrigger>
                <TabsTrigger value="ADJ">Penyesuaian</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="outline" size="sm" onClick={() => setTab("ADJ")}>
              <History className="size-4" /> Riwayat Penyesuaian
            </Button>
          </div>
        }
      />

      {/* KPI — dihitung dari seluruh rekening kedua role */}
      {tab !== "ADJ" && (
        <section className="grid grid-cols-1 gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-800 to-emerald-950 p-5 text-white shadow-lg shadow-emerald-900/15 transition-transform motion-safe:hover:-translate-y-0.5">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-emerald-200">
              <span>Total Saldo Tersimpan</span>
              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/25 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                {(kpi?.santri.n ?? 0) + (kpi?.ustadz.n ?? 0)} Rekening
              </span>
            </div>
            <div className="my-1 font-mono text-2xl font-bold tracking-tight lg:text-[26px]">
              <AnimatedRupiah value={(kpi?.santri.sum ?? 0) + (kpi?.ustadz.sum ?? 0)} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-emerald-700/50 pt-3 text-[11px] text-emerald-200/90">
              <span>Akumulasi saldo santri &amp; ustadz</span>
              <span className="flex items-center gap-1 font-medium text-emerald-300">
                <ShieldCheck className="size-3" /> Terproteksi
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-2xs transition-transform motion-safe:hover:-translate-y-0.5">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Saldo Deposit Santri</span>
              <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:border-blue-800 dark:bg-blue-950/40">
                {kpi?.santri.n ?? 0} Akun
              </span>
            </div>
            <div className="my-1 font-mono text-2xl font-bold tracking-tight">
              <AnimatedRupiah value={kpi?.santri.sum ?? 0} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
              <span>Untuk bayar SPP &amp; pesanan</span>
              <span className="font-medium">
                Rata-rata: {kpi && kpi.santri.n > 0 ? rp(Math.round(kpi.santri.sum / kpi.santri.n)) : "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-2xs transition-transform motion-safe:hover:-translate-y-0.5">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>Dompet Aktif Ustadz</span>
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40">
                {kpi?.ustadz.n ?? 0} Akun
              </span>
            </div>
            <div className="my-1 font-mono text-2xl font-bold tracking-tight">
              <AnimatedRupiah value={kpi?.ustadz.sum ?? 0} />
            </div>
            <div className="mt-3 flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
              <span>Siap ditarik ustadz</span>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-2xl border border-rose-200/80 bg-rose-50/30 p-5 shadow-2xs transition-transform motion-safe:hover:-translate-y-0.5 dark:border-rose-800 dark:bg-rose-950/10">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-rose-700 dark:text-rose-300">
              <span>Rekening Saldo Rp 0</span>
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-0.5 text-[11px] font-semibold dark:border-rose-800 dark:bg-rose-950/40">
                Perlu Top-Up
              </span>
            </div>
            <div className="my-1 text-2xl font-bold tracking-tight">{kpi ? (kpi.santri.zero ?? 0) + (kpi.ustadz.zero ?? 0) : "—"}</div>
            <div className="mt-3 flex items-center justify-between border-t pt-3 text-[11px] text-muted-foreground">
              <span>Rekening santri bersaldo kosong</span>
              <span className="font-medium">Tandai rekening kosong</span>
            </div>
          </div>
        </section>
      )}
      {tab === "ADJ" ? (
        <>
          <Toolbar>
            <Select value={adjFilter} onValueChange={(v) => setAdjFilter(v ?? "ALL")}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua status</SelectItem>
                {ADJ_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {statusLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <RefreshButton onClick={adjList.reload} />
          </Toolbar>
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <Head label="No." className="w-10" />
                  <Head label="Status" />
                  <Head label="Nomor" />
                  <Head label="Pemilik Saldo" />
                  <Head label="Nominal" className="text-right" />
                  <Head label="Alasan" />
                  <Head label="Diajukan" />
                  <Head label="Diproses" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjList.loading && adjList.items.length === 0 ? (
                  <TableSkeleton rows={4} cols={8} />
                ) : adjList.items.length === 0 ? (
                  <EmptyRow colSpan={8} message="Belum ada penyesuaian." />
                ) : (
                  adjList.items.map((a, i) => (
                    <TableRow key={a.id} className="row-accent">
                      <RowNo i={i} page={adjList.page} perPage={50} />
                      <TableCell>
                        <StatusPill status={a.status} />
                      </TableCell>
                      <NomorChip label={`#${a.id}`} title={`Nomor penyesuaian #${a.id}`} />
                      <TableCell className="font-medium">{a.user_name}</TableCell>
                      <TableCell className={`whitespace-nowrap text-right font-semibold ${a.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                        {a.amount > 0 ? "+" : ""}
                        {rp(a.amount)}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <span className="line-clamp-2 text-sm">{a.reason}</span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(a.created_at)}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(a.handled_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableShell>
          <Pager page={adjList.page} hasMore={adjList.hasMore} loading={adjList.loading} onPrev={adjList.goPrev} onNext={adjList.goNext} />
        </>
      ) : selected ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke daftar
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-5">
            <div>
              <p className="text-sm text-muted-foreground">Saldo {tab === "SANTRI" ? "santri" : "ustadz"}</p>
              <p className="text-3xl font-bold">{selected.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Saldo saat ini</p>
              <p className="text-3xl font-bold text-green-700">{rp(selected.balance)}</p>
            </div>
            <Button onClick={() => setAdjOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Ajukan Penyesuaian
            </Button>
          </div>
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <Head label="No." className="w-12" />
                  <Head label="Rujukan" />
                  <Head label="Jenis" />
                  <Head label="Nominal" className="text-right" />
                  <Head label="Saldo setelah" className="text-right" />
                  <Head label="Waktu" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  <TableSkeleton rows={4} cols={6} />
                ) : txs.length === 0 ? (
                  <EmptyRow colSpan={6} message="Belum ada mutasi." />
                ) : (
                  txs.map((t, i) => {
                    const credit = txCredit[t.tx_type];
                    return (
                      <TableRow key={t.id} className="row-accent">
                        <RowNo i={i} />
                        <NomorChip
                          label={t.subject_type ? `${t.subject_type} #${t.subject_id}` : "-"}
                          title="Rujukan transaksi"
                        />
                        <TableCell className="text-sm">{txLabel[t.tx_type] ?? t.tx_type}</TableCell>
                        <TableCell className={`whitespace-nowrap text-right font-semibold ${credit ? "text-green-600" : "text-red-600"}`}>
                          {credit ? "+" : "-"}
                          {rp(t.amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">{rp(t.balance_after)}</TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(t.created_at)}</TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableShell>
        </>
      ) : (
        <>
          <Toolbar>
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder={`Cari nama ${tab === "SANTRI" ? "santri" : "ustadz"}…`}
            />
            <Select value={nomFilter} onValueChange={(v) => setNomFilter(v ?? "semua")}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Semua nominal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua nominal</SelectItem>
                <SelectItem value="tinggi">&gt; Rp 1.000.000</SelectItem>
                <SelectItem value="sedang">Rp 100.000 – 1.000.000</SelectItem>
                <SelectItem value="nol">Saldo Rp 0</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                muatRows();
                setKpiNonce((n) => n + 1);
              }}
            >
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? "motion-safe:animate-spin" : ""}`} /> Muat Ulang
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const tampil = rows.filter((r) => {
                  if (nomFilter === "tinggi") return r.balance > 1_000_000;
                  if (nomFilter === "sedang") return r.balance >= 100_000 && r.balance <= 1_000_000;
                  if (nomFilter === "nol") return r.balance === 0;
                  return true;
                });
                const head = ["user_id", "nama", "saldo"];
                const lines = tampil
                  .map((r) => [r.user_id, `"${r.full_name.replace(/"/g, '""')}"`, r.balance].join(","));
                const csv = "\uFEFF" + [head.join(","), ...lines].join("\r\n");
                const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
                const a = document.createElement("a");
                a.href = url;
                a.download = `rekap-saldo-${tab.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast.success(`${tampil.length} rekening diunduh`);
              }}
            >
              <Download className="size-4" /> Unduh Rekap Saldo
            </Button>
          </Toolbar>
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <Head label="No." className="w-10" />
                  <Head label="Aksi" />
                  <Head label="Nomor" />
                  <Head label="Pengguna" />
                  <Head label="Kategori" />
                  <Head label="Saldo" className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton rows={5} cols={6} />
                ) : rows.length === 0 ? (
                  <EmptyRow colSpan={6} message="Tidak ditemukan." />
                ) : (
                  rows
                    .filter((r) => {
                      if (nomFilter === "tinggi") return r.balance > 1_000_000;
                      if (nomFilter === "sedang") return r.balance >= 100_000 && r.balance <= 1_000_000;
                      if (nomFilter === "nol") return r.balance === 0;
                      return true;
                    })
                    .map((r, i) => (
                      <TableRow key={r.user_id} className={`row-accent ${r.balance === 0 ? "bg-rose-50/40" : "hover:bg-muted/50"}`}>
                        <RowNo i={i} />
                        <AksiCell>
                          <div className="flex gap-1">
                            <TombolAksi label="Detail" onClick={() => openUser(r)} />
                            <TombolAksi
                              label="+ Koreksi"
                              onClick={() => {
                                openUser(r);
                                setAdjOpen(true);
                              }}
                            />
                          </div>
                        </AksiCell>
                        <NomorChip label={`#${r.user_id}`} title={`Nomor pengguna #${r.user_id}`} />
                        <TableCell className="font-medium">{r.full_name}</TableCell>
                        <TableCell>
                          <span className="rounded border border-primary/20 bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            {tab === "SANTRI" ? "Santri" : "Ustadz"}
                          </span>
                        </TableCell>
                        <TableCell className={`text-right font-semibold ${r.balance > 0 ? "text-green-700" : "text-rose-600"}`}>
                          {rp(r.balance)}
                        </TableCell>
                      </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </TableShell>
        </>
      )}

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Penyesuaian Saldo</DialogTitle>
            <DialogDescription>
              {selected?.full_name} akan menerima notifikasi dan harus <strong>menyetujui di aplikasi</strong> sebelum
              saldo berubah. Penolakan membatalkan penyesuaian.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nominal (Rp) — minus utk pengurangan</Label>
              <Input
                value={adjAmount}
                onChange={(e) => setAdjAmount(e.target.value)}
                placeholder="cth: 50000 atau -25000"
                inputMode="numeric"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Alasan (wajib, terlihat oleh {tab === "SANTRI" ? "santri" : "ustadz"})</Label>
              <Input
                value={adjReason}
                onChange={(e) => setAdjReason(e.target.value)}
                placeholder="cth: kompensasi kunjungan bermasalah"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>
              <X className="size-4" /> Batal
            </Button>
            <Button disabled={submitting} onClick={submitAdjustment}>
              <Send className="size-4" /> {submitting ? "Mengirim…" : "Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
