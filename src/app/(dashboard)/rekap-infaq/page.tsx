"use client";

// Laporan saldo & mutasi infaq (admin): per penerima, bisa difilter per bulan.
// Sumber: GET /admin/infaq/laporan?bulan=YYYY-MM (saldo & pengajuan berjalan
// selalu kondisi terkini; kolom total diterima/ditarik mengikuti filter bulan).
// Mutasi detail = halaman detail penerima /penerima/[id] (aturan anti-popup).

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Coins } from "lucide-react";
import { apiGet, ApiError } from "@/lib/api";
import { rp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LaporanRow {
  user_id: number;
  nama: string | null;
  email: string | null;
  status: string;
  saldo: number;
  total_diterima: number;
  total_ditarik: number;
  pending_tarik: number;
}

export default function RekapInfaqPage() {
  const [bulan, setBulan] = useState<string>("");
  const [rows, setRows] = useState<LaporanRow[] | null>(null);

  const load = useCallback(async () => {
    try {
      const qs = bulan ? `?bulan=${encodeURIComponent(bulan)}` : "";
      const res = await apiGet<{ items: LaporanRow[] }>(`/admin/infaq/laporan${qs}`);
      setRows(res.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat laporan");
    }
  }, [bulan]);

  useEffect(() => {
    load();
  }, [load]);

  const totalSaldo = (rows ?? []).reduce((a, r) => a + r.saldo, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="size-6" />
        <div>
          <h1 className="text-xl font-semibold">Rekap Infaq</h1>
          <p className="text-sm text-muted-foreground">
            Laporan saldo dan mutasi infaq setiap penerima.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Per penerima</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Periode total masuk/keluar:</span>
            <Input
              type="month"
              className="w-44"
              value={bulan}
              onChange={(e) => setBulan(e.target.value)}
            />
            {bulan && (
              <Button variant="ghost" size="sm" onClick={() => setBulan("")}>
                Semua
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penerima infaq.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead className="text-right">Saldo kini</TableHead>
                    <TableHead className="text-right">Diterima{bulan ? ` (${bulan})` : " (total)"}</TableHead>
                    <TableHead className="text-right">Ditarik{bulan ? ` (${bulan})` : " (total)"}</TableHead>
                    <TableHead className="text-right">Sedang diajukan</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.user_id}>
                      <TableCell className="font-medium">
                        <Link href={`/penerima/${r.user_id}`} className="hover:underline">
                          {r.nama ?? "(tanpa nama)"}
                        </Link>
                        {r.status !== "ACTIVE" && <span className="ml-2 text-xs text-red-600">nonaktif</span>}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{rp(r.saldo)}</TableCell>
                      <TableCell className="text-right tabular-nums text-green-700">{rp(r.total_diterima)}</TableCell>
                      <TableCell className="text-right tabular-nums">{rp(r.total_ditarik)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.pending_tarik > 0 ? rp(r.pending_tarik) : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" render={<Link href={`/penerima/${r.user_id}`} />}>
                          Lihat mutasi →
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-semibold">
                    <TableCell>Total saldo</TableCell>
                    <TableCell className="text-right tabular-nums">{rp(totalSaldo)}</TableCell>
                    <TableCell colSpan={4} />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Saldo & pengajuan berjalan selalu kondisi terkini; filter bulan hanya membatasi kolom diterima/ditarik.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
