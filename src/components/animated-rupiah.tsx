"use client";

import { useEffect, useRef, useState } from "react";
import { rp } from "@/lib/format";

/**
 * Count-up halus menuju `value`.
 * - `animateOnMount`: mulai dari 0 saat kartu pertama tampil (KPI halaman detail);
 *   tanpa ini, perilaku lama: langsung tampil, hanya menganimasikan saat NILAI BERUBAH.
 * - Langsung tampil penuh bila pengguna mengurangi gerakan.
 */
function useCountUp(value: number, animateOnMount: boolean) {
  const [tampil, setTampil] = useState(() => (animateOnMount ? 0 : value));
  const dari = useRef(tampil);

  useEffect(() => {
    if (dari.current === value) return;
    const kurangiGerakan = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (kurangiGerakan) {
      // tetap satu frame — hindari setState sinkron di dalam effect
      const raf = requestAnimationFrame(() => {
        dari.current = value;
        setTampil(value);
      });
      return () => cancelAnimationFrame(raf);
    }
    const awal = dari.current;
    const t0 = performance.now();
    const durasi = 900;
    let raf = 0;
    const tik = (t: number) => {
      const p = Math.min((t - t0) / durasi, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setTampil(Math.round(awal + (value - awal) * e));
      if (p < 1) raf = requestAnimationFrame(tik);
      else dari.current = value;
    };
    raf = requestAnimationFrame(tik);
    return () => cancelAnimationFrame(raf);
  }, [value, animateOnMount]);

  return tampil;
}

/** Angka rupiah dengan animasi count-up halus. */
export function AnimatedRupiah({
  value,
  className,
  animateOnMount = false,
}: {
  value: number;
  className?: string;
  animateOnMount?: boolean;
}) {
  const tampil = useCountUp(value, animateOnMount);
  return <span className={className}>{rp(tampil)}</span>;
}

/** Angka bulat biasa (bukan rupiah) dengan animasi count-up halus. */
export function AnimatedNumber({
  value,
  className,
  animateOnMount = false,
}: {
  value: number;
  className?: string;
  animateOnMount?: boolean;
}) {
  const tampil = useCountUp(value, animateOnMount);
  return <span className={className}>{tampil.toLocaleString("id-ID")}</span>;
}
