"use client";

import { useEffect, useRef, useState } from "react";
import { rp } from "@/lib/format";

/** Angka rupiah dengan animasi count-up halus; langsung tampil bila pengguna mengurangi gerakan. */
export function AnimatedRupiah({ value, className }: { value: number; className?: string }) {
  const [tampil, setTampil] = useState(value);
  const dari = useRef(value);

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
  }, [value]);

  return <span className={className}>{rp(tampil)}</span>;
}
