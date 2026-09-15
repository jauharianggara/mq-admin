"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Undo2 } from "lucide-react";
import { apiGetPage, apiPost, ApiError } from "@/lib/api";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payment {
  id: number;
  external_id: string;
  xendit_invoice_id: string | null;
  amount: number;
  status: string;
  channel: string | null;
  refunded_amount: number;
  visit_id: number;
  created_at: string;
}

const statusColor: Record<string, string> = {
  PENDING: "bg-sky-100 text-sky-700",
  PAID: "bg-green-100 text-green-700",
  EXPIRED: "bg-gray-200 text-gray-600",
  REFUND_REQUESTED: "bg-amber-100 text-amber-700",
  REFUND_PENDING_MANUAL: "bg-orange-100 text-orange-700",
  REFUNDED: "bg-purple-100 text-purple-700",
  FAILED: "bg-red-100 text-red-700",
};

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function PaymentsPage() {
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await apiGetPage<Payment>("/admin/payments", {
        status: filter === "ALL" ? undefined : filter,
      });
      setItems(items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat pembayaran");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  async function markRefunded(p: Payment) {
    setBusy(p.id);
    try {
      await apiPost(`/admin/payments/${p.id}/mark-refunded`);
      toast.success("Ditandai dikembalikan (manual)");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menandai");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pembayaran (Xendit)</h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua status</SelectItem>
              {Object.keys(statusColor).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Refund otomatis dipanggil sistem saat ustadz menolak / timeout / late-PAID. Status{" "}
        <Badge variant="secondary" className={statusColor.REFUND_PENDING_MANUAL}>
          REFUND_PENDING_MANUAL
        </Badge>{" "}
        berarti refund API Xendit gagal — proses manual dari dashboard Xendit lalu tandai
        dikembalikan di sini.
      </p>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Belum ada pembayaran.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Visit</TableHead>
                <TableHead>External ID</TableHead>
                <TableHead>Nominal</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.id}</TableCell>
                  <TableCell>#{p.visit_id}</TableCell>
                  <TableCell className="font-mono text-xs">{p.external_id}</TableCell>
                  <TableCell className="whitespace-nowrap">{rp(p.amount)}</TableCell>
                  <TableCell>{p.channel ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Badge variant="secondary" className={statusColor[p.status] ?? ""}>
                        {p.status}
                      </Badge>
                      {p.refunded_amount > 0 && (
                        <span className="text-xs text-muted-foreground">
                          -{rp(p.refunded_amount)}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fmt(p.created_at)}</TableCell>
                  <TableCell className="text-right">
                    {p.status === "REFUND_PENDING_MANUAL" || p.status === "PAID" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => markRefunded(p)}
                        disabled={busy === p.id}
                        title="Tandai sudah dikembalikan manual via dashboard Xendit"
                      >
                        <Undo2 className="mr-1 h-3 w-3" /> Tandai Dikembalikan
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
