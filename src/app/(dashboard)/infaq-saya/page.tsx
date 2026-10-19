"use client";

// Infaq Saya — khusus role PENERIMA: saldo, mutasi, riwayat penarikan.
// Ajukan penarikan = HALAMAN TERPISAH /infaq-saya/tarik (aturan anti-popup),
// bukan dialog.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Coins, Send, Wallet } from "lucide-react";
import { apiGet, ApiError } from "@/lib/api";
import { rp, fmtDateTime } from "@/lib/format";
import { me } from "@/lib/auth";
import { LABEL_STATUS_PAYOUT } from "@/lib/infaq";
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

interface MutasiTx {
  id: number;
  tx_type: string;
  amount: number;
  balance_after: number;
  created_at: string;
}

interface PayoutItem {
  id: number;
  amount: number; // diterima (setelah fee — fee infaq = 0)
  fee: number;
  bank_name: string;
  bank_account_no: string;
  status: string;
  rejected_reason: string | null;
  created_at: string;
}

export default function InfaqSayaPage() {
  const [cek, setCek] = useState<"loading" | "ok" | "forbidden">("loading");
  const [saldo, setSaldo] = useState<number | null>(null);
  const [min, setMin] = useState<number | null>(null);
  const [fee, setFee] = useState(0);
  const [mutasi, setMutasi] = useState<MutasiTx[] | null>(null);
  const [ajuan, setAjuan] = useState<PayoutItem[] | null>(null);

  const muatSemua = useCallback(async () => {
    try {
      const w = await apiGet<{ balance: number }>("/wallet");
      setSaldo(w.balance);
      const t = await apiGet<{ items: MutasiTx[] }>("/wallet/transactions?limit=100");
      setMutasi(t.items);
      const p = await apiGet<{ items: PayoutItem[]; fee: number; min: number }>("/infaq/payouts");
      setAjuan(p.items);
      setFee(p.fee);
      setMin(p.min);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat data infaq");
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const u = await me();
        if (!u?.roles?.includes("PENERIMA")) {
          setCek("forbidden");
          return;
        }
        setCek("ok");
        await muatSemua();
      } catch {
        setCek("forbidden");
      }
    })();
  }, [muatSemua]);

  if (cek === "loading") {
    return <Skeleton className="h-64 w-full" />;
  }
  if (cek === "forbidden") {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Halaman ini khusus penerima infaq. Hubungi admin bila seharusnya Anda punya akses.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="size-6" />
        <div>
          <h1 className="text-xl font-semibold">Infaq Saya</h1>
          <p className="text-sm text-muted-foreground">
            Saldo, mutasi, dan penarikan dana infaq Anda.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Saldo infaq</CardTitle>
            <Wallet className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold tabular-nums">{saldo === null ? "…" : rp(saldo)}</div>
            <Button className="mt-3" render={<Link href="/infaq-saya/tarik" />}>
              <Send className="size-4" /> Ajukan Penarikan
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              Minimal penarikan {min === null ? "…" : rp(min)} · tanpa biaya admin{fee > 0 ? ` (biaya saat ini ${rp(fee)})` : ""}.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Riwayat penarikan</CardTitle>
          </CardHeader>
          <CardContent className="max-h-56 space-y-2 overflow-auto">
            {ajuan === null ? (
              <p className="text-sm text-muted-foreground">…</p>
            ) : ajuan.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada penarikan.</p>
            ) : (
              ajuan.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <div>
                    <div className="font-medium">{rp(p.amount)}</div>
                    <div className="text-xs text-muted-foreground">
                      {p.bank_name} {p.bank_account_no} · {fmtDateTime(p.created_at)}
                    </div>
                    {p.rejected_reason && <div className="text-xs text-red-600">{p.rejected_reason}</div>}
                  </div>
                  <Badge variant={p.status === "TRANSFERRED" ? "default" : p.status === "REJECTED" ? "destructive" : "secondary"}>
                    {LABEL_STATUS_PAYOUT[p.status] ?? p.status}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Mutasi saldo</CardTitle>
        </CardHeader>
        <CardContent>
          {mutasi === null ? (
            <Skeleton className="h-32 w-full" />
          ) : mutasi.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada mutasi — saldo bertambah otomatis setiap ada pembagian infaq.
            </p>
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
                  {mutasi.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="whitespace-nowrap text-sm">{fmtDateTime(t.created_at)}</TableCell>
                      <TableCell className="text-sm">
                        {t.tx_type === "EARNING" ? "Pembagian infaq" : t.tx_type === "PAYOUT" ? "Penarikan" : t.tx_type === "REFUND" ? "Pengembalian" : t.tx_type === "ADJUST" ? "Penyesuaian" : t.tx_type}
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
