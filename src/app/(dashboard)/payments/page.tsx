"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { apiGet, ApiError } from "@/lib/api";
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

interface PaymentsResp {
  items: Payment[];
  meta: { pagination: { next_cursor: string | null; has_more: boolean } };
}

const statusColor: Record<string, string> = {
  PENDING: "bg-sky-100 text-sky-700",
  PAID: "bg-green-100 text-green-700",
  EXPIRED: "bg-gray-200 text-gray-600",
  REFUNDED: "bg-purple-100 text-purple-700",
  FAILED: "bg-red-100 text-red-700",
};

const jenisLabel: Record<string, string> = {
  ustadz_visit: "Kunjungan",
  wallet_topup: "Top-up deposit",
};

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmt(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function PaymentsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [jenis, setJenis] = useState<string>("ALL");
  const [filter, setFilter] = useState<string>("ALL");
  const [total, setTotal] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (filter !== "ALL") qs.set("status", filter);
      if (jenis !== "ALL") qs.set("subject_type", jenis);
      const q = qs.toString();
      const d = await apiGet<PaymentsResp>(`/admin/payments${q ? `?${q}` : ""}`);
      setItems(d.items ?? []);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat pembayaran");
    } finally {
      setLoading(false);
    }
  }, [filter, jenis]);

  useEffect(() => {
    load();
    const qs = new URLSearchParams({ entity: "payments" });
    if (filter !== "ALL") qs.set("status", filter);
    if (jenis !== "ALL") qs.set("subject_type", jenis);
    apiGet<{ total: number }>(`/admin/count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
  }, [load, filter, jenis]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">
          Pembayaran (Xendit){" "}
          {total !== null && <span className="text-lg font-normal text-muted-foreground">· {total} invoice</span>}
        </h1>
          <p className="text-sm text-muted-foreground">
            Semua invoice: pembayaran kunjungan <strong>dan</strong> top-up deposit santri.
            Pengembalian dana selalu otomatis masuk ke deposit santri — tidak ada tindakan manual.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={jenis} onValueChange={(v) => setJenis(v ?? "ALL")}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Semua jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Semua jenis</SelectItem>
              <SelectItem value="ustadz_visit">Kunjungan</SelectItem>
              <SelectItem value="wallet_topup">Top-up deposit</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
            <SelectTrigger className="w-40">
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

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Tidak ada pembayaran sesuai filter.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Untuk</TableHead>
                <TableHead className="text-right">Nominal</TableHead>
                <TableHead>Metode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dibuat</TableHead>
                <TableHead>Dibayar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((p) => (
                <TableRow
                  key={p.id}
                  className={p.subject_type === "ustadz_visit" ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}
                  onClick={() => p.subject_type === "ustadz_visit" && router.push(`/visits/${p.subject_id}`)}
                >
                  <TableCell className="text-muted-foreground">{p.id}</TableCell>
                  <TableCell>{jenisLabel[p.subject_type] ?? p.subject_type}</TableCell>
                  <TableCell className="max-w-72">
                    <span className="line-clamp-1 text-sm" title={p.subject_label}>
                      {p.subject_label}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold">{rp(p.amount)}</TableCell>
                  <TableCell className="text-sm">
                    {p.channel === "DEPOSIT"
                      ? "Saldo (deposit)"
                      : p.channel
                        ? `Xendit (${p.channel})`
                        : "Xendit"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColor[p.status] ?? ""}>
                      {p.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {fmt(p.created_at)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {fmt(p.paid_at)}
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
