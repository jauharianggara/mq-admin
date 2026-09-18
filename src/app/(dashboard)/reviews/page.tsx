"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
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
import { useAdminList } from "@/hooks/use-admin-list";
import { fmtDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Review {
  id: number;
  visit_id: number;
  direction: string;
  reviewer_id: number;
  reviewer_name?: string;
  reviewee_id: number;
  rating: number;
  comment: string | null;
  hidden: boolean;
  revealed: boolean;
  created_at: string;
}

const COLS = 9;

export default function ReviewsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [busy, setBusy] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  const list = useAdminList<Review>("/admin/reviews", {
    params: { direction: filter === "ALL" ? undefined : filter },
    limit: 50,
  });

  useEffect(() => {
    const qs = new URLSearchParams({ entity: "reviews" });
    if (filter !== "ALL") qs.set("direction", filter);
    apiGet<{ total: number }>(`/admin/count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const items = q.trim()
    ? list.items.filter(
        (r) =>
          r.reviewer_name?.toLowerCase().includes(q.toLowerCase()) ||
          (r.comment ?? "").toLowerCase().includes(q.toLowerCase()) ||
          String(r.visit_id) === q.trim(),
      )
    : list.items;

  async function setHidden(r: Review, hidden: boolean) {
    setBusy(r.id);
    try {
      await apiPost(`/admin/reviews/${r.id}/${hidden ? "hide" : "unhide"}`);
      list.reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Review Kunjungan"
        total={total}
        totalSuffix="review"
        subtitle="Review dua arah (double-blind): baru terlihat setelah kedua pihak menilai atau window 7 hari lewat. Sembunyikan bila komentar tidak pantas — review tetap tersimpan untuk audit dan keluar dari rating agregat."
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Cari reviewer / komentar / no. kunjungan…" />
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Semua arah" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua arah</SelectItem>
            <SelectItem value="SANTRI_TO_USTADZ">Santri → Ustadz (publik)</SelectItem>
            <SelectItem value="USTADZ_TO_SANTRI">Ustadz → Santri (privat)</SelectItem>
          </SelectContent>
        </Select>
        <RefreshButton onClick={list.reload} />
      </Toolbar>

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="No." col="id" sort={list.sort} order={list.order} onSort={list.toggleSort} className="w-12" />
              <Head label="Arah" />
              <Head label="Penilai" />
              <Head label="Kunjungan" />
              <SortHead label="Rating" col="rating" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="Komentar" />
              <Head label="Keterlihatan" />
              <SortHead label="Tanggal" col="created_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={5} cols={COLS} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Belum ada review." />
            ) : (
              items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{r.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.direction === "SANTRI_TO_USTADZ" ? "S→U" : "U→S"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{r.reviewer_name ?? `#${r.reviewer_id}`}</TableCell>
                  <TableCell>
                    <Link href={`/visits/${r.visit_id}`} className="text-sm underline-offset-2 hover:underline">
                      Kunjungan #{r.visit_id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-amber-600">★{r.rating}</span>
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-sm">{r.comment ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!r.revealed && <Badge variant="secondary">belum terlihat</Badge>}
                      {r.hidden && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          disembunyikan
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{fmtDateTime(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={r.hidden ? "outline" : "ghost"}
                      onClick={() => setHidden(r, !r.hidden)}
                      disabled={busy === r.id}
                    >
                      {r.hidden ? "Tampilkan" : "Sembunyikan"}
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
