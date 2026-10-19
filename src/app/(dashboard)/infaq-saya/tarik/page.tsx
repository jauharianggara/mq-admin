"use client";

// Halaman Ajukan Penarikan Infaq Saya (penerima login) — form halaman penuh,
// bukan dialog. Fee infaq = 0 (setting), minimal dari /infaq/payouts.

import Link from "next/link";
import { useEffect, useState } from "react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
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

export default function TarikInfaqSayaPage() {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [min, setMin] = useState<number | null>(null);
  const [fee, setFee] = useState(0);
  const [jumlah, setJumlah] = useState("");
  const [bank, setBank] = useState("");
  const [no, setNo] = useState("");
  const [an, setAn] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const w = await apiGet<{ balance: number }>("/wallet");
        setSaldo(w.balance);
        const p = await apiGet<{ fee: number; min: number }>("/infaq/payouts");
        setFee(p.fee);
        setMin(p.min);
        setJumlah(String(w.balance));
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal memuat saldo");
      }
    })();
  }, []);

  const amount = Number(jumlah.replace(/\D/g, "") || "0");
  const valid = saldo !== null && min !== null && amount >= min && amount <= saldo && bank.trim() && no.trim() && an.trim();

  async function submit() {
    if (!valid) return;
    setBusy(true);
    try {
      await apiPost("/infaq/payouts", {
        amount,
        bank_name: bank.trim(),
        account_no: no.trim(),
        account_name: an.trim(),
      });
      toast.success(`Pengajuan ${rp(amount)} terkirim — menunggu ACC admin`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengajukan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link href="/infaq-saya" className="hover:underline">← Infaq Saya</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajukan Penarikan Infaq</CardTitle>
        </CardHeader>
        <CardContent className="max-w-xl space-y-4">
          {saldo === null || min === null ? (
            <Skeleton className="h-6 w-72" />
          ) : (
            <p className="text-sm text-muted-foreground">
              Saldo Anda: <b className="text-foreground">{rp(saldo)}</b> · minimal {rp(min)} ·{" "}
              {fee > 0 ? `biaya admin ${rp(fee)}` : "tanpa biaya admin"}. Dana langsung didebit saat pengajuan dibuat;
              kembali otomatis bila ditolak admin.
            </p>
          )}
          <div>
            <label className="text-sm font-medium">Jumlah</label>
            <Input
              inputMode="numeric"
              value={"Rp " + Number(jumlah.replace(/\D/g, "") || 0).toLocaleString("id-ID")}
              onChange={(e) => setJumlah(e.target.value.replace(/\D/g, "").slice(0, 12))}
              onFocus={(e) => e.target.select()}
            />
            {min !== null && amount > 0 && amount < min && (
              <p className="mt-1 text-xs text-red-600">Minimal penarikan {rp(min)}</p>
            )}
            {saldo !== null && amount > saldo && (
              <p className="mt-1 text-xs text-red-600">Melebihi saldo Anda ({rp(saldo)})</p>
            )}
          </div>
          <div>
            <label className="text-sm font-medium">Nama bank</label>
            <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="mis. BSI" />
          </div>
          <div>
            <label className="text-sm font-medium">Nomor rekening</label>
            <Input value={no} onChange={(e) => setNo(e.target.value)} placeholder="mis. 7011…" />
          </div>
          <div>
            <label className="text-sm font-medium">Nama pemilik rekening</label>
            <Input value={an} onChange={(e) => setAn(e.target.value)} placeholder="sesuai buku tabungan" />
          </div>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={busy || !valid}>
              {busy ? "Mengirim…" : "Kirim Pengajuan"}
            </Button>
            <Button variant="outline" render={<Link href="/infaq-saya" />}>Batal</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
