"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, FileText, Archive, Eye } from "lucide-react";
import { apiGet, apiPost, apiPatch, ApiError } from "@/lib/api";
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

interface Material {
  id: number;
  slug: string;
  title: string;
  tajwid_rule: string | null;
  content_md: string | null;
  status: string;
  published_at: string | null;
}

interface TajwidRule {
  id: number;
  code: string;
  name_id: string;
}

const statusVariant: Record<string, "default" | "secondary" | "outline"> = {
  PUBLISHED: "default",
  DRAFT: "secondary",
  ARCHIVED: "outline",
};

export default function MateriPage() {
  const [items, setItems] = useState<Material[]>([]);
  const [rules, setRules] = useState<TajwidRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    slug: "",
    title: "",
    tajwid_rule_code: "",
    content_md: "",
    status: "DRAFT",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await apiGet<Material[]>("/learning/materials?status=DRAFT&status=PUBLISHED&status=ARCHIVED");
      setItems(list);
    } catch {
      // kalau 403 (bukan manage), coba tanpa status filter
      try {
        const list = await apiGet<Material[]>("/learning/materials");
        setItems(list);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Gagal memuat");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRules = useCallback(async () => {
    try {
      // query tajwid_rules via backend (publik endpoint belum ada — hardcode sementara)
      // TODO: tambah GET /quran/tajwid-rules
      setRules([
        { id: 1, code: "IDGHAM_BIGUNNAH", name_id: "Idgham Bighunnah" },
        { id: 2, code: "IDGHAM_BILAGHUNNAH", name_id: "Idgham Bilaghunnah" },
        { id: 3, code: "IQLAB", name_id: "Iqlab" },
        { id: 4, code: "IZHAR", name_id: "Izhar" },
        { id: 5, code: "IKHFA", name_id: "Ikhfa" },
        { id: 6, code: "GHUNNAH", name_id: "Ghunnah" },
        { id: 7, code: "QALQALAH", name_id: "Qalqalah" },
        { id: 8, code: "MADD", name_id: "Mad" },
      ]);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
    loadRules();
  }, [load, loadRules]);

  function openCreate() {
    setEditing(null);
    setForm({ slug: "", title: "", tajwid_rule_code: "", content_md: "", status: "DRAFT" });
    setShowForm(true);
  }

  function openEdit(m: Material) {
    setEditing(m);
    setForm({
      slug: m.slug,
      title: m.title,
      tajwid_rule_code: m.tajwid_rule ?? "",
      content_md: m.content_md ?? "",
      status: m.status,
    });
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
      await apiPatch(`/learning/materials/${m.id}`, { ...form, status: "ARCHIVED" });
      toast.success("Materi diarsipkan");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Materi Pembelajaran</h1>
          <p className="text-sm text-muted-foreground">
            Materi tajwid & pembelajaran (markdown)
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" /> Materi Baru
        </Button>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Judul</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Rule Tajwid</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
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
                  Belum ada materi
                </TableCell>
              </TableRow>
            ) : (
              items.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs">{m.id}</TableCell>
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
                    <Badge variant={statusVariant[m.status] ?? "secondary"}>{m.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.published_at?.slice(0, 10) ?? "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(m)} title="Edit">
                        <FileText className="size-4" />
                      </Button>
                      {m.status !== "ARCHIVED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-muted-foreground"
                          onClick={() => archive(m)}
                          title="Arsipkan"
                        >
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
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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
                <Label>Rule Tajwid (opsional)</Label>
                <Select
                  value={form.tajwid_rule_code || "none"}
                  onValueChange={(v) => setForm({ ...form, tajwid_rule_code: v === "none" ? "" : (v ?? "") })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Materi umum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Materi umum</SelectItem>
                    {rules.map((r) => (
                      <SelectItem key={r.id} value={r.code}>
                        {r.name_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Judul</Label>
              <Input
                placeholder="Pengenalan Tajwid"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Konten (Markdown)</Label>
              <Textarea
                placeholder={"## Apa itu Tajwid?\n\nTajwid adalah..."}
                value={form.content_md}
                onChange={(e) => setForm({ ...form, content_md: e.target.value })}
                rows={12}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v ?? "DRAFT" })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="PUBLISHED">Publish</SelectItem>
                  <SelectItem value="ARCHIVED">Arsip</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={save} disabled={busy || !form.slug || !form.title || !form.content_md} className="w-full">
              {busy ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Buat Materi"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
