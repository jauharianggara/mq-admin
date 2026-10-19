"use client";

// Editor khusus pembagian income kunjungan (fee infaq) — setting backend
// `visit_income_split`. Sengaja TIDAK lewat kartu JSON di /pengaturan
// (kartu itu disembunyikan utk key ini): aturan permanen user 19 Okt 2026 —
// konfigurasi wajib UI form/tabel sendiri, bahasa awam, anti-misleading.

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CircleCheck,
  HandCoins,
  Plus,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { apiGet, apiPut, ApiError } from "@/lib/api";
import { rp } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const SETTING_KEY = "visit_income_split";
const CONTOH_DEFAULT = 100000;

type Target = "USTADZ" | "PLATFORM" | "USER";

interface Row {
  target: Target;
  userId: string; // string supaya input bebas; divalidasi sendiri
  pct: string; // string angka 0-100
}

const DEFAULT_ROWS: Row[] = [
  { target: "USTADZ", userId: "", pct: "80" },
  { target: "PLATFORM", userId: "", pct: "20" },
];

const LABEL_TARGET: Record<Target, string> = {
  USTADZ: "Ustadz",
  PLATFORM: "Pengelola Aplikasi",
  USER: "User Lain",
};

const PENJELASAN_TARGET: Record<Target, string> = {
  USTADZ: "Masuk saldo ustadz yang mengajar pada kunjungan itu",
  PLATFORM: "Ditahan pengelola aplikasi (tidak masuk saldo siapa pun)",
  USER: "Masuk saldo user dengan ID di kolom sebelah",
};

interface SettingsMap {
  [key: string]: { value: unknown; description: string | null };
}

interface PenerimaOption {
  user_id: number;
  nama: string;
  status: string;
}

interface LaporanRow {
  user_id: number;
  nama: string | null;
  status: string;
}

function angka(s: string): number | null {
  if (!/^\d{1,3}$/.test(s)) return null;
  return Number(s);
}

