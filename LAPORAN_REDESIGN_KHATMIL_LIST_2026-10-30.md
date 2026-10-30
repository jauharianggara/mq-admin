# Laporan Redesign Daftar Khatmil (sesuai mockup — adopsi selektif)

**Tanggal:** 30 Oktober 2026
**Acuan:** mockup HTML "Khatmil (Campaign)" daftar — ACC pemilik: *Adopsi selektif*.
**Batas:** hanya `src/app/(dashboard)/khatmil/page.tsx`. Backend/DB/izin tidak diubah. Tanpa commit/push/deploy.

## Yang diimplementasikan (semua angka dari API nyata, cursor loop seluruh campaign)

1. **4 KPI ala mockup**:
   - Hero emerald: **Total Juz Khatam** = Σ `juz_completed` vs Σ (`group_count`×30) + bar persentase + "N campaign khatam penuh".
   - **Campaign Aktif** + badge "Berjalan".
   - **Peserta Tilawah** = jumlah peserta semua campaign (non-draf) + rata-rata juz/peserta.
   - **Target Selesai Terdekat** = campaign ACTIVE/SCHEDULED dengan `period_end` terdekat yang belum lewat + nama + sisa hari.
2. **Tab status dengan count**: Semua / Aktif / Terjadwal / Selesai / Dibatalkan / **Draf** (Draf ditambahkan karena data nyata punya campaign DRAFT — mockup tidak mencantumkannya; deviasi jujur).
3. **Export Rekap CSV** — fetch-all: id, nama, slug, status, peserta, juz selesai, progres, periode.
4. **Tabel gaya mockup**: No · avatar inisial + Nama + chip slug + periode · Mode · Status pill · Peserta · **Juz Selesai per kelompok** dengan badge KHATAM · Progress bar + % · Aksi (Detail / Edit / **Batalkan** untuk Aktif & Terjadwal — tetap dengan konfirmasi).

## Deviasi dari mockup (tercatat)

| Mockup | Keputusan | Alasan |
|---|---|---|
| Tombol Batalkan tidak ada | **Dipertahankan** (ikon, hanya Aktif/Terjadwal, konfirmasi) | Aksi bisnis wajib (plan pertama: "jangan ganti Batalkan") |
| KPI "dari 300 Juz", "3 kelompok" | Dihitung dari Σ config nyata | Tanpa angka fiktif |
| Dropdown "Urutan: Terbaru…" | Tidak diambil | Sort server via kolom header sudah ada; "Terbaru" butuh sort `created_at` yang belum terbukti di API |
| Nomor halaman 1/2 | Tetap Sebelumnya/Berikutnya | API cursor |
| Banner SOP "pengacakan juz otomatis + tab audit santri terlambat" | Tidak ditiru | Narasi fiktif — fitur tidak ada |

## Bug ditemukan & diperbaiki saat UAT

Perhitungan "Target Terdekat" memakai `return` di dalam loop agregat sehingga campaign pertama dengan periode lewat menghentikan seluruh perhitungan (semua KPI kosong). Diperbaiki dengan skip kondisional — diverifikasi: target kini "6 Des 2026 — Khatamil MQ Angkatan 1 2026 (sisa 37 hari)".

## Verifikasi

- ESLint khatmil: **0 masalah**; `tsc` lulus; `next build` ✓.
- Browser (backend asli): KPI "150 dari 660 Juz · 23% · 5 campaign khatam penuh"; Campaign Aktif 2; tab count Sesuai (Aktif 2, Terjadwal 2, Selesai 3, Draf 1, Dibatalkan 1); baris pertama aksi "Detail" saja (terminal CANCELLED), Batalkan tersedia di baris Aktif/Terjadwal; Export Rekap berfungsi.
- Bukti: `m8-khatmil-list-1440.png` (capture penuh, dua iterasi).

## Catatan

- Filter tab tetap server-side (akurat); count dari agregat fetch-all terpisah.
- Sort tetap via kolom header (server) — dropdown Urutan mockup tidak diambil.
