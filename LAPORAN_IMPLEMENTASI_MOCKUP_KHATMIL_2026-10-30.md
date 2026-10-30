# Laporan Implementasi Mockup Detail Khatmil (penuh)

**Tanggal:** 30 Oktober 2026
**Acuan:** mockup HTML "Khatmil MQ Angkatan 1 2026" (lampiran ACC pemilik — pilihan *Implementasi penuh mockup*) + akumulasi keputusan sebelumnya.
**Status:** selesai & terverifikasi di backend asli `mq_dev`. **Tanpa commit/push/deploy; backend/DB/izin tak diubah.**

## A. Yang diimplementasikan (struktur sesuai mockup)

1. **Hero session header** — back-link "Kembali ke Daftar Khatmil", judul + pill status Aktif, meta pills (periode • "N Kelompok • Target N× Khatam" • "N Santri Total" • chip slug), tombol **Bagikan** / **Cetak Laporan** / **Ubah Sesi**.
2. **Analytics 12-kolom** — kartu besar (angka % besar + bar 30 segmen + legend Selesai/Dibaca/Tersedia + "N peserta menyelesaikan juz") dan **4 kartu stat**: Kelompok (grup + santri + rincian per kelompok), Pembina Sesi (jumlah asatidz + rasio + nama), Verifikasi Bacaan, Capaian Tertinggi (kelompok terbaik + % + pembina).
3. **Peta & Distribusi Juz per Kelompok** — toggle **"Mode Detail Kelompok" / "Bandingkan N Kelompok"**, tombol "+ Tambah Kelompok" (stub), kartu selector kelompok **5/halaman** (sesuai ACC pagination; peta lama otomatis tertutup saat ganti halaman), meta bar aktif (pembina, santri terdaftar, slot tersedia, filter **Semua/Diambil/Tersedia**), **kartu juz detail** (nomor, %, pemilik; kosong = "+ Ambil"), panel detail juz inline, catatan alur penugasan.
4. **Peserta & Peringkat Bacaan** — kontrol filter kelompok (stub), cari santri, tombol Filter (stub), tabel baru (#, Nama+sejak+lapor, Juz Selesai, Juz Dipegang, Progres Bacaan bar+%, Kontribusi, Aksi ⋮ stub), footer pagination "1–10 dari 13".
   **Update (30 Okt, permintaan "peserta berdasarkan kelompok"):** filter kelompok kini **berfungsi** — peta `nama peserta → kelompok` diturunkan dari `juz_map_groups` (owner_name per kelompok, cocok 21/21 di campaign 44). Pilih kelompok → tabel hanya anggota kelompok itu, **peringkat dihitung ulang di dalam kelompok** (1..7), footer "1–7 dari 7 peserta (Kelompok 2)", dan kolom **Kelompok** (badge "Kel. N") ditambahkan ke tabel. Peserta yang belum mengambil juz tampil hanya di "Semua Kelompok" dengan tanda "—" (keterbatasan sampai API Tahap 2 mengirim kelompok per peserta).
5. **Dual-split** — kiri "Aktivitas Laporan Terbaru" (5 terbaru, "Lihat Semua Log" stub disabled), kanan "Detail Informasi Sesi" (dl + link Kelola bila tidak terminal).
6. **Cetak** — tombol hero "Cetak Laporan" → `PrintView` render terpisah dengan header campaign + label cakupan jujur ("seluruh kelompok & peserta · Aktivitas: N laporan terbaru — API maks 50, bukan riwayat lengkap").

## B. Deviasi terencana dari mockup (diputuskan demi kebenaran data & ACC sebelumnya)

| Mockup | Implementasi | Alasan |
|---|---|---|
| "7.8% **Khatam Tercapai**" | "7.8% **progres bacaan**" | Koreksi pemilik sendiri (review gel. 1): 7,8% ≠ khatam; memisahkan progres bacaan vs juz selesai sudah ACC & diverifikasi |
| Angka "42 Santri / 3 Kelompok / 42.0% Kel. 2 / 1:14 / Ust. Hasan, Zaki" | Dihitung dari API nyata (13 santri, 1 kelompok, dst.) | Melarang data fiktif; semua kartu memakai agregat nyata |
| "Lihat Semua Log" menuju riwayat lengkap | Stub disabled + keterangan "API maks 50" | API belum punya pagination riwayat (keputusan: jangan klaim lengkap) |
| Aksi "+ Ambil / Tukar Santri / Salin Susunan / Atur Ulang Slot / Bandingkan→drilldown / Bagikan / Buka Tiket" fungsional | Tombol tampil; aksi → toast "Belum tersedia — butuh dukungan backend" atau disabled+title | Endpoint/izin tidak ada; backend di luar cakupan |
| Kolom tabel "Kelompok" per peserta | Belum ada (data kelompok-per-peserta tidak dikirim API) | Tahap 2 (API) |
| Sort tabel "progres bacaan tertinggi" | Tetap juz selesai terbanyak → nama | Aturan produk yang dikukuhkan pemilik di verifikasi |
| Pagination "1-7 dari 13" (tabel 7 baris) | "1–10 dari 13" konsisten 10/hlm | ACC 10 peserta/halaman |
| TOC anchor "BAGIAN" | Dihapus (mockup tanpa TOC) | mengikuti mockup |
| Top-3 highlight lama | Dihapus (mockup menempatkannya lewat sort berbeda) | mengikuti mockup; sort bawaan dipertahankan |

## C. Verifikasi

- ESLint folder khatmil + `next.config.ts`: **0 masalah**; `tsc --noEmit` lulus; `next build` ✓.
- Browser (backend asli): hero/analytics/matrix/peserta/dual-split terverifikasi DOM (label, jumlah kartu, filter, pagination); "+ Ambil" → toast stub; kartu juz → panel "Pemilik… Posisi bacaan QS…" tetap bekerja; mode Bandingkan menampilkan bar per kelompok; 10 kelompok: selector 5/hlm → hlm 2 = K6–10, K6 terpilih; PrintView: label cakupan + 13 peserta penuh; **konsol 0 error**.
- Responsif: overflow-x 0 di 1440/768/375.
- PDF dicetak ulang via mode cetak: `khatmil-final-35.pdf` (13 peserta penuh), `khatmil-final-33.pdf` (2 kelompok, label jujur).
- Bukti: `m1-detail35-1440.png`, `m1-detail35-juz.png`, `m1-bandingkan-33.png`, `m1-groups41-hlm2.png`, `m1-375.jpg`, `m1-768.png`, `t1-printview-35.png`.

## D. Catatan

- Bagian shell (sidebar/header global) tidak diubah — hanya konten halaman detail.
- Aksi stub kini memakai `toast.info("Belum tersedia — butuh dukungan backend")` — pola jujur; pindah ke implementasi nyata bila backend menyediakan.
- Halaman lama (TOC, kartu statistik 5 kotak, disclosure) digantikan penuh; semua alur ACC lama (pilih juz → panel, penugasan pembina → Menunggu ACC, terminal tanpa aksi tulis, fail-path Simpan tetap di form) tetap berfungsi dan diuji pada tahap-tahap sebelumnya.
