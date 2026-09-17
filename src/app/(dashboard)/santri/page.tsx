"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { apiGetPage, ApiError } from "@/lib/api";
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

interface Santri {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  last_login_at: string | null;
  deposit: number;
  khatmil_aktif: number;
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

export default function SantriPage() {
  const router = useRouter();
  const [items, setItems] = useState<Santri[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [next, setNext] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  // riwayat cursor per halaman (cursors[0] = halaman 1)
  const [cursors, setCursors] = useState<(string | null)[]>([null]);
  const [page, setPage] = useState(0);

  const load = useCallback(
    async (c: string | null, replace: boolean) => {
      setLoading(true);
      try {
        const result = await apiGetPage<Santri>("/admin/santri", {
          q: q || undefined,
          status: status === "all" ? undefined : status,
          cursor: c ?? undefined,
          limit: 20,
        });
        setItems(replace ? result.items : (prev) => [...prev, ...result.items]);
        setNext(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal memuat santri");
      } finally {
        setLoading(false);
      }
    },
    [q, status],
  );

  useEffect(() => {
    setCursors([null]);
    setPage(0);
    load(null, true);
  }, [load]);

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

  const totalDeposit = items.reduce((a, b) => a + b.deposit, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Santri</h1>
        <p className="text-sm text-muted-foreground">
          Daftar santri lengkap dengan deposit, khatmil aktif & riwayat kunjungan ngaji
          {items.length > 0 && <> — total deposit {items.length} santri teratas: <strong>{rp(totalDeposit)}</strong></>}
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
              <TableHead>Nama</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead>Kota</TableHead>
              <TableHead className="text-right">Deposit</TableHead>
              <TableHead className="text-center">Khatmil Aktif</TableHead>
              <TableHead className="text-center">Kunjungan Selesai</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Login Terakhir</TableHead>
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
                  Tidak ada santri sesuai filter.
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/santri/${s.id}`)}>
                  <TableCell>
                    <div className="font-medium">{s.full_name}</div>
                    <div className="text-xs text-muted-foreground">#{s.id}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{s.email ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{s.phone ?? ""}</div>
                  </TableCell>
                  <TableCell>{s.city ?? "-"}</TableCell>
                  <TableCell className={`text-right font-semibold ${s.deposit > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                    {rp(s.deposit)}
                  </TableCell>
                  <TableCell className="text-center">{s.khatmil_aktif}</TableCell>
                  <TableCell className="text-center">{s.kunjungan_selesai}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusVariant[s.status] ?? ""}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmt(s.last_login_at)}</TableCell>
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
