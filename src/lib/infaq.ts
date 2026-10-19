"use client";

// Data bersama modul infaq (Penerima Infaq / Rekap Infaq / detail penerima).

import { useCallback, useEffect, useState } from "react";
import { apiGet, ApiError } from "./api";
import { toast } from "sonner";

export interface LaporanRow {
  user_id: number;
  nama: string | null;
  email: string | null;
  status: string;
  saldo: number;
  total_diterima: number;
  total_ditarik: number;
  pending_tarik: number;
}

export interface MutasiTx {
  id: number;
  tx_type: string;
  amount: number;
  balance_after: number;
  subject_type: string | null;
  subject_id: number | null;
  created_at: string;
}

export function useLaporanInfaq() {
  const [rows, setRows] = useState<LaporanRow[] | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await apiGet<{ items: LaporanRow[] }>("/admin/infaq/laporan");
      setRows(res.items);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { rows, load };
}

export function useMutasi(userId: number | null) {
  const [items, setItems] = useState<MutasiTx[] | null>(null);

  const load = useCallback(async () => {
    if (userId === null) return;
    setItems(null);
    try {
      // endpoint admin/wallet/{id}/transactions balik array langsung (bukan {items})
      const res = await apiGet<MutasiTx[] | { items: MutasiTx[] }>(
        `/admin/wallet/${userId}/transactions?limit=100`,
      );
      setItems(Array.isArray(res) ? res : (res.items ?? []));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Gagal memuat mutasi");
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, reload: load };
}

export const LABEL_TX: Record<string, string> = {
  TOPUP: "Top-up",
  PAYMENT: "Pembayaran",
  REFUND: "Pengembalian",
  EARNING: "Pendapatan",
  PAYOUT: "Penarikan",
  ADJUST: "Penyesuaian",
};

export const LABEL_STATUS_PAYOUT: Record<string, string> = {
  PENDING: "Menunggu ACC",
  APPROVED: "Disetujui — menunggu transfer",
  TRANSFERRED: "Selesai ditransfer",
  REJECTED: "Ditolak",
};
