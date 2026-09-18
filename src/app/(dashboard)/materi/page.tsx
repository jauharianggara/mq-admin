"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, FileText, Plus } from "lucide-react";
import { apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { StatusPill, statusLabel } from "@/components/status-pill";
import { fmtDate } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Material {
  id: number;
  slug: string;
  title: string;
  tajwid_rule: string | null;
  status: string;
  content_md: string | null;
  published_at: string | null;
}

// sementara hardcoded — tajwid_rules table belum di-seed di BE
const TAJWID_RULES = ["Nun Sukun & Tanwin", "Mim Sukun", "Idgham", "Iqlab", "Ikhfa", "Mad", "Qalqalah", "Waqaf"];

const STATUS_ORDER = ["PUBLISHED", "DRAFT", "ARCHIVED"];
const COLS = 7;

export default function MateriPage() {
  const [items, setItems] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("ALL");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ slug: "", title: "", tajwid_rule_code: "", content_md: "", status: "DRAFT" });
  // sort client-side (list full-fetch)
  const [sort, setSort] = useState<string | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await apiGet<Material[]>("/learning/materials"));
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
    if (sort !== col) { setSort(col); setOrder("asc"); }
    else if (order === "asc") { setOrder("desc"); }
    else { setSort(null); setOrder("asc"); }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = items.filter(
      (m) => (filter === "ALL" || m.status === filter) && (!s || m.title.toLowerCase().includes(s) || m.slug.includes(s)),
    );
    if (!sort) return out;
    const dir = order === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const va = sort === "published_at" ? (a.published_at ?? "") : String(a[sort as keyof Material] ?? "").toLowerCase();
      const vb = sort === "published_at" ? (b.published_at ?? "") : String(b[sort as keyof Material] ?? "").toLowerCase();
      return va.localeCompare(vb) * dir;
    });
  }, [items, q, filter, sort, order]);

  function openCreate() {
    setEditing(null);
    setForm({ slug: "", title: "", tajwid_rule_code: "", content_md: "", status: "DRAFT" });
    setShowForm(true);
  }

  function openEdit(m: Material) {
    setEditing(m);
    setForm({ slug: m.slug, title: m.title, tajwid_rule_code: m.tajwid_rule ?? "", content_md: m.content_md ?? "", status: m.status });
    setShowForm(true);
  }

  async function save() {
    setBusy(true);
    try {
      const body = {
        slug: form.slug,
        title: form.title,
        tajwid_rule_code: form.tajwid_rule_code || null,
        content_md: form.content_md,
        status: form.status,
      };
      if (editing) {
        await apiPatch(`/learning/materials/${editing.id}`, body);
        toast.success("Materi diperbarui");
      } else {
        await apiPost("/learning/materials", body);
        toast.success("Materi dibuat");
      }
      setShowForm(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  async function archive(m: Material) {
    try {
      await apiPatch(`/learning/materials/${m.id}`, {
        slug: m.slug,
        title: m.title,
        tajwid_rule_code: m.tajwid_rule,
        content_md: m.content_md ?? "",
        status: "ARCHIVED",
      });
      toast.success("Materi diarsipkan");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Materi Pembelajaran"
        total={items.length}
        totalSuffix="materi"
        subtitle="Materi tajwid & pembelajaran (markdown) untuk santri"
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Materi Baru
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Cari judul / slug…" />
        <Select value={filter} onValueChange={(v) => setFilter(v ?? "ALL")}>
          <SelectTrigger className="w-40">
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

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="ID" col="id" sort={sort} order={order} onSort={toggleSort} className="w-12" />
              <SortHead label="Judul" col="title" sort={sort} order={order} onSort={toggleSort} />
              <SortHead label="Slug" col="slug" sort={sort} order={order} onSort={toggleSort} />
              <Head label="Rule Tajwid" />
              <SortHead label="Status" col="status" sort={sort} order={order} onSort={toggleSort} />
              <SortHead label="Terbit" col="published_at" sort={sort} order={order} onSort={toggleSort} />
              <Head label="" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableSkeleton rows={3} cols={COLS} />
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Belum ada materi sesuai filter." />
            ) : (
              filtered.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.id}</TableCell>
                  <TableCell className="text-sm font-medium">{m.title}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{m.slug}</TableCell>
                  <TableCell>
                    {m.tajwid_rule ? (
                      <Badge variant="outline">{m.tajwid_rule}</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">umum</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={m.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{fmtDate(m.published_at)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)} title="Edit">
                        <FileText className="size-4" />
                      </Button>
                      {m.status !== "ARCHIVED" && (
                        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => archive(m)} title="Arsipkan">
                          <Archive className="size-4" />
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

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit: ${editing.title}` : "Materi Baru"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Slug (unik)</Label>
                <Input
                  placeholder="pengenalan-tajwid"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  disabled={!!editing}
                />
              </div>
              <div className="space-y-1">
                <Label>Judul</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Rule Tajwid</Label>
                <Select value={form.tajwid_rule_code || "umum"} onValueChange={(v) => setForm({ ...form, tajwid_rule_code: v === "umum" ? "" : (v ?? "") })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="umum">Umum</SelectItem>
                    {TAJWID_RULES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "DRAFT" })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {statusLabel(s)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Isi (Markdown)</Label>
              <Textarea
                rows={12}
                className="font-mono text-xs"
                placeholder="# Pengenalan Tajwid…"
                value={form.content_md}
                onChange={(e) => setForm({ ...form, content_md: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button disabled={busy || !form.slug.trim() || !form.title.trim()} onClick={save}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
