"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtDate, fmtDateInput } from "@/lib/format";
import {
  ActivityEvent,
  Avatar,
  CampaignDetail,
  Participant,
  StatusBadge,
  JuzSlot,
  timeAgo,
} from "../shared";

/* ============ Tipe ============ */

export interface PetaGroup {
  group_no: number;
  pembina: string | null;
  pending_pembina: string | null;
  slots: JuzSlot[];
}

export interface JuzSel {
  g: number;
  j: number;
}

const GROUP_PAGE_SIZE = 5;

const pct30 = (done: number) => Number(((done / 30) * 100).toFixed(1));

/* ============ Angka count-up (hormat reduced-motion) ============ */

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [tampil, setTampil] = useState(0);
  const dari = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = requestAnimationFrame(() => {
        dari.current = value;
        setTampil(value);
      });
      return () => cancelAnimationFrame(id);
    }
    const awal = dari.current;
    const t0 = performance.now();
    const durasi = 900;
    let raf = 0;
    const tik = (t: number) => {
      const p = Math.min((t - t0) / durasi, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setTampil(Math.round(awal + (value - awal) * e));
      if (p < 1) raf = requestAnimationFrame(tik);
      else {
        dari.current = value;
        setTampil(value);
      }
    };
    raf = requestAnimationFrame(tik);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <span className="tabular-nums">
      {tampil}
      {suffix}
    </span>
  );
}

/* ============ 1. Hero session card ============ */

