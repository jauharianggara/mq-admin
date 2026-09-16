"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Plus, RefreshCw, Search } from "lucide-react";
import { apiGet, apiGetPage, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
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

const txColor: Record<string, string> = {
  TOPUP: "text-green-600",
  REFUND: "text-green-600",
  EARNING: "text-green-600",
  PAYMENT: "text-red-600",
  PAYOUT: "text-red-600",
};

const adjColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACCEPTED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmt(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function DepositPage() {
  const [tab, setTab] = useState<"SANTRI" | "USTADZ" | "ADJ">("SANTRI");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<BalanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  // detail user terpilih
  const [selected, setSelected] = useState<BalanceRow | null>(null);
  const [txs, setTxs] = useState<Tx[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  // monitoring penyesuaian
  const [adjs, setAdjs] = useState<Adjustment[]>([]);
  const [adjFilter, setAdjFilter] = useState<string>("ALL");
  // dialog ajukan penyesuaian
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjAmount, setAdjAmount] = useState("");
  const [adjReason, setAdjReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === "ADJ") {
        const qs = new URLSearchParams();
        if (adjFilter !== "ALL") qs.set("status", adjFilter);
        const qstr = qs.toString();
        const d = await apiGetPage<Adjustment>(
          `/admin/wallet-adjustments${qstr ? `?${qstr}` : ""}`
        );
        setAdjs(d.items);
      } else {
        const qs = new URLSearchParams({ role: tab });
        if (q.trim()) qs.set("q", q.trim());
        const d = await apiGet<{ items: BalanceRow[] }>(
          `/admin/wallet?${qs.toString()}`
        );
        setRows(d.items ?? []);
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat data saldo");
    } finally {
      setLoading(false);
    }
  }, [tab, q, adjFilter]);

  useEffect(() => {
    if (tab !== "ADJ") setSelected(null);
    load();
  }, [load, tab]);

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
      toast.success(
        "Penyesuaian diajukan — menunggu ACC santri/ustadz di aplikasi (saldo belum berubah)"
      );
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Saldo & Mutasi</h1>
          <p className="text-sm text-muted-foreground">
            Deposit santri & penghasilan ustadz. Saldo hanya berubah melalui mutasi — koreksi
            membutuhkan ACC pihak terkait di aplikasi.
          </p>
        </div>
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="SANTRI">Saldo Santri</TabsTrigger>
            <TabsTrigger value="USTADZ">Saldo Ustadz</TabsTrigger>
            <TabsTrigger value="ADJ">Penyesuaian</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {tab === "ADJ" ? (
        <>
          <div className="flex items-center gap-2">
            <Select
              value={adjFilter}
              onValueChange={(v) => setAdjFilter(v ?? "ALL")}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Semua status</SelectItem>
                <SelectItem value="PENDING">Menunggu ACC</SelectItem>
                <SelectItem value="ACCEPTED">Disetujui</SelectItem>
                <SelectItem value="REJECTED">Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Pemilik Saldo</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead>Alasan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Diajukan</TableHead>
                  <TableHead>Diproses</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : adjs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      Belum ada penyesuaian.
                    </TableCell>
                  </TableRow>
                ) : (
                  adjs.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-muted-foreground">{a.id}</TableCell>
                      <TableCell className="font-medium">{a.user_name}</TableCell>
                      <TableCell
                        className={`text-right font-semibold ${a.amount > 0 ? "text-green-600" : "text-red-600"}`}
                      >
                        {a.amount > 0 ? "+" : ""}
                        {rp(a.amount)}
                      </TableCell>
                      <TableCell className="max-w-64">
                        <span className="line-clamp-2 text-sm">{a.reason}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={adjColor[a.status] ?? ""}>
                          {a.status === "PENDING" ? "Menunggu ACC" : a.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(a.created_at)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(a.handled_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : selected ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Kembali ke daftar
          </Button>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/40 p-5">
            <div>
              <p className="text-sm text-muted-foreground">
                Saldo {tab === "SANTRI" ? "santri" : "ustadz"}
              </p>
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
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Nominal</TableHead>
                  <TableHead className="text-right">Saldo setelah</TableHead>
                  <TableHead>Rujukan</TableHead>
                  <TableHead>Waktu</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ) : txs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      Belum ada mutasi.
                    </TableCell>
                  </TableRow>
                ) : (
                  txs.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-muted-foreground">{t.id}</TableCell>
                      <TableCell>{txLabel[t.tx_type] ?? t.tx_type}</TableCell>
                      <TableCell className={`text-right font-semibold ${txColor[t.tx_type] ?? ""}`}>
                        {txColor[t.tx_type] === "text-green-600" ? "+" : "-"}
                        {rp(t.amount)}
                      </TableCell>
                      <TableCell className="text-right">{rp(t.balance_after)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {t.subject_type ? `${t.subject_type} #${t.subject_id}` : "-"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{fmt(t.created_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={`Cari nama ${tab === "SANTRI" ? "santri" : "ustadz"}…`}
                className="pl-8"
                onKeyDown={(e) => e.key === "Enter" && load()}
              />
            </div>
            <Button variant="outline" onClick={load}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Pengguna</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={3}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-muted-foreground">
                      Tidak ditemukan.
                    </TableCell>
                  </TableRow>
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
          </div>
        </>
      )}

      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajukan Penyesuaian Saldo</DialogTitle>
            <DialogDescription>
              {selected?.full_name} akan menerima notifikasi dan harus{" "}
              <strong>menyetujui di aplikasi</strong> sebelum saldo berubah. Penolakan membatalkan
              penyesuaian.
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
