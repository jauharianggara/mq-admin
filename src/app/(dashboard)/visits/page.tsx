"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

const STATUS_ORDER = [
  "REQUESTED",
  "WAITING_CONFIRM",
  "CONFIRMED",
  "COMPLETED",
  "REVIEWED",
  "DECLINED",
  "CANCELED",
  "PAYMENT_EXPIRED",
];

const COLS = 9;

export default function VisitsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [total, setTotal] = useState<number | null>(null);

  const list = useAdminList<Visit>("/admin/visits", {
    params: { status: filter === "ALL" ? undefined : filter },
    limit: 20,
  });

  useEffect(() => {
    const qs = new URLSearchParams({ entity: "visits" });
    if (filter !== "ALL") qs.set("status", filter);
    apiGet<{ total: number }>(`/admin/count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const items = q.trim()
    ? list.items.filter(
        (v) =>
          v.requester?.full_name?.toLowerCase().includes(q.toLowerCase()) ||
          v.ustadz?.full_name?.toLowerCase().includes(q.toLowerCase()) ||
          String(v.id) === q.trim(),
      )
    : list.items;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Kunjungan"
        total={total}
        totalSuffix="kunjungan"
        subtitle="Pesanan ngaji ke rumah — klik Buka untuk detail, chat & tindakan admin"
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Cari santri / ustadz / nomor…" />
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
          <SelectTrigger className="w-56">
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
              <Head label="No." className="w-12" />
              <Head label="Santri" />
              <Head label="Ustadz" />
              <SortHead label="Jadwal" col="scheduled_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="Durasi" />
              <Head label="Bayar dengan" />
              <SortHead label="Total" col="price_total" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-right" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={5} cols={COLS} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Belum ada kunjungan sesuai filter." />
            ) : (
              items.map((v, i) => (
                <TableRow key={v.id} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground">{(list.page - 1) * 20 + i + 1}</TableCell>
                  <TableCell className="text-sm">{v.requester?.full_name ?? "-"}</TableCell>
                  <TableCell className="text-sm">{v.ustadz?.full_name ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(v.scheduled_at)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm">{v.duration_hours} jam</TableCell>
                  <TableCell className="text-xs">
                    {v.payment
                      ? v.payment.channel === "DEPOSIT"
                        ? "Saldo deposit"
                        : v.payment.channel
                          ? `Xendit (${v.payment.channel})`
                          : "Xendit"
                      : "-"}
                    {v.payment && v.payment.refunded_amount > 0 && ` (-${rp(v.payment.refunded_amount)})`}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold">{rp(v.price_total)}</TableCell>
                  <TableCell>
                    <StatusPill status={v.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" render={<Link href={`/visits/${v.id}`} />}>
                      Buka
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      <Pager page={list.page} hasMore={list.hasMore} loading={list.loading} onPrev={list.goPrev} onNext={list.goNext} />
    </div>
  );
}
