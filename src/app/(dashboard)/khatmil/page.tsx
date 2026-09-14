"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { apiGet, apiPost, ApiError } from "@/lib/api";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Campaign {
  id: number;
  slug: string;
  name: string;
  mode: string;
  status: string;
  target_khataman: number;
  min_minutes_per_juz: number;
  participants: number;
  juz_completed: number;
  progress_pct: number;
}

interface JuzSlot {
  juz: number;
  status: string | null;
  owner_name: string | null;
  pages_read: number | null;
  minutes_read: number | null;
}

interface CampaignDetail extends Campaign {
  juz_map: JuzSlot[];
}

export default function KhatmilPage() {
  const [items, setItems] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ slug: "", name: "", mode: "PARALLEL", status: "ACTIVE", min_minutes_per_juz: 30 });
  const [busy, setBusy] = useState(false);

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

  async function openDetail(id: number) {
    try {
      const d = await apiGet<CampaignDetail>(`/khatmil/campaigns/${id}`);
      setDetail(d);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  async function create() {
    setBusy(true);
    try {
      await apiPost("/khatmil/campaigns", {
        slug: form.slug,
        name: form.name,
        mode: form.mode,
        status: form.status,
        min_minutes_per_juz: Number(form.min_minutes_per_juz),
        target_khataman: 1,
      });
      toast.success("Campaign dibuat");
      setShowCreate(false);
      setForm({ slug: "", name: "", mode: "PARALLEL", status: "ACTIVE", min_minutes_per_juz: 30 });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuat campaign");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Khatmil</h1>
          <p className="text-sm text-muted-foreground">Campaign khataman Al-Quran bersama</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="size-4" /> Campaign Baru
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Peserta</TableHead>
              <TableHead>Juz Selesai</TableHead>
              <TableHead>Progress</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                  Belum ada campaign
                </TableCell>
              </TableRow>
            ) : (
              items.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => openDetail(c.id)}>
                  <TableCell className="font-mono text-xs">{c.id}</TableCell>
                  <TableCell className="text-sm font-medium">{c.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.mode}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>{c.status}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{c.participants}</TableCell>
                  <TableCell className="text-sm">{c.juz_completed}/30</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-24 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${Math.min(c.progress_pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{c.progress_pct}%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Campaign Khatmil Baru</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Slug (unik)</Label>
              <Input
                placeholder="khatam-ramadhan-2026"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Nama</Label>
              <Input
                placeholder="Khataman Ramadhan 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Mode</Label>
                <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v ?? "PARALLEL" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PARALLEL">Paralel</SelectItem>
                    <SelectItem value="SEQUENTIAL">Bergiliran</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Min. menit / juz</Label>
                <Input
                  type="number"
                  value={form.min_minutes_per_juz}
                  onChange={(e) => setForm({ ...form, min_minutes_per_juz: Number(e.target.value) })}
                />
              </div>
            </div>
            <Button onClick={create} disabled={busy || !form.slug || !form.name} className="w-full">
              {busy ? "Membuat..." : "Buat Campaign"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle>{detail.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span>
                    Status: <Badge variant={detail.status === "ACTIVE" ? "default" : "secondary"}>{detail.status}</Badge>
                  </span>
                  <span>Mode: <b>{detail.mode}</b></span>
                  <span>Peserta: <b>{detail.participants}</b></span>
                  <span>Min menit/juz: <b>{detail.min_minutes_per_juz}</b></span>
                  <span>
                    Progress: <b>{detail.progress_pct}%</b> ({detail.juz_completed}/30 juz)
                  </span>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Peta Juz (30)</div>
                  <div className="grid grid-cols-6 sm:grid-cols-10 gap-1.5">
                    {detail.juz_map.map((j) => (
                      <div
                        key={j.juz}
                        title={
                          j.status
                            ? `Juz ${j.juz}: ${j.owner_name ?? "?"} — ${j.status} (${j.pages_read ?? 0}p / ${j.minutes_read ?? 0}m)`
                            : `Juz ${j.juz}: kosong`
                        }
                        className={`flex h-10 items-center justify-center rounded-md border text-xs font-medium ${
                          j.status === "COMPLETED"
                            ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                            : j.status
                              ? "border-amber-300 bg-amber-100 text-amber-800"
                              : "border-dashed text-muted-foreground"
                        }`}
                      >
                        {j.juz}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-3 text-xs text-muted-foreground">
                    <span>🟩 Selesai</span>
                    <span>🟨 Aktif</span>
                    <span>⬜ Kosong</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
