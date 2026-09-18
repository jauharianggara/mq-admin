"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import { apiGet, apiGetPage, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  PageHeader,
  Toolbar,
  RefreshButton,
  TableShell,
  Head,
  TableSkeleton,
  EmptyRow,
} from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { fmtDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Submission {
  id: number;
  user_id: number;
  user_name: string | null;
  surah_id: number;
  surah_name: string;
  ayah_start: number;
  ayah_end: number;
  duration_ms: number | null;
  note: string | null;
  status: string;
  ustadz_id: number | null;
  submitted_at: string;
  reviewed_at: string | null;
  audio_presigned_url?: string | null;
  review?: {
    reviewer_id: number;
    verdict: string;
    notes: string | null;
    reply_audio_presigned_url: string | null;
    created_at: string;
  } | null;
}

// pewarnaan status dipusatkan di components/status-pill (kit); detailBadge hanya utk verdict di dialog detail
const detailBadge: Record<string, string> = {
  PASSED: "bg-emerald-100 text-emerald-800",
  REVISION: "bg-amber-100 text-amber-800",
  REJECTED: "bg-red-100 text-red-700",
};

export default function HafalanPage() {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("PENDING");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [detail, setDetail] = useState<Submission | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(
    async (c: string | null, replace: boolean) => {
      setLoading(true);
      try {
        const page = await apiGetPage<Submission>("/ustadz/memorization/queue", {
          status: status === "ALL" ? undefined : status,
          cursor: c ?? undefined,
          limit: 20,
        });
        setItems(replace ? page.items : (prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    },
    [status],
  );

  useEffect(() => {
    load(null, true);
  }, [load]);

  async function openDetail(id: number) {
    try {
      const d = await apiGet<Submission>(`/me/submissions/${id}`);
      setDetail(d);
      setNotes(d.review?.notes ?? "");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat detail");
    }
  }

  async function submitReview(action: "CLAIM" | "SUBMIT", verdict?: string) {
    if (!detail) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = { action };
      if (verdict) body.verdict = verdict;
      if (notes) body.notes = notes;
      const d = await apiPost<Submission>(
        `/memorization/submissions/${detail.id}/review`,
        body,
      );
      toast.success(
        action === "CLAIM" ? "Setoran diklaim (IN_REVIEW)" : `Review tersimpan: ${verdict}`,
      );
      setDetail(d);
      load(null, true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Hafalan — Antrean Review"
        subtitle="Setoran santri yang menunggu diperiksa ustadz — klik baris untuk detail & putusan"
      />

      <Toolbar>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "ALL")}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PENDING">Menunggu</SelectItem>
            <SelectItem value="IN_REVIEW">Sedang Direview</SelectItem>
            <SelectItem value="ALL">Semua</SelectItem>
          </SelectContent>
        </Select>
        <RefreshButton onClick={() => load(null, true)} />
      </Toolbar>

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <Head label="No." className="w-12" />
              <Head label="Santri" />
              <Head label="Surah" />
              <Head label="Ayat" />
              <Head label="Durasi" />
              <Head label="Status" />
              <Head label="Disetor" />
              <Head label="" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              <TableSkeleton rows={5} cols={8} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={8} message="Tidak ada setoran pada filter ini" />
            ) : (
              items.map((s, i) => (
                <TableRow key={s.id} className="cursor-pointer" onClick={() => openDetail(s.id)}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="text-sm">{s.user_name ?? `#${s.user_id}`}</TableCell>
                  <TableCell className="text-sm">{s.surah_name}</TableCell>
                  <TableCell className="text-sm font-mono">{s.ayah_start}-{s.ayah_end}</TableCell>
                  <TableCell className="text-sm">{s.duration_ms ? `${Math.round(s.duration_ms / 1000)}s` : "—"}</TableCell>
                  <TableCell>
                    <StatusPill status={s.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(s.submitted_at)}</TableCell>
                  <TableCell className="text-right">
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(cursor, false)} disabled={loading}>
            Muat lebih banyak
          </Button>
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>
                  Setoran #{detail.id} — {detail.surah_name} {detail.ayah_start}-{detail.ayah_end}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Santri: {detail.user_name ?? `#${detail.user_id}`} ·{" "}
                  {fmtDateTime(detail.submitted_at)}
                </div>
                {detail.note && (
                  <div className="rounded-md bg-muted p-3 text-sm">{detail.note}</div>
                )}
                <div>
                  <div className="mb-1 text-sm font-medium">Audio Setoran</div>
                  {detail.audio_presigned_url ? (
                    <audio controls src={detail.audio_presigned_url} className="w-full" />
                  ) : (
                    <div className="text-xs text-muted-foreground">Audio tidak tersedia</div>
                  )}
                </div>
                {detail.review?.reply_audio_presigned_url && (
                  <div>
                    <div className="mb-1 text-sm font-medium">Balasan Voice Ustadz</div>
                    <audio controls src={detail.review.reply_audio_presigned_url} className="w-full" />
                  </div>
                )}
                {detail.status === "PENDING" && (
                  <Button onClick={() => submitReview("CLAIM")} disabled={submitting} className="w-full">
                    Klaim untuk Review (IN_REVIEW)
                  </Button>
                )}
                {detail.status === "IN_REVIEW" && (
                  <div className="space-y-3">
                    <Textarea
                      placeholder="Catatan untuk santri (opsional)..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => submitReview("SUBMIT", "PASSED")}
                        disabled={submitting}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        Lulus
                      </Button>
                      <Button
                        onClick={() => submitReview("SUBMIT", "REVISION")}
                        disabled={submitting}
                        variant="outline"
                        className="border-orange-400 text-orange-600"
                      >
                        Revisi
                      </Button>
                      <Button
                        onClick={() => submitReview("SUBMIT", "REJECTED")}
                        disabled={submitting}
                        variant="outline"
                        className="border-red-400 text-red-600"
                      >
                        Tolak
                      </Button>
                    </div>
                  </div>
                )}
                {["PASSED", "REVISION", "REJECTED"].includes(detail.status) && detail.review && (
                  <div className="rounded-md border p-3 text-sm">
                    <Badge variant="secondary" className={detailBadge[detail.review.verdict] ?? ""}>{detail.review.verdict}</Badge>
                    {detail.review.notes && (
                      <div className="mt-2 text-muted-foreground">{detail.review.notes}</div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
