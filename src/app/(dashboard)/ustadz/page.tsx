"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
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

interface Ustadz {
  id: number;
  full_name: string;
  photo_url?: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  status: string;
  last_login_at: string | null;
  verified: boolean;
  pendidikan: string | null;
  is_accepting: boolean | null;
  price_per_hour: number | null;
  rating_avg: number | null;
  rating_count: number;
  saldo_penghasilan: number;
  kunjungan_selesai: number;
}

const COLS = 9;

export default function UstadzPage() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [total, setTotal] = useState<number | null>(null);

  const list = useAdminList<Ustadz>("/admin/ustadz", {
    params: {
      q: q || undefined,
      status: status === "all" ? undefined : status,
    },
    limit: 20,
  });

  useEffect(() => {
    const qs = new URLSearchParams({ role: "USTADZ" });
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
        title="Ustadz"
        total={total}
        totalSuffix="ustadz"
        subtitle="Verifikasi, tarif per jam & rating — klik baris untuk detail"
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
              <Head label="Pendidikan" />
              <Head label="Tarif/Jam" className="text-right" />
              <Head label="Rating" />
              <SortHead label="Saldo" col="saldo" sort={list.sort} order={list.order} onSort={list.toggleSort} className="text-right" />
              <Head label="Menerima" />
              <SortHead label="Status" col="status" sort={list.sort} order={list.order} onSort={list.toggleSort} />
              <SortHead label="Login Terakhir" col="last_login_at" sort={list.sort} order={list.order} onSort={list.toggleSort} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={6} cols={COLS} />
            ) : list.items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Tidak ada ustadz sesuai filter." />
            ) : (
              list.items.map((u, i) => (
                <TableRow key={u.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/ustadz/${u.id}`)}>
                  <TableCell className="text-muted-foreground">{(list.page - 1) * 20 + i + 1}</TableCell>                  <TableCell>
                    <div className="flex items-center gap-2">
                      <UserAvatar photoUrl={u.photo_url} name={u.full_name} />
                      <div>
                        <div className="font-medium">
                          {u.full_name}
                          {u.verified && <span className="ml-1 text-green-600" title="Terverifikasi">✓</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">#{u.id} · {u.city ?? "-"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{u.email ?? "-"}</div>
                    <div className="text-xs text-muted-foreground">{u.phone ?? ""}</div>
                  </TableCell>
                  <TableCell className="text-sm">{u.pendidikan ?? "-"}</TableCell>
                  <TableCell className="whitespace-nowrap text-right text-sm">
                    {u.price_per_hour ? rp(u.price_per_hour) : "-"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {u.rating_count > 0 ? (
                      <span className="font-semibold text-amber-600">★{u.rating_avg?.toFixed(1)}</span>
                    ) : (
                      <span className="text-muted-foreground">belum ada rating</span>
                    )}
                    <span className="ml-1 text-xs text-muted-foreground">({u.rating_count})</span>
                  </TableCell>
                  <TableCell className={`text-right font-semibold ${u.saldo_penghasilan > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                    {rp(u.saldo_penghasilan)}
                  </TableCell>
                  <TableCell>
                    {u.is_accepting === null ? (
                      <span className="text-xs text-muted-foreground">belum diatur</span>
                    ) : u.is_accepting ? (
                      <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">Terima</Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">Tutup</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={u.status} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{fmtDateTime(u.last_login_at)}</TableCell>
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
