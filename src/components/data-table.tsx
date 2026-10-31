"use client";

import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TableCell,
  TableHead as UiTableHead,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  ArrowUpDown,
  Ban,
  Banknote,
  CheckCircle2,
  Eye,
  Pencil,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

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

// ===================== pola baku baris: No | Aksi | Status | Nomor =====================
// (lihat PLAN_POLA_TABEL_BAKU_2026-10-31.md — ACC 31 Okt 2026)

/** Sel "No" — nomor urut mono 2 digit, increment dan reset per halaman. */
export function RowNo({
  i,
  page = 1,
  perPage = 0,
  className,
}: {
  /** indeks baris dalam halaman (0-based) */
  i: number;
  page?: number;
  /** ukuran halaman; 0 = tanpa offset (daftar kecil tanpa paginasi) */
  perPage?: number;
  className?: string;
}) {
  const n = (perPage > 0 ? (page - 1) * perPage : 0) + i + 1;
  return (
    <TableCell className={`text-center font-mono text-muted-foreground ${className ?? ""}`}>
      {String(n).padStart(2, "0")}
    </TableCell>
  );
}

/** Sel "Nomor" — chip mono identitas entri (#ID / external_id / rujukan). */
export function NomorChip({
  label,
  title,
  className,
}: {
  label: string | number;
  title?: string;
  className?: string;
}) {
  return (
    <TableCell className={className}>
      <span
        title={title}
        className="inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground"
      >
        {label}
      </span>
    </TableCell>
  );
}

/** Sel "Aksi" — selalu di kolom kiri; klik tombol tidak memicu klik baris. */
export function AksiCell({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  /** ekstra: cegah klik baris saat menyentuh sel (utk tombol status dsb.) */
  onClick?: (e: React.MouseEvent<HTMLTableCellElement>) => void;
}) {
  return (
    <TableCell className={`whitespace-nowrap ${className ?? ""}`} onClick={onClick}>
      {children}
    </TableCell>
  );
}

/** Ikon default per label TombolAksi — dipakai bila pemanggil tidak mengirim `icon` eksplisit. */
const ICON_BY_LABEL: Record<string, LucideIcon> = {
  Detail: Eye,
  ACC: CheckCircle2,
  Tolak: XCircle,
  Aktifkan: CheckCircle2,
  Nonaktifkan: Ban,
  Suspend: Ban,
  "Sudah ditransfer": Banknote,
  Mutasi: ArrowLeftRight,
  "+ Koreksi": Pencil,
};

/** Tombol aksi baku dalam tabel (PLAN_STANDARD_TOMBOL_TABEL_2026-10-31, ACC 31 Okt):
 *  selalu size xs, shape mengikuti Button, SELALU berikon; stopPropagation bawaan agar klik baris tidak dobel.
 *  variant: outline = detail/proses · default = ACC/aktifkan · destructive = tolak/suspend. */
export function TombolAksi({
  label = "Detail",
  variant = "outline",
  icon,
  href,
  onClick,
  title,
  disabled,
}: {
  label?: string;
  variant?: "outline" | "default" | "destructive" | "ghost";
  icon?: React.ReactNode;
  /** render sebagai <Link> — untuk aksi buka detail */
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  title?: string;
  disabled?: boolean;
}) {
  const IkonBawaan = icon === undefined ? ICON_BY_LABEL[label] : undefined;
  return (
    <Button
      size="xs"
      variant={variant}
      disabled={disabled}
      title={title}
      className={cn(
        variant === "destructive" &&
          "border border-destructive/45 bg-transparent text-destructive hover:bg-destructive/10 dark:bg-transparent",
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      {...(href
        ? { nativeButton: false, render: <Link href={href} onClick={(e) => e.stopPropagation()} /> }
        : {})}
    >
      {icon ?? (IkonBawaan ? <IkonBawaan className="size-3" /> : null)}
      {label}
    </Button>
  );
}
