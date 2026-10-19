"use client";

// Detail Penerima Infaq — halaman penuh (bukan dialog): profil, ringkasan
// dana, tombol ajukan penarikan, dan tabel mutasi lengkap.

import Link from "next/link";
import { useParams } from "next/navigation";
import { Coins, Send } from "lucide-react";
import { rp, fmtDateTime } from "@/lib/format";
import { useLaporanInfaq, useMutasi, LABEL_TX, type MutasiTx } from "@/lib/infaq";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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

export default function DetailPenerimaPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params?.id);
  const { rows } = useLaporanInfaq();
  const { items } = useMutasi(Number.isFinite(userId) ? userId : null);

  const r = rows?.find((x) => x.user_id === userId);

  if (rows !== null && !r) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Penerima tidak ditemukan.{" "}
          <Link href="/penerima" className="underline">Kembali ke daftar</Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link href="/penerima" className="hover:underline">← Penerima Infaq</Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Coins className="size-6" />
          <div>
            <h1 className="text-xl font-semibold">{r?.nama ?? "…"}</h1>
            <p className="text-sm text-muted-foreground">
              {r?.email ?? ""} {r && r.status !== "ACTIVE" && <span className="text-red-600">· nonaktif</span>}
            </p>
          </div>
        </div>
        <Button render={<Link href={`/penerima/${userId}/tarik`} />} disabled={!r || r.saldo <= 0 || r.status !== "ACTIVE"}>
          <Send className="size-4" /> Ajukan Penarikan atas Nama
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo kini</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">{r ? rp(r.saldo) : "…"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total diterima</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums text-green-700">{r ? rp(r.total_diterima) : "…"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total ditarik</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">{r ? rp(r.total_ditarik) : "…"}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sedang diajukan</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold tabular-nums">
            {r ? (r.pending_tarik > 0 ? <Badge variant="secondary">{rp(r.pending_tarik)}</Badge> : "—") : "…"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Mutasi saldo</CardTitle>
        </CardHeader>
        <CardContent>
          {items === null ? (
            <Skeleton className="h-32 w-full" />
          ) : items.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Belum ada mutasi.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Jenis</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Saldo setelah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((t: MutasiTx) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(t.created_at)}</TableCell>
                      <TableCell>
                        <Badge variant={t.tx_type === "PAYOUT" ? "destructive" : "secondary"}>
                          {LABEL_TX[t.tx_type] ?? t.tx_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {t.tx_type === "PAYOUT" || t.tx_type === "PAYMENT" ? "−" : "+"}
                        {rp(t.amount)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">{rp(t.balance_after)}</TableCell>
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
