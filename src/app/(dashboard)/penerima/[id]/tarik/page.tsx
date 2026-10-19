"use client";

// Halaman Ajukan Penarikan ATAS NAMA penerima (admin) — form halaman penuh,
// bukan dialog. Dana langsung didebit saat diajukan; menunggu ACC admin lain
// di menu Penarikan.

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { apiPost, ApiError } from "@/lib/api";
import { rp } from "@/lib/format";
import { useLaporanInfaq } from "@/lib/infaq";
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

export default function TarikAtasNamaPage() {
  const params = useParams<{ id: string }>();
  const userId = Number(params?.id);
  const { rows } = useLaporanInfaq();
  const r = rows?.find((x) => x.user_id === userId);

  const [jumlah, setJumlah] = useState("");
  const [bank, setBank] = useState("");
  const [no, setNo] = useState("");
  const [an, setAn] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (r) setJumlah(String(r.saldo));
  }, [r?.user_id]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const amount = Number(jumlah.replace(/\D/g, "") || "0");
  const valid = !!r && amount > 0 && amount <= r.saldo && bank.trim() && no.trim() && an.trim();

  async function submit() {
    if (!r || !valid) return;
    setBusy(true);
    try {
      await apiPost("/admin/infaq/payouts", {
        user_id: r.user_id,
        amount,
        bank_name: bank.trim(),
        account_no: no.trim(),
        account_name: an.trim(),
      });
      toast.success(`Pengajuan ${rp(amount)} atas nama ${r.nama ?? "penerima"} dibuat — masuk antrean ACC admin`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengajukan");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link href={`/penerima/${userId}`} className="hover:underline">← Detail penerima</Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ajukan penarikan atas nama {r?.nama ?? "…"}</CardTitle>
        </CardHeader>
        <CardContent className="max-w-xl space-y-4">
          {r ? (
            <p className="text-sm text-muted-foreground">
              Saldo penerima: <b className="text-foreground">{rp(r.saldo)}</b> — tanpa biaya admin.
              Dana langsung didebit saat pengajuan dibuat; kembali otomatis bila ditolak.
            </p>
          ) : (
            <Skeleton className="h-6 w-72" />
          )}
          <div>
            <label className="text-sm font-medium">Jumlah</label>
            <Input
              inputMode="numeric"
              value={"Rp " + Number(jumlah.replace(/\D/g, "") || 0).toLocaleString("id-ID")}
              onChange={(e) => setJumlah(e.target.value.replace(/\D/g, "").slice(0, 12))}
              onFocus={(e) => e.target.select()}
            />
            {r && amount > r.saldo && <p className="mt-1 text-xs text-red-600">Melebihi saldo penerima ({rp(r.saldo)})</p>}
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
              {busy ? "Mengirim…" : "Ajukan"}
            </Button>
            <Button variant="outline" render={<Link href={`/penerima/${userId}`} />}>Batal</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
