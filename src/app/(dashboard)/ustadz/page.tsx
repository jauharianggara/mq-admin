"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { apiGet, apiGetPage, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface Ustadz {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  last_login_at: string | null;
  verified: boolean;
  pendidikan: string | null;
  is_accepting: boolean | null;
  price_per_hour: number | null;
  rating_avg: number | null;
  rating_count: number;
  saldo_penghasilan: number;
  kunjungan_selesai: number;
}

const statusVariant: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
  DEACTIVATED: "bg-gray-100 text-gray-600",
};

function rp(n: number) {
  return "Rp " + n.toLocaleString("id-ID");
}

function fmt(iso: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

export default function UstadzPage() {
  const router = useRouter();
  const [items, setItems] = useState<Ustadz[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [menerima, setMenerima] = useState<string>("all");
  const [next, setNext] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  // riwayat cursor per halaman (cursors[0] = halaman 1)
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState(0);

  const load = useCallback(
    async (c: string | null, replace: boolean) => {
      setLoading(true);
      try {
        // filter "menerima" diterapkan client-side (data dari backend ringan)
        const result = await apiGetPage<Ustadz>("/admin/ustadz", {
          q: q || undefined,
          status: status === "all" ? undefined : status,
          cursor: c ?? undefined,
          limit: 20,
        });
        const filtered =
          menerima === "all"
            ? result.items
            : result.items.filter((u) => (menerima === "ya" ? u.is_accepting : !u.is_accepting));
        setItems(replace ? filtered : (prev) => [...prev, ...filtered]);
        setNext(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal memuat ustadz");
      } finally {
        setLoading(false);
      }
    },
    [q, status, menerima],
  );

  useEffect(() => {
    setCursors([null]);
    setPage(0);
    load(null, true);
    // total mengikuti filter q + status (menerima = client-side, tak dihitung)
    const qs = new URLSearchParams({ role: "USTADZ" });
    if (q.trim()) qs.set("q", q.trim());
    if (status !== "all") qs.set("status", status);
    apiGet<{ total: number }>(`/admin/users-count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
  }, [load, q, status]);

  function goNext() {
    if (!next) return;
    const cs = [...cursors];
    cs[page + 1] = next;
    setCursors(cs);
    setPage(page + 1);
    load(next, true);
  }

  function goPrev() {
    const p = page - 1;
    setPage(p);
    load(cursors[p] ?? null, true);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Ustadz{" "}
          {total !== null && <span className="text-lg font-normal text-muted-foreground">· {total} ustadz</span>}
        </h1>
        <p className="text-sm text-muted-foreground">
          Daftar ustadz: verifikasi, ketersediaan menerima pesanan, infaq per jam, rating santri & saldo penghasilan — klik baris utk detail
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama / email / phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={menerima} onValueChange={(v) => setMenerima(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Menerima pesanan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua</SelectItem>
            <SelectItem value="ya">Menerima pesanan</SelectItem>
            <SelectItem value="tidak">Tidak menerima</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="PENDING_VERIFICATION">Menunggu verifikasi</SelectItem>
            <SelectItem value="SUSPENDED">Suspend</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => load(null, true)}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ustadz</TableHead>
              <TableHead>Kota / Pendidikan</TableHead>
              <TableHead>Menerima</TableHead>
              <TableHead className="text-right">Infaq/jam</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead className="text-right">Saldo Penghasilan</TableHead>
              <TableHead className="text-center">Kunjungan</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0 ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={8}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  Tidak ada ustadz sesuai filter.
                </TableCell>
              </TableRow>
            ) : (
              items.map((u) => (
                <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/ustadz/${u.id}`)}>
                  <TableCell>
                    <div className="flex items-center gap-1.5 font-medium">
                      {u.full_name}
                      {u.verified && (
                        <Badge className="bg-sky-100 text-sky-800">✓ Terverifikasi</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      #{u.id} · {u.email ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{u.city ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{u.pendidikan ?? "-"}</div>
                  </TableCell>
                  <TableCell>
                    {u.is_accepting === null ? (
                      <span className="text-xs text-muted-foreground">belum diatur</span>
                    ) : u.is_accepting ? (
                      <Badge className="bg-green-100 text-green-800">Ya</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-600">Tidak</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {u.price_per_hour ? rp(u.price_per_hour) : "-"}
                  </TableCell>
                  <TableCell>
                    {u.rating_count > 0 ? (
                      <span className="text-sm">
                        ★ {u.rating_avg?.toFixed(1)}{" "}
                        <span className="text-xs text-muted-foreground">({u.rating_count})</span>
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">baru</span>
                    )}
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${u.saldo_penghasilan > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                    {rp(u.saldo_penghasilan)}
                  </TableCell>
                  <TableCell className="text-center">{u.kunjungan_selesai}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusVariant[u.status] ?? ""}>
                      {u.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {(page > 0 || hasMore) && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Halaman {page + 1}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 0 || loading} onClick={goPrev}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
            </Button>
            <Button variant="outline" size="sm" disabled={!hasMore || loading} onClick={goNext}>
              Berikutnya <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
