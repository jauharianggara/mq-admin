"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, RefreshCw, Upload, XCircle } from "lucide-react";
import { apiGet, apiGetPage, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payout {
  id: number;
  ustadz_id: number;
  ustadz_name: string;
  amount: number; // diterima ustadz (setelah fee)
  fee: number;
  bank_name: string;
  account_no: string;
  account_name: string;
  status: string; // PENDING | APPROVED | TRANSFERRED | REJECTED
  created_at: string;
  rejected_reason?: string | null;
}

const statusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-sky-100 text-sky-700",
  TRANSFERRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const statusLabel: Record<string, string> = {
  PENDING: "Menunggu ACC",
  APPROVED: "Disetujui",
  TRANSFERRED: "Sudah ditransfer",
  REJECTED: "Ditolak",
};

function fmt(iso: string | null) {
  if (!iso) return "-";
  const d = new Date(iso);
  return d.toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtRp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

export default function PayoutsPage() {
  const [items, setItems] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [busy, setBusy] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payout | null>(null);
  const [reason, setReason] = useState("");
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await apiGetPage<Payout>("/admin/payouts", {
        status: filter === "ALL" ? undefined : filter,
      });
      setItems(items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat penarikan");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const qs = new URLSearchParams({ entity: "payouts" });
    if (filter !== "ALL") qs.set("status", filter);
    apiGet<{ total: number }>(`/admin/count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
  }, [load, filter]);

  async function approve(p: Payout) {
    if (
      !confirm(
        `ACC penarikan ${fmtRp(p.amount)} oleh ${p.ustadz_name} ke ${p.bank_name} ${p.account_no} a.n. ${p.account_name}?`
      )
    )
      return;
    setBusy(p.id);
    try {
      await apiPost(`/admin/payouts/${p.id}/approve`);
      toast.success("Disetujui — masuk daftar transfer");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyetujui");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    if (reason.trim().length < 3) {
      toast.error("Alasan tolak wajib diisi");
      return;
    }
    setBusy(rejectTarget.id);
    try {
      await apiPost(`/admin/payouts/${rejectTarget.id}/reject`, { reason: reason.trim() });
      toast.success("Ditolak — dana kembali ke saldo ustadz");
      setRejectTarget(null);
      setReason("");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menolak");
    } finally {
      setBusy(null);
    }
  }

  async function markTransferred(p: Payout) {
    if (!confirm(`Tandai sudah ditransfer ke ${p.bank_name} ${p.account_no}?`)) return;
    setBusy(p.id);
    try {
      await apiPost(`/admin/payouts/mark-transferred`, { payout_ids: [p.id] });
      toast.success("Ditandai sudah ditransfer");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menandai");
    } finally {
      setBusy(null);
    }
  }

  // ===== Download daftar transfer (CSV, status APPROVED) =====
  async function downloadCsv() {
    setExporting(true);
    try {
      const { items } = await apiGetPage<Payout>("/admin/payouts", { status: "APPROVED" });
      if (items.length === 0) {
        toast.info("Tidak ada permintaan berstatus Disetujui siap transfer");
        return;
      }
      const head = ["payout_id", "ustadz", "bank", "no_rekening", "atas_nama", "diterima"];
      const lines = items.map((p) =>
        [
          p.id,
          p.ustadz_name,
          p.bank_name,
          p.account_no,
          p.account_name,
          p.amount,
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csv = "\uFEFF" + [head.join(","), ...lines].join("\r\n");
      const url = URL.createObjectURL(
        new Blob([csv], { type: "text/csv;charset=utf-8" })
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `daftar-transfer-mq-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${items.length} baris diunduh — transfer via internet banking/manual, lalu unggah kembali`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal membuat CSV");
    } finally {
      setExporting(false);
    }
  }

  // ===== Upload daftar transfer (CSV berisi payout_id) → bulk TRANSFERRED =====
  async function uploadCsv(file: File) {
    setUploading(true);
    try {
      const text = await file.text();
      const ids: number[] = [];
      for (const line of text.split(/\r?\n/)) {
        const cells = line.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        const id = Number.parseInt(cells[0] ?? "", 10);
        if (Number.isInteger(id) && id > 0) ids.push(id);
      }
      const unique = [...new Set(ids)];
      if (unique.length === 0) {
        toast.error("CSV tidak memuat payout_id yang dikenal (kolom pertama)");
        return;
      }
      const res = await apiPost<{ transferred: number; skipped: number }>(
        "/admin/payouts/mark-transferred",
        { payout_ids: unique }
      );
      toast.success(
        `${res.transferred} ditandai transfer${res.skipped > 0 ? `, ${res.skipped} dilewati (bukan APPROVED)` : ""}`
      );
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memproses CSV");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const pendingCount = items.filter((p) => p.status === "PENDING").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
          Penarikan Dana Ustadz{" "}
          {total !== null && <span className="text-lg font-normal text-muted-foreground">· {total} pengajuan</span>}
        </h1>
          <p className="text-sm text-muted-foreground">
            Ustadz mengajukan sendiri dari aplikasi — saldo terkunci sejak pengajuan.
            {pendingCount > 0 && (
              <>
                {" "}
                <Badge className={statusColor.PENDING}>{pendingCount} menunggu ACC</Badge>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua status</SelectItem>
              {Object.keys(statusColor).map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" disabled={exporting} onClick={downloadCsv}>
            <Download className="mr-2 h-4 w-4" />
            Daftar Transfer
          </Button>
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            {uploading ? "Memproses…" : "Unggah Bukti Transfer"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCsv(f);
            }}
          />
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>Ustadz</TableHead>
              <TableHead>Bank / Rekening</TableHead>
              <TableHead className="text-right">Diterima</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Belum ada pengajuan penarikan.
                </TableCell>
              </TableRow>
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.ustadz_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {p.bank_name} • <span className="font-mono">{p.account_no}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">a.n. {p.account_name}</div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{fmtRp(p.amount)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{fmtRp(p.fee)}</TableCell>
                  <TableCell>
                    <Badge className={statusColor[p.status]}>
                      {statusLabel[p.status] ?? p.status}
                    </Badge>
                    {p.status === "REJECTED" && p.rejected_reason && (
                      <div className="mt-1 max-w-52 text-xs text-red-600">{p.rejected_reason}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(p.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            disabled={busy === p.id}
                            onClick={() => approve(p)}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" /> ACC
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={busy === p.id}
                            onClick={() => setRejectTarget(p)}
                          >
                            <XCircle className="mr-1 h-4 w-4" /> Tolak
                          </Button>
                        </>
                      )}
                      {p.status === "APPROVED" && (
                        <Button size="sm" variant="outline" disabled={busy === p.id} onClick={() => markTransferred(p)}>
                          Sudah ditransfer
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak penarikan #{rejectTarget?.id}?</DialogTitle>
            <DialogDescription>
              Dana {rejectTarget ? fmtRp(rejectTarget.amount + (rejectTarget.fee ?? 0)) : ""} kembali ke saldo ustadz. Alasan diteruskan ke ustadz.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="cth: nomor rekening tidak sesuai buku tabungan"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" disabled={busy === rejectTarget?.id} onClick={reject}>
              Tolak &amp; Kembalikan Dana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
