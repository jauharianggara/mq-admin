"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeOff, Eye, RefreshCw } from "lucide-react";
import Link from "next/link";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
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

function fmt(iso: string) {
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function ReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [busy, setBusy] = useState<number | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { items } = await apiGetPage<Review>("/admin/reviews", {
        direction: filter === "ALL" ? undefined : filter,
      });
      setItems(items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat review");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
    const qs = new URLSearchParams({ entity: "reviews" });
    if (filter !== "ALL") qs.set("direction", filter);
    apiGet<{ total: number }>(`/admin/count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
  }, [load, filter]);

  async function setHidden(r: Review, hidden: boolean) {
    setBusy(r.id);
    try {
      await apiPost(`/admin/reviews/${r.id}/${hidden ? "hide" : "unhide"}`);
      toast.success(hidden ? "Review disembunyikan" : "Review ditampilkan kembali");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          Review Kunjungan{" "}
          {total !== null && <span className="text-lg font-normal text-muted-foreground">· {total} review</span>}
        </h1>
        <div className="flex items-center gap-2">
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
          <Button variant="outline" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Review dua arah (double-blind): baru terlihat setelah kedua pihak menilai atau window 7
        hari lewat. <strong>Sembunyikan</strong> bila komentar tidak pantas — review tetap
        tersimpan untuk audit dan keluar dari rating agregat.
      </p>

      {loading ? (
        <Skeleton className="h-64 w-full" />
      ) : items.length === 0 ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">
          Belum ada review.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Arah</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead>Dinilai</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Comment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{r.id}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {r.direction === "SANTRI_TO_USTADZ" ? "S→U" : "U→S"}
                    </Badge>
                  </TableCell>
                  <TableCell>{r.reviewer_name ?? `#${r.reviewer_id}`}</TableCell>
                  <TableCell>
                    <Link href={`/visits/${r.visit_id}`} className="text-sm underline-offset-2 hover:underline">
                      Kunjungan #{r.visit_id}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold text-amber-600">★{r.rating}</span>
                  </TableCell>
                  <TableCell className="max-w-64 truncate">{r.comment ?? "-"}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {!r.revealed && <Badge variant="secondary">belum reveal</Badge>}
                      {r.hidden && (
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          hidden
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={r.hidden ? "outline" : "ghost"}
                      onClick={() => setHidden(r, !r.hidden)}
                      disabled={busy === r.id}
                    >
                      {r.hidden ? (
                        <>
                          <Eye className="mr-1 h-3 w-3" /> Tampilkan
                        </>
                      ) : (
                        <>
                          <EyeOff className="mr-1 h-3 w-3" /> Sembunyikan
                        </>
                      )}
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
