# Laporan Animasi Detail Khatmil — Fidelity Mockup rev 2 (2026-10-31)

## Cakupan
Melengkapi implementasi rev 2 (commit `19d8b5d`) dengan **lapisan animasi mockup** yang belum diterapkan — struktur/konten sudah identik, yang hilang hanya gerakannya. Dua file diubah:

- `src/app/globals.css` — keyframes `khatmil-*` (wave kolom, cascade pill, grow bar, shimmer) + kelas `.khatmil-*` + guard `@media print`.
- `src/app/(dashboard)/khatmil/[id]/sections.tsx` — pemasangan kelas/prop CSS var; tanpa perubahan kontrak API, izin, atau fitur.

## Animasi (semua hormat `prefers-reduced-motion`)
| Elemen | Animasi mockup | Implementasi |
|---|---|---|
| 30 pill hero | cascade fill kiri→kanan 40ms/pil | `.khatmil-pill-seg` + `--seg-delay` |
| Grid 30 kartu juz | wave per kolom 175ms via IntersectionObserver | `.khatmil-juz-card` + `--col-index` (kolom = ((juz-1)%10)+1); observer menempel pada **container grid** (threshold 0.15, rootMargin -60px) sehingga wave main tepat saat grid masuk viewport saat di-scroll — bukan saat section; node dipantau via state ref agar observer menempel ulang saat pindah mode Detail ↔ Bandingkan |
| Hover kartu juz | lift -3px scale 1.03 | `hover:-translate-y-[3px] hover:scale-[1.03]` |
| Bar progres (kartu kelompok, bandingkan, tabel peserta) | grow dari 0 + shimmer saat 100% | `.khatmil-bar` / `.khatmil-bar-lengkap` + `--target-width`, `--bar-delay` |
| Entrance 4 blok section | fade + naik 8px, delay 50/100/150/200ms | `.khatmil-entrance` (fill both, tanpa flash) |

Ring kartu terpilih tetap persisten (fitur ACC), bukan flash 350ms mockup — seleksi nyata punya arti lebih.

## Verifikasi (dev server + Chromium, 2026-10-31)
| Uji | Hasil |
|---|---|
| `tsc --noEmit` / `eslint` | lolos (fix awal: hapus setState sinkron di effect — reduced-motion cukup ditangani gating CSS `no-preference`) |
| id 44 COMPLETED (skenario mockup) | h1 "Khatmil Ramadhan 1447 H — Sesi Selesai"; 30 pill cascade → opacity 1; 3 bar lengkap + shimmer aktif; hover translate -3px scale 1.03 |
| Wave scroll (revisi 31 Okt) | sebelum scroll: grid belum reveal, kartu opacity 0; 300ms setelah grid masuk viewport: reveal aktif, kolom awal 0.91 & kolom akhir masih 0 (wave berjalan); 2s: semua opacity 1; pindah Bandingkan→Detail: 30 kartu kembali tampil (min opacity ≈1) — bukti `khatmil-detail-anim-wave-scroll.png` |
| id 36 ACTIVE | 9 pill amber cascade, 21 "+ Ambil"; bar peserta grow dgn % nyata (24,6%/20,9%/0,6%…); tombol Ubah Sesi tampil |
| Reduced motion (emulasi) | kartu opacity 1, `animation-name: none`, bar tetap penuh — animasi mati total |
| Fitur ACC tetap jalan | klik kartu → panel detail "Pemilik: Imron Wahyudi · Selesai" + ring; tutup → ring hilang; filter Semua/Diambil/Tersedia; toggle Bandingkan |
| Mobile 390px | overflow-x 0px |
| Console | 0 error |
| Screenshot | `artifacts/shots/mq/khatmil-detail-anim-{desktop,mobile,aktif36}.png` |

## Catatan lingkungan (bukan kode)
Saat pemeriksaan, **seluruh stack dev lokal mati** (dev server 3210 jadi proses zombie yang menjawab halaman tapi proxy-nya mati → halaman nyangkut di skeleton; BE 8290 dan MySQL juga mati). Stack dinyalakan ulang sebagai service: `mysql-mq` (mysqld 8.0.30, port 3306), `mq-be` (`target/debug/mq-backend.exe`, port 8290), `mq-admin-dev2` (`npm run dev`, port 3210). Login admin dev `admin@mq.local` / `rahasia123` berfungsi (tidak direset).

## Tidak diubah
- PrintView tetap statis; `@media print` memaksa bar tampil penuh tanpa animasi.
- Kolom Progres Bacaan kosong (—/0%) di campaign COMPLETED tetap sesuai data (`juz_active` kosong) — perilaku ACC rev 2.
