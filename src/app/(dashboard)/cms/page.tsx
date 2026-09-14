"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, FileText } from "lucide-react";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/api";
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
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Entity = "articles" | "banners" | "announcements" | "faqs";

interface CmsItem {
  id: number;
  [key: string]: unknown;
}

const entityConfig: Record<Entity, { label: string; fields: { key: string; label: string; type: "text" | "textarea" | "number" | "select"; options?: string[] }[]; listColumns: string[] }> = {
  articles: {
    label: "Artikel",
    fields: [
      { key: "slug", label: "Slug", type: "text" },
      { key: "title", label: "Judul", type: "text" },
      { key: "excerpt", label: "Ringkasan", type: "text" },
      { key: "content_html", label: "Konten (HTML)", type: "textarea" },
      { key: "status", label: "Status", type: "select", options: ["DRAFT", "PUBLISHED", "ARCHIVED"] },
      { key: "reading_minutes", label: "Menit Baca", type: "number" },
    ],
    listColumns: ["title", "slug", "status"],
  },
  banners: {
    label: "Banner",
    fields: [
      { key: "title", label: "Judul", type: "text" },
      { key: "position", label: "Posisi", type: "select", options: ["HOME_TOP", "HOME_MID", "KHOTMIL_TOP"] },
      { key: "target_type", label: "Target Type", type: "select", options: ["URL", "DEEPLINK"] },
      { key: "target_value", label: "Target URL/Link", type: "text" },
      { key: "sort_order", label: "Urutan", type: "number" },
    ],
    listColumns: ["title", "position", "sort_order"],
  },
  announcements: {
    label: "Pengumuman",
    fields: [
      { key: "title", label: "Judul", type: "text" },
      { key: "body", label: "Isi", type: "textarea" },
      { key: "level", label: "Level", type: "select", options: ["INFO", "WARNING", "CRITICAL"] },
    ],
    listColumns: ["title", "level"],
  },
  faqs: {
    label: "FAQ",
    fields: [
      { key: "question", label: "Pertanyaan", type: "text" },
      { key: "answer", label: "Jawaban", type: "textarea" },
      { key: "sort_order", label: "Urutan", type: "number" },
    ],
    listColumns: ["question", "answer"],
  },
};

export default function CmsPage() {
  const [entity, setEntity] = useState<Entity>("articles");
  const [items, setItems] = useState<CmsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CmsItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const load = useCallback(
    async (e: Entity) => {
      setLoading(true);
      try {
        // publik endpoints utk list; admin lihat semua
        const endpoints: Record<Entity, string> = {
          articles: "/cms/articles",
          banners: "/cms/banners",
          announcements: "/cms/announcements",
          faqs: "/cms/faqs",
        };
        const list = await apiGet<CmsItem[]>(endpoints[e]);
        setItems(list);
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(entity);
  }, [entity, load]);

  function openCreate() {
    setEditing(null);
    const initial: Record<string, string> = {};
    for (const f of entityConfig[entity].fields) {
      initial[f.key] = f.type === "number" ? "0" : f.type === "select" ? (f.options?.[0] ?? "") : "";
    }
    setForm(initial);
    setShowForm(true);
  }

  function openEdit(item: CmsItem) {
    setEditing(item);
    const initial: Record<string, string> = {};
    for (const f of entityConfig[entity].fields) {
      initial[f.key] = String(item[f.key] ?? "");
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
          body[f.key] = Number(form[f.key]) || 0;
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">CMS</h1>
        <p className="text-sm text-muted-foreground">Artikel, banner, pengumuman & FAQ</p>
      </div>

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
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {items.length} {entityConfig[e].label.toLowerCase()}
              </div>
              <Button size="sm" onClick={openCreate}>
                <Plus className="size-4" /> Tambah
              </Button>
            </div>

            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">ID</TableHead>
                    {entityConfig[e].listColumns.map((col) => (
                      <TableHead key={col}>{col.replace(/_/g, " ")}</TableHead>
                    ))}
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        {entityConfig[e].listColumns.map((col) => (
                          <TableCell key={col}><Skeleton className="h-4 w-full" /></TableCell>
                        ))}
                        <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={entityConfig[e].listColumns.length + 2} className="py-8 text-center text-sm text-muted-foreground">
                        Belum ada {entityConfig[e].label.toLowerCase()}
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs">{item.id}</TableCell>
                        {entityConfig[e].listColumns.map((col) => {
                          const val = item[col];
                          if (col === "status") {
                            return (
                              <TableCell key={col}>
                                <Badge variant={val === "PUBLISHED" || val === "INFO" ? "default" : "secondary"}>
                                  {String(val)}
                                </Badge>
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
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editing ? `Edit ${config.label}` : `${config.label} Baru`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {config.fields.map((f) => (
              <div key={f.key} className="space-y-1">
                <Label>{f.label}</Label>
                {f.type === "textarea" ? (
                  <Textarea
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    rows={f.key === "content_html" || f.key === "body" ? 8 : 3}
                  />
                ) : f.type === "select" ? (
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  >
                    {f.options?.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={f.type === "number" ? "number" : "text"}
                    value={form[f.key] ?? ""}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                  />
                )}
              </div>
            ))}
            <Button onClick={save} disabled={busy} className="w-full">
              {busy ? "Menyimpan..." : editing ? "Simpan" : "Buat"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
