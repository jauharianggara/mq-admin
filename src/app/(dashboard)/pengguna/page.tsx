"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { apiGetPage, apiPatch, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AdminUser {
  id: number;
  email: string | null;
  phone: string | null;
  account_type: string;
  status: string;
  roles: string[] | null;
  last_login_at: string | null;
  full_name?: string | null;
  city?: string | null;
  pendidikan_terakhir?: string | null;
  point?: { lat: number | null; lng: number | null; label: string | null } | null;
}

const statusVariant: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  PENDING_VERIFICATION: "bg-amber-100 text-amber-800",
  SUSPENDED: "bg-red-100 text-red-800",
  DEACTIVATED: "bg-gray-100 text-gray-600",
  DELETED: "bg-gray-100 text-gray-400",
};

export default function PenggunaPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [role, setRole] = useState<string>("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(
    async (c: string | null, replace: boolean) => {
      setLoading(true);
      setError("");
      try {
        const page = await apiGetPage<AdminUser>("/admin/users", {
          q: q || undefined,
          status: status === "all" ? undefined : status,
          role: role === "all" ? undefined : role,
          cursor: c ?? undefined,
          limit: 20,
        });
        setItems(replace ? page.items : (prev) => [...prev, ...page.items]);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Gagal memuat");
      } finally {
        setLoading(false);
      }
    },
    [q, status, role],
  );

  useEffect(() => {
    load(null, true);
  }, [load]);

  async function changeStatus(id: number, newStatus: string) {
    try {
      await apiPatch(`/admin/users/${id}`, { status: newStatus });
      toast.success(`Status pengguna #${id} → ${newStatus}`);
      load(cursor && !hasMore ? null : null, true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  async function changeRole(id: number, action: "add_role" | "remove_role", role: string) {
    try {
      await apiPatch(`/admin/users/${id}`, { [action]: role });
      toast.success(`Role ${role} ${action === "add_role" ? "ditambahkan" : "dihapus"} (#${id})`);
      load(null, true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pengguna</h1>
        <p className="text-sm text-muted-foreground">Kelola akun santri, ustadz & admin</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Cari email / phone..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={role} onValueChange={(v) => setRole(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Peran" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua peran</SelectItem>
            <SelectItem value="SANTRI">Santri</SelectItem>
            <SelectItem value="USTADZ">Ustadz</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="MODERATOR">Moderator</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => setStatus(v ?? "all")}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua status</SelectItem>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="PENDING_VERIFICATION">Menunggu verifikasi</SelectItem>
            <SelectItem value="SUSPENDED">Suspend</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>Email / Phone</TableHead>
              <TableHead>Tipe</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Login Terakhir</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && items.length === 0
              ? Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : items.map((u) => {
                  // klik baris -> detail sesuai peran (santri/ustadz punya halaman khusus)
                  const detailHref = u.roles?.includes("USTADZ")
                    ? `/ustadz/${u.id}`
                    : u.roles?.includes("SANTRI")
                      ? `/santri/${u.id}`
                      : null;
                  return (
                  <TableRow
                    key={u.id}
                    className={detailHref ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => detailHref && router.push(detailHref)}
                  >
                    <TableCell className="font-mono text-xs">{u.id}</TableCell>
                    <TableCell>
                      <div className="text-sm">{u.full_name || "—"}</div>
                      {u.city && <div className="text-xs text-muted-foreground">{u.city}</div>}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{u.email ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{u.phone ?? ""}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{u.account_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(u.roles ?? []).map((r) => (
                          <Badge
                            key={r}
                            variant="outline"
                            className="cursor-pointer text-[10px]"
                            onClick={() => changeRole(u.id, "remove_role", r)}
                            title={`Klik untuk hapus ${r}`}
                          >
                            {r} ×
                          </Badge>
                        ))}
                        <Badge
                          variant="outline"
                          className="cursor-pointer border-dashed text-[10px] text-muted-foreground"
                          onClick={() => changeRole(u.id, "add_role", "USTADZ")}
                          title="Tambah role USTADZ"
                        >
                          + USTADZ
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusVariant[u.status] ?? "bg-gray-100"
                        }`}
                      >
                        {u.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_login_at?.replace("T", " ").replace("Z", "") ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {u.status === "PENDING_VERIFICATION" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => changeStatus(u.id, "ACTIVE")}
                        >
                          Aktifkan
                        </Button>
                      )}
                      {u.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() => changeStatus(u.id, "SUSPENDED")}
                        >
                          Suspend
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                  );
                })}
          </TableBody>
        </Table>
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={() => load(cursor, false)} disabled={loading}>
            {loading ? "Memuat..." : "Muat lebih banyak"} <ChevronRight className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
