"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText, Plus, Trash2 } from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusPill } from "@/components/status-pill";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Entity = "articles" | "banners" | "announcements" | "faqs";
type FieldType = "text" | "textarea" | "number" | "date" | "boolean";

interface FieldConfig {
  key: string;
  label: string;
  type: FieldType;
}

// Field = kolom SKEMA DB (bukan istilah bebas) — create/update BE whitelist kolom ini.
const entityConfig: Record<Entity, { label: string; fields: FieldConfig[]; listColumns: string[] }> = {
  articles: {
    label: "Artikel",
    fields: [
      { key: "title", label: "Judul", type: "text" },
      { key: "slug", label: "Slug", type: "text" },
      { key: "excerpt", label: "Ringkasan", type: "textarea" },
      { key: "content_html", label: "Isi (HTML)", type: "textarea" },
      { key: "status", label: "Status (PUBLISHED/DRAFT)", type: "text" },
      { key: "reading_minutes", label: "Menit baca", type: "number" },
      { key: "category_id", label: "ID kategori (ops.)", type: "number" },
    ],
    listColumns: ["title", "slug", "status", "reading_minutes"],
  },
  banners: {
    label: "Banner",
    fields: [
      { key: "title", label: "Judul", type: "text" },
      { key: "position", label: "Posisi", type: "text" },
      { key: "sort_order", label: "Urutan", type: "number" },
      { key: "target_type", label: "Jenis tautan", type: "text" },
      { key: "target_value", label: "Tautan/nilai", type: "text" },
      { key: "image_media_id", label: "ID media gambar", type: "number" },
      { key: "is_active", label: "Aktif", type: "boolean" },
    ],
    listColumns: ["title", "position", "sort_order"],
  },
  announcements: {
    label: "Pengumuman",
    fields: [
      { key: "title", label: "Judul", type: "text" },
      { key: "body", label: "Isi", type: "textarea" },
      { key: "level", label: "Level (INFO/WARN)", type: "text" },
      { key: "is_active", label: "Aktif", type: "boolean" },
    ],
    listColumns: ["title", "level"],
  },
  faqs: {
    label: "FAQ",
    fields: [
      { key: "question", label: "Pertanyaan", type: "text" },
      { key: "answer", label: "Jawaban", type: "textarea" },
      { key: "sort_order", label: "Urutan", type: "number" },
      { key: "is_active", label: "Aktif", type: "boolean" },
    ],
    listColumns: ["question", "sort_order"],
  },
};

type CmsItem = Record<string, unknown> & { id: number };

