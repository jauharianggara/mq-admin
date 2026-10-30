"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RefreshCw } from "lucide-react";

import {
  ActivityEvent,
  Avatar,
  CampaignDetail,
  isTerminal,
  Participant,
} from "../shared";
import {
  ActivitySpecSection,
  HeroProgressAndKpis,
  JuzMatrixSection,
  JuzSel,
  PesertaSection,
  PetaGroup,
  PrintView,
  SessionHero,
} from "./sections";

interface UstadzOption {
  id: number;
  full_name: string;
  city: string | null;
  verified: boolean;
}

/** Detail campaign — SATU halaman tanpa tab, layout sesuai mockup ACC:
 *  Hero → Analytics → Peta & Distribusi Juz → Peserta & Peringkat → Aktivitas + Detail Sesi. */
export default function KhatmilDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activity, setActivity] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<JuzSel | null>(null);
  const [printMode, setPrintMode] = useState(false);

  // Mode cetak: render PrintView (data penuh) lalu buka dialog cetak.
  useEffect(() => {
    if (!printMode) return;
    const selesai = () => setPrintMode(false);
    window.addEventListener("afterprint", selesai);
    const t = setTimeout(() => window.print(), 80);
    return () => {
      window.removeEventListener("afterprint", selesai);
      clearTimeout(t);
    };
  }, [printMode]);

  // ---- dialog assign pembina kelompok ----
  const [assignGroup, setAssignGroup] = useState<number | null>(null);
  const [ustQuery, setUstQuery] = useState("");
  const [ustList, setUstList] = useState<UstadzOption[]>([]);
  const [ustLoading, setUstLoading] = useState(false);
  const [assignBusy, setAssignBusy] = useState(false);

  useEffect(() => {
    let ignore = false;
    Promise.all([
      apiGet<CampaignDetail>(`/khatmil/campaigns/${id}`),
      apiGet<Participant[]>(`/khatmil/campaigns/${id}/participants`),
      apiGet<ActivityEvent[]>(`/khatmil/campaigns/${id}/activity`),
    ])
      .then(([d, p, a]) => {
        if (!ignore) {
          setDetail(d);
          setParticipants(p);
          setActivity(a);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!ignore) setError(e instanceof Error ? e.message : "Gagal memuat");
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [id]);

  // muat daftar ustadz utk dialog assign (debounce 350ms, hanya saat dialog terbuka)
  useEffect(() => {
    if (assignGroup == null) return;
    const t = setTimeout(async () => {
      setUstLoading(true);
      try {
        const qs = new URLSearchParams({ limit: "20" });
        if (ustQuery.trim()) qs.set("q", ustQuery.trim());
        const res = await apiGet<UstadzOption[]>(`/admin/ustadz?${qs.toString()}`);
        setUstList(Array.isArray(res) ? res : []);
      } catch {
        setUstList([]);
      } finally {
        setUstLoading(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [assignGroup, ustQuery]);

  async function assignPembina(groupNo: number, ustadzId: number, nama: string) {
    if (!detail) return;
    setAssignBusy(true);
    try {
      await apiPost(`/khatmil/campaigns/${detail.id}/groups/${groupNo}/assign-pembina`, {
        ustadz_id: ustadzId,
      });
      toast.success(`Kelompok ${groupNo} → ${nama} — menunggu ACC ustadz`);
      setAssignGroup(null);
      setUstQuery("");
      muatUlang();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menugaskan pembina");
    } finally {
      setAssignBusy(false);
    }
  }

  // reload dari handler (bukan effect)
  function muatUlang() {
    setLoading(true);
    setError(null);
    Promise.all([
      apiGet<CampaignDetail>(`/khatmil/campaigns/${id}`),
      apiGet<Participant[]>(`/khatmil/campaigns/${id}/participants`),
      apiGet<ActivityEvent[]>(`/khatmil/campaigns/${id}/activity`),
    ])
      .then(([d, p, a]) => {
        setDetail(d);
        setParticipants(p);
        setActivity(a);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : "Gagal memuat");
      })
      .finally(() => setLoading(false));
  }

  // peringkat: juz selesai terbanyak dulu, lalu nama
  const ranked = useMemo(
    () =>
      [...participants].sort(
        (a, b) => b.juz_done_count - a.juz_done_count || a.full_name.localeCompare(b.full_name)
      ),
    [participants]
  );

  // pemetaan peserta → kelompok dari kepemilikan juz (owner_name per kelompok)
  const groupByName = useMemo(() => {
    const m: Record<string, number> = {};
    for (const g of detail?.juz_map_groups ?? [])
      for (const s of g.slots)
        if (s.owner_name && m[s.owner_name] === undefined) m[s.owner_name] = g.group_no;
    return m;
  }, [detail]);
  const kelompokList = useMemo(
    () =>
      (detail?.groups ?? []).map((g) => ({
        no: g.group_no,
        pembina: g.pembina ?? g.pending_pembina ?? null,
      })),
    [detail]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-64 rounded-2xl lg:col-span-8" />
          <div className="grid grid-cols-2 gap-4 lg:col-span-4">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-10">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <p className="text-sm text-destructive">{error ?? "Data campaign tidak tersedia"}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={muatUlang}>
            <RefreshCw className="size-4" /> Coba Lagi
          </Button>
        </div>
      </div>
    );
  }

  const petaGroups: PetaGroup[] = (() => {
    const gmg = detail.juz_map_groups ?? [];
    if (gmg.length > 0) {
      return gmg.map((gm) => {
        const grp = detail.groups?.find((g) => g.group_no === gm.group_no);
        return {
          group_no: gm.group_no,
          pembina: grp?.pembina ?? null,
          pending_pembina: grp?.pending_pembina ?? null,
          slots: gm.slots,
        };
      });
    }
    return [
      {
        group_no: 1,
        pembina: detail.groups?.[0]?.pembina ?? null,
        pending_pembina: detail.groups?.[0]?.pending_pembina ?? null,
        slots: detail.juz_map ?? [],
      },
    ];
  })();
  const doneByNo: Record<number, number> = Object.fromEntries(
    petaGroups.map((pg) => [pg.group_no, pg.slots.filter((s) => s.status === "COMPLETED").length])
  );
  const canWrite = !isTerminal(detail.status);
  const belumTersedia = () => toast.info("Belum tersedia — butuh dukungan backend");

  return (
    <div className="mx-auto max-w-7xl space-y-8 pb-6" data-khatmil-print>
      {printMode ? (
        <PrintView
          detail={detail}
          petaGroups={petaGroups}
          doneByNo={doneByNo}
          ranked={ranked}
          activity={activity}
        />
      ) : (
        <>
          <SessionHero
            detail={detail}
            canWrite={canWrite}
            onCetak={() => setPrintMode(true)}
            onBagikan={() => {
              navigator.clipboard
                ?.writeText(location.href)
                .then(() => toast.success("Tautan halaman disalin"))
                .catch(() => toast.error("Gagal menyalin tautan"));
            }}
          />
          <HeroProgressAndKpis
            detail={detail}
            petaGroups={petaGroups}
            doneByNo={doneByNo}
            participants={participants}
          />
          <JuzMatrixSection
            detail={detail}
            petaGroups={petaGroups}
            doneByNo={doneByNo}
            canWrite={canWrite}
            sel={sel}
            onJuz={(s) => setSel(sel && sel.g === s.g && sel.j === s.j ? null : s)}
            onCloseSlot={() => setSel(null)}
            onBelumTersedia={belumTersedia}
            onAssign={(g) => {
              setAssignGroup(g);
              setUstQuery("");
            }}
          />
          <PesertaSection
            ranked={ranked}
            participantsCount={participants.length}
            kelompokList={kelompokList}
            groupByName={groupByName}
          />
          <ActivitySpecSection
            activity={activity}
            detail={detail}
            canWrite={canWrite}
            onBelumTersedia={belumTersedia}
          />

          {/* ---- Dialog: tetapkan pembina kelompok ---- */}
          <Dialog open={assignGroup != null} onOpenChange={(o) => !o && setAssignGroup(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tetapkan Pembina — Kelompok {assignGroup}</DialogTitle>
                <DialogDescription>
                  Pilih ustadz; penugasan berlaku setelah di-ACC ustadz di aplikasinya.
                </DialogDescription>
              </DialogHeader>
              <Input
                placeholder="Cari nama ustadz…"
                value={ustQuery}
                onChange={(e) => setUstQuery(e.target.value)}
              />
              <div className="max-h-72 space-y-1 overflow-y-auto">
                {ustLoading && (
                  <div className="py-4 text-center text-sm text-muted-foreground">Memuat…</div>
                )}
                {!ustLoading && ustList.length === 0 && (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Tidak ada ustadz ditemukan
                  </div>
                )}
                {ustList.map((u) => (
                  <button
                    key={u.id}
                    disabled={assignBusy}
                    onClick={() => assignPembina(assignGroup!, u.id, u.full_name)}
                    className="flex w-full items-center gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-muted disabled:opacity-50"
                  >
                    <Avatar name={u.full_name} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{u.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {u.city || "tanpa kota"}
                        {u.verified ? " · Terverifikasi" : ""}
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-semibold text-primary">
                      {assignBusy ? "Menugaskan…" : "Tugaskan →"}
                    </span>
                  </button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
