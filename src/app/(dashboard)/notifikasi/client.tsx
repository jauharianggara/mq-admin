"use client";

import { useCallback, useEffect, useState } from "react";
import { Send } from "lucide-react";
import { apiGet, apiGetPage, apiPost, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
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
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { NomorChip, RowNo } from "@/components/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

type Target = "all" | "role" | "user";

const ROLES = ["SANTRI", "USTADZ", "MODERATOR", "ADMIN", "SUPER_ADMIN"];

interface NotifHistoryItem {
  id: number;
  actor: string | null;
  target_user_id: number | null;
  detail: {
    target?: string;
    role?: string | null;
    user_id?: number | null;
    title?: string;
    recipients?: number;
  };
  created_at: string | null;
}

const TARGET_LABEL: Record<string, string> = {
  all: "Semua user",
  role: "Per role",
  user: "Satu user",
};

interface UserOption {
  id: number;
  email: string | null;
  full_name: string | null;
  account_type: string;
  status: string;
}

function userLabel(u: UserOption): string {
  const name = u.full_name?.trim() || "(tanpa nama)";
  return `#${u.id} — ${name}${u.email ? ` (${u.email})` : ""}`;
}

/// Combobox pencarian pengguna (debounce 300ms → GET /admin/users?q=&status=ACTIVE).
function UserPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserOption[] | null>(null);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<UserOption | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const page = await apiGetPage<UserOption>("/admin/users", {
          q: query.trim() || undefined,
          status: "ACTIVE",
          limit: 10,
        });
        setResults(page.items);
      } catch {
        setResults([]);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  function pick(u: UserOption) {
    setSelected(u);
    onChange(String(u.id));
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative w-full max-w-md">
      <Input
        placeholder={selected ? userLabel(selected) : "Ketik nama / email / ID untuk mencari…"}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setSelected(null);
          onChange("");
          setOpen(true);
        }}
      />
      {selected && !query && (
        <p className="mt-1 text-xs text-muted-foreground">
          Terpilih: {userLabel(selected)}
        </p>
      )}
      {open && results !== null && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover shadow-md">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada hasil</p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-accent"
                onClick={() => pick(u)}
              >
                {userLabel(u)}
                <span className="ml-2 text-xs text-muted-foreground">{u.account_type}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "baru saja";
  if (s < 3600) return `${Math.floor(s / 60)} mnt lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  return d.toLocaleString("id-ID");
}

export default function NotifikasiClient() {
  const [target, setTarget] = useState<Target>("all");
  const [role, setRole] = useState<string>("SANTRI");
  const [userId, setUserId] = useState<string>("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deeplink, setDeeplink] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<NotifHistoryItem[] | null>(null);
  const [preview, setPreview] = useState<number | null>(null);

  // Pratinjau dampak: jumlah penerima utk kombinasi target saat ini (debounce 300ms).
  useEffect(() => {
    if (target === "user" && !Number(userId)) {
      // aturan react-hooks: setState sinkron dilarang di body effect
      const raf = requestAnimationFrame(() => setPreview(null));
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(async () => {
      try {
        const qs = new URLSearchParams({ target });
        if (target === "role") qs.set("role", role);
        if (target === "user") qs.set("user_id", userId);
        const r = await apiGet<{ recipients: number }>(
          `/admin/notifications/targets-count?${qs.toString()}`,
        );
        setPreview(r.recipients);
      } catch {
        setPreview(null);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [target, role, userId]);

  const loadHistory = useCallback(async () => {
    try {
      const items = await apiGet<NotifHistoryItem[]>("/admin/notifications");
      setHistory(items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat riwayat");
      setHistory([]);
    }
  }, []);

  useEffect(() => {
    // satu frame berikutnya — aturan react-hooks melarang setState sinkron di body effect
    const raf = requestAnimationFrame(() => loadHistory());
    return () => cancelAnimationFrame(raf);
  }, [loadHistory]);

  async function submit() {
    if (!title.trim() || !body.trim()) {
      toast.error("Judul dan isi notifikasi wajib diisi");
      return;
    }
    if (target === "user" && !Number(userId)) {
      toast.error("Isi ID pengguna yang valid");
      return;
    }
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        target,
        title: title.trim(),
        body: body.trim(),
      };
      if (target === "role") payload.role = role;
      if (target === "user") payload.user_id = Number(userId);
      if (deeplink.trim()) payload.deeplink = deeplink.trim();

      const res = await apiPost<{ recipients: number }>("/admin/notifications", payload);
      toast.success(`Terkirim ke ${res.recipients} pengguna`);
      setTitle("");
      setBody("");
      setDeeplink("");
      await loadHistory();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal mengirim notifikasi");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Kirim Notifikasi</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label>Target</Label>
            <Select
              items={{ all: "Semua user (aktif)", role: "Per role", user: "Satu user" }}
              value={target}
              onValueChange={(v) => setTarget((v ?? "all") as Target)}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Pilih target" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua user (aktif)</SelectItem>
                <SelectItem value="role">Per role</SelectItem>
                <SelectItem value="user">Satu user</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {target === "role" && (
            <div className="grid gap-2">
              <Label>Role</Label>
              <Select
                items={Object.fromEntries(ROLES.map((r) => [r, r]))}
                value={role}
                onValueChange={(v) => setRole(v ?? "SANTRI")}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Pilih role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {target === "user" && (
            <div className="grid gap-2">
              <Label>Pengguna</Label>
              <UserPicker value={userId} onChange={setUserId} />
            </div>
          )}

          <div className="grid gap-2">
            <Label>Judul</Label>
            <Input
              placeholder="mis. Pengumuman libur mengaji"
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Isi</Label>
            <Textarea
              placeholder="Isi notifikasi…"
              rows={4}
              maxLength={2000}
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label>Deeplink (opsional)</Label>
            <Input
              placeholder="mis. khatmil:campaign:3"
              value={deeplink}
              onChange={(e) => setDeeplink(e.target.value)}
            />
          </div>

          <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm">
            {target === "user" && !Number(userId) ? (
              <span className="text-muted-foreground">Pilih pengguna untuk melihat pratinjau penerima.</span>
            ) : preview === null ? (
              <span className="text-muted-foreground">Menghitung pratinjau penerima…</span>
            ) : (
              <span>
                Akan terkirim ke{" "}
                <span className="font-semibold">{preview.toLocaleString("id-ID")}</span> pengguna aktif
                — masuk inbox aplikasi <span className="text-muted-foreground">+ push notifikasi HP otomatis</span>.
              </span>
            )}
          </div>

          <div>
            <Button onClick={submit} disabled={busy}>
              <Send className="size-4" />
              {busy ? "Mengirim…" : "Kirim"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Pengiriman</CardTitle>
        </CardHeader>
        <CardContent>
          {history === null ? (
            <div className="grid gap-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-2/3" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada riwayat.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">No</TableHead>
                  <TableHead>Nomor</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Oleh</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Judul</TableHead>
                  <TableHead className="text-right">Penerima</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h, i) => (
                  <TableRow key={h.id} className="row-accent">
                    <RowNo i={i} />
                    <NomorChip label={`#${h.id}`} title={`Nomor kirim #${h.id}`} />
                    <TableCell className="whitespace-nowrap">{timeAgo(h.created_at)}</TableCell>
                    <TableCell>{h.actor ?? "-"}</TableCell>
                    <TableCell>
                      {h.detail?.target === "user"
                        ? `User #${h.detail?.user_id ?? h.target_user_id ?? "-"}`
                        : h.detail?.target === "role"
                          ? `Role ${h.detail?.role ?? "-"}`
                          : TARGET_LABEL[h.detail?.target ?? ""] ?? h.detail?.target ?? "-"}
                    </TableCell>
                    <TableCell className="max-w-64 truncate">{h.detail?.title ?? "-"}</TableCell>
                    <TableCell className="text-right">{h.detail?.recipients ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
