"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
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

const STATUS_ORDER = ["PENDING", "PAID", "EXPIRED", "REFUNDED", "FAILED"];

const jenisLabel: Record<string, string> = {
  ustadz_visit: "Kunjungan",
  wallet_topup: "Top-up deposit",
};

const COLS = 8;

export default function PaymentsPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [jenis, setJenis] = useState("ALL");
  const [filter, setFilter] = useState("ALL");
  const [total, setTotal] = useState<number | null>(null);

  const list = useAdminList<Payment>("/admin/payments", {
    params: {
      status: filter === "ALL" ? undefined : filter,
      subject_type: jenis === "ALL" ? undefined : jenis,
    },
    limit: 50,
  });

  useEffect(() => {
    const qs = new URLSearchParams({ entity: "payments" });
    if (filter !== "ALL") qs.set("status", filter);
    if (jenis !== "ALL") qs.set("subject_type", jenis);
    apiGet<{ total: number }>(`/admin/count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, jenis]);

  const items = q.trim()
    ? list.items.filter(
        (p) =>
          p.subject_label?.toLowerCase().includes(q.toLowerCase()) ||
          p.external_id?.toLowerCase().includes(q.toLowerCase()) ||
          String(p.id) === q.trim(),
      )
    : list.items;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pembayaran (Xendit)"
        total={total}
        totalSuffix="invoice"
        subtitle="Semua invoice: pembayaran kunjungan dan top-up deposit. Pengembalian dana selalu otomatis masuk ke deposit santri."
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Cari pihak terkait / no. invoice…" />
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
          <SelectTrigger className="w-44">
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
              <Head label="Jenis" />
              <Head label="Untuk" />
              <SortHead label="Nominal" col="amount" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-right" />
              <Head label="Metode" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <SortHead label="Dibuat" col="created_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <SortHead label="Dibayar" col="paid_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={6} cols={COLS} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Tidak ada pembayaran sesuai filter." />
            ) : (
              items.map((p, i) => (
                <TableRow
                  key={p.id}
                  className={p.subject_type === "ustadz_visit" ? "cursor-pointer hover:bg-muted/50" : "hover:bg-muted/50"}
                  onClick={() => p.subject_type === "ustadz_visit" && router.push(`/visits/${p.subject_id}`)}
                >
                  <TableCell className="text-muted-foreground">{(list.page - 1) * 50 + i + 1}</TableCell>
                  <TableCell className="text-sm">{jenisLabel[p.subject_type] ?? p.subject_type}</TableCell>
                  <TableCell className="max-w-72">
                    <span className="line-clamp-1 text-sm" title={p.subject_label}>
                      {p.subject_label}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-semibold">{rp(p.amount)}</TableCell>
                  <TableCell className="text-sm">
                    {p.channel === "DEPOSIT" ? "Saldo (deposit)" : p.channel ? `Xendit (${p.channel})` : "Xendit"}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={p.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(p.created_at)}</TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(p.paid_at)}</TableCell>
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
