"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { apiGet, apiGetPage, apiPatch, ApiError } from "@/lib/api";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Slot {
  id: number;
  weekday: number;
  start_minute: number;
  end_minute: number;
}

interface Payout {
  id: number;
  amount: number;
  fee: number;
  bank_name: string;
  account_no: string;
  account_name: string;
  status: string;
  created_at: string;
}

interface Ustadz {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  bio: string | null;
  pendidikan: string | null;
  last_login_at: string | null;
  verified_at: string | null;
  is_accepting: boolean;
  price_per_hour: number | null;
  rating_avg: number | null;
  rating_count: number;
  saldo_penghasilan: number;
  slots: Slot[];
  blackouts: { off_date: string; note: string | null }[];
  payouts: Payout[];
}

interface VisitRow {
  id: number;
  status: string;
  scheduled_at: string;
  duration_hours: number;
  price_total: number;
  requester: { full_name: string } | null;
}

const statusVariant: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
  DEACTIVATED: "bg-gray-100 text-gray-600",
};

const visitStatusColor: Record<string, string> = {
  REQUESTED: "bg-sky-100 text-sky-700",
  WAITING_CONFIRM: "bg-amber-100 text-amber-700",
  CONFIRMED: "bg-green-100 text-green-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  REVIEWED: "bg-purple-100 text-purple-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELED: "bg-gray-200 text-gray-700",
  PAYMENT_EXPIRED: "bg-gray-200 text-gray-600",
};

const payoutStatusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-sky-100 text-sky-700",
  TRANSFERRED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
};

const hari = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function mm(m: number) {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function UstadzDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [u, setU] = useState<Ustadz | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await apiGet<Ustadz>(`/admin/ustadz/${id}`);
      setU(d);
      const v = await apiGetPage<VisitRow>("/admin/visits", { ustadz_id: id, limit: 10 }).catch(() => ({ items: [], nextCursor: null, hasMore: false }));
      setVisits(v.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat ustadz");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  async function setStatus(newStatus: string) {
    if (!u) return;
    if (!confirm(`Ubah status ${u.full_name} menjadi ${newStatus}?`)) return;
    setBusy(true);
    try {
      await apiPatch(`/admin/users/${u.id}`, { status: newStatus });
      toast.success(`Status → ${newStatus}`);
      load();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold">
              {u?.full_name ?? "Ustadz"} #{id}
              {u?.verified_at && <Badge className="bg-sky-100 text-sky-800">✓ Terverifikasi</Badge>}
            </h1>
            <p className="text-sm text-muted-foreground">Detail ustadz — layanan, ketersediaan, penghasilan & kunjungan</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {u && (
            <Badge variant="secondary" className={statusVariant[u.status] ?? ""}>
              {u.status}
            </Badge>
          )}
          <Button variant="outline" size="icon" onClick={load}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : !u ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">Ustadz tidak ditemukan.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Info label="Email" value={u.email ?? "-"} />
                <Info label="Telepon" value={u.phone ?? "-"} />
                <Info label="Kota" value={u.city ?? "-"} />
                <Info label="Pendidikan" value={u.pendidikan ?? "-"} />
                <Info label="Terverifikasi" value={u.verified_at ? fmt(u.verified_at) : "Belum"} />
                <Info label="Login terakhir" value={fmt(u.last_login_at)} />
                {u.bio && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground">{u.bio}</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Layanan Ngaji</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Info
                  label="Menerima pesanan"
                  value={u.is_accepting ? "Ya — tampil di pencarian santri" : "Tidak"}
                />
                <Info label="Infaq per jam" value={u.price_per_hour ? rp(u.price_per_hour) : "Belum diatur"} />
                <Info
                  label="Rating santri"
                  value={u.rating_count > 0 ? `★ ${u.rating_avg?.toFixed(1)} (${u.rating_count} ulasan)` : "Belum ada"}
                />
                <Separator />
                <div>
                  <p className="text-xs text-muted-foreground">Saldo penghasilan</p>
                  <p className={`text-3xl font-bold ${u.saldo_penghasilan > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                    {rp(u.saldo_penghasilan)}
                  </p>
                </div>
                <p className="text-xs font-semibold text-muted-foreground">Penarikan terakhir</p>
                <div className="space-y-1.5">
                  {u.payouts.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada pengajuan.</p>
                  ) : (
                    u.payouts.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between text-sm">
                        <span>
                          #{p.id} {p.bank_name} {p.account_no}
                        </span>
                        <span className="flex items-center gap-2">
                          <span className="font-medium">{rp(p.amount)}</span>
                          <Badge variant="secondary" className={payoutStatusColor[p.status] ?? ""}>
                            {p.status}
                          </Badge>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ketersediaan Mingguan & Tanggal Libur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {u.slots.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Belum mengatur ketersediaan — santri tidak dapat memesan ustadz ini.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[0, 1, 2, 3, 4, 5, 6].map((d) => {
                    const rows = u.slots.filter((s) => s.weekday === d);
                    if (rows.length === 0) return null;
                    return (
                      <div key={d} className="flex items-center gap-2 text-sm">
                        <span className="w-16 font-medium">{hari[d]}</span>
                        <span className="flex flex-wrap gap-1">
                          {rows.map((s) => (
                            <Badge key={s.id} variant="secondary">
                              {mm(s.start_minute)}–{mm(s.end_minute)}
                            </Badge>
                          ))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
              {u.blackouts.length > 0 && (
                <>
                  <Separator />
                  <p className="text-xs font-semibold text-muted-foreground">Tanggal libur</p>
                  <div className="flex flex-wrap gap-1.5">
                    {u.blackouts.map((b) => (
                      <Badge key={b.off_date} className="bg-red-50 text-red-700">
                        {b.off_date}
                        {b.note ? ` · ${b.note}` : ""}
                      </Badge>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kunjungan Ditangani (terakhir)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Santri</TableHead>
                    <TableHead>Jadwal</TableHead>
                    <TableHead>Durasi</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visits.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Belum ada kunjungan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    visits.map((v) => (
                      <TableRow key={v.id} className="hover:bg-muted/50">
                        <TableCell className="text-muted-foreground">{v.id}</TableCell>
                        <TableCell>{v.requester?.full_name ?? "-"}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmt(v.scheduled_at)}</TableCell>
                        <TableCell>{v.duration_hours} jam</TableCell>
                        <TableCell className="text-right font-semibold">{rp(v.price_total)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={visitStatusColor[v.status] ?? ""}>
                            {v.status}
                          </Badge>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tindakan Admin</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {u.status === "ACTIVE" ? (
                <Button variant="destructive" disabled={busy} onClick={() => setStatus("SUSPENDED")}>
                  Suspend akun
                </Button>
              ) : (
                <Button disabled={busy} onClick={() => setStatus("ACTIVE")}>
                  Aktifkan akun
                </Button>
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
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
