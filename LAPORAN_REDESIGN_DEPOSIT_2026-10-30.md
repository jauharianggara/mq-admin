# Laporan Redesign Saldo & Mutasi (sesuai mockup — adopsi selektif)

**Tanggal:** 30 Oktober 2026
**Acuan:** mockup HTML "Saldo & Mutasi" — ACC pemilik: *Adopsi selektif*.
**Batas:** hanya `src/app/(dashboard)/deposit/page.tsx`. Backend/DB/izin tidak diubah. Tanpa commit/push/deploy.

## Yang diimplementasikan (semua angka dari API nyata `/admin/wallet?role=`)

1. **4 KPI dihitung dari seluruh rekening kedua role** (fetch SANTRI + USTADZ sekaligus, bukan hanya tab aktif):
   - **Total Saldo Tersimpan** (hero emerald) + jumlah rekening + "Terproteksi".
   - **Saldo Deposit Santri** + "N Akun" + rata-rata per akun.
   - **Dompet Aktif Ustadz** + "N Akun".
   - **Rekening Saldo Rp 0 (Perlu Top-Up)** — jumlah rekening bersaldo kosong (pengganti KPI "Mutasi Hari Ini" yang tidak didukung API: mutasi hanya bisa diambil per rekening, tidak ada endpoint global).
   - Delta "+14.2% bln lalu" dari mockup **tidak diambil** — butuh snapshot saldo historis yang tidak ada (tanpa data, jangan klaim).
2. **Filter nominal klien** (akurat — data `/admin/wallet` utuh tanpa pagination): Semua nominal / > Rp 1jt / Rp 100rb–1jt / Saldo Rp 0.
3. **Unduh Rekap Saldo** — CSV dari tab aktif (mengikuti filter nominal & pencarian).
4. **Tabel baru** — No. · Pengguna · **Kategori** (badge Santri/Ustadz) · Saldo (merah + "Saldo kosong — perlu top-up" bila 0, baris di-highlight rose) · Aksi (**Lihat Detail** + **+ Koreksi** — membuka detail mutasi sekaligus dialog penyesuaian ber-ACC dua arah yang sudah ada).
5. Header: tab per role + tombol **Riwayat Penyesuaian** (pindah tab ADJ).

## Yang tidak diambil (tak didukung API)

- KPI "Mutasi Hari Ini" (nominal & jumlah transaksi) — tidak ada endpoint mutasi global.
- Delta % vs bulan lalu — tidak ada snapshot historis.
- Filter periode mutasi — idem.
- "Buku Kas & Audit" — tidak ada endpoint.

## Verifikasi

- ESLint deposit: **0 masalah**; `tsc` lulus; `next build` ✓. Refactor ikut: `load`/effect diefaktor ke pola resmi React (fetch + flag ignore; reset detail via jalur async) — membersihkan error `set-state-in-effect` lama di file ini.
- Browser (backend asli `mq_dev`): KPI hero **87 rekening**, Saldo Santri **50 akun**, Dompet Ustadz **37 akun**, kartu nol **85 rekening** (data nyata memang dominan saldo kosong); kolom Kategori badge; tombol "+ Koreksi" 50 baris; Unduh Rekap tampil. Bukti: `m7-deposit-1440.png`.
- Fungsi lama utuh: tab per role, cari, detail mutasi per rekening, ajukan penyesuaian ber-ACC dua arah, riwayat penyesuaian dengan filter status.

## Keterbatasan (jujur)

- Filter nominal hanya berlaku pada tab Santri/Ustadz (bukan tab Penyesuaian).
- "Rekening Saldo Rp 0" menghitung kedua role gabungan (50 santri + sisanya ustadz).
