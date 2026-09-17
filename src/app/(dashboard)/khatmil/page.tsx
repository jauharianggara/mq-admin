"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";

import { Campaign, MiniBar, patchCampaign, StatusBadge, STATUS_LABEL } from "./shared";

/** List campaign — page utama. Detail/form = halaman terpisah (rev 3.4: NO dialog utk konten besar). */
// Tanggal Indonesia ringkas: "1 Sep 2026" (input YYYY-MM-DD; kosong → "")
function fmtDate(s?: string | null): string {
  if (!s) return "";
  const [y, m, d] = s.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return s;
  const bulan = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  return `${d} ${bulan[m - 1]} ${y}`;
}

export default function KhatmilPage() {
  const router = useRouter();
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ACTIVE");
  const [search, setSearch] = useState("");

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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(
      (c) =>
        (filter === "ALL" || c.status === filter) &&
        (!q || c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
    );
  }, [items, filter, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Khatmil</h1>
          <p className="text-sm text-muted-foreground">Campaign khataman Al-Quran bersama</p>
        </div>
        <Button onClick={() => router.push("/khatmil/baru")}>
          <Plus className="size-4" /> Campaign Baru
        </Button>
      </div>

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

      {/* Tabel (desktop) */}
      <div className="hidden overflow-hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Nama Khatmil</TableHead>
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
                  Belum ada khatmil
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/khatmil/${c.id}`)}>
                  <TableCell className="font-mono text-xs text-muted-foreground">#{c.id}</TableCell>
                  <TableCell>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {c.slug}
                      {c.period_start ? ` · ${fmtDate(c.period_start)}${c.period_end ? ` – ${fmtDate(c.period_end)}` : ""}` : ""}
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
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button size="sm" variant="outline">⋯</Button>} />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/khatmil/${c.id}/edit`)}>
                              ✏️ Edit Campaign
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => {
                                if (confirm(`Batalkan campaign "${c.name}"? Tindakan ini permanen.`))
                                  patchCampaign(c, { status: "CANCELLED" }, "Campaign dibatalkan").then(load);
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

      {/* Kartu list (mobile) */}
      <div className="space-y-2 md:hidden">
        {loading ? (
          <Skeleton className="h-20 w-full" />
        ) : filtered.length === 0 ? (
          <div className="rounded-lg border py-8 text-center text-sm text-muted-foreground">Belum ada khatmil</div>
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
                      {fmtDate(c.period_start)}
                      {c.period_end ? ` – ${fmtDate(c.period_end)}` : ""}
                    </span>
                  </>
                )}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <MiniBar pct={c.progress_pct} className="flex-1" />
                <span className="text-xs font-semibold text-primary">
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
