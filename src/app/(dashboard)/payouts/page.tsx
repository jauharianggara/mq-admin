"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Upload, XCircle } from "lucide-react";
import { apiGet, apiGetPage, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  PageHeader,
  Toolbar,
  SearchInput,
  RefreshButton,
  TableShell,
  SortHead,
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

const STATUS_ORDER = ["PENDING", "APPROVED", "TRANSFERRED", "REJECTED"];
const COLS = 8;

export default function PayoutsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payout | null>(null);
  const [reason, setReason] = useState("");
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const list = useAdminList<Payout>("/admin/payouts", {
    params: { status: filter === "ALL" ? undefined : filter },
    limit: 20,
  });

  useEffect(() => {
    const qs = new URLSearchParams({ entity: "payouts" });
    if (filter !== "ALL") qs.set("status", filter);
    apiGet<{ total: number }>(`/admin/count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const items = q.trim()
    ? list.items.filter(
        (p) =>
          p.ustadz_name?.toLowerCase().includes(q.toLowerCase()) ||
          p.account_no?.includes(q.trim()) ||
          String(p.id) === q.trim(),
      )
    : list.items;

  const pendingCount = items.filter((p) => p.status === "PENDING").length;

  async function approve(p: Payout) {
    if (
      !confirm(
        `ACC penarikan ${rp(p.amount)} oleh ${p.ustadz_name} ke ${p.bank_name} ${p.account_no} a.n. ${p.account_name}?`
      )
    )
      return;
    setBusy(p.id);
    try {
      await apiPost(`/admin/payouts/${p.id}/approve`);
      toast.success("Disetujui — masuk daftar transfer");
      list.reload();
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
      list.reload();
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
      list.reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menandai");
    } finally {
      setBusy(null);
    }
  }

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
        [p.id, p.ustadz_name, p.bank_name, p.account_no, p.account_name, p.amount]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csv = "\uFEFF" + [head.join(","), ...lines].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
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
      const res = await apiPost<{ transferred: number; skipped: number }>("/admin/payouts/mark-transferred", {
        payout_ids: unique,
      });
      toast.success(
        `${res.transferred} ditandai transfer${res.skipped > 0 ? `, ${res.skipped} dilewati (bukan Disetujui)` : ""}`
      );
      list.reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memproses CSV");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Penarikan Dana Ustadz"
        total={total}
        totalSuffix="pengajuan"
        subtitle={`Ustadz mengajukan sendiri dari aplikasi — saldo terkunci sejak pengajuan.${
          pendingCount > 0 ? ` Saat ini ${pendingCount} menunggu ACC.` : ""
        }`}
        actions={
          <>
            <Button variant="outline" disabled={exporting} onClick={downloadCsv}>
              <Download className="mr-2 h-4 w-4" />
              Daftar Transfer
            </Button>
            <Button variant="outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
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
          </>
        }
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Cari ustadz / no. rekening…" />
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua status</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RefreshButton onClick={list.reload} />
      </Toolbar>

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="No." col="id" sort={list.sort} order={list.order} onSort={list.toggleSort} className="w-14" />
              <Head label="Ustadz" />
              <Head label="Bank / Rekening" />
              <SortHead label="Diterima" col="amount" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-right" />
              <Head label="Fee" className="text-right" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <SortHead label="Waktu" col="created_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={4} cols={COLS} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Belum ada pengajuan penarikan." />
            ) : (
              items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{p.id}</TableCell>
                  <TableCell className="font-medium">{p.ustadz_name}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {p.bank_name} • <span className="font-mono">{p.account_no}</span>
                    </div>
                    <div className="text-xs text-muted-foreground">a.n. {p.account_name}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold">{rp(p.amount)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-muted-foreground">{rp(p.fee)}</TableCell>
                  <TableCell>
                    <StatusPill status={p.status} />
                    {p.status === "REJECTED" && p.rejected_reason && (
                      <div className="mt-1 max-w-52 text-xs text-red-600">{p.rejected_reason}</div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDateTime(p.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {p.status === "PENDING" && (
                        <>
                          <Button size="sm" disabled={busy === p.id} onClick={() => approve(p)}>
                            <CheckCircle2 className="mr-1 h-4 w-4" /> ACC
                          </Button>
                          <Button size="sm" variant="destructive" disabled={busy === p.id} onClick={() => setRejectTarget(p)}>
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
      </TableShell>

      <Pager page={list.page} hasMore={list.hasMore} loading={list.loading} onPrev={list.goPrev} onNext={list.goNext} />

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak penarikan #{rejectTarget?.id}?</DialogTitle>
            <DialogDescription>
              Dana {rejectTarget ? rp(rejectTarget.amount + (rejectTarget.fee ?? 0)) : ""} kembali ke saldo ustadz. Alasan
              diteruskan ke ustadz.
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
