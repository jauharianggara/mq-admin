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

interface Tx {
  id: number;
  tx_type: string;
  amount: number;
  balance_after: number;
  subject_type: string | null;
  subject_id: number | null;
  created_at: string;
}

interface Khatmil {
  campaign_id: number;
  name: string;
  juz: string[] | null;
}

interface Santri {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  gender: string | null;
  created_at: string | null;
  last_login_at: string | null;
  bio: string | null;
  deposit: number;
  transactions: Tx[];
  khatmil_aktif: Khatmil[];
}

interface VisitRow {
  id: number;
  status: string;
  scheduled_at: string;
  duration_hours: number;
  price_total: number;
  ustadz: { full_name: string } | null;
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

const txLabel: Record<string, string> = {
  TOPUP: "Top-up deposit",
  PAYMENT: "Bayar kunjungan",
  REFUND: "Pengembalian dana",
  ADJUST: "Penyesuaian saldo",
  EARNING: "Penghasilan",
  PAYOUT: "Penarikan",
};

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmt(iso: string | null | undefined) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function SantriDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [s, setS] = useState<Santri | null>(null);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const d = await apiGet<Santri>(`/admin/santri/${id}`);
      setS(d);
      const v = await apiGetPage<VisitRow>("/admin/visits", { user_id: id, limit: 10 }).catch(() => ({ items: [], nextCursor: null, hasMore: false }));
      setVisits(v.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat santri");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) load();
  }, [id, load]);

  async function setStatus(newStatus: string) {
    if (!s) return;
    if (!confirm(`Ubah status ${s.full_name} menjadi ${newStatus}?`)) return;
    setBusy(true);
    try {
      await apiPatch(`/admin/users/${s.id}`, { status: newStatus });
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
            <h1 className="text-2xl font-semibold">{s?.full_name ?? "Santri"} #{id}</h1>
            <p className="text-sm text-muted-foreground">Detail santri — deposit, khatmil & kunjungan ngaji</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s && (
            <Badge variant="secondary" className={statusVariant[s.status] ?? ""}>
              {s.status}
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
      ) : !s ? (
        <div className="rounded-lg border p-10 text-center text-muted-foreground">Santri tidak ditemukan.</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Profil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Info label="Email" value={s.email ?? "-"} />
                <Info label="Telepon" value={s.phone ?? "-"} />
                <Info label="Kota" value={s.city ?? "-"} />
                <Info label="Jenis kelamin" value={s.gender === "M" ? "Laki-laki" : s.gender === "F" ? "Perempuan" : "-"} />
                <Info label="Terdaftar" value={fmt(s.created_at)} />
                <Info label="Login terakhir" value={fmt(s.last_login_at)} />
                {s.bio && (
                  <>
                    <Separator />
                    <p className="text-sm text-muted-foreground">{s.bio}</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Deposit</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground">Saldo saat ini</p>
                  <p className={`text-3xl font-bold ${s.deposit > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                    {rp(s.deposit)}
                  </p>
                </div>
                <Separator />
                <p className="text-xs font-semibold text-muted-foreground">Mutasi terakhir</p>
                <div className="space-y-1.5">
                  {s.transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Belum ada mutasi.</p>
                  ) : (
                    s.transactions.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span>
                          {txLabel[t.tx_type] ?? t.tx_type}
                          {t.subject_type && (
                            <span className="ml-1 text-xs text-muted-foreground">
                              {t.subject_type} #{t.subject_id}
                            </span>
                          )}
                        </span>
                        <span className="font-medium">
                          {["TOPUP", "REFUND", "EARNING"].includes(t.tx_type) ? (
                            <span className="text-green-600">+{rp(t.amount)}</span>
                          ) : (
                            <span className="text-red-600">-{rp(t.amount)}</span>
                          )}
                          <span className="ml-2 text-xs text-muted-foreground">→ {rp(t.balance_after)}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
                <Separator />
                <Button variant="outline" size="sm" render={<Link href="/deposit" />}>
                  Kelola saldo & penyesuaian
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Khatmil Aktif</CardTitle>
            </CardHeader>
            <CardContent>
              {s.khatmil_aktif.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak sedang mengikuti khatmil aktif.</p>
              ) : (
                <div className="space-y-3">
                  {s.khatmil_aktif.map((k) => (
                    <div key={k.campaign_id} className="flex flex-wrap items-center gap-2">
                      <Button variant="link" className="h-auto p-0 font-medium" render={<Link href={`/khatmil/${k.campaign_id}`} />}>
                        {k.name}
                      </Button>
                      {k.juz?.map((j) => (
                        <Badge key={j} className="bg-emerald-100 text-emerald-800">
                          Juz {j}
                        </Badge>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Kunjungan Ngaji (terakhir)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Ustadz</TableHead>
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
                        <TableCell>{v.ustadz?.full_name ?? "-"}</TableCell>
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
              {s.status === "ACTIVE" ? (
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
