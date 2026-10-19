"use client";

// Halaman Tambah Penerima (bukan dialog). Setelah dibuat, kredensial
// ditampilkan sebagai SECTION di halaman ini (bukan popup) + pengingat
// password hanya ditampilkan sekali.

import { useState } from "react";
import Link from "next/link";
import { UserPlus } from "lucide-react";
import { apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface Kredensial {
  id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  password: string;
  password_generated: boolean;
}

export default function TambahPenerimaPage() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [kredensial, setKredensial] = useState<Kredensial | null>(null);

  async function submit() {
    setBusy(true);
    try {
      const res = await apiPost<Kredensial>("/admin/penerima", {
        full_name: nama.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        password: password.trim() || null,
      });
      setKredensial(res);
      setNama(""); setEmail(""); setPhone(""); setPassword("");
      toast.success("Penerima dibuat");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal membuat penerima");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <Link href="/penerima" className="hover:underline">← Penerima Infaq</Link>
      </div>

      <div className="flex items-center gap-2">
        <UserPlus className="size-6" />
        <div>
          <h1 className="text-xl font-semibold">Tambah Penerima</h1>
          <p className="text-sm text-muted-foreground">
            Akun dipakai penerima untuk login panel admin (menu Infaq Saya) — lihat saldo, mutasi, dan ajukan penarikan.
          </p>
        </div>
      </div>

      {kredensial ? (
        <Card>
          <CardHeader>
            <CardTitle>Akun penerima dibuat</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-md border bg-muted/40 p-4 text-sm">
              <div className="text-base font-semibold">{kredensial.full_name}</div>
              <div>Login: <span className="font-mono">{kredensial.email ?? kredensial.phone}</span></div>
              <div>
                Password: <span className="font-mono font-bold">{kredensial.password}</span>
                {kredensial.password_generated ? " (dibuat otomatis)" : ""}
              </div>
            </div>
            <p className="text-sm text-amber-700">
              Setorkan kredensial ini ke penerima. Password tidak dapat dilihat lagi setelah Anda meninggalkan halaman ini
              (kalau hilang, buat ulang lewat ganti password di menu Pengguna).
            </p>
            <div className="flex gap-2">
              <Button render={<Link href={`/penerima/${kredensial.id}`} />}>Buka detail penerima</Button>
              <Button variant="outline" render={<Link href="/penerima" />}>Kembali ke daftar</Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="max-w-xl space-y-4 pt-6">
            <div>
              <label className="text-sm font-medium">Nama pihak / penerima</label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="mis. Yayasan Al-Ikhlas" />
            </div>
            <div>
              <label className="text-sm font-medium">Email (untuk login)</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mis. yayasan@email.com" />
            </div>
            <div>
              <label className="text-sm font-medium">No. HP (opsional, alternatif login)</label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08…" />
            </div>
            <div>
              <label className="text-sm font-medium">Password (kosongkan = dibuat otomatis)</label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="minimal 8 karakter" />
            </div>
            <div className="flex gap-2">
              <Button onClick={submit} disabled={busy || nama.trim().length === 0 || (email.trim().length === 0 && phone.trim().length === 0)}>
                {busy ? "Menyimpan…" : "Buat Penerima"}
              </Button>
              <Button variant="outline" render={<Link href="/penerima" />}>Batal</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
