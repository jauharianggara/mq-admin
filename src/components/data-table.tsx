"use client";

import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead as UiTableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

/**
 * Kit halaman list admin — SEMUA halaman index WAJIB pakai komponen ini.
 * Struktur seragam: PageHeader (judul + total + aksi) -> Toolbar (cari + filter + refresh)
 * -> TableShell (SortHead / TableSkeleton / EmptyRow) -> Pager.
 */

export function PageHeader({
  title,
  total,
  totalSuffix,
  subtitle,
  actions,
}: {
  title: string;
  /** counter total di samping judul (mis. 75 santri) */
  total?: number | null;
  totalSuffix?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {title}
          {total !== null && total !== undefined && (
            <span className="ml-1 text-lg font-normal text-muted-foreground">
              · {total.toLocaleString("id-ID")} {totalSuffix ?? ""}
            </span>
          )}
        </h1>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Baris toolbar filter: search kiri (fleksibel) + anak Select/Button kanan + refresh paling kanan. */
export function Toolbar({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Cari…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative min-w-48 flex-1">
      <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8"
      />
    </div>
  );
}

export function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" onClick={onClick} title="Muat ulang">
      <RefreshCw className="h-4 w-4" />
    </Button>
  );
}

// ===================== tabel =====================

export function TableShell({ children }: { children: React.ReactNode }) {
  // overflow-x-auto: tabel lebar (mis. Ustadz 9 kolom) di-scroll horizontal DALAM kotak,
  // bukan memecah layout halaman.
  return <div className="overflow-x-auto rounded-lg border">{children}</div>;
}

/** Header kolom non-sort. */
export function Head({
  label,
  className,
}: {
  label: React.ReactNode;
  className?: string;
}) {
  return <UiTableHead className={className}>{label}</UiTableHead>;
}

/** Header kolom sortable — klik = toggle asc/desc. */
export function SortHead({
  label,
  col,
  sort,
  order,
  onSort,
  className,
}: {
  label: React.ReactNode;
  /** key kolom sesuai whitelist BE; undefined = kolom non-sort */
  col?: string;
  sort?: string | null;
  order?: "asc" | "desc";
  onSort?: (col: string) => void;
  className?: string;
}) {
  if (!col || !onSort) {
    return <Head label={label} className={className} />;
  }
  const active = sort === col;
  const Icon = !active ? ArrowUpDown : order === "asc" ? ArrowUp : ArrowDown;
  return (
    <UiTableHead className={className}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`-ml-1 inline-flex items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-muted ${
          active ? "font-semibold text-foreground" : "text-muted-foreground"
        }`}
        title={active ? `Diurut: ${order === "asc" ? "A-Z" : "Z-A"} — klik untuk balik` : "Klik untuk urutkan"}
      >
        {label}
        <Icon className="size-3.5" />
      </button>
    </UiTableHead>
  );
}

export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: cols }).map((_, j) => (
            <TableCell key={j}>
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function EmptyRow({ colSpan, message = "Belum ada data." }: { colSpan: number; message?: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-10 text-center text-muted-foreground">
        {message}
      </TableCell>
    </TableRow>
  );
}

export function Pager({
  page,
  hasMore,
  loading,
  onPrev,
  onNext,
}: {
  page: number;
  hasMore: boolean;
  loading: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  if (page <= 1 && !hasMore) return null;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Halaman {page}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={onPrev}>
          <ChevronLeft className="mr-1 h-4 w-4" /> Sebelumnya
        </Button>
        <Button variant="outline" size="sm" disabled={!hasMore || loading} onClick={onNext}>
          Berikutnya <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
