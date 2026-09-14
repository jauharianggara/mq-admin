"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGet, apiGetPage, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
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

interface QuestionOut {
  id: number;
  category_id: number;
  category_name: string;
  is_anonymous: boolean;
  asker_name: string | null;
  title: string;
  body: string | null;
  status: string;
  assigned_ustadz_name: string | null;
  created_at: string;
  published_at: string | null;
}

interface MessageOut {
  id: number;
  sender_id: number;
  sender_name: string | null;
  is_ustadz: boolean;
  type_: string;
  content: string | null;
  media_presigned_url: string | null;
  created_at: string;
}

interface Thread {
  question: QuestionOut;
  messages: MessageOut[];
}

const statusColor: Record<string, string> = {
  PUBLISH_REQUESTED: "bg-amber-100 text-amber-800",
  PUBLISHED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  QUEUED: "bg-gray-100 text-gray-700",
  ANSWERED: "bg-blue-100 text-blue-800",
  CLOSED: "bg-gray-100 text-gray-400",
};

export default function TanyaPage() {
  const [items, setItems] = useState<QuestionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [thread, setThread] = useState<Thread | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await apiGetPage<QuestionOut>("/questions/moderation", { limit: 50 });
      setItems(page.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function openThread(id: number) {
    try {
      const t = await apiGet<Thread>(`/questions/${id}`);
      setThread(t);
      setRejectReason("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat");
    }
  }

  async function act(path: string, body: unknown, msg: string) {
    setBusy(true);
    try {
      await apiPost(`/questions/${thread?.question.id}/${path}`, body);
      toast.success(msg);
      setThread(null);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tanya Ustadz — Moderasi</h1>
        <p className="text-sm text-muted-foreground">
          Antrean publikasi jawaban (PUBLISH_REQUESTED) & pertanyaan menunggu
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Penanya</TableHead>
              <TableHead>Ustadz</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Antrean moderasi kosong
                </TableCell>
              </TableRow>
            ) : (
              items.map((q) => (
                <TableRow key={q.id} className="cursor-pointer" onClick={() => openThread(q.id)}>
                  <TableCell className="font-mono text-xs">{q.id}</TableCell>
                  <TableCell className="max-w-64 truncate text-sm font-medium">{q.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{q.category_name}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {q.asker_name ?? <span className="italic text-muted-foreground">Anonim</span>}
                  </TableCell>
                  <TableCell className="text-sm">{q.assigned_ustadz_name ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        statusColor[q.status] ?? "bg-gray-100"
                      }`}
                    >
                      {q.status}
                    </span>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!thread} onOpenChange={(o) => !o && setThread(null)}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          {thread && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6">{thread.question.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Kategori: <b>{thread.question.category_name}</b>
                  </span>
                  <span>
                    Penanya: <b>{thread.question.asker_name ?? "Anonim"}</b>
                  </span>
                  <span>
                    Ustadz: <b>{thread.question.assigned_ustadz_name ?? "—"}</b>
                  </span>
                  <Badge className={statusColor[thread.question.status]}>
                    {thread.question.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {thread.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`rounded-lg border p-3 ${
                        m.is_ustadz ? "border-primary/30 bg-primary/5" : ""
                      }`}
                    >
                      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <b>{m.sender_name ?? `#${m.sender_id}`}</b>
                        {m.is_ustadz && <Badge className="text-[9px]">USTADZ</Badge>}
                        <span>{m.created_at?.replace("T", " ").replace("Z", "")}</span>
                      </div>
                      {m.type_ === "TEXT" ? (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{m.type_}</Badge>
                          {m.media_presigned_url && (
                            <audio controls src={m.media_presigned_url} className="h-8 flex-1" />
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {thread.question.status === "PUBLISH_REQUESTED" && (
                  <div className="space-y-2 border-t pt-3">
                    <div className="text-xs text-muted-foreground">
                      Publikasi ke arsip publik (dengan disclaimer):
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        disabled={busy}
                        onClick={() => act("publish", undefined, "Jawaban dipublikasikan")}
                      >
                        Setujui Publikasi
                      </Button>
                    </div>
                    <Textarea
                      placeholder="Alasan penolakan (opsional)..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows={2}
                    />
                    <Button
                      variant="outline"
                      className="w-full border-red-400 text-red-600"
                      disabled={busy}
                      onClick={() =>
                        act(
                          "reject-publish",
                          rejectReason ? { reason: rejectReason } : undefined,
                          "Publikasi ditolak",
                        )
                      }
                    >
                      Tolak Publikasi
                    </Button>
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
