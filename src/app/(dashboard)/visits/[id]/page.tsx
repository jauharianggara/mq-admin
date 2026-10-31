"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Ban,
  CalendarDays,
  CheckCircle2,
  Copy,
  CreditCard,
  Download,
  EyeOff,
  Hourglass,
  MapPin,
  Phone,
  RefreshCw,
  ShieldAlert,
  X,
  XCircle,
} from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
import { fmtDateLong, fmtDateTime, fmtTime, rp } from "@/lib/format";
import { cn } from "@/lib/utils";
import VisitMap from "@/components/visit-map";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  IN_PROGRESS: "bg-teal-100 text-teal-800",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  REVIEWED: "bg-purple-100 text-purple-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-200 text-gray-700",
  PAYMENT_EXPIRED: "bg-gray-200 text-gray-600",
};

function salin(teks: string) {
  navigator.clipboard
    .writeText(teks)
    .then(() => toast.success(`Disalin: ${teks}`))
    .catch(() => toast.error("Gagal menyalin"));
}

/** Judul kartu bergaya mockup: ikon tonjolan + judul + deskripsi kecil */
function JudulKartu({
  icon,
  judul,
  deskripsi,
}: {
  icon: React.ReactNode;
  judul: string;
  deskripsi: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        {icon}
      </span>
      <div>
        <CardTitle className="text-base font-bold">{judul}</CardTitle>
        <CardDescription>{deskripsi}</CardDescription>
      </div>
    </div>
  );
}

