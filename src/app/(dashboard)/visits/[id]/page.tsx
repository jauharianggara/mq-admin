"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, EyeOff, RefreshCw } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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
  channel: string | null;
}

interface Visit {
  id: number;
  status: string;
  scheduled_at: string;
  duration_hours: number;
  lat: number | null;
  lng: number | null;
  address_label: string;
  note: string | null;
  price_per_hour: number;
  price_total: number;
  anonymized: boolean;
  cancel_reason: string | null;
  decline_reason: string | null;
  created_at: string;
  paid_at: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  canceled_at: string | null;
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

function fmt(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "full", timeStyle: "short" });
}

function fmtShort(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function rp(n: number | null | undefined) {
  return "Rp " + (n ?? 0).toLocaleString("id-ID");
}

export default function VisitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string | null>(null);
  const [v, setV] = useState<Visit | null>(null);
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // form force-cancel inline (bukan popup)
  const [showCancelForm, setShowCancelForm] = useState(false);
  const [reason, setReason] = useState("");
  const [forceRefund, setForceRefund] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const visit = await apiGet<Visit>(`/admin/visits/${id}`);
      setV(visit);
      const msgs = await apiGet<ChatMsg[]>(`/admin/visits/${id}/messages?limit=200`).catch(() => []);
      setChat(msgs);
      setError(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gagal memuat kunjungan");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  async function doForceComplete() {
    if (!v) return;
    setBusy(true);
    try {
      await apiPost(`/admin/visits/${v.id}/force-complete`);
      toast.success("Kunjungan ditandai selesai (force)");
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  async function doForceCancel() {
    if (!v || !reason.trim()) return;
    setBusy(true);
    try {
      await apiPost(`/admin/visits/${v.id}/force-cancel`, {
        reason: reason.trim(),
        force_refund: forceRefund,
      });
      toast.success("Pesanan dibatalkan (force)");
      setReason("");
      setForceRefund(false);
      setShowCancelForm(false);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  const canForce = v?.status === "CONFIRMED" || v?.status === "WAITING_CONFIRM";

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" render={<Link href="/visits" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">
              Kunjungan #{id} — {v ? `${v.duration_hours} jam` : ""}
            </h1>
            <p className="text-sm text-muted-foreground">Detail lengkap & penanganan dispute</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {v && (
            <Badge variant="secondary" className={statusColor[v.status] ?? ""}>
              {v.status}
            </Badge>
          )}
          <Button variant="outline" size="icon" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : error || !v ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">{error}</div>
      ) : (
        <>
          {/* Ringkasan */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Informasi Kunjungan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                  <Info label="Santri" value={v.requester?.full_name ?? "-"} />
                  <Info label="Ustadz" value={v.ustadz?.full_name ?? "-"} />
                  <Info label="Jadwal" value={fmt(v.scheduled_at)} />
                  <Info label="Durasi" value={`${v.duration_hours} jam`} />
                  <Info label="Infaq" value={`${rp(v.price_per_hour)} / jam`} />
                  <Info label="Total" value={rp(v.price_total)} />
                  <Info
                    label="Titik lokasi santri"
                    value={
                      v.anonymized
                        ? "dianonymize (akun dihapus)"
                        : v.lat != null
                          ? `${v.lat.toFixed(5)}, ${v.lng?.toFixed(5)}`
                          : "-"
                    }
                  />
                  <Info label="Patokan rumah" value={v.address_label} />
                  <Info label="Dibuat" value={fmtShort(v.created_at)} />
                  {v.paid_at && <Info label="Dibayar" value={fmtShort(v.paid_at)} />}
                  {v.confirmed_at && <Info label="Dikonfirmasi" value={fmtShort(v.confirmed_at)} />}
                  {v.completed_at && <Info label="Selesai" value={fmtShort(v.completed_at)} />}
                  {v.canceled_at && <Info label="Dibatalkan" value={fmtShort(v.canceled_at)} />}
                </div>
                {v.note && (
                  <>
                    <Separator />
                    <p className="text-sm">
                      <span className="text-muted-foreground">Catatan santri: </span>
                      {v.note}
                    </p>
                  </>
                )}
                {(v.cancel_reason || v.decline_reason) && (
                  <p className="rounded bg-red-50 p-2 text-xs text-red-700">
                    {v.cancel_reason ?? v.decline_reason}
                  </p>
                )}
                {v.ustadz?.phone && (
                  <p className="text-xs text-muted-foreground">
                    Kontak ustadz: <span className="font-mono">{v.ustadz.phone}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pembayaran</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {v.payment ? (
                    <>
                      <Info label="Status" value={v.payment.status} />
                      <Info label="Nominal" value={rp(v.payment.amount)} />
                      <Info
                        label="Bayar dgn"
                        value={
                          v.payment.channel === "DEPOSIT"
                            ? "Saldo (deposit)"
                            : v.payment.channel
                              ? `Xendit (${v.payment.channel})`
                              : "Xendit"
                        }
                      />
                      {v.payment.refunded_amount > 0 && (
                        <Info label="Dikembalikan ke deposit" value={rp(v.payment.refunded_amount)} />
                      )}
                      <div>
                        <p className="text-xs text-muted-foreground">External ID</p>
                        <p className="break-all font-mono text-xs">{v.payment.external_id}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-muted-foreground">Belum ada pembayaran.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tindakan Admin</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {canForce ? (
                    <>
                      {v.status === "CONFIRMED" && (
                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={doForceComplete}
                          disabled={busy}
                        >
                          Tandai Selesai (force)
                        </Button>
                      )}
                      {!showCancelForm ? (
                        <Button
                          className="w-full"
                          variant="outline"
                          onClick={() => setShowCancelForm(true)}
                        >
                          Batalkan pesanan ini…
                        </Button>
                      ) : (
                        <div className="space-y-2 rounded-lg border p-3">
                          <Label className="text-xs">Alasan pembatalan (wajib, tercatat audit)</Label>
                          <Textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="cth: laporan no-show dari kedua pihak"
                            rows={2}
                          />
                          <label className="flex items-start gap-2 text-xs leading-tight">
                            <input
                              type="checkbox"
                              className="mt-0.5"
                              checked={forceRefund}
                              onChange={(e) => setForceRefund(e.target.checked)}
                            />
                            Refund penuh ke santri (override aturan cancel)
                          </label>
                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              size="sm"
                              variant="destructive"
                              onClick={doForceCancel}
                              disabled={busy || !reason.trim()}
                            >
                              Batalkan
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowCancelForm(false)}
                            >
                              Batal
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Status <strong>{v.status}</strong> tidak punya aksi force (terminal / sudah
                      selesai).
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Chat read-only — section halaman, bukan popup */}
          <Card>
            <CardHeader>
              <CardTitle>Chat Transaksi (read-only)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-3 flex items-center gap-1 text-xs text-muted-foreground">
                <EyeOff className="h-3 w-3" /> Admin hanya membaca — untuk penanganan dispute.
              </p>
              {chat.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada pesan.</p>
              ) : (
                <div className="space-y-2">
                  {chat.map((m) => {
                    const fromSantri = v.requester && m.sender_id === v.requester.user_id;
                    return (
                      <div key={m.id} className={`flex ${fromSantri ? "justify-start" : "justify-end"}`}>
                        <div
                          className={`max-w-[70%] rounded-lg px-3 py-2 ${
                            fromSantri ? "bg-amber-50" : "bg-green-50"
                          }`}
                        >
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            {fromSantri ? v.requester?.full_name : v.ustadz?.full_name}
                          </p>
                          <p className="text-sm">{m.body}</p>
                          <p className="text-right text-[10px] text-muted-foreground">
                            {fmtShort(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
