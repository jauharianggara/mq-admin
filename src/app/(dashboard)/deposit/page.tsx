"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus } from "lucide-react";
import { apiGet, apiGetPage, apiPost, ApiError } from "@/lib/api";
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
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<BalanceRow | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [adjFilter, setAdjFilter] = useState("ALL");
  const adjList = useAdminList<Adjustment>("/admin/wallet-adjustments", {
    params: { status: adjFilter === "ALL" ? undefined : adjFilter },
    limit: 50,
  });

  const load = useCallback(async () => {
    if (tab === "ADJ") {
      adjList.reload();
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({ role: tab });
      if (q.trim()) qs.set("q", q.trim());
      const d = await apiGet<{ items: BalanceRow[] }>(`/admin/wallet?${qs.toString()}`);
      setRows(d.items ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat data saldo");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, q]);

  useEffect(() => {
    if (tab !== "ADJ") {
      setSelected(null);
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="SANTRI">Saldo Santri</TabsTrigger>
              <TabsTrigger value="USTADZ">Saldo Ustadz</TabsTrigger>
              <TabsTrigger value="ADJ">Penyesuaian</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      />

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
                  <Head label="No." className="w-12" />
                  <Head label="Pemilik Saldo" />
                  <Head label="Nominal" className="text-right" />
                  <Head label="Alasan" />
                  <Head label="Status" />
                  <Head label="Diajukan" />
                  <Head label="Diproses" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjList.loading && adjList.items.length === 0 ? (
                  <TableSkeleton rows={4} cols={7} />
                ) : adjList.items.length === 0 ? (
                  <EmptyRow colSpan={7} message="Belum ada penyesuaian." />
                ) : (
                  adjList.items.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{a.id}</TableCell>
                      <TableCell className="font-medium">{a.user_name}</TableCell>
                      <TableCell className={`whitespace-nowrap text-right font-semibold ${a.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                        {a.amount > 0 ? "+" : ""}
                        {rp(a.amount)}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <span className="line-clamp-2 text-sm">{a.reason}</span>
                      </TableCell>
                      <TableCell>
                        <StatusPill status={a.status} />
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
                  <Head label="Jenis" />
                  <Head label="Nominal" className="text-right" />
                  <Head label="Saldo setelah" className="text-right" />
                  <Head label="Rujukan" />
                  <Head label="Waktu" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  <TableSkeleton rows={4} cols={6} />
                ) : txs.length === 0 ? (
                  <EmptyRow colSpan={6} message="Belum ada mutasi." />
                ) : (
                  txs.map((t) => {
                    const credit = txCredit[t.tx_type];
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{t.id}</TableCell>
                        <TableCell className="text-sm">{txLabel[t.tx_type] ?? t.tx_type}</TableCell>
                        <TableCell className={`whitespace-nowrap text-right font-semibold ${credit ? "text-green-600" : "text-red-600"}`}>
                          {credit ? "+" : "-"}
                          {rp(t.amount)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-right">{rp(t.balance_after)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.subject_type ? `${t.subject_type} #${t.subject_id}` : "-"}
                        </TableCell>
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
            <RefreshButton onClick={load} />
          </Toolbar>
          <TableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <Head label="Pengguna" />
                  <Head label="Saldo" className="text-right" />
                  <Head label="" className="text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableSkeleton rows={5} cols={3} />
                ) : rows.length === 0 ? (
                  <EmptyRow colSpan={3} message="Tidak ditemukan." />
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.user_id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{r.full_name}</TableCell>
                      <TableCell className={`text-right font-semibold ${r.balance > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                        {rp(r.balance)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openUser(r)}>
                          Lihat Detail
                        </Button>
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
              Batal
            </Button>
            <Button disabled={submitting} onClick={submitAdjustment}>
              {submitting ? "Mengirim…" : "Ajukan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
