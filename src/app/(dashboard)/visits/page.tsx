"use client";

import { useCallback, useEffect, useState } from "react";
import { EyeOff, MessageSquare, RefreshCw } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";

interface Party {
  user_id: number;
  full_name: string;
  phone: string | null;
}

interface Payment {
  id: number;
  external_id: string;
  status: string;
  amount: number;
  refunded_amount: number;
}

interface Visit {
  id: number;
  status: string;
  service_name: string;
  scheduled_at: string;
  duration_minutes: number;
  address_label: string;
  price_amount: number;
  note: string | null;
  cancel_reason: string | null;
  decline_reason: string | null;
  created_at: string;
  ustadz: Party | null;
  requester: Party | null;
  payment: Payment | null;
  unread?: number;
}

interface ChatMsg {
  id: number;
  sender_id: number;
  body: string;
  created_at: string;
  read_at: string | null;
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
  const d = new Date(iso);
  return d.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function rp(n: number | null | undefined) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

export default function VisitsPage() {
  const [items, setItems] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [detail, setDetail] = useState<Visit | null>(null);
  const [chat, setChat] = useState<ChatMsg[] | null>(null);
  const [forceCancel, setForceCancel] = useState<Visit | null>(null);
  const [reason, setReason] = useState("");
  const [forceRefund, setForceRefund] = useState(false);
  const [busy, setBusy] = useState(false);

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

  async function openDetail(v: Visit) {
    setDetail(v);
    setChat(null);
  }

  async function openChat(v: Visit) {
    setDetail(v);
    setChat([]);
    try {
      const msgs = await apiGet<ChatMsg[]>(`/admin/visits/${v.id}/messages`);
      setChat(msgs);
    } catch {
      setChat(null);
      toast.error("Gagal memuat chat");
    }
  }

  async function doForceComplete() {
    if (!detail) return;
    setBusy(true);
    try {
      await apiPost(`/admin/visits/${detail.id}/force-complete`);
      toast.success("Ditandai selesai (force)");
      setDetail(null);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  async function doForceCancel() {
    if (!forceCancel || !reason.trim()) return;
    setBusy(true);
    try {
      await apiPost(`/admin/visits/${forceCancel.id}/force-cancel`, {
        reason: reason.trim(),
        force_refund: forceRefund,
      });
      toast.success("Dibatalkan (force)");
      setForceCancel(null);
      setReason("");
      setForceRefund(false);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

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
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((v) => (
                <TableRow key={v.id}>
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
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => openDetail(v)}>
                        Detail
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openChat(v)} title="Chat (dispute)">
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              Kunjungan #{detail?.id} — {detail?.service_name}
            </DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-muted-foreground">Santri</p>
                  <p className="font-medium">{detail.requester?.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Ustadz</p>
                  <p className="font-medium">{detail.ustadz?.full_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Jadwal</p>
                  <p className="font-medium">{fmt(detail.scheduled_at)} ({detail.duration_minutes} mnt)</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tarif</p>
                  <p className="font-medium">{rp(detail.price_amount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Patokan</p>
                  <p className="font-medium">{detail.address_label}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pembayaran</p>
                  <p className="font-medium">
                    {detail.payment
                      ? `${detail.payment.status} • ${rp(detail.payment.amount)} ${detail.payment.external_id}`
                      : "-"}
                  </p>
                </div>
              </div>
              {detail.note && (
                <p className="rounded bg-muted p-2 text-xs">Catatan: {detail.note}</p>
              )}
              {(detail.cancel_reason || detail.decline_reason) && (
                <p className="rounded bg-red-50 p-2 text-xs text-red-700">
                  {detail.cancel_reason ?? detail.decline_reason}
                </p>
              )}
              {(detail.status === "CONFIRMED" || detail.status === "WAITING_CONFIRM") && (
                <div className="flex justify-end gap-2 pt-2">
                  {detail.status === "CONFIRMED" && (
                    <Button size="sm" onClick={doForceComplete} disabled={busy}>
                      Force Selesai
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setForceCancel(detail);
                      setDetail(null);
                    }}
                  >
                    Force Batalkan
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Chat read-only */}
      <Dialog open={!!detail && chat !== null} onOpenChange={(o) => !o && setChat(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Chat Kunjungan #{detail?.id} (read-only)</DialogTitle>
          </DialogHeader>
          <div className="max-h-80 space-y-2 overflow-y-auto">
            {chat && chat.length > 0 ? (
              chat.map((m) => {
                const mine = m.sender_id === detail?.requester?.user_id;
                return (
                  <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[75%] rounded-lg px-3 py-2 text-xs ${
                        mine ? "bg-amber-50" : "bg-green-50"
                      }`}
                    >
                      <p className="font-semibold">
                        {mine
                          ? detail?.requester?.full_name
                          : detail?.ustadz?.full_name}
                      </p>
                      <p>{m.body}</p>
                      <p className="text-right text-[10px] text-muted-foreground">{fmt(m.created_at)}</p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada pesan.</p>
            )}
          </div>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <EyeOff className="h-3 w-3" /> Admin hanya dapat membaca chat (penanganan dispute).
          </p>
        </DialogContent>
      </Dialog>

      {/* Force cancel */}
      <Dialog open={!!forceCancel} onOpenChange={(o) => !o && setForceCancel(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Force batalkan #{forceCancel?.id}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              placeholder="Alasan (wajib, tercatat di audit)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={forceRefund}
                onChange={(e) => setForceRefund(e.target.checked)}
              />
              Refund penuh ke santri (override aturan)
            </label>
            <Button
              className="w-full"
              variant="destructive"
              onClick={doForceCancel}
              disabled={busy || !reason.trim()}
            >
              Batalkan Pesanan
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
