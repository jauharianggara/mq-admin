"use client";

// Daftar Penerima Infaq (admin). ATURAN ANTI-POPUP: form & konten padat =
// halaman sendiri (/penerima/baru, /penerima/[id], /penerima/[id]/tarik) —
// di sini TIDAK ADA dialog.

import { Coins, UserPlus } from "lucide-react";
import Link from "next/link";
import { type MouseEvent } from "react";
import { apiPatch, ApiError } from "@/lib/api";
import { rp } from "@/lib/format";
import { useLaporanInfaq, type LaporanRow } from "@/lib/infaq";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

export default function PenerimaPage() {
  const { rows, load } = useLaporanInfaq();

  async function toggleStatus(e: MouseEvent, r: LaporanRow) {
    e.preventDefault(); // jangan ikut buka detail
    e.stopPropagation();
    const next = r.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      await apiPatch(`/admin/users/${r.user_id}`, { status: next });
      toast.success(next === "ACTIVE" ? "Penerima diaktifkan" : "Penerima dinonaktifkan (login ditolak)");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Gagal");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins className="size-6" />
          <div>
            <h1 className="text-xl font-semibold">Penerima Infaq</h1>
            <p className="text-sm text-muted-foreground">
              Pihak yang menerima pembagian infaq — punya saldo, mutasi, dan bisa menarik dana. Klik nama untuk detail.
            </p>
          </div>
        </div>
        <Button render={<Link href="/penerima/baru" />}>
          <UserPlus className="size-4" /> Tambah Penerima
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Daftar penerima</CardTitle>
        </CardHeader>
        <CardContent>
          {rows === null ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Belum ada penerima. Klik <b>Tambah Penerima</b> untuk membuat akun pertama.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Kontak</TableHead>
                    <TableHead className="text-right">Saldo kini</TableHead>
                    <TableHead className="text-right">Total diterima</TableHead>
                    <TableHead className="text-right">Total ditarik</TableHead>
                    <TableHead className="text-right">Sedang diajukan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.user_id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link href={`/penerima/${r.user_id}`} className="hover:underline">
                          {r.nama ?? "(tanpa nama)"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.email ?? r.user_id}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{rp(r.saldo)}</TableCell>
                      <TableCell className="text-right tabular-nums">{rp(r.total_diterima)}</TableCell>
                      <TableCell className="text-right tabular-nums">{rp(r.total_ditarik)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {r.pending_tarik > 0 ? <Badge variant="secondary">{rp(r.pending_tarik)}</Badge> : "—"}
                      </TableCell>
                      <TableCell>
                        <button
                          className="cursor-pointer"
                          onClick={(e) => toggleStatus(e, r)}
                          title="Klik utk aktif/nonaktifkan"
                        >
                          <Badge variant={r.status === "ACTIVE" ? "default" : "destructive"}>
                            {r.status === "ACTIVE" ? "Aktif" : "Nonaktif"}
                          </Badge>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