export default function CmsPage() {
  const [entity, setEntity] = useState<Entity>("articles");
  const [items, setItems] = useState<CmsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CmsItem | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  // sort client-side per tab
  const [sort, setSort] = useState<string | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");

  const load = useCallback(
    async (e: Entity = entity) => {
      setLoading(true);
      try {
        setItems(await apiGet<CmsItem[]>(`/admin/cms/${e}`));
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    },
    [entity],
  );

  useEffect(() => {
    load(entity);
    setSort(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entity]);

  function toggleSort(col: string) {
    if (sort !== col) { setSort(col); setOrder("asc"); }
    else if (order === "asc") { setOrder("desc"); }
    else { setSort(null); setOrder("asc"); }
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const out = s
      ? items.filter((it) =>
          entityConfig[entity].listColumns.some((c) => String(it[c] ?? "").toLowerCase().includes(s)),
        )
      : items;
    if (!sort) return out;
    const dir = order === "asc" ? 1 : -1;
    return [...out].sort((a, b) => {
      const va = String(a[sort] ?? "").toLowerCase();
      const vb = String(b[sort] ?? "").toLowerCase();
      return va.localeCompare(vb) * dir;
    });
  }, [items, q, entity, sort, order]);

  function openCreate() {
    const initial: Record<string, string> = {};
    for (const f of entityConfig[entity].fields) initial[f.key] = "";
    setEditing(null);
    setForm(initial);
    setShowForm(true);
  }

  function openEdit(item: CmsItem) {
    setEditing(item);
    const initial: Record<string, string> = {};
    for (const f of entityConfig[entity].fields) {
      initial[f.key] = f.type === "boolean" ? (item[f.key] ? "1" : "0") : String(item[f.key] ?? "");
    }
    setForm(initial);
    setShowForm(true);
  }

  async function save() {
    setBusy(true);
    try {
      const body: Record<string, unknown> = {};
      for (const f of entityConfig[entity].fields) {
        if (f.type === "number") {
          body[f.key] = form[f.key] ? Number(form[f.key]) : null;
        } else if (f.type === "boolean") {
          body[f.key] = form[f.key] === "1";
        } else {
          body[f.key] = form[f.key] || null;
        }
      }
      if (editing) {
        await apiPatch(`/admin/cms/${entity}/${editing.id}`, body);
        toast.success("Diperbarui");
      } else {
        await apiPost(`/admin/cms/${entity}`, body);
        toast.success("Dibuat");
      }
      setShowForm(false);
      load(entity);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: CmsItem) {
    if (!confirm(`Hapus ${entityConfig[entity].label.toLowerCase()} "${String(item[entityConfig[entity].listColumns[0]])}"?`)) return;
    try {
      await apiDelete(`/admin/cms/${entity}/${item.id}`);
      toast.success("Dihapus");
      load(entity);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  const config = entityConfig[entity];

  return (
    <div className="space-y-4">
      <PageHeader
        title="CMS"
        subtitle="Artikel, banner, pengumuman & FAQ untuk aplikasi santri"
      />

      <Tabs value={entity} onValueChange={(v) => setEntity(v as Entity)}>
        <TabsList>
          {(Object.keys(entityConfig) as Entity[]).map((e) => (
            <TabsTrigger key={e} value={e}>
              {entityConfig[e].label}
            </TabsTrigger>
          ))}
        </TabsList>

        {(Object.keys(entityConfig) as Entity[]).map((e) => (
          <TabsContent key={e} value={e} className="space-y-4">
            <Toolbar>
              <SearchInput
                value={e === entity ? q : ""}
                onChange={setQ}
                placeholder={`Cari ${entityConfig[e].label.toLowerCase()}…`}
              />
              <span className="text-sm text-muted-foreground">
                {e === entity ? filtered.length : ""} {entityConfig[e].label.toLowerCase()}
              </span>
              <Button variant="outline" size="sm" onClick={() => load()} title="Muat ulang">
                ↻
              </Button>
              <Button onClick={openCreate}>
                <Plus className="size-4" /> Tambah
              </Button>
            </Toolbar>

            <TableShell>
              <Table>
                <TableHeader>
                  <TableRow>
                    <Head label="ID" className="w-12" />
                    {entityConfig[e].listColumns.map((col) => (
                      <SortHead
                        key={col}
                        label={col.replace(/_/g, " ")}
                        col={col}
                        sort={e === entity ? sort : null}
                        order={order}
                        onSort={toggleSort}
                      />
                    ))}
                    <Head label="" className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && e === entity ? (
                    <TableSkeleton rows={3} cols={entityConfig[e].listColumns.length + 2} />
                  ) : e === entity && filtered.length === 0 ? (
                    <EmptyRow
                      colSpan={entityConfig[e].listColumns.length + 2}
                      message={`Belum ada ${entityConfig[e].label.toLowerCase()}.`}
                    />
                  ) : (
                    e === entity &&
                    filtered.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.id}</TableCell>
                        {entityConfig[e].listColumns.map((col) => {
                          const val = item[col];
                          if (col === "status") {
                            return (
                              <TableCell key={col}>
                                <StatusPill status={String(val)} />
                              </TableCell>
                            );
                          }
                          if (col === "is_active") {
                            return (
                              <TableCell key={col}>
                                <Badge variant={val ? "default" : "secondary"}>{val ? "Aktif" : "Nonaktif"}</Badge>
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={col} className="max-w-48 truncate text-sm">
                              {String(val ?? "—")}
                            </TableCell>
                          );
                        })}
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(item)} title="Edit">
                              <FileText className="size-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(item)} title="Hapus">
                              <Trash2 className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableShell>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${config.label}` : `${config.label} Baru`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {config.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}</Label>
                {f.type === "textarea" ? (
                  <textarea
                    className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    rows={4}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                ) : f.type === "boolean" ? (
                  <Select
                    value={form[f.key] === "1" ? "1" : "0"}
                    onValueChange={(v) => setForm({ ...form, [f.key]: v ?? "0" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Aktif</SelectItem>
                      <SelectItem value="0">Nonaktif</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Batal
            </Button>
            <Button disabled={busy} onClick={save}>
              {busy ? "Menyimpan…" : "Simpan"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
