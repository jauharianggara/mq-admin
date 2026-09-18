"use client";

import { Badge } from "@/components/ui/badge";

/**
 * StatusPill — SATU-SATUNYA cara menampilkan status di admin.
 * Peta domain -> warna + label Indonesia (istilah kontekstual, bukan code mentah).
 */

const TONE = {
  green: "bg-emerald-100 text-emerald-800",
  sky: "bg-sky-100 text-sky-700",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
  gray: "bg-gray-100 text-gray-600",
} as const;

type Tone = keyof typeof TONE;

/** [label Indonesia, tone] */
const MAP: Record<string, [string, Tone]> = {
  // user
  ACTIVE: ["Aktif", "green"],
  PENDING_VERIFICATION: ["Menunggu verifikasi", "amber"],
  SUSPENDED: ["Ditangguhkan", "red"],
  DEACTIVATED: ["Dinonaktifkan", "gray"],
  DELETED: ["Terhapus", "gray"],
  // kunjungan (visit)
  REQUESTED: ["Menunggu pembayaran", "sky"],
  WAITING_CONFIRM: ["Menunggu ACC ustadz", "amber"],
  CONFIRMED: ["Terjadwal", "green"],
  COMPLETED: ["Selesai", "green"],
  REVIEWED: ["Selesai & dinilai", "purple"],
  DECLINED: ["Ditolak ustadz", "red"],
  CANCELED: ["Dibatalkan", "gray"],
  PAYMENT_EXPIRED: ["Pembayaran kedaluwarsa", "gray"],
  // pembayaran
  PAID: ["Lunas", "green"],
  EXPIRED: ["Kedaluwarsa", "gray"],
  REFUNDED: ["Dikembalikan ke deposit", "purple"],
  FAILED: ["Gagal", "red"],
  // penarikan ustadz
  PENDING: ["Menunggu ACC", "amber"],
  APPROVED: ["Disetujui", "sky"],
  TRANSFERRED: ["Sudah ditransfer", "green"],
  REJECTED: ["Ditolak", "red"],
  // materi
  DRAFT: ["Draf", "gray"],
  PUBLISHED: ["Terbit", "green"],
  ARCHIVED: ["Diarsipkan", "amber"],
  // khatmil campaign
  SCHEDULED: ["Terjadwal", "sky"],
  CANCELLED: ["Dibatalkan", "gray"],
  // pertanyaan
  QUEUED: ["Menunggu ustadz", "amber"],
  ASSIGNED: ["Ditugaskan", "sky"],
  ANSWERED: ["Dijawab", "green"],
  PUBLISH_REQUESTED: ["Minta tayang", "purple"],
  CLOSED: ["Ditutup", "gray"],
  // hafalan
  IN_REVIEW: ["Sedang direview", "sky"],
  PASSED: ["Lulus", "green"],
  REVISION: ["Perlu revisi", "amber"],
  // penyesuaian saldo
  ACCEPTED: ["Disetujui", "green"],
};

export function StatusPill({ status, fallbackLabel }: { status: string; fallbackLabel?: string }) {
  const [label, tone] = MAP[status] ?? [fallbackLabel ?? status, "gray"];
  return <Badge variant="secondary" className={TONE[tone]}>{label}</Badge>;
}

export function statusLabel(status: string): string {
  return MAP[status]?.[0] ?? status;
}
