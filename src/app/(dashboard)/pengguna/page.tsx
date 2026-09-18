"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Pager,
} from "@/components/data-table";
import { StatusPill } from "@/components/status-pill";
import { useAdminList } from "@/hooks/use-admin-list";
import { fmtDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
}

const COLS = 8;

export default function PenggunaPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [role, setRole] = useState("all");
  const [total, setTotal] = useState<number | null>(null);

  const list = useAdminList<AdminUser>("/admin/users", {
    params: {
      q: q || undefined,
      status: status === "all" ? undefined : status,
      role: role === "all" ? undefined : role,
    },
    limit: 20,
  });

  useEffect(() => {
    const qs = new URLSearchParams();
    if (role !== "all") qs.set("role", role);
    if (status !== "all") qs.set("status", status);
    if (q.trim()) qs.set("q", q.trim());
    apiGet<{ total: number }>(`/admin/users-count${qs.size ? `?${qs.toString()}` : ""}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, role]);

  async function changeStatus(id: number, newStatus: string) {
    try {
      await apiPatch(`/admin/users/${id}`, { status: newStatus });
      toast.success(`Status pengguna #${id} diperbarui`);
      list.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  async function changeRole(id: number, action: "add_role" | "remove_role", role: string) {
    try {
      await apiPatch(`/admin/users/${id}`, { [action]: role });
      toast.success(`Role ${role} ${action === "add_role" ? "ditambahkan" : "dihapus"} (#${id})`);
      list.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal");
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pengguna"
        total={total}
        totalSuffix="akun"
        subtitle="Kelola akun santri, ustadz & admin — klik baris untuk detail"
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / email / nomor HP…" />
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
            <SelectItem value="SUSPENDED">Ditangguhkan</SelectItem>
          </SelectContent>
        </Select>
        <RefreshButton onClick={list.reload} />
      </Toolbar>

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <Head label="No." className="w-12" />
              <SortHead label="Nama" col="full_name" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="Kontak" />
              <Head label="Tipe" />
              <Head label="Role" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <SortHead label="Login Terakhir" col="last_login_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="" className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={5} cols={COLS} />
            ) : list.items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Tidak ada pengguna sesuai filter." />
            ) : (
              list.items.map((u, i) => {
                const no = (list.page - 1) * 20 + i + 1;
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
                    <TableCell className="text-muted-foreground">{no}</TableCell>
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
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                      <StatusPill status={u.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {fmtDateTime(u.last_login_at)}
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      {u.status === "PENDING_VERIFICATION" && (
                        <Button size="sm" variant="outline" onClick={() => changeStatus(u.id, "ACTIVE")}>
                          Aktifkan
                        </Button>
                      )}
                      {u.status === "ACTIVE" && (
                        <Button size="sm" variant="outline" className="text-destructive" onClick={() => changeStatus(u.id, "SUSPENDED")}>
                          Suspend
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableShell>

      <Pager page={list.page} hasMore={list.hasMore} loading={list.loading} onPrev={list.goPrev} onNext={list.goNext} />
    </div>
  );
}
