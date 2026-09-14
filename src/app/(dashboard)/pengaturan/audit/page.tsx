"use client";

import { useCallback, useEffect, useState } from "react";
import { apiGetPage, ApiError } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface AuditEntry {
  id: number;
  actor_id: number | null;
  action: string;
  module: string;
  entity_type: string;
  entity_id: string | null;
  old: unknown;
  new: unknown;
  created_at: string;
}

export default function AuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const page = await apiGetPage<AuditEntry>("/admin/audit-logs", { limit: 50 });
      setItems(page.items);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Jejak semua perubahan admin (terbaru dulu)
        </p>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">ID</TableHead>
              <TableHead>Waktu</TableHead>
              <TableHead>Aktor</TableHead>
              <TableHead>Aksi</TableHead>
              <TableHead>Modul</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Detail</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
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
                  Belum ada audit entry
                </TableCell>
              </TableRow>
            ) : (
              items.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-mono text-xs">{a.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {a.created_at?.replace("T", " ").replace("Z", "")}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{a.actor_id ?? "sys"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        a.action === "DELETE"
                          ? "destructive"
                          : a.action === "CREATE"
                            ? "default"
                            : "secondary"
                      }
                    >
                      {a.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{a.module}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {a.entity_type}#{a.entity_id}
                  </TableCell>
                  <TableCell className="max-w-48">
                    {a.new !== null && a.new !== undefined ? (
                      <code className="text-[10px] text-muted-foreground">
                        {JSON.stringify(a.new).slice(0, 80)}
                      </code>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