export function SessionHero({
  detail,
  canWrite,
  onCetak,
  onBagikan,
}: {
  detail: CampaignDetail;
  canWrite: boolean;
  onCetak: () => void;
  onBagikan: () => void;
}) {
  const gc = detail.group_count ?? 1;
  return (
    <section className="rounded-xl border bg-card p-5 shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300 sm:p-6">
      <nav aria-label="Breadcrumb" className="mb-3">
        <Link
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary"
          href="/khatmil"
        >
          ← Kembali ke Daftar Khatmil
        </Link>
      </nav>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{detail.name}</h1>
            <StatusBadge status={detail.status} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">
              {detail.period_start
                ? `${fmtDateInput(detail.period_start)} – ${detail.period_end ? fmtDateInput(detail.period_end) : "berjalan"}`
                : "Periode tidak ditentukan"}
            </span>
            <span className="text-border">•</span>
            <span className="rounded-md border bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {gc} Kelompok • Target {gc}× Khatam
            </span>
            <span className="text-border">•</span>
            <span className="font-medium">{detail.participants} Santri Total</span>
            <span className="text-border">•</span>
            <code className="rounded border bg-muted px-2 py-0.5 font-mono text-[11px]">{detail.slug}</code>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant="outline" onClick={onBagikan}>
            Bagikan
          </Button>
          <Button size="sm" variant="outline" onClick={onCetak}>
            Cetak Laporan
          </Button>
          {canWrite && (
            <Button size="sm" onClick={() => (location.href = `/khatmil/${detail.id}/edit`)}>
              Ubah Sesi
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ============ 2. Hero progres + 4 KPI pendamping ============ */

export function HeroProgressAndKpis({
  detail,
  petaGroups,
  doneByNo,
  participants,
}: {
  detail: CampaignDetail;
  petaGroups: PetaGroup[];
  doneByNo: Record<number, number>;
  participants: Participant[];
}) {
  const multi = petaGroups.length > 1;
  const contributors = participants.filter((p) => p.juz_done_count > 0).length;

  const slots30: ("selesai" | "aktif" | "kosong")[] = useMemo(() => {
    const sumber: JuzSlot[][] = multi ? petaGroups.map((g) => g.slots) : [detail.juz_map];
    return Array.from({ length: 30 }, (_, i) => {
      const per = sumber.map((slots) => slots[i]?.status ?? null);
      if (per.every((s) => s === "COMPLETED")) return "selesai";
      if (per.some((s) => s)) return "aktif";
      return "kosong";
    });
  }, [multi, petaGroups, detail.juz_map]);

  const juzDipegang = petaGroups.reduce((acc, g) => acc + g.slots.filter((s) => s.status).length, 0);
  const selesai = slots30.filter((s) => s === "selesai").length;
  const dibaca = slots30.filter((s) => s === "aktif").length;
  const tersedia = 30 - selesai - dibaca;

  const memberList = (detail.groups ?? []).map((g) => `Kel. ${g.group_no} (${g.member_count})`).join(", ");
  const pembinaCount = (detail.groups ?? []).filter((g) => g.pembina).length;
  const pembinaNames = (detail.groups ?? [])
    .map((g) => g.pembina)
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  const rasio = pembinaCount > 0 ? `1:${Math.max(1, Math.round(detail.participants / pembinaCount))}` : "—";
  const terbaik = [...petaGroups].sort((a, b) => (doneByNo[b.group_no] ?? 0) - (doneByNo[a.group_no] ?? 0))[0];
  const terbaikDone = terbaik ? doneByNo[terbaik.group_no] ?? 0 : 0;
  const terbaikPembina = terbaik?.pembina ?? terbaik?.pending_pembina ?? "—";

  return (
    <section className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Hero progres */}
      <div className="flex flex-col justify-between rounded-xl border bg-card p-5 shadow-sm sm:p-6 lg:col-span-8">
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Progres Keseluruhan
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl">
                  <CountUp value={detail.progress_pct} suffix="%" />
                </span>
                <span className="text-xs font-medium text-muted-foreground">progres bacaan</span>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40">
                {juzDipegang} Juz Dipegang Santri
              </span>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Target selesai: {detail.period_end ? fmtDateInput(detail.period_end) : "—"}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
              <span className="font-medium">
                {multi
                  ? "Progres gabungan (30 juz per kelompok)"
                  : `Peta Selesai (${detail.juz_completed} dari 30 Juz)`}
              </span>
              <span className="font-mono text-[11px]">{tersedia} Juz Tersedia</span>
            </div>
            <div
              className="grid gap-1.5"
              style={{ display: "grid", gridTemplateColumns: "repeat(30, minmax(0, 1fr))" }}
            >
              {slots30.map((s, i) => (
                <span
                  key={i}
                  title={`Juz ${i + 1}: ${s === "selesai" ? "Selesai" : s === "aktif" ? "Dipegang" : "Kosong"}`}
                  className={`h-2 rounded-full transition-colors ${
                    s === "selesai"
                      ? "bg-emerald-500"
                      : s === "aktif"
                        ? "bg-amber-400"
                        : "bg-muted-foreground/20"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-4 text-xs">
          <div className="flex items-center gap-4">
            <span className="inline-flex items-center font-medium">
              <span className="mr-1.5 size-2.5 rounded-full bg-emerald-500" />
              <b>{selesai}</b>&nbsp;Selesai
            </span>
            <span className="inline-flex items-center text-muted-foreground">
              <span className="mr-1.5 size-2.5 rounded-full bg-amber-400" />
              <b>{dibaca}</b>&nbsp;Sedang Dibaca
            </span>
            <span className="inline-flex items-center text-muted-foreground">
              <span className="mr-1.5 size-2.5 rounded-full bg-muted-foreground/30" />
              <b>{tersedia}</b>&nbsp;Tersedia
            </span>
          </div>
          <span className="font-medium">
            <b className="text-foreground">{contributors}</b>{" "}
            <span className="text-muted-foreground">peserta menyelesaikan juz</span>
          </span>
        </div>
      </div>

      {/* 4 KPI pendamping */}
      <div className="grid grid-cols-2 gap-3.5 lg:col-span-4">
        <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-transform motion-safe:hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground">Kelompok</span>
          <div className="mt-2">
            <span className="text-2xl font-bold">{detail.group_count ?? petaGroups.length}</span>
            <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Santri
            </span>
          </div>
          <p className="mt-1 truncate text-[10px] text-muted-foreground" title={memberList}>
            {memberList || "—"}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-transform motion-safe:hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground">Pembina Sesi</span>
          <div className="mt-2">
            <span className="text-2xl font-bold">{pembinaCount}</span>
            <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              Asatidz
            </span>
          </div>
          <p className="mt-1 truncate text-[10px] text-muted-foreground" title={pembinaNames}>
            Rasio {rasio} • {pembinaNames || "—"}
          </p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-transform motion-safe:hover:-translate-y-0.5">
          <span className="text-[11px] font-semibold text-muted-foreground">Verifikasi Bacaan</span>
          <div className="mt-2 flex items-center gap-1.5 text-lg font-bold text-emerald-600 dark:text-emerald-400">
            {detail.require_manual_verification ? "Manual" : "Otomatis"}
            <Check className="size-4" />
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">Tiap kelompok terisolasi</p>
        </div>

        <div className="flex flex-col justify-between rounded-xl border bg-card p-4 shadow-sm transition-transform motion-safe:hover:-translate-y-0.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground">Capaian Tertinggi</span>
            {terbaik && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40">
                Kel. {terbaik.group_no}
              </span>
            )}
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{pct30(terbaikDone)}%</span>
            <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{terbaikDone}/30 Juz</span>
          </div>
          <p className="mt-1 truncate text-[10px] text-muted-foreground">{terbaikPembina}</p>
        </div>
      </div>
    </section>
  );
}

/* ============ 3. Peta & Distribusi Juz per Kelompok ============ */

function JuzKartu({
  slot,
  groupNo,
  sel,
  onJuz,
  delay,
}: {
  slot: JuzSlot;
  groupNo: number;
  sel: JuzSel | null;
  onJuz: (s: JuzSel) => void;
  delay: number;
}) {
  const dipilih = sel && sel.g === groupNo && sel.j === slot.juz;
  const selesai = slot.status === "COMPLETED";

  if (!slot.status) {
    return (
      <button
        onClick={() => onJuz({ g: groupNo, j: slot.juz })}
        title="Juz kosong — klik untuk melihat detail"
        className="rounded-lg border border-dashed bg-muted/40 p-2.5 text-center transition hover:border-primary/40 hover:bg-muted/70 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
        style={{ animationDelay: `${delay}ms` }}
      >
        <span className="block text-xs font-bold text-muted-foreground">Juz {slot.juz}</span>
        <span
          className="mt-1.5 inline-block text-[10px] font-semibold text-primary"
          title="Klaim juz dilakukan lewat aplikasi santri"
        >
          + Ambil
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onJuz({ g: groupNo, j: slot.juz })}
      title={`Juz ${slot.juz}: ${slot.owner_name ?? "?"}${selesai ? " — selesai" : slot.progress_pct != null ? ` — ${slot.progress_pct}%` : ""}`}
      className={`rounded-lg border p-2.5 text-center transition hover:shadow-md motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 ${
        dipilih ? "ring-2 ring-primary" : ""
      } ${
        selesai
          ? "border-emerald-200 bg-emerald-50/60 dark:border-emerald-800 dark:bg-emerald-950/30"
          : "border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/30"
      }`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <span className="block text-xs font-bold">Juz {slot.juz}</span>
      <span
        className={`my-1.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${
          selesai
            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900"
            : "bg-amber-100 text-amber-800 dark:bg-amber-900"
        }`}
      >
        {selesai ? "Selesai" : slot.progress_pct != null ? `${slot.progress_pct}%` : "Aktif"}
      </span>
      <span className="block truncate text-[11px] font-medium text-muted-foreground" title={slot.owner_name ?? ""}>
        {slot.owner_name ?? "—"}
      </span>
    </button>
  );
}

function KartuRingkasKelompok({
  pg,
  done,
  aktif,
  onPilih,
  delay = 0,
}: {
  pg: PetaGroup;
  done: number;
  aktif: boolean;
  onPilih: () => void;
  delay?: number;
}) {
  const filled = pg.slots.filter((s) => s.status).length;
  return (
    <button
      onClick={onPilih}
      aria-pressed={aktif}
      style={{ animationDelay: `${delay}ms` }}
      className={`rounded-xl border-2 p-4 text-left transition motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 ${
        aktif ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/30 hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold">Kelompok {pg.group_no}</span>
        <span className="text-xs font-extrabold text-primary">{pct30(done)}%</span>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Pembina: <b className="text-foreground">{pg.pembina ?? pg.pending_pembina ?? "—"}</b>
      </p>
      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-1.5 rounded-full ${done >= 30 ? "bg-emerald-500" : done > 0 ? "bg-amber-400" : "bg-muted-foreground/30"}`}
          style={{ width: `${(done / 30) * 100}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{filled} / 30 Juz Diambil</span>
        {done >= 30 && <span className="font-medium text-emerald-600 dark:text-emerald-400">Lengkap</span>}
      </div>
    </button>
  );
}

function BarBandingKelompok({ pg, done }: { pg: PetaGroup; done: number }) {
  const filled = pg.slots.filter((s) => s.status).length;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-sm font-semibold">Kelompok {pg.group_no}</span>
      <div className="h-3 flex-1 rounded-full bg-muted">
        <div
          className={`h-3 rounded-full ${done >= 30 ? "bg-emerald-500" : done > 0 ? "bg-amber-400" : "bg-muted-foreground/30"}`}
          style={{ width: `${(done / 30) * 100}%` }}
        />
      </div>
      <span className="w-44 shrink-0 text-right text-xs text-muted-foreground">
        {done}/30 juz selesai · {filled}/30 terisi
      </span>
    </div>
  );
}

export function JuzMatrixSection({
  detail,
  petaGroups,
  doneByNo,
  canWrite,
  sel,
  onJuz,
  onCloseSlot,
  onBelumTersedia,
  onAssign,
}: {
  detail: CampaignDetail;
  petaGroups: PetaGroup[];
  doneByNo: Record<number, number>;
  canWrite: boolean;
  sel: JuzSel | null;
  onJuz: (s: JuzSel) => void;
  onCloseSlot: () => void;
  onBelumTersedia: () => void;
  onAssign: (groupNo: number) => void;
}) {
  const multi = petaGroups.length > 1;
  const [mode, setMode] = useState<"detail" | "bandingkan">("detail");
  const [aktifNo, setAktifNo] = useState<number | null>(null);
  const [juzFilter, setJuzFilter] = useState<"semua" | "diambil" | "tersedia">("semua");
  const [hlmKel, setHlmKel] = useState(0);

  const kelPageCount = Math.max(1, Math.ceil(petaGroups.length / GROUP_PAGE_SIZE));
  const kelSafe = Math.min(hlmKel, kelPageCount - 1);
  const kelTampil = petaGroups.slice(kelSafe * GROUP_PAGE_SIZE, kelSafe * GROUP_PAGE_SIZE + GROUP_PAGE_SIZE);

  function gantiHlmKel(p: number) {
    setHlmKel(p);
    const first = petaGroups[p * GROUP_PAGE_SIZE];
    if (first) setAktifNo(first.group_no);
  }

  const aktifNoEfektif = aktifNo ?? petaGroups[0]?.group_no ?? null;
  const aktif = petaGroups.find((g) => g.group_no === aktifNoEfektif) ?? null;
  const aktifFilled = aktif ? aktif.slots.filter((s) => s.status).length : 0;
  const aktifMember = detail.groups?.find((g) => g.group_no === aktif?.group_no)?.member_count;
  const aktifPembina = aktif?.pembina ?? aktif?.pending_pembina ?? "—";

  const slotsTampil = (aktif?.slots ?? []).filter((s) => {
    if (juzFilter === "diambil") return !!s.status;
    if (juzFilter === "tersedia") return !s.status;
    return true;
  });

  return (
    <section className="space-y-5 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
      {/* Header & switcher */}
      <div className="flex flex-col justify-between gap-3 border-b pb-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold tracking-tight sm:text-lg">Peta &amp; Distribusi Juz per Kelompok</h2>
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
              {petaGroups.length} Kelompok Terdaftar
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Pilih kelompok untuk mengelola 30 juz masing-masing, atau bandingkan progres antar kelompok.
          </p>
        </div>
        {multi && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex rounded-lg border bg-muted p-0.5">
              <button
                onClick={() => setMode("detail")}
                aria-pressed={mode === "detail"}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                  mode === "detail" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Mode Detail Kelompok
              </button>
              <button
                onClick={() => setMode("bandingkan")}
                aria-pressed={mode === "bandingkan"}
                className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                  mode === "bandingkan" ? "bg-card text-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Bandingkan {petaGroups.length} Kelompok
              </button>
            </div>
          </div>
        )}
        <button
          onClick={onBelumTersedia}
          title="Butuh dukungan backend"
          disabled
          className="inline-flex items-center gap-1 rounded-lg border border-dashed border-primary/60 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary transition-colors disabled:opacity-50"
        >
          <span className="text-sm leading-none">+</span> Tambah Kelompok
        </button>
      </div>

      {mode === "bandingkan" && multi ? (
        <div className="space-y-3 py-2">
          {petaGroups.map((pg) => (
            <BarBandingKelompok key={pg.group_no} pg={pg} done={doneByNo[pg.group_no] ?? 0} />
          ))}
        </div>
      ) : (
        <>
          {/* Kartu overview kelompok (5/halaman) */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {kelTampil.map((pg, i) => (
              <KartuRingkasKelompok
                key={pg.group_no}
                pg={pg}
                done={doneByNo[pg.group_no] ?? 0}
                aktif={pg.group_no === aktifNoEfektif}
                onPilih={() => setAktifNo(pg.group_no)}
                delay={i * 60}
              />
            ))}
          </div>
          {kelPageCount > 1 && (
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={kelSafe === 0}
                onClick={() => gantiHlmKel(kelSafe - 1)}
                aria-label="Halaman kelompok sebelumnya"
              >
                <ChevronLeft className="mr-1 size-4" /> Sebelumnya
              </Button>
              <span className="text-xs tabular-nums text-muted-foreground">
                {kelSafe + 1} / {kelPageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={kelSafe >= kelPageCount - 1}
                onClick={() => gantiHlmKel(kelSafe + 1)}
                aria-label="Halaman kelompok berikutnya"
              >
                Berikutnya <ChevronRight className="size-4" />
              </Button>
            </div>
          )}

          {/* Meta bar kelompok aktif + filter juz */}
          {aktif && (
            <div className="flex flex-col justify-between gap-3 rounded-xl border bg-muted/40 p-3 text-xs sm:flex-row sm:items-center">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-medium">
                  Pembina: <b className="text-foreground">{aktifPembina}</b>
                </span>
                <span className="text-border">•</span>
                <span>
                  <b>{aktifMember ?? detail.participants}</b> santri terdaftar
                </span>
                <span className="text-border">•</span>
                <span className="rounded border border-amber-200/60 bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                  {30 - aktifFilled} Slot Tersedia
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="inline-flex items-center gap-1 rounded-lg border bg-card p-0.5">
                  {(
                    [
                      ["semua", `Semua (${aktif.slots.length})`],
                      ["diambil", `Diambil (${aktifFilled})`],
                      ["tersedia", `Tersedia (${30 - aktifFilled})`],
                    ] as const
                  ).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setJuzFilter(v)}
                      aria-pressed={juzFilter === v}
                      className={`rounded px-2.5 py-1 font-semibold transition ${
                        juzFilter === v ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {canWrite && (
                  <Button size="sm" variant="outline" onClick={() => onAssign(aktif.group_no)}>
                    {aktif.pembina || aktif.pending_pembina ? "Ganti Pembina" : "Tetapkan Pembina"}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Kartu 30 juz */}
          {aktif && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-10">
              {slotsTampil.map((s, i) => (
                <JuzKartu
                  key={s.juz}
                  slot={s}
                  groupNo={aktif.group_no}
                  sel={sel}
                  onJuz={onJuz}
                  delay={i * 30}
                />
              ))}
            </div>
          )}

          {/* Panel detail juz terpilih (fitur ACC) */}
          {aktif && sel && sel.g === aktif.group_no && (() => {
            const slot = aktif.slots.find((s) => s.juz === sel.j);
            if (!slot) return null;
            return (
              <div className="rounded-xl border bg-muted/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <b>
                    Kelompok {aktif.group_no} · Juz {slot.juz}
                  </b>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={`Tutup detail juz ${slot.juz}`}
                    onClick={onCloseSlot}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
                {!slot.status ? (
                  <div className="mt-1 text-muted-foreground">kosong — belum diklaim</div>
                ) : (
                  <div className="mt-1.5 space-y-1 text-muted-foreground">
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
                        Selesai &amp; terverifikasi:{" "}
                        <b className="text-foreground">{fmtDate(slot.completed_at)}</b>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Alur penugasan */}
          <p className="rounded-lg border bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
            <b>Alur penugasan:</b> tetapkan pembina di sini → ustadz menerima notifikasi → ACC di aplikasi ustadz.
            Klaim juz dilakukan santri lewat aplikasi.
          </p>
        </>
      )}
    </section>
  );
}

/* ============ 4. Peserta & Peringkat (per kelompok) ============ */

const PARTICIPANT_PAGE_SIZE = 10;

export function PesertaSection({
  ranked,
  participantsCount,
  kelompokList,
  groupByName,
}: {
  ranked: Participant[];
  participantsCount: number;
  kelompokList: { no: number; pembina: string | null }[];
  groupByName: Record<string, number>;
}) {
  const [q, setQ] = useState("");
  const [kel, setKel] = useState("semua");
  const [page, setPage] = useState(0);

  const perKelompok = useMemo(() => {
    const daftar =
      kel === "semua"
        ? ranked
        : ranked.filter((p) => String(groupByName[p.full_name] ?? "") === kel);
    return daftar.map((p, i) => ({ p, rank: i + 1 })); // peringkat DI DALAM kelompok terpilih
  }, [ranked, groupByName, kel]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return perKelompok.filter(({ p }) => p.full_name.toLowerCase().includes(query));
  }, [perKelompok, q]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PARTICIPANT_PAGE_SIZE));
  const pageSafe = Math.min(page, pageCount - 1);
  const rows = filtered.slice(pageSafe * PARTICIPANT_PAGE_SIZE, pageSafe * PARTICIPANT_PAGE_SIZE + PARTICIPANT_PAGE_SIZE);

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-4 border-b p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-base font-bold tracking-tight sm:text-lg">Peserta &amp; Peringkat Bacaan</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Peringkat dihitung per kelompok, dari juz selesai terbanyak lalu nama.
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <select
            value={kel}
            onChange={(e) => {
              setKel(e.target.value);
              setPage(0);
            }}
            aria-label="Filter per kelompok"
            className="cursor-pointer rounded-lg border bg-card px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none"
          >
            <option value="semua">Semua Kelompok ({participantsCount} santri)</option>
            {kelompokList.map((k) => (
              <option key={k.no} value={String(k.no)}>
                Kelompok {k.no}
                {k.pembina ? ` — ${k.pembina}` : ""}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              placeholder="Cari santri..."
              className="h-9 w-full pl-8 sm:w-48"
              aria-label="Cari santri"
            />
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12 text-center">#</TableHead>
              <TableHead>Nama Peserta</TableHead>
              <TableHead>Kelompok</TableHead>
              <TableHead className="text-center">Juz Selesai</TableHead>
              <TableHead className="text-center">Juz Dipegang</TableHead>
              <TableHead>Progres Bacaan</TableHead>
              <TableHead className="text-right">Kontribusi</TableHead>
              <TableHead className="w-12 text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-6 text-center text-muted-foreground">
                  {participantsCount === 0 ? "Belum ada peserta" : "Tidak ada santri yang cocok."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map(({ p, rank }) => {
                const gno = groupByName[p.full_name];
                return (
                  <TableRow key={p.user_id}>
                    <TableCell className="text-center font-medium text-muted-foreground">{rank}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-emerald-700 text-[11px] font-semibold text-white">
                          {p.full_name.slice(0, 2).toUpperCase()}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900">{p.full_name}</div>
                          <div className="text-[10px] text-slate-400">
                            sejak {fmtDate(p.joined_at)} • lapor {timeAgo(p.last_reported_at)}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40">
                        Kel. {gno ?? "?"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40">
                        {p.juz_done_count} Juz
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {p.juz_active.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="inline-flex flex-wrap justify-center gap-1">
                          {p.juz_active.map((j) => (
                            <span
                              key={j.juz}
                              title={j.progress_pct != null ? `${j.progress_pct}%` : undefined}
                              className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                            >
                              Juz {j.juz}
                            </span>
                          ))}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="w-28 rounded-full bg-slate-100">
                        <div
                          className="rounded-full bg-emerald-500"
                          style={{ width: `${p.juz_active[0]?.progress_pct ?? 0}%`, height: "6px" }}
                        />
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium text-slate-700">
                      {p.contribution_pct != null ? `${p.contribution_pct}%` : "0%"}
                    </TableCell>
                    <TableCell className="text-center text-slate-400 hover:text-slate-600 cursor-pointer">⋮</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="border-t bg-muted/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>
          Menampilkan <b>{rows.length === 0 ? 0 : pageSafe * PARTICIPANT_PAGE_SIZE + 1}–{Math.min((pageSafe + 1) * PARTICIPANT_PAGE_SIZE, filtered.length)}</b> dari{" "}
          <b>{filtered.length}</b> peserta
          {kel !== "semua" && ` (Kelompok ${kel})`}
        </span>
        <div className="inline-flex items-center gap-1.5">
          <Button variant="outline" size="sm" disabled={pageSafe === 0} onClick={() => setPage(pageSafe - 1)}>
            Sebelumnya
          </Button>
          <span className="px-2 font-semibold text-foreground">
            {pageSafe + 1} / {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={pageSafe >= pageCount - 1} onClick={() => setPage(pageSafe + 1)}>
            Berikutnya
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ============ 5. Aktivitas + Detail Sesi (dual split) ============ */

const ACTIVITY_VISIBLE = 5;

export function ActivitySpecSection({
  activity,
  detail,
  canWrite,
  onBelumTersedia,
}: {
  activity: ActivityEvent[];
  detail: CampaignDetail;
  canWrite: boolean;
  onBelumTersedia: () => void;
}) {
  const terbaru = activity.slice(0, ACTIVITY_VISIBLE);
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Kiri: aktivitas */}
      <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-7">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-sm font-bold sm:text-base">Aktivitas Laporan Terbaru</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              5 laporan tilawah terakhir yang tercatat di sistem (API menyimpan maksimal 50).
            </p>
          </div>
          <button
            onClick={onBelumTersedia}
            title="Halaman riwayat butuh pagination backend"
            className="shrink-0 text-xs font-semibold text-primary transition-colors hover:underline disabled:opacity-50"
            disabled
          >
            Lihat Semua Log
          </button>
        </div>
        {terbaru.length === 0 ? (
          <p className="mt-5 text-sm text-muted-foreground">Belum ada laporan progres.</p>
        ) : (
          <div className="divide-y mt-3 text-xs">
            {terbaru.map((e, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-[11px] font-semibold text-white">
                    {(e.full_name ?? "?").slice(0, 2).toUpperCase()}
                  </span>
                  <div>
                    <div className="font-semibold text-slate-900">{e.full_name}</div>
                    <div className="text-slate-600 mt-0.5">
                      Mencatat bacaan pada{" "}
                      <span className="font-semibold">
                        {e.current_surah != null ? `Juz ${e.juz}: QS ${e.current_surah}:${e.current_ayah}` : `Juz ${e.juz}`}
                      </span>
                      {e.completed && (
                        <span className="ml-1.5 inline-flex items-center gap-0.5 font-medium text-emerald-600">
                          <Check className="size-3" aria-hidden="true" /> selesai
                        </span>
                      )}
                    </div>
                    {e.note && <p className="mt-0.5 text-[11px] italic text-slate-400">“{e.note}”</p>}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(e.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Kanan: detail sesi */}
      <div className="rounded-xl border bg-card p-5 shadow-sm lg:col-span-5">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h3 className="text-sm font-bold sm:text-base">Detail Informasi Sesi</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">Konfigurasi operasional &amp; kebijakan khatmil.</p>
          </div>
        </div>
        <dl className="mt-3 divide-y text-xs">
          {detail.description && (
            <div className="flex items-start justify-between gap-3 py-2.5">
              <dt className="font-medium text-muted-foreground">Deskripsi Kegiatan</dt>
              <dd className="max-w-xs text-right font-medium">{detail.description}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-muted-foreground">Periode Sesi</dt>
            <dd className="font-semibold">
              {detail.period_start
                ? `${fmtDateInput(detail.period_start)} — ${detail.period_end ? fmtDateInput(detail.period_end) : "berjalan"}`
                : "Tidak ditentukan"}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-muted-foreground">Mode Tilawah</dt>
            <dd className="font-medium">{detail.mode === "SEQUENTIAL" ? "Paralel — Bebas ambil juz" : "Bergiliran — sesuai urutan"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-muted-foreground">Kuota Peserta</dt>
            <dd className="font-bold">{detail.max_participants ?? "Tanpa Batas"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-muted-foreground">Sistem Verifikasi</dt>
            <dd className="font-medium">{detail.require_manual_verification ? "Manual — ACC pengurus" : "Otomatis — Posisi terakhir juz"}</dd>
          </div>
          <div className="flex items-center justify-between gap-3 py-2.5">
            <dt className="font-medium text-muted-foreground">Unique Slug</dt>
            <dd>
              <code className="rounded border bg-muted px-2 py-1 font-mono text-[11px]">{detail.slug}</code>
            </dd>
          </div>
        </dl>
        <div className="mt-4 border-t pt-3 text-right">
          <Link
            href={`/khatmil/${detail.id}/edit`}
            className={`text-xs font-semibold text-emerald-700 hover:underline ${canWrite ? "" : "pointer-events-none opacity-40"}`}
            title={canWrite ? "Buka form ubah sesi" : "Campaign sudah selesai — pengaturan terkunci"}
          >
            Ubah Pengaturan Sesi →
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ============ PrintView — data penuh utk cetak/PDF ============ */

export function PrintView({
  detail,
  petaGroups,
  doneByNo,
  ranked,
  activity,
}: {
  detail: CampaignDetail;
  petaGroups: PetaGroup[];
  doneByNo: Record<number, number>;
  ranked: Participant[];
  activity: ActivityEvent[];
}) {
  return (
    <div className="space-y-6">
      <div className="break-inside-avoid border-b pb-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight">{detail.name}</h1>
          <StatusBadge status={detail.status} />
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {detail.period_start
            ? `${fmtDateInput(detail.period_start)} – ${detail.period_end ? fmtDateInput(detail.period_end) : "berjalan"}`
            : "Periode tidak ditentukan"}{" "}
          · {detail.participants} peserta · {detail.slug}
        </p>
      </div>
      <p className="rounded-md border bg-muted/40 p-2.5 text-xs text-muted-foreground">
        Cakupan cetak: <b>seluruh {petaGroups.length} kelompok</b> (peta lengkap) ·{" "}
        <b>seluruh {ranked.length} peserta</b> · <b>Aktivitas: {activity.length} laporan terbaru</b> (API
        menyimpan maksimal 50 terakhir — bukan riwayat lengkap).
      </p>

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Kelompok &amp; Peta Juz — semua kelompok
        </h2>
        <div className="space-y-5">
          {petaGroups.map((pg) => {
            const done = doneByNo[pg.group_no] ?? 0;
            const filled = pg.slots.filter((s) => s.status).length;
            return (
              <div key={pg.group_no} className="break-inside-avoid">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                  <b>Kelompok {pg.group_no}</b>
                  <span className="text-muted-foreground">
                    {done} dari 30 juz selesai · {filled}/30 juz terisi ·{" "}
                    {pg.pembina
                      ? `Pembina: ${pg.pembina}`
                      : pg.pending_pembina
                        ? `Menunggu ACC: ${pg.pending_pembina}`
                        : "belum ada pembina"}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-6 lg:grid-cols-10">
                  {pg.slots.map((s) => (
                    <div
                      key={s.juz}
                      className={`rounded-md border p-1.5 text-center text-[10px] font-medium ${
                        s.status === "COMPLETED"
                          ? "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40"
                          : s.status
                            ? "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40"
                            : "border-dashed text-muted-foreground"
                      }`}
                    >
                      Juz {s.juz}
                      {s.status ? ` · ${s.owner_name ?? "?"}` : ""}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Peserta &amp; Peringkat — seluruh {ranked.length} peserta
        </h2>
        <div className="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">#</TableHead>
                <TableHead>Peserta</TableHead>
                <TableHead>Juz Selesai</TableHead>
                <TableHead>Juz Dipegang</TableHead>
                <TableHead>Progres Bacaan</TableHead>
                <TableHead>Kontribusi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranked.map((p, i) => (
                <TableRow key={p.user_id}>
                  <TableCell className="text-xs tabular-nums text-muted-foreground">{i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar name={p.full_name} />
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold">{p.full_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          sejak {fmtDate(p.joined_at)} · lapor {timeAgo(p.last_reported_at)}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {p.juz_done.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      `${p.juz_done_count} juz (${p.juz_done.map((j) => j.juz).join(", ")})`
                    )}
                  </TableCell>
                  <TableCell>
                    {p.juz_active.length === 0
                      ? "—"
                      : p.juz_active.map((j) => `Juz ${j.juz}`).join(", ")}
                  </TableCell>
                  <TableCell>
                    {p.juz_active[0]?.progress_pct != null ? `${p.juz_active[0].progress_pct}%` : "—"}
                  </TableCell>
                  <TableCell>
                    {p.contribution_pct != null ? `${p.contribution_pct}%` : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Aktivitas — {activity.length} laporan terbaru
        </h2>
        {activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada laporan progres.</p>
        ) : (
          <div className="space-y-1 text-sm">
            {activity.map((e, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {e.created_at.slice(0, 10)}
                </span>
                <span className="min-w-0 flex-1">
                  <b>{e.full_name}</b> — Juz {e.juz}:{" "}
                  {e.current_surah != null ? `QS ${e.current_surah}:${e.current_ayah}` : "laporan lama"}
                  {e.completed && <span className="ml-1 font-medium text-emerald-600">selesai</span>}
                  {e.note && <span className="text-muted-foreground"> — “{e.note}”</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="break-inside-avoid">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Detail Khatmil
        </h2>
        <dl className="divide-y rounded-lg border text-sm">
          {detail.description && (
            <div className="flex justify-between gap-3 p-2.5">
              <dt className="text-muted-foreground">Deskripsi</dt>
              <dd className="text-right">{detail.description}</dd>
            </div>
          )}
          <div className="flex justify-between gap-3 p-2.5">
            <dt className="text-muted-foreground">Periode</dt>
            <dd className="text-right">
              {detail.period_start
                ? `${fmtDateInput(detail.period_start)} – ${detail.period_end ? fmtDateInput(detail.period_end) : "berjalan"}`
                : "tidak ditentukan"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 p-2.5">
            <dt className="text-muted-foreground">Mode</dt>
            <dd className="text-right">
              {detail.mode === "SEQUENTIAL" ? "Bergiliran — sesuai urutan" : "Paralel — bebas ambil juz"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 p-2.5">
            <dt className="text-muted-foreground">Verifikasi</dt>
            <dd className="text-right">
              {detail.require_manual_verification ? "Manual — ACC pengurus" : "Otomatis — posisi terakhir juz"}
            </dd>
          </div>
          <div className="flex justify-between gap-3 p-2.5">
            <dt className="text-muted-foreground">Slug</dt>
            <dd className="text-right font-mono text-xs">{detail.slug}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
