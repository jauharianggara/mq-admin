"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Trophy } from "lucide-react";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/* ============================== Types ============================== */

interface Campaign {
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

interface JuzSlot {
  juz: number;
  status: string | null;
  owner_name: string | null;
  current_surah: number | null;
  current_ayah: number | null;
  progress_pct: number | null;
  completed_at: string | null;
}

interface CampaignDetail extends Campaign {
  juz_map: JuzSlot[];
  period_start: string | null;
  period_end: string | null;
}

interface JuzActive {
  juz: number;
  status: string;
  current_surah: number | null;
  current_ayah: number | null;
  read_ayat: number | null;
  juz_total_ayat: number;
  progress_pct: number | null;
}

interface Participant {
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

interface ActivityEvent {
  full_name: string;
  juz: number;
  current_surah: number | null;
  current_ayah: number | null;
  note: string | null;
  completed: boolean;
  created_at: string;
}

/* ============================== Helpers ============================== */

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Aktif",
  SCHEDULED: "Terjadwal",
  DRAFT: "Draf",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

function StatusBadge({ status }: { status: string }) {
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

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function Avatar({ name, className = "" }: { name: string; className?: string }) {
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

function MiniBar({ pct, className = "" }: { pct: number | null; className?: string }) {
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

function timeAgo(iso: string | null) {
  if (!iso) return "belum pernah";
  const d = new Date(iso + "Z");
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return `${Math.floor(s / 86400)} hari lalu`;
}

const isTerminal = (st: string) => st === "COMPLETED" || st === "CANCELLED";

/* ============================== Page ============================== */

export default function KhatmilPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ACTIVE");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [selectedJuz, setSelectedJuz] = useState<JuzSlot | null>(null);
  const [editing, setEditing] = useState<Campaign | "new" | null>(null);
  const [statusTarget, setStatusTarget] = useState<Campaign | null>(null);
  const [statusValue, setStatusValue] = useState<string>("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<Campaign[]>("/khatmil/campaigns");
      setItems(list);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openDetail = useCallback(async (id: number) => {
    setDetailLoading(true);
    setSelectedJuz(null);
    try {
      const [d, p, a] = await Promise.all([
        apiGet<CampaignDetail>(`/khatmil/campaigns/${id}`),
        apiGet<Participant[]>(`/khatmil/campaigns/${id}/participants`),
        apiGet<ActivityEvent[]>(`/khatmil/campaigns/${id}/activity`),
      ]);
      setDetail(d);
      setParticipants(p);
      setActivity(a);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat detail");
    } finally {
      setDetailLoading(false);
    }
  }, []);

  async function patchCampaign(c: Campaign, patch: Partial<Campaign> & Record<string, unknown>, label: string) {
    // ambil detail utk field yang tidak ada di list (periode) — PATCH jangan sampai menghapus data
    let base: Partial<CampaignDetail> = {};
    if (patch.period_start === undefined || patch.period_end === undefined) {
      try {
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
      max_participants:
        patch.max_participants !== undefined ? patch.max_participants : c.max_participants ?? null,
    };
    try {
      await apiPatch(`/khatmil/campaigns/${c.id}`, body);
      toast.success(label);
      load();
      if (detail?.id === c.id) openDetail(c.id);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (c) =>
        (filter === "ALL" || c.status === filter) &&
        (!q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
    );
  }, [items, filter, search]);

  /* ---------- Leaderboard derived ---------- */
  const ranked = useMemo(
    () =>
      [...participants].sort(
        (a, b) => b.juz_done_count - a.juz_done_count || a.full_name.localeCompare(b.full_name)
      ),
    [participants]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Khatmil</h1>
          <p className="text-sm text-muted-foreground">Campaign khataman Al-Quran bersama</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus className="size-4" /> Campaign Baru
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        {["ACTIVE", "SCHEDULED", "DRAFT", "COMPLETED", "CANCELLED", "ALL"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1 text-xs font-medium ${
              filter === f
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {f === "ALL" ? "Semua" : STATUS_LABEL[f]}
          </button>
        ))}
        <div className="ml-auto flex w-full items-center gap-2 rounded-lg border bg-background px-3 py-1.5 sm:w-64">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama / slug…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* ===== Table (desktop) ===== */}
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Nama Campaign</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Peserta</TableHead>
              <TableHead className="text-center">Juz Selesai</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead className="w-32 text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-sm text-muted-foreground">
                  Tidak ada campaign
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c.id)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{c.id}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.slug}
                      {c.period_start ? ` · ${c.period_start}${c.period_end ? ` – ${c.period_end}` : ""}` : ""}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.mode === "SEQUENTIAL" ? "Bergiliran" : "Paralel"}</Badge>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-center text-sm">{c.participants}</TableCell>
                  <TableCell className="text-center text-sm">
                    {c.juz_completed}/{30 * c.target_khataman}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <MiniBar pct={c.progress_pct} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => openDetail(c.id)}>
                        Detail
                      </Button>
                      {!isTerminal(c.status) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button size="sm" variant="outline">⋯</Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(c)}>✏️ Edit Campaign</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setStatusTarget(c);
                                setStatusValue("");
                              }}
                            >
                              🔄 Ubah Status…
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (confirm(`Batalkan campaign "${c.name}"? Tindakan ini permanen.`))
                                  patchCampaign(c, { status: "CANCELLED" }, "Campaign dibatalkan");
                              }}
                            >
                              🚫 Batalkan Campaign
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ===== Kartu list (mobile) ===== */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
            Tidak ada campaign
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => openDetail(c.id)}
              className="w-full rounded-lg border bg-background p-3 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{c.name}</span>
                <StatusBadge status={c.status} />
              </div>
              <div className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                <span>{c.mode === "SEQUENTIAL" ? "Bergiliran" : "Paralel"}</span>
                <span>·</span>
                <span>{c.participants} peserta</span>
                {c.period_start && (
                  <>
                    <span>·</span>
                    <span>
                      {c.period_start}
                      {c.period_end ? `–${c.period_end}` : ""}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <MiniBar pct={c.progress_pct} className="flex-1" />
                <span className="text-xs font-semibold text-primary">
                  {c.juz_completed}/{30 * c.target_khataman}
                </span>
                <span className="text-muted-foreground">›</span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* ===== Dialog Detail — 5 TAB ===== */}
      <Dialog open={!!detail || detailLoading} onOpenChange={(o) => !o && (setDetail(null), setDetailLoading(false))}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {detailLoading || !detail ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2 pr-6">
                  {detail.name}
                  <StatusBadge status={detail.status} />
                </DialogTitle>
              </DialogHeader>
              <Tabs defaultValue="ringkasan">
                <TabsList className="flex-wrap">
                  <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
                  <TabsTrigger value="peta">Peta Juz</TabsTrigger>
                  <TabsTrigger value="peserta">Peserta</TabsTrigger>
                  <TabsTrigger value="aktivitas">Aktivitas</TabsTrigger>
                  <TabsTrigger value="peringkat">Peringkat</TabsTrigger>
                </TabsList>

                {/* ---- TAB 1: Ringkasan ---- */}
                <TabsContent value="ringkasan" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                    {[
                      { l: "Peserta", v: String(detail.participants) },
                      {
                        l: "Juz Selesai",
                        v: `${detail.juz_completed}/${30 * detail.target_khataman}`,
                      },
                      {
                        l: "Juz Kosong",
                        v: String(
                          detail.juz_map.filter((j) => !j.status || j.status === "COMPLETED").length === 0
                            ? 0
                            : 30 - detail.juz_map.filter((j) => j.status).length
                        ),
                      },
                      { l: "Progress", v: `${detail.progress_pct}%` },
                    ].map((s) => (
                      <div key={s.l} className="rounded-lg border p-3">
                        <div className="text-xs text-muted-foreground">{s.l}</div>
                        <div className="mt-1 text-xl font-semibold">{s.v}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      Mode: <b className="text-foreground">{detail.mode === "SEQUENTIAL" ? "Bergiliran" : "Paralel"}</b>
                    </span>
                    <span>
                      Target khataman: <b className="text-foreground">{detail.target_khataman || "—"}</b>
                    </span>
                    <span>
                      Verifikasi: <b className="text-foreground">{detail.require_manual_verification ? "Manual (pengurus)" : "Otomatis (posisi)"}</b>
                    </span>
                    {detail.period_start && (
                      <span>
                        Periode: <b className="text-foreground">{detail.period_start}{detail.period_end ? ` – ${detail.period_end}` : ""}</b>
                      </span>
                    )}
                    {detail.max_participants && (
                      <span>
                        Kuota: <b className="text-foreground">{detail.max_participants}</b>
                      </span>
                    )}
                  </div>
                  {detail.description && (
                    <p className="whitespace-pre-wrap rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                      {detail.description}
                    </p>
                  )}
                  {!isTerminal(detail.status) && (
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" size="sm" onClick={() => setEditing(detail)}>
                        ✏️ Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setStatusTarget(detail);
                          setStatusValue("");
                        }}
                      >
                        🔄 Ubah Status
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* ---- TAB 2: Peta Juz ---- */}
                <TabsContent value="peta" className="space-y-3">
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
                    {detail.juz_map.map((j) => (
                      <button
                        key={j.juz}
                        onClick={() => setSelectedJuz(j === selectedJuz ? null : j)}
                        title={
                          j.status
                            ? `Juz ${j.juz}: ${j.owner_name ?? "?"} — ${j.status}`
                            : `Juz ${j.juz}: kosong`
                        }
                        className={`flex h-10 items-center justify-center rounded-md border text-xs font-medium transition-sm ${
                          j.status === "COMPLETED"
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : j.status
                              ? "border-amber-300 bg-amber-100 text-amber-800"
                              : "border-dashed text-muted-foreground hover:bg-muted"
                        } ${selectedJuz?.juz === j.juz ? "ring-2 ring-primary ring-offset-1" : ""}`}
                      >
                        {j.juz}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span>🟩 Selesai</span>
                    <span>🟨 Aktif dipegang</span>
                    <span>⬜ Kosong</span>
                    <span className="ml-auto">Klik kotak utk detail</span>
                  </div>
                  {selectedJuz && (
                    <div className="rounded-lg border bg-muted/40 p-3 text-sm">
                      <b>Juz {selectedJuz.juz}</b>
                      {!selectedJuz.status ? (
                        <span className="ml-2 text-muted-foreground">kosong — belum diklaim</span>
                      ) : (
                        <div className="mt-1.5 space-y-1 text-muted-foreground">
                          <div>
                            Pemilik: <b className="text-foreground">{selectedJuz.owner_name ?? "?"}</b> ·{" "}
                            <StatusBadge status={selectedJuz.status} />
                          </div>
                          {selectedJuz.status !== "COMPLETED" &&
                            (selectedJuz.current_surah != null ? (
                              <div>
                                Posisi bacaan:{" "}
                                <b className="text-foreground">
                                  QS {selectedJuz.current_surah}:{selectedJuz.current_ayah}
                                </b>{" "}
                                · {selectedJuz.progress_pct ?? 0}%
                              </div>
                            ) : (
                              <div>Belum ada laporan posisi bacaan</div>
                            ))}
                          {selectedJuz.completed_at && (
                            <div>
                              Selesai & terverifikasi: <b className="text-foreground">{selectedJuz.completed_at.slice(0, 10)}</b>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ---- TAB 3: Peserta ---- */}
                <TabsContent value="peserta" className="space-y-3">
                  {participants.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">Belum ada peserta</div>
                  ) : (
                    <>
                      {/* desktop table */}
                      <div className="hidden overflow-hidden rounded-lg border md:block">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Peserta</TableHead>
                              <TableHead>Join</TableHead>
                              <TableHead>Juz Dipegang</TableHead>
                              <TableHead>Juz Selesai</TableHead>
                              <TableHead>Progres Bacaan</TableHead>
                              <TableHead>Progres Tugas</TableHead>
                              <TableHead>Kontribusi</TableHead>
                              <TableHead>Terakhir Lapor</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {participants.map((p) => (
                              <TableRow key={p.user_id}>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <Avatar name={p.full_name} />
                                    <span className="text-sm font-medium">{p.full_name}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {p.joined_at.slice(0, 10)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex max-w-40 flex-wrap gap-1">
                                    {p.juz_active.length === 0 ? (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    ) : (
                                      p.juz_active.map((j) => (
                                        <span
                                          key={j.juz}
                                          className="rounded border border-amber-200 bg-amber-50 px-1.5 text-xs font-medium text-amber-800"
                                        >
                                          {j.juz}
                                          {j.progress_pct != null ? ` · ${j.progress_pct}%` : ""}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex max-w-40 flex-wrap gap-1">
                                    {p.juz_done.length === 0 ? (
                                      <span className="text-xs text-muted-foreground">—</span>
                                    ) : (
                                      p.juz_done.map((j) => (
                                        <span
                                          key={j.juz}
                                          className="rounded border border-emerald-200 bg-emerald-50 px-1.5 text-xs font-medium text-emerald-800"
                                        >
                                          {j.juz}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {p.juz_active.length === 0 ? (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  ) : p.juz_active[0].progress_pct == null ? (
                                    <span className="text-xs text-muted-foreground">belum ada posisi</span>
                                  ) : (
                                    <MiniBar pct={p.juz_active[0].progress_pct} />
                                  )}
                                </TableCell>
                                <TableCell>
                                  <MiniBar pct={p.task_progress_pct} />
                                </TableCell>
                                <TableCell>
                                  <MiniBar pct={p.contribution_pct} />
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">
                                  {timeAgo(p.last_reported_at)}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {/* mobile cards */}
                      <div className="space-y-2 md:hidden">
                        {participants.map((p) => (
                          <div key={p.user_id} className="rounded-lg border p-3">
                            <div className="flex items-center gap-2">
                              <Avatar name={p.full_name} />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-semibold">{p.full_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {p.juz_active.length > 0
                                    ? `juz ${p.juz_active.map((j) => j.juz).join(", ")} dipegang`
                                    : "tidak pegang juz"}
                                </div>
                              </div>
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                {p.juz_done_count} juz
                              </Badge>
                            </div>
                            <div className="mt-2 space-y-1.5">
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-20 text-muted-foreground">Kontribusi</span>
                                <MiniBar pct={p.contribution_pct} className="flex-1" />
                              </div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="w-20 text-muted-foreground">Progres Tugas</span>
                                <MiniBar pct={p.task_progress_pct} className="flex-1" />
                              </div>
                            </div>
                            <div className="mt-1.5 text-xs text-muted-foreground">
                              lapor {timeAgo(p.last_reported_at)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ---- TAB 4: Aktivitas ---- */}
                <TabsContent value="aktivitas" className="space-y-2">
                  {activity.length === 0 ? (
                    <div className="py-6 text-center text-sm text-muted-foreground">
                      Belum ada laporan progres
                    </div>
                  ) : (
                    activity.map((e, i) => (
                      <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                        <Avatar name={e.full_name} />
                        <div className="min-w-0 flex-1 text-sm">
                          <b>{e.full_name}</b>{" "}
                          <span className="text-muted-foreground">— Juz {e.juz}:</span>{" "}
                          {e.current_surah != null ? (
                            <span>
                              QS {e.current_surah}:{e.current_ayah}
                              {e.completed && <span className="ml-1 font-semibold text-emerald-700">✓ selesai</span>}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">laporan lama</span>
                          )}
                          {e.note && <div className="mt-0.5 text-xs text-muted-foreground">“{e.note}”</div>}
                        </div>
                        <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(e.created_at)}</span>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* ---- TAB 5: Peringkat (leaderboard) ---- */}
                <TabsContent value="peringkat" className="space-y-4">
                  {/* Strip total progres */}
                  <div className="rounded-lg border bg-gradient-to-b from-primary/5 to-transparent p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-semibold">Total Progres Khataman</span>
                      <span className="text-2xl font-bold tabular-nums text-primary">
                        {detail.progress_pct}%
                        <span className="ml-1 text-xs font-medium text-muted-foreground">
                          · {detail.juz_completed}/{30 * detail.target_khataman} juz
                        </span>
                      </span>
                    </div>
                    <div className="mt-2 flex gap-0.5">
                      {detail.juz_map.map((j) => (
                        <div
                          key={j.juz}
                          title={`Juz ${j.juz}${j.status ? ` — ${j.status}` : " — kosong"}`}
                          className={`h-3.5 flex-1 rounded-sm ${
                            j.status === "COMPLETED" ? "bg-primary" : j.status ? "bg-amber-400/80" : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="mt-1.5 flex flex-wrap justify-between gap-1 text-xs text-muted-foreground">
                      <span>
                        <b>{detail.juz_map.filter((j) => j.status === "COMPLETED").length} selesai</b> ·{" "}
                        {detail.juz_map.filter((j) => j.status && j.status !== "COMPLETED").length} dibaca ·{" "}
                        {detail.juz_map.filter((j) => !j.status).length} kosong
                      </span>
                      <span>
                        <b>{participants.filter((p) => p.juz_done_count > 0).length} peserta</b> menyumbang
                      </span>
                    </div>
                  </div>

                  {/* Podium */}
                  {ranked.filter((p) => p.juz_done_count > 0).length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {[1, 0, 2].map((idx) => {
                        const p = ranked[idx];
                        if (!p) return <div key={idx} />;
                        const medals = ["🥈", "🥇", "🥉"];
                        const ring = ["border-slate-300", "border-amber-400 bg-amber-50/60", "border-orange-300"];
                        return (
                          <div
                            key={p.user_id}
                            className={`rounded-xl border p-3 text-center ${ring[ranked.indexOf(p)] ?? ring[0]} ${
                              idx === 0 ? "sm:pb-5 sm:pt-4" : ""
                            }`}
                          >
                            <div className="text-lg">{medals[ranked.indexOf(p)]}</div>
                            <Avatar name={p.full_name} className={`mx-auto mt-1 ${idx === 0 ? "h-11 w-11 text-sm" : ""}`} />
                            <div className="mt-1.5 truncate text-xs font-semibold sm:text-sm">{p.full_name}</div>
                            <div className="text-xs text-muted-foreground">
                              <b className="text-foreground">{p.juz_done_count} juz</b> selesai
                            </div>
                            <div className="text-xs font-semibold text-primary">
                              {p.contribution_pct != null ? `${p.contribution_pct}%` : "—"}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Tabel semua peserta (desktop) */}
                  <div className="hidden overflow-hidden rounded-lg border md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">#</TableHead>
                          <TableHead>Peserta</TableHead>
                          <TableHead>Juz Selesai</TableHead>
                          <TableHead>Dipegang</TableHead>
                          <TableHead>Kontribusi /30</TableHead>
                          <TableHead>Progres Bacaan</TableHead>
                          <TableHead>Terakhir Lapor</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ranked.map((p, i) => (
                          <TableRow key={p.user_id}>
                            <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar name={p.full_name} />
                                <span className="text-sm font-medium">{p.full_name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                {p.juz_done_count} juz
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {p.juz_active.length ? `juz ${p.juz_active.map((j) => j.juz).join(", ")}` : "—"}
                            </TableCell>
                            <TableCell>
                              <MiniBar pct={p.contribution_pct} />
                            </TableCell>
                            <TableCell>
                              {p.juz_active[0]?.progress_pct != null ? (
                                <MiniBar pct={p.juz_active[0].progress_pct} />
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{timeAgo(p.last_reported_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Kartu list (mobile) */}
                  <div className="space-y-2 md:hidden">
                    {ranked.map((p, i) => (
                      <div key={p.user_id} className="rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                          <Avatar name={p.full_name} />
                          <div className="min-w-0 flex-1 truncate text-sm font-semibold">{p.full_name}</div>
                          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                            {p.juz_done_count} juz
                          </Badge>
                        </div>
                        {p.juz_active.length > 0 && (
                          <div className="mt-1 pl-7 text-xs text-muted-foreground">
                            juz {p.juz_active.map((j) => j.juz).join(", ")} dipegang
                          </div>
                        )}
                        <div className="mt-2 space-y-1.5 pl-7">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-muted-foreground">Kontribusi</span>
                            <MiniBar pct={p.contribution_pct} className="flex-1" />
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <span className="w-20 text-muted-foreground">Progres Bacaan</span>
                            <MiniBar pct={p.juz_active[0]?.progress_pct ?? null} className="flex-1" />
                          </div>
                        </div>
                        <div className="mt-1 pl-7 text-xs text-muted-foreground">
                          lapor {timeAgo(p.last_reported_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ===== Dialog Create/Edit ===== */}
      <CampaignFormDialog
        editing={editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          load();
          if (detail) openDetail(detail.id);
        }}
        onPatch={patchCampaign}
      />

      {/* ===== Dialog Ubah Status cepat ===== */}
      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Status — {statusTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Status baru</Label>
              <Select value={statusValue} onValueChange={(v) => setStatusValue(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih status…" />
                </SelectTrigger>
                <SelectContent>
                  {["ACTIVE", "SCHEDULED", "COMPLETED", "CANCELLED"].map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1.5 text-xs text-muted-foreground">
                Selesai / Dibatalkan = campaign terkunci permanen (tidak bisa diedit lagi).
              </p>
            </div>
            <Button
              className="w-full"
              disabled={!statusValue || statusValue === statusTarget?.status}
              onClick={() => {
                if (statusTarget)
                  patchCampaign(statusTarget, { status: statusValue }, `Status → ${STATUS_LABEL[statusValue]}`);
                setStatusTarget(null);
              }}
            >
              Simpan Status
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ============================== Form Create/Edit ============================== */

function CampaignFormDialog({
  editing,
  onClose,
  onSaved,
  onPatch,
}: {
  editing: Campaign | "new" | null;
  onClose: () => void;
  onSaved: () => void;
  onPatch: (c: Campaign, patch: Partial<Campaign> & Record<string, unknown>, label: string) => void;
}) {
  const isNew = editing === "new";
  const c = isNew || !editing ? null : editing;
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
    if (editing === "new") {
      setForm({
        slug: "", name: "", description: "", mode: "PARALLEL", status: "DRAFT",
        target_khataman: "1", max_participants: "", period_start: "", period_end: "",
        require_manual_verification: false,
      });
    } else if (editing) {
      setForm({
        slug: editing.slug,
        name: editing.name,
        description: editing.description ?? "",
        mode: editing.mode,
        status: editing.status,
        target_khataman: String(editing.target_khataman),
        max_participants: editing.max_participants != null ? String(editing.max_participants) : "",
        period_start: "",
        period_end: "",
        require_manual_verification: editing.require_manual_verification,
      });
      // periode tidak ada di list — ambil dari detail
      apiGet<CampaignDetail>(`/khatmil/campaigns/${editing.id}`)
        .then((d) =>
          setForm((f) => ({ ...f, period_start: d.period_start ?? "", period_end: d.period_end ?? "" }))
        )
        .catch(() => {});
    }
  }, [editing]);

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
        onSaved();
      } else if (c) {
        onPatch(
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
        onClose();
      }
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  }

  const valid = form.slug.trim() && form.name.trim();

  return (
    <Dialog open={!!editing} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? "Campaign Khatmil Baru" : "Edit Campaign"}</DialogTitle>
        </DialogHeader>

        {c && !isNew && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <b>{c.name}</b> — {STATUS_LABEL[c.status]} · {c.participants} peserta · {c.juz_completed}/
            {30 * c.target_khataman} juz. Perubahan langsung berlaku setelah disimpan.
          </div>
        )}
        {locked && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            🔒 Campaign sudah <b>{STATUS_LABEL[c!.status]}</b> — terkunci permanen dan tidak dapat diubah. Data
            tetap bisa dilihat di tab Detail.
          </div>
        )}

        <div className="space-y-4">
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Dasar</div>
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
            <div className="mt-3 space-y-1">
              <Label>Deskripsi</Label>
              <Textarea
                rows={2}
                placeholder="Khataman bersama seluruh santri…"
                value={form.description}
                disabled={locked}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Pengaturan Pembacaan
            </div>
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
          </div>

          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Periode &amp; Status
            </div>
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
            <div className="mt-3 space-y-1">
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
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>
            {locked ? "Tutup" : "Batal"}
          </Button>
          {!locked && (
            <Button disabled={busy || !valid} onClick={submit}>
              {busy ? "Menyimpan…" : isNew ? "Buat Campaign" : "Simpan Perubahan"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
