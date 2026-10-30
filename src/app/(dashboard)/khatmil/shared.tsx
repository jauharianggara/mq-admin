"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { StatusPill } from "@/components/status-pill";

/* ============================== Types ============================== */

export interface Campaign {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  /** Cover campaign (presigned URL, TTL 15 menit) */
  cover_url?: string | null;
  max_participants: number | null;
  mode: string;
  status: string;
  target_khataman: number;
  group_count: number;
  require_manual_verification: boolean;
  participants: number;
  juz_completed: number;
  progress_pct: number;
  period_start?: string | null;
  period_end?: string | null;
  /** legacy — dikirim ulang saat PATCH agar tidak ditimpa default 30 backend */
  min_minutes_per_juz?: number;
  /** Rincian progres per kelompok (multi-kelompok — rev 3) */
  groups_progress?: GroupProgress[];
}

export interface GroupProgress {
  group_no: number;
  member_count: number;
  completed_juz: number;
}

/** Breakdown per kelompok utk LIST: multi = per kelompok; 1 kelompok = satu baris. */
export function groupProgressList(c: Campaign): GroupProgress[] {
  if ((c.group_count ?? 1) > 1 && c.groups_progress?.length) {
    return c.groups_progress;
  }
  return [{ group_no: 1, member_count: c.participants, completed_juz: c.juz_completed }];
}

export interface JuzSlot {
  juz: number;
  status: string | null;
  owner_name: string | null;
  current_surah: number | null;
  current_ayah: number | null;
  progress_pct: number | null;
  completed_at: string | null;
}

export interface GroupLite {
  id: number;
  group_no: number;
  member_count: number;
  pembina?: string | null;
  pending_pembina?: string | null;
}

export interface GroupJuzMap {
  group_no: number;
  group_id: number;
  slots: JuzSlot[];
}

export interface CampaignDetail extends Campaign {
  juz_map: JuzSlot[];
  groups?: GroupLite[];
  juz_map_groups?: GroupJuzMap[];
  period_start: string | null;
  period_end: string | null;
}

export interface JuzActive {
  juz: number;
  status: string;
  current_surah: number | null;
  current_ayah: number | null;
  read_ayat: number | null;
  juz_total_ayat: number;
  progress_pct: number | null;
}

export interface Participant {
  user_id: number;
  full_name: string;
  joined_at: string;
  juz_active: JuzActive[];
  juz_done: { juz: number; completed_at: string | null }[];
  juz_active_count: number;
  juz_done_count: number;
  task_progress_pct: number | null;
  contribution_pct: number | null;
  last_reported_at: string | null;
}

export interface ActivityEvent {
  full_name: string;
  juz: number;
  current_surah: number | null;
  current_ayah: number | null;
  note: string | null;
  completed: boolean;
  created_at: string;
}

/* ============================== Helpers ============================== */

export const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  SCHEDULED: "Terjadwal",
  DRAFT: "Draf",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

export const isTerminal = (st: string) => st === "COMPLETED" || st === "CANCELLED";

/** Transisi status yang diterima backend (khatmil service.rs): Cancel hanya dari Terjadwal/Aktif. */
export function nextStatuses(status: string): string[] {
  switch (status) {
    case "DRAFT":
      return ["DRAFT", "SCHEDULED", "ACTIVE"];
    case "SCHEDULED":
      return ["SCHEDULED", "ACTIVE", "CANCELLED"];
    case "ACTIVE":
      return ["ACTIVE", "COMPLETED", "CANCELLED"];
    default:
      return [status]; // COMPLETED / CANCELLED = terminal
  }
}

export function StatusBadge({ status }: { status: string }) {
  // delegasi ke kit StatusPill — satu sumber gaya status utk seluruh admin
  return <StatusPill status={status} fallbackLabel={STATUS_LABEL[status] ?? status} />;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

/** Cover campaign — presigned URL bisa kedaluwarsa/gagal: img disembunyikan, bukan menyisakan kotak kosong. */
export function CoverImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [err, setErr] = useState(false);
  if (err || !src) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" onError={() => setErr(true)} />
  );
}

