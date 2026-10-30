# Laporan Redesign Detail Khatmil — Mockup rev 2 (2026-10-30)

## Cakupan
Implementasi penuh mockup rev 2 halaman detail `/khatmil/[id]` (lampiran user, "Khatmil Ramadhan 1447 H — Sesi Selesai"), menggantikan layout rev sebelumnya. Satu file komponen baru, satu file halaman disinkronkan:

- `src/app/(dashboard)/khatmil/[id]/sections.tsx` — ditulis ulang utuh (rev 2).
- `src/app/(dashboard)/khatmil/[id]/page.tsx` — impor/prop disinkronkan + aksi **Bagikan** nyata (copy URL → toast).

## Struktur baru (sesuai mockup rev 2)
1. **SessionHeroCard** — kartu putih: breadcrumb "Kembali ke Daftar Khatmil", judul + StatusBadge, meta pills (periode, `N Kelompok • Target N× Khatam`, `N Santri Total`, slug chip), tombol Bagikan / Cetak Laporan / Ubah Sesi (Ubah Sesi hanya saat `canWrite`).
2. **HeroProgressAndKpis** (grid 12: hero 8 + 4 KPI 4) — hero: `PROGRES KESELURUHAN` % count-up, badge "N Juz Dipegang Santri", target selesai, bar 30 pill (gabungan multi-kelompok / peta tunggal), legend Selesai/Dibaca/Tersedia, "N peserta menyelesaikan juz". KPI: Kelompok (daftar member_count), Pembina Sesi (jumlah + rasio + nama), Verifikasi Bacaan (Otomatis/Manual), Capaian Tertinggi (kelompok + % + x/30 juz).
3. **JuzMatrixSection** — header + badge "N Kelompok Terdaftar" + toggle **Mode Detail / Bandingkan** (multi-kelompok) + "+ Tambah Kelompok" (stub disabled, toast "Belum tersedia"); kartu overview kelompok **5 per halaman** (ACC Tahap 1) dengan %, pembina, n/30 terisi, bar; meta bar kelompok aktif (pembina, santri terdaftar, slot tersedia) + filter juz Semua/Diambil/Tersedia + tombol Ganti/Tetapkan Pembina (dialog); **30 kartu juz** per kelompok (Juz N + badge Selesai/% + nama pemilik; kosong = dashed "+ Ambil"); klik kartu → panel detail juz inline (pemilik, status, posisi bacaan, tanggal selesai) — fitur ACC dipertahankan; catatan alur penugasan.
4. **PesertaSection** — kontrol select kelompok + cari; tabel: # (rank per kelompok terpilih), Nama (avatar + sejak + lapor), badge Kelompok, pill Juz Selesai, badge Juz Dipegang (dari `juz_active`), bar Progres Bacaan, Kontribusi %, kolom Aksi ⋮ stub; footer "Menampilkan 1–10 dari N" + pagination.
5. **ActivitySpecSection** (split 7/5) — kiri 5 aktivitas naratif + "Lihat Semua Log" (stub disabled, API max 50); kanan Detail Informasi Sesi (deskripsi/periode/mode/kuota/verifikasi/slug) + link "Ubah Pengaturan Sesi →" (tetap tampil saat terminal, nonaktif — ACC user).
6. **PrintView** — dipertahankan dari versi sebelumnya (cetak data penuh).

## Komitmen ACC yang dipertahankan
- Fitur panel detail juz inline (klik kartu juz).
- Pagination kartu kelompok 5/halaman (ACC Tahap 1 skalabilitas).
- Link "Kelola/Ubah Pengaturan Sesi" tetap tampil di campaign terminal (form terkunci).
- Count-up hormat `prefers-reduced-motion`; entrance animation `motion-safe:animate-in`.
- Kontrak API, izin, perhitungan, lifecycle tidak berubah (fetch sama: campaigns/participants/activity; assign-pembina via dialog 1 input — sesuai aturan anti-popup).

## Verifikasi (dev server + Chromium, 2026-10-30)
| Uji | Hasil |
|---|---|
| `tsc --noEmit` / `eslint` / `next build` | lolos semua |
| id 44 COMPLETED 3 kelompok | hero 100% + 30 pill + legend; 4 KPI; kartu overview; filter juz Semua(30)/Diambil(30)/Tersedia(0); panel detail juz buka/tutup; mode Bandingkan; cari santri (1–1); pagination peserta 1/3→2/3; link Ubah Pengaturan Sesi redup tapi tampil |
| id 36 ACTIVE 1 kelompok | label "Peta Selesai (single)", tanpa toggle bandingkan, tombol **Ubah Sesi** tampil, dialog assign terbuka + daftar ustadz + tutup tanpa assign |
| id 41 CANCELLED 10 kelompok | pagination kelompok 1/2→2/2 (5/hlm), Bandingkan 10 Kelompok render bar |
| Breakpoint 390/768/1440 px | overflow-x = 0 px di semua |
| Console | 0 error |
| Screenshot | `artifacts/shots/mq/khatmil-detail-rev2-{desktop,mobile,tablet,aktif36}.png` |

## Catatan
- Kolom "Juz Dipegang"/"Progres Bacaan" kosong (—) pada campaign COMPLETED — memang `juz_active` kosong; terisi pada campaign aktif.
- Pagination peserta memakai nomor tampilan di atas data yang sudah termuat (≤50), bukan cursor — sesuai mockup rev 2.
