# Laporan Redesign Halaman Santri — Mockup (2026-10-31)

## Cakupan
Implementasi mockup halaman `/santri` (lampiran; judul shell "Pembayaran (Xendit)" hanya artefak generator — isi & sidebar mockup menunjuk halaman **Santri**). File berubah:

- `src/app/(dashboard)/santri/page.tsx` — ditulis ulang (layout KPI + pil filter + kota + ekspor CSV + banner).
- `src/hooks/use-admin-list.ts` — tambah `setSortKey(col, order)` (setter sort programatis utk dropdown; perilaku lama tak berubah) + pemicu load awal dipindah ke `requestAnimationFrame` (aturan `react-hooks/set-state-in-effect`).
- `src/app/globals.css` — keyframes `shimmer-sweep` (mati saat reduce-motion) + alias `.row-accent` untuk aksen hover baris (pola `td:first-child` hasil fix bug Chrome 31 Okt).

## Pemetaan mockup → data nyata
| Mockup | Implementasi |
|---|---|
| Badge "77 santri terdaftar" | `users-count` role SANTRI (77) |
| KPI Total Deposit + rata-rata | full-fetch `?limit=100` → Σ deposit **Rp 1.575.000** (cocok dgn jumlah API), rata-rata `Σ/77`; count-up `AnimatedRupiah`; kartu gelap + shimmer |
| KPI Santri Aktif + "menunggu verifikasi" | `users-count` per status (75/77 = 97%, pending 1) — chip "97% Rasio" dihitung, bukan rekaan |
| KPI Khatmil Berjalan / Kunjungan | agregat kolom `khatmil_aktif` & `kunjungan_selesai` dari data; label disesuaikan (tanpa "bulan ini"/rating — tidak ada di API) |
| Pil status + count | status server-side (ACTIVE/PENDING_VERIFICATION/SUSPENDED), count dari `users-count` |
| Cari (⌘K) | server `q` (debounce 350ms); shortcut ⌘K/Ctrl+K fokus |
| Dropdown kota | **real, client-side** atas full-fetch (BE belum punya filter kota; total ≤100); aktifnya menyalakan mode lokal: filter+sort+paginasi klien, pager bernomor + catatan "data ≤100" |
| Dropdown sort | server-side: Terbaru (default kursor id desc), Nama A-Z (`full_name asc`), Deposit Tertinggi (`deposit desc`) — opsi "Khatmil Terbanyak" mockup dilepas (kolom tidak ada di whitelist sort BE) |
| Baris per halaman 10/25/50 | 10/20/50 (default 20 = konvensi repo), bekerja di kedua mode |
| Ekspor Data | **CSV nyata** dari baris yang tampil (BOM UTF-8, `;`) |
| + Tambah Santri Baru | tombol tampil tapi stub: BE tak punya endpoint create user → toast "Belum tersedia" (pola "+ Tambah Kelompok") |
| Banner kepatuhan + "Lihat Log Verifikasi" | banner informasional; tombol → `/pengaturan/audit` (nyata). "Unduh Panduan Data" dilepas (tidak ada aset) |
| Aksen hover baris, hover lift kartu, fade-in-up stagger, shimmer | `.row-accent`, `motion-safe:hover:-translate-y-0.5`, `animate-in` delay 0/50/100/150/200ms, `.shimmer-sweep` |

List utama tetap **server-side** (useAdminList: q/status/sort/kursor) — konsisten pola skalabilitas; mode lokal hanya saat kota dipilih.

## Verifikasi (dev server + Chromium, 31 Okt)
| Uji | Hasil |
|---|---|
| `tsc --noEmit` / `eslint` | lolos (fix: `setSortKey` masuk return hook, tipe `onValueChange` sort, guard `perPage`,hapus `sortCfg`) |
| KPI vs API | Σ deposit klien = Rp 1.575.000 = jumlah `?limit=100` (77 santri) |
| Pil "Aktif" | 1–10 dari 75 (server filter) |
| Cari "vina" | 1 baris cocok, "1–1 dari 1" |
| Kota "Bandung" | mode lokal: "1–7 dari 7 (filter kota — data ≤100)", pager bernomor |
| Sort Deposit Tertinggi | 1.080.000 / 475.000 / 10.000 (desc) |
| Per halaman 50 | 50 baris, "1–50 dari 77"; kembali 10 |
| Pager server | Berikutnya → "11–20", baris no. 11; Sebelumnya → no. 01 |
| Ekspor CSV | toast "10 baris diekspor ke CSV" + unduhan |
| ⌘K | fokus ke kotak cari |
| Halaman lain (hook berubah) | `/visits` tetap render 20 baris |
| Mobile 390px | overflow-x 0 |
| Console | 0 error kode (1 error eksternal: gambar avatar S3 signing kadaluarsa) |
| Screenshot | `artifacts/shots/mq/santri-redesign-{desktop,mobile}.png` |

## Catatan lingkungan
- Sesi admin hangus saat pengujian (mq_at 15 menit; refresh gagal setelah BE di-restart) → login ulang `admin@mq.local` via UI.
- Perbaikan kecil hasil review screenshot: label select (Semua Kota/Terbaru, bukan nilai mentah), pager "Hal. N", lebar kolom tabel muat 1440px, inisial avatar "(tanpa nama)" → "?".