export function Avatar({ name, className = "" }: { name: string; className?: string }) {
  const palette = ["bg-emerald-700", "bg-teal-600", "bg-cyan-700", "bg-green-600", "bg-stone-600"];
  const c = palette[name.length % palette.length];
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${c} ${className}`}
    >
      {initials(name)}
    </div>
  );
}

export function MiniBar({ pct, className = "" }: { pct: number | null; className?: string }) {
  const v = Math.min(pct ?? 0, 100);
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-1.5 min-w-10 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-muted-foreground">
        {pct == null ? "—" : `${pct}%`}
      </span>
    </div>
  );
}

export function timeAgo(iso: string | null) {
  if (!iso) return "belum pernah";
  // Backend mengirim ISO-8601 UTC yang SUDAH berakhiran Z/offset — jangan tambah "Z" lagi (berakhir "…ZZ" → NaN).
  const m = /[zZ]$|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`;
  const d = new Date(m);
  if (Number.isNaN(d.getTime())) return "—"; // fallback utk tanggal tidak valid
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

/** PATCH campaign — Return true hanya bila PATCH sukses; pemanggil WAJIB cek sebelum navigasi/onDone.
 *  Periode: patch eksplisit → GET detail → fallback data daftar. Bila GET gagal DAN daftar tak
 *  menyimpan periode, PATCH DIBATALKAN (jangan pernah mengirim null hasil kegagalan baca — backend
 *  menulis ulang kolom periode dari payload). */
export async function patchCampaign(c: Campaign, patch: Partial<Campaign> & Record<string, unknown>, label: string): Promise<boolean> {
  const needsDetail = patch.period_start === undefined || patch.period_end === undefined;
  let base: Partial<CampaignDetail> | null = null;
  if (needsDetail) {
    try {
      base = await apiGet<CampaignDetail>(`/khatmil/campaigns/${c.id}`);
    } catch {
      base = null;
    }
  }
  const periodStart =
    patch.period_start !== undefined ? patch.period_start : base?.period_start !== undefined ? base.period_start : c.period_start ?? null;
  const periodEnd =
    patch.period_end !== undefined ? patch.period_end : base?.period_end !== undefined ? base.period_end : c.period_end ?? null;
  if (needsDetail && base === null && (periodStart == null || periodEnd == null)) {
    // sumber periode tidak bisa dipastikan (GET gagal + daftar tak menyimpannya) — jangan risiko menghapus data
    toast.error("Gagal membaca periode campaign — perubahan dibatalkan demi keamanan data");
    return false;
  }
  const body = {
    slug: c.slug,
    name: patch.name ?? c.name,
    description: patch.description !== undefined ? patch.description : c.description ?? "",
    mode: patch.mode ?? c.mode,
    status: patch.status ?? c.status,
    target_khataman: patch.target_khataman ?? c.target_khataman,
    group_count: patch.group_count ?? c.group_count ?? 1,
    period_start: periodStart,
    period_end: periodEnd,
    require_manual_verification: patch.require_manual_verification ?? c.require_manual_verification,
    max_participants: patch.max_participants !== undefined ? patch.max_participants : c.max_participants ?? null,
    // legacy — pertahankan nilai lama, jangan biarkan default 30 backend menimpa
    ...(c.min_minutes_per_juz != null ? { min_minutes_per_juz: c.min_minutes_per_juz } : {}),
    ...(patch.cover_media_id !== undefined ? { cover_media_id: patch.cover_media_id } : {}),
    ...(patch.remove_cover ? { remove_cover: true } : {}),
  };
  try {
    await apiPatch(`/khatmil/campaigns/${c.id}`, body);
    toast.success(label);
    return true;
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : "Gagal");
    return false;
  }
}

/* ============================== Form (shared create/edit PAGE) ============================== */

function initialForm(c: Campaign | null) {
  if (!c) {
    return {
      slug: "", name: "", description: "", mode: "PARALLEL", status: "DRAFT",
      group_count: "1", max_participants: "", period_start: "", period_end: "",
      require_manual_verification: false,
    };
  }
  return {
    slug: c.slug,
    name: c.name,
    description: c.description ?? "",
    mode: c.mode,
    status: c.status,
    group_count: String(c.group_count ?? c.target_khataman ?? 1),
    max_participants: c.max_participants != null ? String(c.max_participants) : "",
    // periode dari data yang SUDAH ada — fetch detail hanya melengkapi, gagal fetch tak boleh menghapus periode
    period_start: c.period_start ?? "",
    period_end: c.period_end ?? "",
    require_manual_verification: c.require_manual_verification,
  };
}

