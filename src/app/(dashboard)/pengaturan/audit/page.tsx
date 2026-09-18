"use client";

import { useMemo, useState } from "react";
import {
  PageHeader,
  Toolbar,
  SearchInput,
  RefreshButton,
  TableShell,
  Head,
  TableSkeleton,
  EmptyRow,
  Pager,
} from "@/components/data-table";
import { useAdminList } from "@/hooks/use-admin-list";
import { fmtDateTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditEntry {
  id: number;
  actor_id: number | null;
  action: string;
  module: string;
  entity_type: string | null;
  entity_id: string | null;
  old: unknown;
  new: unknown;
  created_at: string;
}

const COLS = 7;

export default function AuditPage() {
  const [q, setQ] = useState("");
  const [module, setModule] = useState("all");

  const list = useAdminList<AuditEntry>("/admin/audit-logs", {
    params: { module: module === "all" ? undefined : module },
    limit: 50,
  });

  const items = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return list.items;
    return list.items.filter(
      (a) =>
        a.module?.toLowerCase().includes(s) ||
        a.action?.toLowerCase().includes(s) ||
        String(a.entity_id ?? "").includes(s),
    );
  }, [list.items, q]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Audit Log"
        subtitle="Jejak semua perubahan data oleh admin & sistem"
      />

      <Toolbar>
        <SearchInput value={q} onChange={setQ} placeholder="Cari modul / aksi / ID entitas…" />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={module}
          onChange={(e) => setModule(e.target.value)}
        >
          <option value="all">Semua modul</option>
          <option value="users">users</option>
          <option value="khatmil">khatmil</option>
          <option value="visits">visits</option>
          <option value="wallet">wallet</option>
          <option value="cms">cms</option>
          <option value="settings">settings</option>
        </select>
        <RefreshButton onClick={list.reload} />
      </Toolbar>

      <TableShell>
        <Table>
          <TableHeader>
            <TableRow>
              <Head label="Waktu" />
              <Head label="Aktor" />
              <Head label="Modul" />
              <Head label="Aksi" />
              <Head label="Entitas" />
              <Head label="Perubahan" />
              <Head label="Nilai Baru" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.loading && list.items.length === 0 ? (
              <TableSkeleton rows={6} cols={COLS} />
            ) : items.length === 0 ? (
              <EmptyRow colSpan={COLS} message="Belum ada log audit." />
            ) : (
              items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</TableCell>
                  <TableCell className="text-xs">
                    {a.actor_id ? (
                      `#${a.actor_id}`
                    ) : (
                      <Badge variant="secondary" className="bg-gray-100 text-gray-600">sistem</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{a.module}</Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a.action}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.entity_type ? `${a.entity_type} ${a.entity_id ?? ""}` : "—"}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-xs text-muted-foreground">
                    {a.old ? JSON.stringify(a.old) : "—"}
                  </TableCell>
                  <TableCell className="max-w-64 truncate text-xs">{a.new ? JSON.stringify(a.new) : "—"}</TableCell>
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