function toRows(raw: unknown): Row[] | null {
  let arr: unknown = raw;
  if (typeof raw === "string") {
    try {
      arr = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const rows: Row[] = [];
  for (const item of arr) {
    if (item === null || typeof item !== "object") return null;
    // sudah diperiksa object di atas; Index Signature supaya akses properti ter-check
    const e = item as Record<string, unknown>;
    const t = e.to;
    const p = e.pct;
    const uid = e.user_id;
    if ((t === "USTADZ" || t === "PLATFORM") && typeof p === "number") {
      rows.push({ target: t, userId: "", pct: String(p) });
    } else if (t === "USER" && typeof p === "number" && typeof uid === "number") {
      rows.push({ target: "USER", userId: String(uid), pct: String(p) });
    } else {
      return null; // bentuk tak dikenal — jangan tebak
    }
  }
  return rows;
}

export default function PembagianInfaqPage() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [savedJson, setSavedJson] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [contoh, setContoh] = useState(String(CONTOH_DEFAULT));
  const [penerima, setPenerima] = useState<PenerimaOption[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await apiGet<SettingsMap>("/admin/settings");
      const parsed = toRows(s[SETTING_KEY]?.value);
      if (parsed) {
        setRows(parsed);
        setSavedJson(JSON.stringify(parsed));
      } else {
        setRows(DEFAULT_ROWS.map((r) => ({ ...r })));
        setSavedJson("");
        toast.info("Belum pernah diatur — menampilkan pembagian default Ustadz 80% / Pengelola 20%");
      }
      try {
        const l = await apiGet<{ items: LaporanRow[] }>("/admin/infaq/laporan");
        setPenerima(l.items.map((r) => ({ user_id: r.user_id, nama: r.nama ?? `User ${r.user_id}`, status: r.status })));
      } catch {
        // menu Penerima belum lengkap — fitur pilih nama saja yang hilang
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalPct = useMemo(
    () => (rows ?? []).reduce((a, r) => a + (angka(r.pct) ?? 0), 0),
    [rows],
  );

  const peringatan = useMemo(() => {
    if (!rows) return [];
    const w: string[] = [];
    if (!rows.some((r) => r.target === "USTADZ" && (angka(r.pct) ?? 0) > 0))
      w.push("Tidak ada porsi untuk Ustadz — ustadz tidak akan menerima penghasilan apa pun dari kunjungan.");
    const ids = rows.filter((r) => r.target === "USER").map((r) => r.userId);
    if (new Set(ids).size !== ids.length)
      w.push("Ada user yang sama muncul lebih dari sekali — gabungkan jadi satu baris.");
    return w;
  }, [rows]);

  const errorPerBaris = useMemo(() => {
    if (!rows) return [];
    return rows.map((r) => {
      const p = angka(r.pct);
      if (p === null) return "Persen wajib angka 0-100";
      if (r.target === "USER" && !/^\d+$/.test(r.userId))
        return "Isi ID User (angka) — lihat menu Pengguna";
      return null;
    });
  }, [rows]);

  const adaError = rows === null || errorPerBaris.some((e) => e !== null);
  const totalPas = totalPct === 100;
  const bisaSimpan = !loading && !busy && rows !== null && !adaError && totalPas;
  const belumDisimpan =
    rows !== null && JSON.stringify(rows) !== savedJson;

  const contohNum = useMemo(() => {
    const n = Number(contoh.replace(/\D/g, ""));
    return Number.isFinite(n) && n > 0 ? n : CONTOH_DEFAULT;
  }, [contoh]);

  // Pembagiannya dicermati SAMA dengan backend: floor per porsi,
  // sisa pembulatan diberikan ke penerima pertama.
  const bagianRupiah = useMemo(() => {
    if (!rows) return [];
    const floor = rows.map((r) => Math.floor((contohNum * (angka(r.pct) ?? 0)) / 100));
    const sisa = contohNum - floor.reduce((a, b) => a + b, 0);
    return floor.map((n, i) => (i === 0 ? n + sisa : n));
  }, [rows, contohNum]);

  function ubah(i: number, patch: Partial<Row>) {
    setRows((rs) => (rs ?? []).map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  }

  function tambah() {
    setRows((rs) => [...(rs ?? []), { target: "PLATFORM", userId: "", pct: "0" }]);
  }

  function hapus(i: number) {
    setRows((rs) => {
      if (!rs || rs.length <= 1) {
        toast.error("Minimal harus ada satu penerima");
        return rs;
      }
      return rs.filter((_, idx) => idx !== i);
    });
  }

  async function simpan() {
    if (!rows || !bisaSimpan) return;
    setBusy(true);
    try {
      const body = rows.map((r) => {
        const pct = angka(r.pct) ?? 0;
        if (r.target === "USER")
          return { to: "USER", pct, user_id: Number(r.userId) };
        return { to: r.target, pct };
      });
      await apiPut(`/admin/settings/${SETTING_KEY}`, body);
      toast.success("Pembagian tersimpan — berlaku untuk kunjungan yang selesai setelah ini");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  if (loading || rows === null) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <HandCoins className="size-6" />
        <div>
          <h1 className="text-xl font-semibold">Pembagian Infaq Kunjungan</h1>
          <p className="text-sm text-muted-foreground">
            Atur pembagian pembayaran kunjungan ustadz untuk setiap penerima.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Siapa menerima berapa persen?</CardTitle>
          <div className="flex items-center gap-3">
            {belumDisimpan && <Badge variant="secondary">Ada perubahan belum disimpan</Badge>}
            <Button onClick={simpan} disabled={!bisaSimpan}>
              <Save className="size-4" /> Simpan Pembagian
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total pembagian</span>
              {totalPas && !adaError ? (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-green-600">
                  <CircleCheck className="size-4" /> 100% — pas
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
                  <TriangleAlert className="size-4" />
                  {totalPct}% — harus tepat 100% ({totalPct < 100 ? `kurang ${100 - totalPct}%` : `lebih ${totalPct - 100}%`})
                </span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-56">Diterima oleh</TableHead>
                  <TableHead>Penjelasan</TableHead>
                  <TableHead className="w-24 text-right">Persen</TableHead>
                  <TableHead className="w-44 text-right">
                    Perkiraan<span className="text-muted-foreground">**</span>
                  </TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Select
                        value={r.target}
                        onValueChange={(v) => ubah(i, { target: v as Target })}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue>{LABEL_TARGET[r.target]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USTADZ">Ustadz</SelectItem>
                          <SelectItem value="PLATFORM">Pengelola Aplikasi</SelectItem>
                          <SelectItem value="USER">User Lain</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.target === "USER" ? (
                        <div className="flex flex-col gap-1">
                          {penerima.length > 0 ? (
                            <Select
                              value={r.userId}
                              onValueChange={(v) => {
                                if (v !== null) ubah(i, { userId: v });
                              }}
                            >
                              <SelectTrigger className="w-56">
                                <SelectValue placeholder="Pilih penerima">{penerima.find((p) => String(p.user_id) === r.userId)?.nama ?? "Pilih penerima"}</SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {penerima.map((p) => (
                                  <SelectItem key={p.user_id} value={String(p.user_id)}>
                                    {p.nama}{p.status !== "ACTIVE" ? " (nonaktif)" : ""}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div>
                              <Input
                                inputMode="numeric"
                                className="w-28"
                                value={r.userId}
                                placeholder="ID user"
                                onChange={(e) => ubah(i, { userId: e.target.value.replace(/\D/g, "") })}
                              />
                              <span className="text-xs">Belum ada daftar penerima — buka menu <b>Penerima Infaq</b> dulu</span>
                            </div>
                          )}
                          <span className="text-xs">Masuk saldo infaq penerima terpilih</span>
                        </div>
                      ) : (
                        PENJELASAN_TARGET[r.target]
                      )}
                      {errorPerBaris[i] && (
                        <div className="mt-1 text-xs font-medium text-red-600">{errorPerBaris[i]}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        inputMode="numeric"
                        className="ml-auto w-20 text-right"
                        value={r.pct}
                        onChange={(e) => ubah(i, { pct: e.target.value.replace(/[^\d]/g, "").slice(0, 3) })}
                      />
                      <span className="text-xs text-muted-foreground">%</span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {totalPas && !adaError ? (bagianRupiah[i] ?? 0) === 0 ? "—" : rp(bagianRupiah[i] ?? 0) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => hapus(i)}
                        disabled={rows.length <= 1}
                        aria-label="Hapus penerima"
                      >
                        <Trash2 className="size-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Button variant="outline" onClick={tambah}>
            <Plus className="size-4" /> Tambah Penerima
          </Button>

          {peringatan.length > 0 && (
            <div className="space-y-1 rounded-md border border-amber-500/50 bg-amber-500/10 p-3 text-sm">
              {peringatan.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
            <div className="mb-1 flex items-center gap-2 font-medium text-foreground">
              <Label className="text-sm">Simulasi perkiraan</Label>
              <span className="font-normal">— total contoh kunjungan:</span>
              <Input
                inputMode="numeric"
                className="w-40"
                value={"Rp " + Number(contoh.replace(/\D/g, "") || 0).toLocaleString("id-ID")}
                onChange={(e) => setContoh(e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
                onFocus={(e) => e.target.select()}
              />
            </div>
            <ul className="list-disc space-y-0.5 pl-5">
              <li>
                Kolom <b>Perkiraan</b> baru terisi kalau total sudah tepat 100% — dihitung dari total contoh ini (gambaran, bukan angka pasti).
              </li>
              <li>
                Kalau pembagian rupiah ada sisa pembulatan, sisa itu otomatis masuk ke <b>penerima pertama</b> (paling atas) agar total tetap pas.
              </li>
              <li>
                Perubahan berlaku untuk <b>kunjungan yang selesai setelah disimpan</b> — kunjungan yang sudah dibayar tidak diubah.
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
