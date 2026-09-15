"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

/* ============================== Types ============================== */

export interface Campaign {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  max_participants: number | null;
  mode: string;
  status: string;
  target_khataman: number;
  require_manual_verification: boolean;
  participants: number;
  juz_completed: number;
  progress_pct: number;
  period_start?: string | null;
  period_end?: string | null;
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

export interface CampaignDetail extends Campaign {
  juz_map: JuzSlot[];
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

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    SCHEDULED: "border-blue-200 bg-blue-50 text-blue-700",
    DRAFT: "border-border bg-muted text-muted-foreground",
    COMPLETED: "border-emerald-300 bg-emerald-100 text-emerald-800",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
  };
  return (
    <Badge variant="outline" className={map[status] ?? ""}>
      {STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
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
  const d = new Date(iso + "Z");
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

/** PATCH campaign — ambil detail dulu utk field yang tak ada di list, jangan sampai menghapus data. */
export async function patchCampaign(c: Campaign, patch: Partial<Campaign> & Record<string, unknown>, label: string) {
  let base: Partial<CampaignDetail> = {};
  if (patch.period_start === undefined || patch.period_end === undefined) {
    try {
      const { apiGet } = await import("@/lib/api");
      base = await apiGet<CampaignDetail>(`/khatmil/campaigns/${c.id}`);
    } catch {
      /* biarkan null */
    }
  }
  const body = {
    slug: c.slug,
    name: patch.name ?? c.name,
    description: patch.description !== undefined ? patch.description : c.description ?? "",
    mode: patch.mode ?? c.mode,
    status: patch.status ?? c.status,
    target_khataman: patch.target_khataman ?? c.target_khataman,
    period_start: patch.period_start !== undefined ? patch.period_start : base.period_start ?? null,
    period_end: patch.period_end !== undefined ? patch.period_end : base.period_end ?? null,
    require_manual_verification: patch.require_manual_verification ?? c.require_manual_verification,
    max_participants: patch.max_participants !== undefined ? patch.max_participants : c.max_participants ?? null,
  };
  try {
    await apiPatch(`/khatmil/campaigns/${c.id}`, body);
    toast.success(label);
  } catch (e) {
    toast.error(e instanceof ApiError ? e.message : "Gagal");
  }
}

/* ============================== Form (shared create/edit PAGE) ============================== */

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

  const [form, setForm] = useState({
    slug: "",
    name: "",
    description: "",
    mode: "PARALLEL",
    status: "DRAFT",
    target_khataman: "1",
    max_participants: "",
    period_start: "",
    period_end: "",
    require_manual_verification: false,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isNew) {
      setForm({
        slug: "", name: "", description: "", mode: "PARALLEL", status: "DRAFT",
        target_khataman: "1", max_participants: "", period_start: "", period_end: "",
        require_manual_verification: false,
      });
    } else if (c) {
      setForm({
        slug: c.slug,
        name: c.name,
        description: c.description ?? "",
        mode: c.mode,
        status: c.status,
        target_khataman: String(c.target_khataman),
        max_participants: c.max_participants != null ? String(c.max_participants) : "",
        period_start: "",
        period_end: "",
        require_manual_verification: c.require_manual_verification,
      });
      import("@/lib/api").then(({ apiGet }) =>
        apiGet<CampaignDetail>(`/khatmil/campaigns/${c.id}`)
          .then((d) => setForm((f) => ({ ...f, period_start: d.period_start ?? "", period_end: d.period_end ?? "" })))
          .catch(() => {})
      );
    }
  }, [editing, isNew, c]);

  async function submit() {
    setBusy(true);
    try {
      if (isNew) {
        await apiPost("/khatmil/campaigns", {
          slug: form.slug,
          name: form.name,
          description: form.description || undefined,
          mode: form.mode,
          status: form.status,
          target_khataman: Number(form.target_khataman) || 1,
          require_manual_verification: form.require_manual_verification,
          ...(form.max_participants ? { max_participants: Number(form.max_participants) } : {}),
          ...(form.period_start ? { period_start: form.period_start } : {}),
          ...(form.period_end ? { period_end: form.period_end } : {}),
        });
        toast.success("Campaign dibuat");
        onDone();
      } else if (c) {
        await patchCampaign(
          c,
          {
            name: form.name,
            description: form.description,
            mode: form.mode,
            status: form.status,
            target_khataman: Number(form.target_khataman) || 1,
            require_manual_verification: form.require_manual_verification,
            max_participants: form.max_participants ? Number(form.max_participants) : null,
            period_start: form.period_start || null,
            period_end: form.period_end || null,
          },
          "Perubahan tersimpan"
        );
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
          {isNew ? "Campaign Khatmil Baru" : `Edit — ${c!.name}`}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isNew ? "Isi detail campaign khataman" : "Perubahan langsung berlaku setelah disimpan"}
        </p>
      </div>

      {c && !isNew && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
          <b>{c.name}</b> — {STATUS_LABEL[c.status]} · {c.participants} peserta · {c.juz_completed}/
          {30 * c.target_khataman} juz
        </div>
      )}
      {locked && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-xs text-amber-800">
          🔒 Campaign sudah <b>{STATUS_LABEL[c!.status]}</b> — terkunci permanen dan tidak dapat diubah. Data tetap
          bisa dilihat di halaman detail.
        </div>
      )}

      <div className="space-y-6">
        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Dasar</h2>
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
              <Label>Nama Campaign *</Label>
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
        </section>

        <section className="space-y-3 rounded-lg border p-4">
          <h2 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Pengaturan Pembacaan</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Mode</Label>
              <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v ?? "PARALLEL" })}>
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
              <Label>Target Khataman</Label>
              <Input
                type="number"
                min={0}
                value={form.target_khataman}
                disabled={locked}
                onChange={(e) => setForm({ ...form, target_khataman: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Berapa kali 30 juz dituntaskan (0 = tanpa target).</p>
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
            <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "DRAFT" })}>
              <SelectTrigger disabled={locked}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(isNew ? ["DRAFT", "SCHEDULED", "ACTIVE"] : ["DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED", "CANCELLED"]).map(
                  (s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {isNew
                ? "Aktif = santri bisa langsung join & klaim juz."
                : "Selesai / Dibatalkan = campaign terkunci permanen."}
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
            {busy ? "Menyimpan…" : isNew ? "Buat Campaign" : "Simpan Perubahan"}
          </Button>
        )}
      </div>
    </div>
  );
}
