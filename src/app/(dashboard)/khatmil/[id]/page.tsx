"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft } from "lucide-react";

import {
  ActivityEvent,
  Avatar,
  CampaignDetail,
  isTerminal,
  MiniBar,
  Participant,
  StatusBadge,
  STATUS_LABEL,
  timeAgo,
} from "../shared";

/** Detail campaign — HALAMAN PENUH 5 tab (rev 3.4: bukan dialog). */
export default function KhatmilDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJuz, setSelectedJuz] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
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
      toast.error(e instanceof Error ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const ranked = useMemo(
    () =>
      [...participants].sort(
        (a, b) => b.juz_done_count - a.juz_done_count || a.full_name.localeCompare(b.full_name)
      ),
    [participants]
  );

  if (loading || !detail) {
    return (
      <div className="mx-auto max-w-4xl space-y-3 py-4">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const slot = selectedJuz != null ? detail.juz_map.find((j) => j.juz === selectedJuz) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/khatmil")} className="mt-1">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight">
            {detail.name}
            <StatusBadge status={detail.status} />
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {detail.slug} · {detail.mode === "SEQUENTIAL" ? "Bergiliran" : "Paralel"} ·{" "}
            {detail.participants} peserta
          </p>
        </div>
        {!isTerminal(detail.status) && (
          <Button variant="outline" onClick={() => router.push(`/khatmil/${detail.id}/edit`)}>
            ✏️ Edit
          </Button>
        )}
      </div>

      <Tabs defaultValue="ringkasan">
        <TabsList className="flex-wrap">
          <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
          <TabsTrigger value="peta">Peta Juz</TabsTrigger>
          <TabsTrigger value="peserta">Peserta</TabsTrigger>
          <TabsTrigger value="aktivitas">Aktivitas</TabsTrigger>
          <TabsTrigger value="peringkat">🏆 Peringkat</TabsTrigger>
        </TabsList>

        {/* ---- Ringkasan ---- */}
        <TabsContent value="ringkasan" className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              { l: "Peserta", v: String(detail.participants) },
              { l: "Juz Selesai", v: `${detail.juz_completed}/${30 * detail.target_khataman}` },
              { l: "Juz Kosong", v: String(detail.juz_map.filter((j) => !j.status).length) },
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
              Target khataman: <b className="text-foreground">{detail.target_khataman || "—"}</b>
            </span>
            <span>
              Verifikasi:{" "}
              <b className="text-foreground">
                {detail.require_manual_verification ? "Manual (pengurus)" : "Otomatis (posisi)"}
              </b>
            </span>
            {detail.period_start && (
              <span>
                Periode:{" "}
                <b className="text-foreground">
                  {detail.period_start}
                  {detail.period_end ? ` – ${detail.period_end}` : ""}
                </b>
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
        </TabsContent>

        {/* ---- Peta Juz ---- */}
        <TabsContent value="peta" className="space-y-3">
          <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {detail.juz_map.map((j) => (
              <button
                key={j.juz}
                onClick={() => setSelectedJuz(selectedJuz === j.juz ? null : j.juz)}
                title={j.status ? `Juz ${j.juz}: ${j.owner_name ?? "?"} — ${j.status}` : `Juz ${j.juz}: kosong`}
                className={`flex h-10 items-center justify-center rounded-md border text-xs font-medium transition-sm ${
                  j.status === "COMPLETED"
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : j.status
                      ? "border-amber-300 bg-amber-100 text-amber-800"
                      : "border-dashed text-muted-foreground hover:bg-muted"
                } ${selectedJuz === j.juz ? "ring-2 ring-primary ring-offset-1" : ""}`}
              >
                {j.juz}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>🟩 Selesai</span>
            <span>🟨 Aktif dipegang</span>
            <span>⬜ Kosong</span>
          </div>
          {slot && (
            <div className="rounded-lg border bg-muted/40 p-4 text-sm">
              <b>Juz {slot.juz}</b>
              {!slot.status ? (
                <span className="ml-2 text-muted-foreground">kosong — belum diklaim</span>
              ) : (
                <div className="mt-2 space-y-1 text-muted-foreground">
                  <div>
                    Pemilik: <b className="text-foreground">{slot.owner_name ?? "?"}</b> ·{" "}
                    <StatusBadge status={slot.status} />
                  </div>
                  {slot.status !== "COMPLETED" &&
                    (slot.current_surah != null ? (
                      <div>
                        Posisi bacaan:{" "}
                        <b className="text-foreground">
                          QS {slot.current_surah}:{slot.current_ayah}
                        </b>{" "}
                        · {slot.progress_pct ?? 0}%
                      </div>
                    ) : (
                      <div>Belum ada laporan posisi bacaan</div>
                    ))}
                  {slot.completed_at && (
                    <div>
                      Selesai & terverifikasi: <b className="text-foreground">{slot.completed_at.slice(0, 10)}</b>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ---- Peserta ---- */}
        <TabsContent value="peserta" className="space-y-3">
          {participants.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Belum ada peserta</div>
          ) : (
            <>
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
                        <TableCell className="text-xs text-muted-foreground">{p.joined_at.slice(0, 10)}</TableCell>
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
                        <TableCell className="text-xs text-muted-foreground">{timeAgo(p.last_reported_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
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
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {p.juz_done_count} juz
                      </span>
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
                    <div className="mt-1.5 text-xs text-muted-foreground">lapor {timeAgo(p.last_reported_at)}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ---- Aktivitas ---- */}
        <TabsContent value="aktivitas" className="space-y-2">
          {activity.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">Belum ada laporan progres</div>
          ) : (
            activity.map((e, i) => (
              <div key={i} className="flex items-start gap-3 rounded-lg border p-3">
                <Avatar name={e.full_name} />
                <div className="min-w-0 flex-1 text-sm">
                  <b>{e.full_name}</b> <span className="text-muted-foreground">— Juz {e.juz}:</span>{" "}
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

        {/* ---- Peringkat ---- */}
        <TabsContent value="peringkat" className="space-y-4">
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

          {ranked.filter((p) => p.juz_done_count > 0).length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {[1, 0, 2].map((idx) => {
                const p = ranked[idx];
                if (!p) return <div key={idx} />;
                const rank = ranked.indexOf(p);
                const medals = ["🥈", "🥇", "🥉"];
                const ring = ["border-slate-300", "border-amber-400 bg-amber-50/60", "border-orange-300"];
                return (
                  <div key={p.user_id} className={`rounded-xl border p-3 text-center ${ring[rank] ?? ring[0]}`}>
                    <div className="text-lg">{medals[rank]}</div>
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
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                        {p.juz_done_count} juz
                      </span>
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

          <div className="space-y-2 md:hidden">
            {ranked.map((p, i) => (
              <div key={p.user_id} className="rounded-lg border p-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  <Avatar name={p.full_name} />
                  <div className="min-w-0 flex-1 truncate text-sm font-semibold">{p.full_name}</div>
                  <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">
                    {p.juz_done_count} juz
                  </span>
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
                <div className="mt-1 pl-7 text-xs text-muted-foreground">lapor {timeAgo(p.last_reported_at)}</div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
