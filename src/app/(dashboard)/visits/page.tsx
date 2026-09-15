"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import { apiGetPage, ApiError } from "@/lib/api";
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

interface Visit {
  id: number;
  status: string;
  service_name: string;
  scheduled_at: string;
  price_amount: number;
  requester: { full_name: string } | null;
  ustadz: { full_name: string } | null;
  payment: { status: string; refunded_amount: number } | null;
}

const statusColor: Record<string, string> = {
  REQUESTED: "bg-sky-100 text-sky-700",
  WAITING_CONFIRM: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  REVIEWED: "bg-purple-100 text-purple-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-200 text-gray-700",
  PAYMENT_EXPIRED: "bg-gray-200 text-gray-600",
};

function fmt(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function rp(n: number | null | undefined) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

export default function VisitsPage() {
  const [items, setItems] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await apiGetPage<Visit>("/admin/visits", {
        status: filter === "ALL" ? undefined : filter,
      });
      setItems(items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat kunjungan");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Kunjungan (Pesan Ustadz)</h1>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
            <SelectTrigger className="w-48">
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
          Belum ada data kunjungan.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Layanan</TableHead>
                <TableHead>Santri</TableHead>
                <TableHead>Ustadz</TableHead>
                <TableHead>Jadwal</TableHead>
                <TableHead>Tarif</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((v) => (
                <TableRow key={v.id} className="hover:bg-muted/50">
                  <TableCell>{v.id}</TableCell>
                  <TableCell>{v.service_name}</TableCell>
                  <TableCell>{v.requester?.full_name ?? "-"}</TableCell>
                  <TableCell>{v.ustadz?.full_name ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{fmt(v.scheduled_at)}</TableCell>
                  <TableCell className="whitespace-nowrap">{rp(v.price_amount)}</TableCell>
                  <TableCell>
                    {v.payment ? (
                      <span className="text-xs">
                        {v.payment.status}
                        {v.payment.refunded_amount > 0 &&
                          ` (-${rp(v.payment.refunded_amount)})`}
                      </span>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColor[v.status] ?? ""}>
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" render={<Link href={`/visits/${v.id}`} />}>
                      Buka
                    </Button>
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