export function CampaignForm({
  editing,
  onDone,
}: {
  editing: Campaign | null; // null = create
  onDone: () => void;
}) {
  const router = useRouter();
  const isNew = editing === null;
  const c = editing;
  const locked = c ? isTerminal(c.status) : false;

  // State awal dari props — parent WAJIB memberi key per campaign (lihat baru/ & edit/) agar reset saat pindah data.
  const [form, setForm] = useState(() => initialForm(editing));
  const [busy, setBusy] = useState(false);
  // cover: media_id hasil upload baru + preview (object URL lokal / presigned URL dari server)
  const [coverMediaId, setCoverMediaId] = useState<number | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(editing?.cover_url ?? null);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverRemoved, setCoverRemoved] = useState(false);

  async function uploadCover(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus gambar (JPG/PNG/WebP)");
      return;
    }
    setCoverBusy(true);
    try {
      const up = await apiPost<{ media_id: number; upload_url: string; expires_at: string }>("/media/uploads", {
        kind: "IMAGE",
        mime_type: file.type,
        byte_size: file.size,
      });
      const res = await fetch(up.upload_url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
      if (!res.ok) throw new ApiError("upload_failed", "Upload gagal", res.status);
      await apiPost(`/media/uploads/${up.media_id}/complete`);
      setCoverMediaId(up.media_id);
      setCoverPreview(URL.createObjectURL(file));
      setCoverRemoved(false);
      toast.success("Cover terunggah — jangan lupa simpan");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload cover gagal");
    } finally {
      setCoverBusy(false);
    }
  }

  async function submit() {
    setBusy(true);
    try {
      if (isNew) {
        const gc = Number(form.group_count) || 1;
        await apiPost("/khatmil/campaigns", {
          slug: form.slug,
          name: form.name,
          description: form.description || undefined,
          mode: form.mode,
          status: form.status,
          group_count: gc,
          target_khataman: gc,
          require_manual_verification: form.require_manual_verification,
          ...(form.max_participants ? { max_participants: Number(form.max_participants) } : {}),
          ...(form.period_start ? { period_start: form.period_start } : {}),
          ...(form.period_end ? { period_end: form.period_end } : {}),
          ...(coverMediaId ? { cover_media_id: coverMediaId } : {}),
        });
        toast.success("Campaign dibuat");
        onDone();
      } else if (c) {
        const gc = Number(form.group_count) || 1;
        const ok = await patchCampaign(
          c,
          {
            name: form.name,
            description: form.description,
            mode: form.mode,
            status: form.status,
            group_count: gc,
            target_khataman: gc,
            require_manual_verification: form.require_manual_verification,
            max_participants: form.max_participants ? Number(form.max_participants) : null,
            period_start: form.period_start || null,
            period_end: form.period_end || null,
            ...(coverMediaId ? { cover_media_id: coverMediaId } : {}),
            ...(coverRemoved ? { remove_cover: true } : {}),
          },
          "Perubahan tersimpan"
        );
        if (!ok) return; // gagal simpan: tetap di form, isian dipertahankan (toast error dari helper)
        onDone();
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  const valid = form.slug.trim() && form.name.trim();
  const cancel = () => router.push(isNew ? "/khatmil" : `/khatmil/${c!.id}`);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {isNew ? "Campaign Khatmil Baru" : `Ubah — ${c!.name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isNew ? "Isi detail campaign khataman" : "Perubahan langsung berlaku setelah disimpan"}
        </p>
      </div>

      {c && !isNew && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <b>{c.name}</b> — {STATUS_LABEL[c.status]} · {c.participants} peserta ·{" "}
          {groupProgressList(c)
            .map((g) =>
              (c.group_count ?? 1) > 1
                ? `Kelompok ${g.group_no}: ${g.completed_juz} dari 30 juz selesai`
                : `${g.completed_juz} dari 30 juz selesai`
            )
            .join(" · ")}
        </div>
      )}
      {locked && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>
            Campaign sudah <b>{STATUS_LABEL[c!.status]}</b> — terkunci permanen dan tidak dapat diubah. Data tetap
            bisa dilihat di halaman detail.
          </span>
        </div>
      )}

      <div className="space-y-6">
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Informasi Khatmil</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Slug (unik) {isNew ? "*" : ""}</Label>
              <Input
                placeholder="khatam-ramadhan-2026"
                value={form.slug}
                disabled={!isNew || locked}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Identitas API — tidak bisa diubah setelah dibuat.</p>
            </div>
            <div className="space-y-1">
              <Label>Nama Khatmil *</Label>
              <Input
                placeholder="Khataman Ramadhan 2026"
                value={form.name}
                disabled={locked}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Deskripsi</Label>
            <Textarea
              rows={3}
              placeholder="Khataman bersama seluruh santri…"
              value={form.description}
              disabled={locked}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <Label>Cover</Label>
            {coverPreview ? (
              <div className="relative overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={coverPreview} alt="Cover campaign" className="aspect-[16/6] w-full object-cover" />
                <div className="absolute right-2 top-2 flex gap-1">
                  <Button
                    type="button" variant="secondary" size="sm" disabled={locked || coverBusy}
                    onClick={() => document.getElementById("cover-input")?.click()}
                  >Ganti</Button>
                  <Button
                    type="button" variant="destructive" size="sm" disabled={locked || coverBusy}
                    onClick={() => {
                      setCoverPreview(null);
                      setCoverMediaId(null);
                      setCoverRemoved(true);
                    }}
                  >Hapus</Button>
                </div>
              </div>
            ) : (
              <button
                type="button" disabled={locked || coverBusy}
                onClick={() => document.getElementById("cover-input")?.click()}
                className="flex aspect-[16/6] w-full items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
              >
                {coverBusy ? "Mengunggah…" : "Klik untuk pilih gambar cover"}
              </button>
            )}
            <input
              id="cover-input" type="file" accept="image/*" className="hidden" disabled={locked || coverBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadCover(f);
                e.currentTarget.value = "";
              }}
            />
          </div>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pengaturan Pembacaan</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Mode</Label>
              <Select
                value={form.mode}
                items={{ PARALLEL: "Paralel — bebas ambil juz", SEQUENTIAL: "Bergiliran — sesuai urutan" }}
                onValueChange={(v) => setForm({ ...form, mode: v ?? "PARALLEL" })}
              >
                <SelectTrigger disabled={locked}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PARALLEL">Paralel — bebas ambil juz</SelectItem>
                  <SelectItem value="SEQUENTIAL">Bergiliran — sesuai urutan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Jumlah Kelompok</Label>
              <Select
                value={form.group_count}
                items={Object.fromEntries(
                  Array.from({ length: 10 }, (_, i) => [String(i + 1), `${i + 1} kelompok`])
                )}
                onValueChange={(v) => setForm({ ...form, group_count: v ?? "1" })}
              >
                <SelectTrigger disabled={locked}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => String(i + 1)).map((n) => (
                    <SelectItem key={n} value={n}>
                      {n} kelompok
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Setiap kelompok = 1 set 30 juz, dibina 1 ustadz. Santri memilih kelompok sendiri saat klaim juz.
              </p>
            </div>
            <div className="space-y-1">
              <Label>Kuota Peserta (opsional)</Label>
              <Input
                type="number"
                min={1}
                placeholder="kosong = tanpa batas"
                value={form.max_participants}
                disabled={locked}
                onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Verifikasi Manual</Label>
              <Select
                value={form.require_manual_verification ? "1" : "0"}
                items={{ "0": "Otomatis — posisi terakhir juz", "1": "Manual — menunggu ACC pengurus" }}
                onValueChange={(v) => setForm({ ...form, require_manual_verification: v === "1" })}
              >
                <SelectTrigger disabled={locked}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Otomatis — posisi terakhir juz</SelectItem>
                  <SelectItem value="1">Manual — menunggu ACC pengurus</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Periode &amp; Status</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Mulai (opsional)</Label>
              <Input
                type="date"
                value={form.period_start}
                disabled={locked}
                onChange={(e) => setForm({ ...form, period_start: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Selesai (opsional)</Label>
              <Input
                type="date"
                value={form.period_end}
                disabled={locked}
                onChange={(e) => setForm({ ...form, period_end: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>{isNew ? "Status Awal" : "Status"}</Label>
            <Select
              value={form.status}
              items={Object.fromEntries(
                (isNew ? ["DRAFT", "SCHEDULED", "ACTIVE"] : nextStatuses(c!.status)).map((s) => [s, STATUS_LABEL[s]])
              )}
              onValueChange={(v) => setForm({ ...form, status: v ?? "DRAFT" })}
            >
              <SelectTrigger disabled={locked}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(isNew ? ["DRAFT", "SCHEDULED", "ACTIVE"] : nextStatuses(c!.status)).map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isNew
                ? "Aktif = santri bisa langsung join & klaim juz."
                : "Selesai / Dibatalkan = campaign terkunci permanen. Perubahan status mengikuti aturan transisi."}
            </p>
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={cancel}>
          {locked ? "Kembali" : "Batal"}
        </Button>
        {!locked && (
          <Button disabled={busy || !valid} onClick={submit}>
            {busy ? "Menyimpan…" : isNew ? "Buat Campaign" : "Simpan"}
          </Button>
        )}
      </div>
    </div>
  );
}
