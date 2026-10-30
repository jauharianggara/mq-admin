# Laporan Redesign Penarikan Dana Ustadz (sesuai mockup)

**Tanggal:** 30 Oktober 2026
**Acuan:** mockup HTML "Penarikan Dana Ustadz" — dikerjakan dengan pendekatan **adopsi selektif** (konsisten pilihan Anda pada modul Kunjungan): semua fungsi nyata dipertahankan, elemen tanpa dukungan data tidak diambil.
**Batas:** hanya `src/app/(dashboard)/payouts/page.tsx`. Backend/DB/izin tidak diubah. Tanpa commit/push/deploy.

## Yang diimplementasikan

1. **Header + aksi** — judul + pill "N pengajuan tercatat", penjelasan dengan highlight "N menunggu ACC", tombol **Daftar Transfer** (export CSV yang sudah ada) dan **Unggah Bukti Transfer** (upload CSV → mark-transferred, sudah ada) tetap fungsional.
2. **4 KPI agregat dari seluruh pengajuan** (cursor loop, guard 25 halaman — angka akurat bukan halaman aktif):
   - **Total Penarikan (bulan ini)** — hero emerald: nominal pengajuan disetujui bulan ini + delta % vs bulan lalu + rata-rata/tarik + "Terlindungi".
   - **Dicairkan Hari Ini** — nominal + jumlah penarikan TRANSFERRED yang dibuat hari ini (label jujur: pengajuan hari ini, bukan waktu transfer — timestamp transfer tidak tersedia di API).
   - **Menunggu ACC Bank** — nominal PENDING + jumlah antrean.
   - **Total Potongan Fee Admin** — total fee semua pengajuan + jumlah yang berpotongan.
   Semua angka memakai `AnimatedRupiah` count-up (hormat reduced-motion).
3. **Filter pills status dengan count** — Semua / Menunggu ACC / Disetujui / Sudah Ditransfer / Ditolak (angka dari agregat fetch-all; klik = filter server akurat).
4. **Filter bank tujuan** — dropdown diisi unik dari data (client-side, akurat untuk seluruh dataset).
5. **Tabel gaya mockup** — No · ID Tarik `#WD-0001` + tombol salin · Ustadz (avatar inisial + nama) · Bank/Rekening (bank • norek + tombol salin + a.n.) · Diterima · Fee · Status (pill + alasan tolak) · Waktu (tanggal + jam dipisah) · Aksi (ACC/Tolak untuk PENDING, "Sudah ditransfer" untuk APPROVED).
6. **Banner Kebijakan Kliring** — SOP verifikasi + SLA 1×24 jam (teks informatif, tanpa tombol stub).

## Yang tidak diambil (tak didukung API/berlebih)

- Tombol aksi animasi fake (ACC → "Disetujui" tanpa backend) di mockup — aksi ACC/Tolak nyata tetap memakai endpoint `approve`/`reject`/`mark-transferred` yang ada.
- "Export Excel", "Atur Kolom", "Unduh Rekap Mutasi", "Panduan SLA" — tanpa backend; Unduh CSV sudah ada sebagai "Daftar Transfer"/"Unduh CSV".
- Nomor halaman 1/2 — API cursor; tetap Sebelumnya/Berikutnya.
- Filter periode — API tidak punya parameter.

## Verifikasi

- ESLint payouts: **0 masalah**; `tsc --noEmit` lulus; `next build` ✓ (dua kali iterasi setelah bersih-bersih import).
- Browser (backend asli): KPI terisi nyata — Menunggu ACC Rp 60.000 (1), Fee total Rp 45.500, pills "Semua 10 · Menunggu ACC 1 · Sudah Ditransfer 6 · Ditolak 3" (jumlah tepat 10); filter bank ada; kolom sesuai; `#WD-0011` + salin; banner kebijakan tampil.
- Bukti: `m6-payouts-1440.png` (capture penuh).

## Catatan

- Kelas `.visits-row` dipakai juga di tabel payouts (indikator hover generik di globals) — nama kelas tak mengikat fungsinya; bila ingin diganti nama netral, tinggal ganti di dua file.
- Semua fungsi lama utuh: ACC → APPROVED, Tolak ber alasan (dana kembali ke saldo), mark-transferred, ekspor/impor CSV, pencarian ustadz/norek/ID.
