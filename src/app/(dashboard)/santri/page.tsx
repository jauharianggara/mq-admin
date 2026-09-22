"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserAvatar } from "@/components/user-avatar";
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
import { rp, fmtDateTime } from "@/lib/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Santri {
  id: number;
  full_name: string;
  photo_url?: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  last_login_at: string | null;
  deposit: number;
  khatmil_aktif: number;
  kunjungan_selesai: number;
}

const COLS = 8;

export default function SantriPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [total, setTotal] = useState<number | null>(null);

  const list = useAdminList<Santri>("/admin/santri", {
    params: {
      q: q || undefined,
      status: status === "all" ? undefined : status,
    },
    limit: 20,
  });

  useEffect(() => {
    const qs = new URLSearchParams({ role: "SANTRI" });
    if (status !== "all") qs.set("status", status);
    if (q.trim()) qs.set("q", q.trim());
    apiGet<{ total: number }>(`/admin/users-count?${qs.toString()}`)
      .then((d) => setTotal(d.total))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Santri"
        total={total}
        totalSuffix="santri"
        subtitle="Deposit, khatmil aktif & riwayat kunjungan — klik baris untuk detail"
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Cari nama / email / nomor HP…" />
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
              <Head label="No." className="w-10" />
              <SortHead label="Nama" col="full_name" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <Head label="Kontak" />
              <Head label="Kota" />
              <SortHead label="Deposit" col="deposit" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-right" />
              <Head label="Khatmil Aktif" className="text-center" />
              <Head label="Kunjungan Selesai" className="text-center" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <SortHead label="Login Terakhir" col="last_login_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={6} cols={COLS} />
            ) : list.items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Tidak ada santri sesuai filter." />
            ) : (
              list.items.map((s, i) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/santri/${s.id}`)}>
                  <TableCell className="text-muted-foreground">{(list.page - 1) * 20 + i + 1}</TableCell>                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserAvatar photoUrl={s.photo_url} name={s.full_name} />
                      <div>
                        <div className="font-medium">{s.full_name}</div>
                        <div className="text-xs text-muted-foreground">#{s.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{s.email ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{s.phone ?? ""}</div>
                  </TableCell>
                  <TableCell>{s.city ?? "-"}</TableCell>
                  <TableCell className={`text-right font-semibold ${s.deposit > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                    {rp(s.deposit)}
                  </TableCell>
                  <TableCell className="text-center">{s.khatmil_aktif}</TableCell>
                  <TableCell className="text-center">{s.kunjungan_selesai}</TableCell>
                  <TableCell>
                    <StatusPill status={s.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDateTime(s.last_login_at)}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableShell>

      <Pager page={list.page} hasMore={list.hasMore} loading={list.loading} onPrev={list.goPrev} onNext={list.goNext} />
    </div>
  );
}