/** Tile label + nilai + sub-teks opsional */
function Info({
  label,
  children,
  sub,
}: {
  label: string;
  children: React.ReactNode;
  sub?: string;
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <p className="text-sm font-bold">{children}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Chip pihak (santri/ustadz): avatar inisial + nama + kontak */
function Pihak({
  label,
  nama,
  phone,
  tone,
}: {
  label: string;
  nama: string | null;
  phone: string | null;
  tone: "santri" | "ustadz";
}) {
  return (
    <div className="flex items-start gap-3.5 rounded-xl border bg-muted/40 p-3">
      <UserAvatar
        name={nama}
        className={cn(
          "size-10 text-xs font-bold",
          tone === "santri" ? "bg-slate-900 text-white" : "bg-emerald-700 text-white",
        )}
      />
      <div className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <p className="mt-0.5 truncate text-sm font-bold capitalize">{nama ?? "-"}</p>
        {phone && (
          <a
            href={`tel:${phone}`}
            className="mt-1 inline-flex items-center gap-1 font-mono text-[11px] font-medium text-emerald-700 hover:underline"
          >
            <Phone className="size-3" />
            {phone}
          </a>
        )}
      </div>
    </div>
  );
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

  // fetch murni (tanpa setState) — effect dan handler yang menulis state
  function muatData(vid: string) {
    return Promise.all([
      apiGet<Visit>(`/admin/visits/${vid}`),
      apiGet<ChatMsg[]>(`/admin/visits/${vid}/messages?limit=200`).catch(() => [] as ChatMsg[]),
    ]);
  }

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    muatData(id)
      .then(([visit, msgs]) => {
        if (!ignore) {
          setV(visit);
          setChat(msgs);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!ignore) setError(e instanceof ApiError ? e.message : "Gagal memuat kunjungan");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  // reload dari handler aksi admin
  function load() {
    if (!id) return;
    setLoading(true);
    muatData(id)
      .then(([visit, msgs]) => {
        setV(visit);
        setChat(msgs);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof ApiError ? e.message : "Gagal memuat kunjungan");
      })
      .finally(() => setLoading(false));
  }

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

  function eksporChat() {
    if (!v || chat.length === 0) return;
    const baris = chat.map(
      (m) =>
        `[${fmtDateTime(m.created_at)}] ${
          v.requester && m.sender_id === v.requester.user_id
            ? (v.requester.full_name ?? "Santri")
            : (v.ustadz?.full_name ?? "Ustadz")
        }: ${m.body}`,
    );
    const isi = `Chat Kunjungan #${v.id} — audit read-only MQ Admin\n\n${baris.join("\n")}\n`;
    const url = URL.createObjectURL(new Blob([isi], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `kunjungan-${v.id}-chat.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Chat diekspor (.txt)");
  }

  const canForce = v?.status === "CONFIRMED" || v?.status === "WAITING_CONFIRM";
  const koordinat = v?.lat != null && v?.lng != null ? `${v.lat.toFixed(5)}, ${v.lng.toFixed(5)}` : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-10">
      {/* 1. Header */}
      <section className="flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-xs sm:p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <Button
            variant="outline"
            size="icon"
            nativeButton={false}
            render={<Link href="/visits" />}
            aria-label="Kembali ke daftar kunjungan"
          >
            <ArrowLeft className="size-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                Kunjungan #{id}
                {v ? ` — ${v.duration_hours} jam` : ""}
              </h1>
              {v && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-6 gap-1.5 rounded-full px-3 text-xs font-bold",
                    statusColor[v.status] ?? "",
                  )}
                >
                  <span className="size-2 rounded-full bg-current" />
                  {v.status}
                </Badge>
              )}
            </div>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Detail lengkap &amp; penanganan dispute tiket kunjungan
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 self-start md:self-center">
          <Button variant="outline" size="sm" onClick={load} disabled={loading || !id}>
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Sinkronkan
          </Button>
        </div>
      </section>

      {loading ? (
        <div className="space-y-5">
          <Skeleton className="h-48 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      ) : error || !v ? (
        <div className="rounded-2xl border p-10 text-center text-muted-foreground">{error}</div>
      ) : (
        <>
          {/* 2. Informasi Kunjungan */}
          <Card className="gap-5 pt-0">
            <div aria-hidden className="h-1 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />
            <CardHeader>
              <JudulKartu
                icon={<CalendarDays className="size-5" />}
                judul="Informasi Kunjungan"
                deskripsi="Parameter sesi pengajaran privat dan identitas peserta"
              />
            </CardHeader>
            <CardContent className="grid gap-x-8 gap-y-5 md:grid-cols-2">
              <Pihak
                label="Santri / Pemesan"
                nama={v.requester?.full_name ?? null}
                phone={null}
                tone="santri"
              />
              <Pihak
                label="Ustadz Pengajar"
                nama={v.ustadz?.full_name ?? null}
                phone={v.ustadz?.phone ?? null}
                tone="ustadz"
              />
              <Info label="Jadwal Kunjungan" sub={"Pukul " + fmtTime(v.scheduled_at)}>
                {fmtDateLong(v.scheduled_at)}
              </Info>
              <Info
                label="Durasi Sesi"
                sub={`${v.duration_hours * 60} menit tatap muka langsung`}
              >
                {v.duration_hours} jam
              </Info>
              <Info label="Tarif Infaq" sub="Rate standar pengajar bersertifikat">
                {rp(v.price_per_hour)} <span className="text-xs font-normal text-muted-foreground">/ jam</span>
              </Info>
              <div className="space-y-1">
                <span className="text-xs font-medium text-muted-foreground">Total Infaq</span>
                <p className="text-lg font-black tracking-tight text-emerald-700">
                  {rp(v.price_total)}
                </p>
                {v.payment?.status === "PAID" && (
                  <span className="inline-flex items-center gap-1 rounded border bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                    <CheckCircle2 className="size-3" /> Lunas terverifikasi
                  </span>
                )}
              </div>
              <Info label="Patokan Rumah">{v.address_label || "-"}</Info>
              <Info label="Dibuat">{fmtDateTime(v.created_at)}</Info>
              {v.paid_at && <Info label="Dibayar">{fmtDateTime(v.paid_at)}</Info>}
              {v.confirmed_at && <Info label="Dikonfirmasi">{fmtDateTime(v.confirmed_at)}</Info>}
              {v.completed_at && <Info label="Selesai">{fmtDateTime(v.completed_at)}</Info>}
              {v.canceled_at && <Info label="Dibatalkan">{fmtDateTime(v.canceled_at)}</Info>}
              {v.note && (
                <div className="md:col-span-2">
                  <Separator className="mb-3" />
                  <p className="text-sm">
                    <span className="text-muted-foreground">Catatan santri: </span>
                    {v.note}
                  </p>
                </div>
              )}
              {(v.cancel_reason || v.decline_reason) && (
                <p className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700 md:col-span-2">
                  {v.cancel_reason ?? v.decline_reason}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 3. Pembayaran & Rincian Transaksi */}
          <Card>
            <CardHeader className="border-b pb-4">
              <JudulKartu
                icon={<CreditCard className="size-5" />}
                judul="Pembayaran & Rincian Transaksi"
                deskripsi="Status penyelesaian dana infaq dan settlement gateway"
              />
              <CardAction>
                {v.payment && (
                  <Badge
                    variant="secondary"
                    className="rounded-full border-0 bg-emerald-100 px-3 text-xs font-bold text-emerald-800"
                  >
                    {v.payment.status}
                  </Badge>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              {v.payment ? (
                <div className="grid items-start gap-6 md:grid-cols-2">
                  <div className="space-y-3.5">
                    <div className="rounded-xl border bg-muted/40 p-4">
                      <span className="text-[11px] font-medium text-muted-foreground">
                        Nominal Total
                      </span>
                      <p className="mt-0.5 text-2xl font-black tracking-tight">
                        {rp(v.payment.amount)}
                      </p>
                      {v.payment.status === "PAID" && (
                        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-emerald-600">
                          <CheckCircle2 className="size-3.5" />
                          Dana diterima — ditahan MQ sampai kunjungan selesai
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
                      <span className="text-xs text-muted-foreground">Bayar dengan</span>
                      <span className="rounded border bg-card px-2 py-0.5 font-mono text-xs font-bold">
                        {v.payment.channel === "DEPOSIT"
                          ? "Saldo (deposit)"
                          : v.payment.channel
                            ? `Xendit (${v.payment.channel})`
                            : "Xendit"}
                      </span>
                    </div>
                    {v.payment.refunded_amount > 0 && (
                      <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2.5">
                        <span className="text-xs text-muted-foreground">Dikembalikan ke deposit</span>
                        <span className="font-mono text-xs font-bold">{rp(v.payment.refunded_amount)}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-3.5">
                    <div className="rounded-xl border bg-muted/40 p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">External ID</span>
                        <button
                          type="button"
                          onClick={() => salin(v.payment!.external_id)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                        >
                          <Copy className="size-3" /> Salin
                        </button>
                      </div>
                      <p className="mt-1 break-all rounded border bg-card p-2 font-mono text-xs font-semibold">
                        {v.payment.external_id}
                      </p>
                    </div>
                    <div className="space-y-2 rounded-xl border bg-muted/40 p-3 text-[11px] text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Biaya Pengajaran ({v.duration_hours} jam)</span>
                        <span className="font-mono font-medium text-foreground">{rp(v.price_total)}</span>
                      </div>
                      <div className="flex justify-between border-t pt-1.5 text-xs font-bold">
                        <span>Total Dibayar</span>
                        <span className="font-mono text-emerald-700">{rp(v.payment.amount)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Belum ada pembayaran.</p>
              )}
            </CardContent>
          </Card>

          {/* 4. Lokasi Kunjungan */}
          <Card>
            <CardHeader className="border-b pb-4">
              <JudulKartu
                icon={<MapPin className="size-5" />}
                judul="Lokasi Kunjungan"
                deskripsi="Peta dan titik koordinat tujuan pengajaran"
              />
              <CardAction>
                {v.address_label && (
                  <span className="rounded-md bg-muted px-2.5 py-1 font-mono text-xs font-medium">
                    {v.address_label}
                  </span>
                )}
              </CardAction>
            </CardHeader>
            <CardContent>
              {!v.anonymized && v.lat != null && v.lng != null ? (
                <div className="grid items-center gap-5 md:grid-cols-12">
                  <div className="md:col-span-7">
                    <VisitMap lat={v.lat} lng={v.lng} className="h-56 w-full md:h-64" />
                  </div>
                  <div className="space-y-3.5 text-xs md:col-span-5">
                    <div className="rounded-xl border bg-muted/40 p-3.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Patokan Rumah
                        </span>
                        {v.address_label && (
                          <button
                            type="button"
                            onClick={() => salin(v.address_label)}
                            className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                          >
                            <Copy className="size-3" /> Salin
                          </button>
                        )}
                      </div>
                      <p className="text-xs font-bold">{v.address_label || "-"}</p>
                    </div>
                    <div className="rounded-xl border bg-muted/40 p-3.5">
                      <div className="mb-1.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Koordinat Terdata
                        </span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                          GPS
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="rounded-lg border bg-card px-2.5 py-1.5 font-mono text-xs font-bold">
                          {koordinat}
                        </p>
                        <button
                          type="button"
                          onClick={() => salin(koordinat!)}
                          className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                        >
                          <Copy className="size-3" /> Salin
                        </button>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      nativeButton={false}
                      className="w-full border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:text-emerald-900"
                      render={
                        <a
                          href={`https://www.google.com/maps?q=${v.lat},${v.lng}`}
                          target="_blank"
                          rel="noreferrer"
                        />
                      }
                    >
                      <MapPin className="size-4" />
                      Buka di Google Maps
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {v.anonymized
                    ? "Lokasi telah dianonymize (akun santri dihapus) — koordinat dibersihkan."
                    : "Belum ada koordinat untuk kunjungan ini."}
                </p>
              )}
            </CardContent>
          </Card>

          {/* 5. Chat Transaksi (read-only) — section halaman, bukan popup */}
          <Card>
            <CardHeader className="border-b pb-4">
              <JudulKartu
                icon={<EyeOff className="size-5" />}
                judul="Chat Transaksi (read-only)"
                deskripsi="Admin hanya membaca — untuk audit kepatuhan & penyelesaian dispute"
              />
              <CardAction>
                <Button variant="outline" size="sm" onClick={eksporChat} disabled={chat.length === 0}>
                  <Download className="size-3.5" />
                  Ekspor Chat
                </Button>
              </CardAction>
            </CardHeader>
            <CardContent>
              {chat.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada pesan.</p>
              ) : (
                <div className="max-h-[380px] space-y-4 overflow-y-auto pr-1">
                  <div className="flex justify-center py-1">
                    <span className="flex items-center gap-1.5 rounded-full border bg-muted/60 px-3.5 py-1 text-[11px] text-muted-foreground">
                      <Hourglass className="size-3" />
                      Riwayat chat — {chat.length} pesan, mode audit baca-saja
                    </span>
                  </div>
                  {chat.map((m) => {
                    const dariSantri = v.requester && m.sender_id === v.requester.user_id;
                    const nama = dariSantri
                      ? (v.requester?.full_name ?? "Santri")
                      : (v.ustadz?.full_name ?? "Ustadz");
                    return (
                      <div
                        key={m.id}
                        className={cn("flex items-start gap-2.5", dariSantri && "flex-row-reverse")}
                      >
                        <span
                          className={cn(
                            "flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white",
                            dariSantri ? "bg-slate-900" : "bg-emerald-700",
                          )}
                        >
                          {(nama.trim().charAt(0).toUpperCase() || "?")}
                        </span>
                        <div className={cn("max-w-[80%]", dariSantri && "text-right")}>
                          <div className="mb-1 flex items-center gap-2 text-[11px]">
                            {dariSantri && <span className="text-muted-foreground">{fmtTime(m.created_at)}</span>}
                            <span className="font-bold">{nama}</span>
                            <span
                              className={cn(
                                "rounded px-1.5 py-0.5 text-[10px] font-medium",
                                dariSantri
                                  ? "bg-muted text-muted-foreground"
                                  : "bg-emerald-50 text-emerald-700",
                              )}
                            >
                              {dariSantri ? "Santri" : "Ustadz"}
                            </span>
                            {!dariSantri && <span className="text-muted-foreground">{fmtTime(m.created_at)}</span>}
                          </div>
                          <div
                            className={cn(
                              "rounded-2xl p-3 text-left text-xs leading-relaxed",
                              dariSantri
                                ? "rounded-tr-sm bg-emerald-600 text-white"
                                : "rounded-tl-sm border bg-muted",
                            )}
                          >
                            {m.body}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <EyeOff className="size-3" /> Mode pengawasan administrator — tidak bisa membalas
                </span>
                <span className="font-mono text-[11px]">visit #{v.id}</span>
              </div>
            </CardContent>
          </Card>

          {/* 6. Tindakan Admin */}
          <Card>
            <CardHeader className="border-b pb-4">
              <JudulKartu
                icon={<ShieldAlert className="size-5" />}
                judul="Tindakan Admin"
                deskripsi="Kontrol dispute, intervensi penyelesaian masalah, dan pembatalan tiket"
              />
            </CardHeader>
            <CardContent>
              {canForce ? (
                <div className="flex flex-col gap-3 sm:flex-row">
                  {v.status === "CONFIRMED" && (
                    <Button
                      className="flex-1 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 hover:text-amber-900"
                      variant="outline"
                      onClick={doForceComplete}
                      disabled={busy}
                    >
                      <CheckCircle2 className="size-4" />
                      Tandai Selesai (force)
                    </Button>
                  )}
                  {!showCancelForm ? (
                    <Button
                      className="flex-1"
                      variant="destructive"
                      onClick={() => setShowCancelForm(true)}
                    >
                      <XCircle className="size-4" /> Batalkan pesanan ini…
                    </Button>
                  ) : (
                    <div className="w-full space-y-2 rounded-xl border p-3 sm:flex-1">
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
                          <Ban className="size-4" /> Batalkan
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setShowCancelForm(false)}>
                          <X className="size-4" /> Batal
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Status <strong>{v.status}</strong> tidak punya aksi force (terminal / sudah selesai).
                </p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
