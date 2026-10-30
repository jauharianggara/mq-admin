"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Copy, Receipt, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import { apiGetPage, apiPost, ApiError } from "@/lib/api";
import { AnimatedRupiah } from "@/components/animated-rupiah";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/status-pill";
import { useAdminList } from "@/hooks/use-admin-list";
import {
  SearchInput,
  TableShell,
  SortHead,
  Head,
  TableSkeleton,
  EmptyRow,
  Pager,
} from "@/components/data-table";
import { rp, fmtDateTime } from "@/lib/format";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Payout {
  id: number;
  ustadz_id: number;
  ustadz_name: string;
  amount: number; // diterima ustadz (setelah fee)
  fee: number;
  bank_name: string;
  account_no: string;
  account_name: string;
  status: string; // PENDING | APPROVED | TRANSFERRED | REJECTED
  created_at: string;
  rejected_reason?: string | null;
}

/** ID tarik seragam: #WD-{id} */
const idTarik = (id: number) => `#WD-${String(id).padStart(4, "0")}`;

export default function PayoutsPage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [bankFilter, setBankFilter] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Payout | null>(null);
  const [reason, setReason] = useState("");
  const [exporting, setExporting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [kpiNonce, setKpiNonce] = useState(0);
  const [fin, setFin] = useState<{
    perStatus: Record<string, { n: number; diterima: number }>;
    bulanIni: number;
    deltaPct: number | null;
    rata2: number;
    countBulanIni: number;
    hariIniNominal: number;
    hariIniCount: number;
    feeTotal: number;
    feeCount: number;
    bankList: string[];
  } | null>(null);

  const list = useAdminList<Payout>("/admin/payouts", {
    params: { status: filter === "ALL" ? undefined : filter },
    limit: 20,
  });

  // Agregasi KPI dari SELURUH pengajuan (cursor loop, guard 25 halaman) — nominal akurat.
  useEffect(() => {
    let ignore = false;
    (async () => {
      const out: Payout[] = [];
      let cursor: string | null = null;
      for (let hal = 0; hal < 25; hal++) {
        const qs = new URLSearchParams({ limit: "50" });
        if (cursor) qs.set("cursor", cursor);
        const res = await apiGetPage<Payout>("/admin/payouts", Object.fromEntries(qs));
        out.push(...res.items);
        if (!res.hasMore || !res.nextCursor) break;
        cursor = res.nextCursor;
      }
      if (ignore) return;

      const perStatus: Record<string, { n: number; diterima: number }> = {};
      for (const p of out) {
        const s = (perStatus[p.status] ??= { n: 0, diterima: 0 });
        s.n += 1;
        s.diterima += p.amount ?? 0;
      }
      const now = new Date();
      const bulanIni = out.filter(
        (p) => {
          const d = new Date(p.created_at);
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        },
      );
      const blnLalu = out.filter((p) => {
        const d = new Date(p.created_at);
        const lalu = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getMonth() === lalu.getMonth() && d.getFullYear() === lalu.getFullYear();
      });
      const disetujuiBulanIni = bulanIni.filter((p) => ["APPROVED", "TRANSFERRED"].includes(p.status));
      const disetujuiBlnLalu = blnLalu.filter((p) => ["APPROVED", "TRANSFERRED"].includes(p.status));
      const sum = (arr: Payout[]) => arr.reduce((a, p) => a + (p.amount ?? 0), 0);
      const bulanIniNominal = sum(disetujuiBulanIni);
      const blnLaluNominal = sum(disetujuiBlnLalu);
      const kini0 = new Date();
      kini0.setHours(0, 0, 0, 0);
      const besok = new Date(kini0);
      besok.setDate(besok.getDate() + 1);
      const hariIni = out.filter((p) => {
        const d = new Date(p.created_at);
        return d >= kini0 && d < besok && p.status === "TRANSFERRED";
      });
      const bankUnik = [...new Set(out.map((p) => p.bank_name).filter(Boolean))];

      setTotal(out.length);
      setFin({
        perStatus,
        bulanIni: bulanIniNominal,
        deltaPct:
          blnLaluNominal > 0
            ? Number((((bulanIniNominal - blnLaluNominal) / blnLaluNominal) * 100).toFixed(1))
            : null,
        rata2: disetujuiBulanIni.length ? Math.round(bulanIniNominal / disetujuiBulanIni.length) : 0,
        countBulanIni: disetujuiBulanIni.length,
        hariIniNominal: sum(hariIni),
        hariIniCount: hariIni.length,
        feeTotal: out.reduce((a, p) => a + (p.fee ?? 0), 0),
        feeCount: out.filter((p) => (p.fee ?? 0) > 0).length,
        bankList: bankUnik,
      });
    })();
    return () => {
      ignore = true;
    };
  }, [kpiNonce]);

  const items = useMemo(() => {
    const query = q.trim().toLowerCase();
    return list.items.filter(
      (p) =>
        p.ustadz_name?.toLowerCase().includes(query) ||
        p.account_no?.includes(query.trim()) ||
        idTarik(p.id).toLowerCase().includes(query),
    );
  }, [list.items, q]);

  const itemsTampil = useMemo(
    () =>
      bankFilter
        ? items.filter((p) => p.bank_name === bankFilter)
        : items,
    [items, bankFilter],
  );

  const pendingCount = fin?.perStatus.PENDING?.n ?? 0;

  async function approve(p: Payout) {
    if (
      !confirm(
        `ACC penarikan ${rp(p.amount)} oleh ${p.ustadz_name} ke ${p.bank_name} ${p.account_no} a.n. ${p.account_name}?`
      )
    )
      return;
    setBusy(p.id);
    try {
      await apiPost(`/admin/payouts/${p.id}/approve`);
      toast.success("Disetujui — masuk daftar transfer");
      muatUlang();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menyetujui");
    } finally {
      setBusy(null);
    }
  }

  async function reject() {
    if (!rejectTarget) return;
    if (reason.trim().length < 3) {
      toast.error("Alasan tolak wajib diisi");
      return;
    }
    setBusy(rejectTarget.id);
    try {
      await apiPost(`/admin/payouts/${rejectTarget.id}/reject`, { reason: reason.trim() });
      toast.success("Ditolak — dana kembali ke saldo ustadz");
      setRejectTarget(null);
      setReason("");
      muatUlang();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menolak");
    } finally {
      setBusy(null);
    }
  }

  async function markTransferred(p: Payout) {
    if (!confirm(`Tandai sudah ditransfer ke ${p.bank_name} ${p.account_no}?`)) return;
    setBusy(p.id);
    try {
      await apiPost(`/admin/payouts/mark-transferred`, { payout_ids: [p.id] });
      toast.success("Ditandai sudah ditransfer");
      muatUlang();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal menandai");
    } finally {
      setBusy(null);
    }
  }

  async function downloadCsv() {
    setExporting(true);
    try {
      const { items } = await apiGetPage<Payout>("/admin/payouts", { status: "APPROVED" });
      if (items.length === 0) {
        toast.info("Tidak ada permintaan berstatus Disetujui siap transfer");
        return;
      }
      const head = ["payout_id", "ustadz", "bank", "no_rekening", "atas_nama", "diterima"];
      const lines = items.map((p) =>
        [p.id, p.ustadz_name, p.bank_name, p.account_no, p.account_name, p.amount]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(",")
      );
      const csv = "\uFEFF" + [head.join(","), ...lines].join("\r\n");
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `daftar-transfer-mq-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${items.length} baris diunduh — transfer via internet banking/manual, lalu unggah kembali`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal membuat CSV");
    } finally {
      setExporting(false);
    }
  }

  async function uploadCsv(file: File) {
    setUploading(true);
    try {
      const text = await file.text();
      const ids: number[] = [];
      for (const line of text.split(/\r?\n/)) {
        const cells = line.split(/[,;]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        const id = Number.parseInt(cells[0] ?? "", 10);
        if (Number.isInteger(id) && id > 0) ids.push(id);
      }
      const unique = [...new Set(ids)];
      if (unique.length === 0) {
        toast.error("CSV tidak memuat payout_id yang dikenal (kolom pertama)");
        return;
      }
      const res = await apiPost<{ transferred: number; skipped: number }>("/admin/payouts/mark-transferred", {
        payout_ids: unique,
      });
      toast.success(
        `${res.transferred} ditandai transfer${res.skipped > 0 ? `, ${res.skipped} dilewati (bukan Disetujui)` : ""}`
      );
      muatUlang();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memproses CSV");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // reload dari handler aksi admin
  function muatUlang() {
    list.reload();
    setKpiNonce((n) => n + 1);
  }

  const pills = [
    { v: "ALL", label: "Semua", n: total },
    { v: "PENDING", label: "Menunggu ACC", n: fin?.perStatus.PENDING?.n },
    { v: "APPROVED", label: "Disetujui", n: fin?.perStatus.APPROVED?.n },
    { v: "TRANSFERRED", label: "Sudah Ditransfer", n: fin?.perStatus.TRANSFERRED?.n },
    { v: "REJECTED", label: "Ditolak", n: fin?.perStatus.REJECTED?.n },
  ];

  return (
    <div className="space-y-5">
      {/* Header + aksi */}
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">Penarikan Dana Ustadz</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40">
              <span className="size-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
              <b>{total ?? "—"}</b> pengajuan tercatat
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Ustadz mengajukan pencairan saldo dompet secara mandiri dari aplikasi — saldo terkunci otomatis
            sejak pengajuan.{" "}
            {pendingCount > 0 && (
              <>
                Saat ini{" "}
                <b className="text-amber-700 dark:text-amber-400">{pendingCount} pengajuan menunggu ACC</b>{" "}
                verifikasi admin.
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5">
          <Button variant="outline" size="sm" disabled={exporting} onClick={downloadCsv}>
            Daftar Transfer
          </Button>
          <Button size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? "Memproses…" : "Unggah Bukti Transfer"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) uploadCsv(f);
            }}
          />
        </div>
      </section>

      {/* KPI — agregat seluruh pengajuan */}
      <section className="grid grid-cols-1 gap-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 md:grid-cols-2 lg:grid-cols-4">
        <div className="relative flex flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-700 to-teal-700 p-5 text-white shadow-sm transition-transform motion-safe:hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-emerald-100">
              <span>Total Penarikan (bulan ini)</span>
              {fin?.deltaPct != null && (
                <span className="rounded-full border border-white/10 bg-white/15 px-2 py-0.5 text-[11px] font-bold">
                  {fin.deltaPct >= 0 ? "+" : ""}
                  {fin.deltaPct}% vs bln lalu
                </span>
              )}
            </div>
            <h3 className="mt-3 text-2xl font-extrabold tracking-tight lg:text-3xl">
              <AnimatedRupiah value={fin?.bulanIni ?? 0} />
            </h3>
            <p className="mt-1 text-xs text-emerald-200">
              Akumulasi dari {fin?.countBulanIni ?? 0} penarikan disetujui
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] text-emerald-200">
            <span>Rata-rata: ~{fin ? rp(fin.rata2) : "—"}/tarik</span>
            <span className="flex items-center gap-1 font-medium text-white">
              <ShieldCheck className="size-3.5 text-emerald-300" /> Terlindungi
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-transform motion-safe:hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-500 motion-safe:animate-pulse" />
                Dicairkan Hari Ini
              </span>
              <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40">
                {fin?.hariIniCount ?? 0} Penarikan
              </span>
            </div>
            <h3 className="mt-3 text-2xl font-bold tracking-tight">
              <AnimatedRupiah value={fin?.hariIniNominal ?? 0} />
            </h3>
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-medium text-muted-foreground">
            <span>Dana keluar harian</span>
            <span className="font-bold">{fin?.hariIniCount ?? 0} Penerima</span>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border border-amber-200/80 bg-gradient-to-b from-amber-50/30 to-transparent p-5 shadow-sm transition-transform motion-safe:hover:-translate-y-1 dark:border-amber-800 dark:bg-amber-950/10">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium">
              <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400">Menunggu ACC Bank</span>
              <span className="motion-safe:animate-pulse rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800 dark:bg-amber-900">
                Perlu Verifikasi
              </span>
            </div>
            <h3 className="mt-3 text-2xl font-bold tracking-tight">
              <AnimatedRupiah value={fin?.perStatus.PENDING?.diterima ?? 0} />
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {fin?.perStatus.PENDING?.n ?? 0} pengajuan antrean pencairan
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-2xl border bg-card p-5 shadow-sm transition-transform motion-safe:hover:-translate-y-1">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <Receipt className="size-4" /> Total Potongan Fee Admin
              </span>
              <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-medium">Interbank</span>
            </div>
            <h3 className="mt-3 text-2xl font-bold tracking-tight">
              <AnimatedRupiah value={fin?.feeTotal ?? 0} />
            </h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {fin?.feeCount ?? 0} transfer berpotongan fee
            </p>
          </div>
          <div className="mt-4 flex items-center justify-between border-t pt-3 text-xs font-medium text-muted-foreground">
            <span>Beban transfer bank</span>
            <span className="font-semibold">Tercatat Otomatis</span>
          </div>
        </div>
      </section>

      {/* Filter pills + bank + refresh */}
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {pills.map((p) => {
            const aktif = filter === p.v;
            return (
              <button
                key={p.v}
                onClick={() => setFilter(p.v)}
                aria-pressed={aktif}
                className={`rounded-lg px-3.5 py-1.5 font-semibold transition-all active:scale-[0.98] ${
                  aktif ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {p.label}
                {p.n != null && (
                  <span className={`ml-1.5 rounded-full px-1.5 py-0.2 font-bold ${aktif ? "bg-primary-foreground/20" : "bg-muted"}`}>
                    {p.n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* Cari + filter bank + muat ulang + ekspor */}
      <section className="grid grid-cols-1 items-center gap-3 rounded-xl border bg-card p-3.5 shadow-2xs md:grid-cols-12">
        <div className="relative md:col-span-6">
          <SearchInput value={q} onChange={setQ} placeholder="Cari ustadz / no. rekening / ID pengajuan…" />
        </div>
        <div className="md:col-span-3">
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            aria-label="Filter bank tujuan"
            className="w-full cursor-pointer rounded-lg border bg-card px-3 py-2 text-xs text-foreground focus:outline-none"
          >
            <option value="">Semua Bank{fin?.bankList.length ? ` (${fin.bankList.join(", ")})` : ""}</option>
            {(fin?.bankList ?? []).map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center justify-end gap-1.5 md:col-span-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              list.reload();
              setKpiNonce((n) => n + 1);
            }}
          >
            <RefreshCw className={`size-4 ${list.loading ? "motion-safe:animate-spin" : ""}`} /> Muat Ulang
          </Button>
          <Button size="sm" disabled={exporting} onClick={downloadCsv}>
            Unduh CSV
          </Button>
        </div>
      </section>

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <Head label="No." className="w-12 text-center" />
              <Head label="ID Tarik" />
              <Head label="Ustadz" />
              <Head label="Bank / Rekening Tujuan" />
              <SortHead label="Diterima" col="amount" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-right" />
              <Head label="Fee" className="text-right" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <SortHead label="Waktu" col="created_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="Aksi" className="text-center" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={4} cols={9} />
            ) : itemsTampil.length === 0 ? (
              <EmptyRow colSpan={9} message="Belum ada pengajuan penarikan." />
            ) : (
              itemsTampil.map((p, i) => (
                <TableRow key={p.id} className="visits-row">
                  <TableCell className="text-center text-muted-foreground">{(list.page - 1) * 20 + i + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold">{idTarik(p.id)}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard
                            .writeText(idTarik(p.id))
                            .then(() => toast.success("ID penarikan disalin"))
                            .catch(() => toast.error("Gagal menyalin"));
                        }}
                        className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                        title={`Salin ${idTarik(p.id)}`}
                        aria-label={`Salin ID penarikan ${p.id}`}
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                        {p.ustadz_name.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold">{p.ustadz_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-sm">
                      <span className="font-bold">{p.bank_name}</span>
                      <span className="text-border">•</span>
                      <span className="font-mono">{p.account_no}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard
                            .writeText(p.account_no)
                            .then(() => toast.success("No. rekening disalin"))
                            .catch(() => toast.error("Gagal menyalin"));
                        }}
                        className="rounded p-0.5 text-muted-foreground transition hover:text-foreground"
                        title="Salin no. rekening"
                        aria-label="Salin no. rekening"
                      >
                        <Copy className="size-3" />
                      </button>
                    </div>
                    <div className="text-xs text-muted-foreground">a.n. {p.account_name}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm font-bold">{rp(p.amount)}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono text-[11px] text-muted-foreground">
                    {rp(p.fee)}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={p.status} />
                    {p.status === "REJECTED" && p.rejected_reason && (
                      <div className="mt-1 max-w-52 text-xs text-red-600">{p.rejected_reason}</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{fmtDateTime(p.created_at).split(",")[0]}</div>
                    <div className="text-[11px] text-muted-foreground">{fmtDateTime(p.created_at).split(", ")[1]}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1.5">
                      {p.status === "PENDING" && (
                        <>
                          <Button size="xs" disabled={busy === p.id} onClick={() => approve(p)}>
                            <CheckCircle2 className="mr-1 size-3.5" /> ACC
                          </Button>
                          <Button size="xs" variant="destructive" disabled={busy === p.id} onClick={() => setRejectTarget(p)}>
                            <XCircle className="mr-1 size-3.5" /> Tolak
                          </Button>
                        </>
                      )}
                      {p.status === "APPROVED" && (
                        <Button size="xs" variant="outline" disabled={busy === p.id} onClick={() => markTransferred(p)}>
                          Sudah ditransfer
                        </Button>
                      )}
                      {p.status === "REJECTED" && p.rejected_reason && (
                        <span className="text-xs text-muted-foreground" title={p.rejected_reason}>
                          Detail alasan
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      <Pager page={list.page} hasMore={list.hasMore} loading={list.loading} onPrev={list.goPrev} onNext={list.goNext} />

      {/* Kebijakan kliring */}
      <section className="rounded-2xl border bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 p-5 text-white shadow-lg">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="max-w-2xl space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                Kebijakan Kliring Bank
              </span>
              <span className="text-xs text-slate-400">SLA Pencairan maks. 1×24 jam</span>
            </div>
            <h4 className="text-base font-semibold">SOP Verifikasi &amp; Kliring Saldo Rekening Ustadz</h4>
            <p className="text-xs leading-relaxed text-slate-300">
              Pengajuan pencairan otomatis membekukan nominal di dompet ustadz. Pastikan nama rekening tujuan
              valid dan identik dengan identitas mitra sebelum menekan ACC untuk mencegah pembatalan otomatis
              oleh sistem interbank.
            </p>
          </div>
        </div>
      </section>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak penarikan #{rejectTarget?.id}?</DialogTitle>
            <DialogDescription>
              Dana {rejectTarget ? rp(rejectTarget.amount + (rejectTarget.fee ?? 0)) : ""} kembali ke saldo ustadz. Alasan
              diteruskan ke ustadz.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="cth: nomor rekening tidak sesuai buku tabungan"
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button variant="destructive" disabled={busy === rejectTarget?.id} onClick={reject}>
              Tolak &amp; Kembalikan Dana
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
