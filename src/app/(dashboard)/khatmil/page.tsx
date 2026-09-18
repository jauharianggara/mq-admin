"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PageHeader,
  Toolbar,
  SearchInput,
  RefreshButton,
  TableShell,
  SortHead,
  Head,
  TableSkeleton,
  EmptyRow,
} from "@/components/data-table";
import { statusLabel } from "@/components/status-pill";
import { fmtDateInput } from "@/lib/format";
import { Campaign, MiniBar, patchCampaign, StatusBadge, STATUS_LABEL } from "./shared";

/** List campaign — full-fetch + filter/sort client-side (data khatmil kecil). Detail/form = halaman terpisah. */
const STATUS_ORDER = ["ACTIVE", "SCHEDULED", "DRAFT", "COMPLETED", "CANCELLED"];
const COLS = 8;

export default function KhatmilPage() {
  const router = useRouter();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ACTIVE");
  const [search, setSearch] = useState("");
  // sort client-side (data di-fetch semua)
  const [sort, setSort] = useState<string | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiGet<Campaign[]>("/khatmil/campaigns"));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function toggleSort(col: string) {
    if (sort !== col) {
      setSort(col);
      setOrder("asc");
    } else if (order === "asc") {
      setOrder("desc");
    } else {
      setSort(null);
      setOrder("asc");
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const out = items.filter(
      (c) =>
        (filter === "ALL" || c.status === filter) &&
        (!q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)),
    );
    if (!sort) return out;
    const dir = order === "asc" ? 1 : -1;
    const val = (c: Campaign): number | string => {
      switch (sort) {
        case "name": return c.name.toLowerCase();
        case "status": return c.status;
        case "participants": return c.participants;
        case "juz_completed": return c.juz_completed;
        case "progress": return c.progress_pct ?? 0;
        default: return c.id;
      }
    };
    return [...out].sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
  }, [items, filter, search, sort, order]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Khatmil"
        total={items.length}
        totalSuffix="campaign"
        subtitle="Khataman Al-Quran bersama — klik baris untuk detail, peta juz & peringkat"
        actions={
          <Button onClick={() => router.push("/khatmil/baru")}>
            <Plus className="size-4" /> Campaign Baru
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Cari nama / slug…" />
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Semua status</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <RefreshButton onClick={load} />
      </Toolbar>

      {/* Tabel (desktop) */}
      <div className="hidden md:block">
        <TableShell>
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead label="ID" col="id" sort={sort} order={order} onSort={toggleSort} className="w-12" />
                <SortHead label="Nama Khatmil" col="name" sort={sort} order={order} onSort={toggleSort} />
                <Head label="Mode" />
                <SortHead label="Status" col="status" sort={sort} order={order} onSort={toggleSort} />
                <SortHead label="Peserta" col="participants" sort={sort} order={order} onSort={toggleSort} className="text-center" />
                <SortHead label="Juz Selesai" col="juz_completed" sort={sort} order={order} onSort={toggleSort} className="text-center" />
                <SortHead label="Progress" col="progress" sort={sort} order={order} onSort={toggleSort} />
                <Head label="" className="w-32 text-right" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableSkeleton rows={3} cols={COLS} />
              ) : filtered.length === 0 ? (
                <EmptyRow colSpan={COLS} message="Belum ada khatmil sesuai filter." />
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/khatmil/${c.id}`)}>
                    <TableCell className="font-mono text-xs text-muted-foreground">#{c.id}</TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{c.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.slug}
                        {c.period_start
                          ? ` · ${fmtDateInput(c.period_start)}${c.period_end ? ` – ${fmtDateInput(c.period_end)}` : ""}`
                          : ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" className="pointer-events-none h-6 px-2 text-xs">
                        {c.mode === "SEQUENTIAL" ? "Bergiliran" : "Paralel"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                    <TableCell className="text-center text-sm">{c.participants}</TableCell>
                    <TableCell className="whitespace-nowrap text-center text-sm">
                      {c.juz_completed} dari {30 * c.target_khataman} juz selesai
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <MiniBar pct={c.progress_pct} />
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1.5">
                        <Button size="sm" variant="outline" onClick={() => router.push(`/khatmil/${c.id}`)}>
                          Detail
                        </Button>
                        {c.status !== "COMPLETED" && c.status !== "CANCELLED" && (
                          <Button size="sm" variant="ghost" title="Edit campaign" onClick={() => router.push(`/khatmil/${c.id}/edit`)}>
                            ✏️
                          </Button>
                        )}
                        {c.status !== "COMPLETED" && c.status !== "CANCELLED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            title="Batalkan campaign"
                            onClick={() => {
                              if (confirm(`Batalkan campaign "${c.name}"? Tindakan ini permanen.`))
                                patchCampaign(c, { status: "CANCELLED" }, "Campaign dibatalkan").then(load);
                            }}
                          >
                            🚫
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableShell>
      </div>

      {/* Kartu list (mobile) */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">
            Belum ada khatmil sesuai filter.
          </div>
        ) : (
          filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/khatmil/${c.id}`)}
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
                      {fmtDateInput(c.period_start)}
                      {c.period_end ? ` – ${fmtDateInput(c.period_end)}` : ""}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <MiniBar pct={c.progress_pct} className="flex-1" />
                <span className="whitespace-nowrap text-xs font-semibold text-primary">
                  {c.juz_completed}/{30 * c.target_khataman} juz selesai
                </span>
                <span className="text-muted-foreground">›</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
