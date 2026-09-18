"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiGetPage, ApiError } from "@/lib/api";
import { toast } from "sonner";

/**
 * useAdminList — state machine list admin seragam:
 * - tanpa sort  : cursor keyset (prev/next, riwayat cursor per halaman).
 * - dengan sort : mode page/offset (sort non-id tak bisa pakai keyset).
 * Filter (params) berubah -> otomatis reset ke halaman 1 + reload.
 */
export function useAdminList<T>(
  path: string,
  opts: {
    params?: Record<string, string | undefined>;
    limit?: number;
    errorMsg?: string;
  } = {},
) {
  const { params = {}, limit = 20, errorMsg = "Gagal memuat data" } = opts;
  const paramsKey = JSON.stringify(params);

  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<string | null>(null);
  const [order, setOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  // riwayat cursor: cursors[0] = halaman 1 (null), cursors[n] = cursor halaman n+1
  const cursors = useRef<(string | null)[]>([null]);
  const nextCursor = useRef<string | null>(null);
  // anti race: hanya respons request TERAKHIR yang boleh menulis state
  // (sort/filter cepat berganti -> respons lama terlambat datang bisa menimpa yang baru)
  const seq = useRef(0);

  const load = useCallback(
    async (c: string | null, p: number) => {
      const my = ++seq.current;
      setLoading(true);
      try {
        const extra: Record<string, string | undefined> = { ...params };
        if (sort) {
          extra.sort = sort;
          extra.order = order;
          extra.page = String(p);
        } else {
          if (c) extra.cursor = c;
        }
        extra.limit = String(limit);
        const res = await apiGetPage<T>(path, extra);
        if (seq.current !== my) return; // respons basi — abaikan
        setItems(res.items);
        setHasMore(res.hasMore);
        nextCursor.current = res.nextCursor;
        setPage(p);
      } catch (e) {
        if (seq.current !== my) return;
        toast.error(e instanceof ApiError ? e.message : errorMsg);
      } finally {
        if (seq.current === my) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [path, paramsKey, sort, order, limit, errorMsg],
  );

  useEffect(() => {
    cursors.current = [null];
    load(null, 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);

  const toggleSort = useCallback(
    (col: string) => {
      if (sort !== col) {
        setSort(col);
        setOrder("asc");
      } else if (order === "asc") {
        setOrder("desc");
      } else {
        setSort(null);
        setOrder("asc");
      }
    },
    [sort, order],
  );

  const goNext = useCallback(() => {
    if (sort) {
      load(null, page + 1);
    } else if (nextCursor.current) {
      const cs = cursors.current;
      cs[page] = nextCursor.current;
      cursors.current = cs;
      load(nextCursor.current, page + 1);
    }
  }, [load, sort, page]);

  const goPrev = useCallback(() => {
    const p = page - 1;
    if (p < 1) return;
    load(sort ? null : cursors.current[p - 1] ?? null, p);
  }, [load, sort, page]);

  const reload = useCallback(() => {
    if (sort) load(null, page);
    else load(cursors.current[page - 1] ?? null, page);
  }, [load, sort, page]);

  return {
    items,
    setItems,
    loading,
    sort,
    order,
    toggleSort,
    page,
    hasMore,
    goNext,
    goPrev,
    reload,
  };
}
