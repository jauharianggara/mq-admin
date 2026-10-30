# Laporan Redesign Halaman Kunjungan + Pembayaran (sesuai mockup — adopsi selektif)

**Tanggal:** 30 Oktober 2026
**Acuan:** mockup HTML "Kunjungan (Pesanan Ngaji ke Rumah)" rev 1–3 dan mockup "Pembayaran (Xendit)" — ACC pemilik: *Adopsi selektif* untuk keduanya.
**Batas:** hanya `src/app/(dashboard)/visits/page.tsx`, `visits/[id]/page.tsx` (refactor effect), `payments/page.tsx`, `src/components/animated-rupiah.tsx` (baru, bersama), `src/app/globals.css` (indikator baris). Backend/DB/izin tidak diubah. Tanpa commit/push/deploy.

## Yang diimplementasikan

1. **5 KPI dengan angka nyata** dari `/admin/count?entity=visits` per status (Total, Menunggu Bayar=REQUESTED, Terjadwal=CONFIRMED, Selesai & Dinilai=REVIEWED, Dibatalkan/Ditolak=DECLINED+CANCELED+PAYMENT_EXPIRED). Kartu **klik untuk memfilter** tabel; refresh via tombol Muat Ulang (nonce). ★ rating tidak ditampilkan (API tidak punya field rating — sesuai adopsi selektif).
2. **Segmented status filter dengan count** menggantikan dropdown — termasuk grup "Dibatalkan / Ditolak (N)" yang menggabungkan 3 status.
3. **Tabel kolom gabungan** ala mockup: `#KJ-{id}` mono + tombol salin (clipboard + toast), Santri (avatar inisial + nama), Ustadz Pembimbing (avatar + nama; kosong = "Menunggu penetapan"), Jadwal & Sesi (tanggal + badge durasi), Biaya & Metode (nominal + badge channel/refund), Status (pill kit / label gabungan "Ditolak Ustadz / Dibatalkan Santri / Kedaluwarsa Bayar"), Aksi "Buka".
4. **Pencarian** mendukung nama santri/ustadz, id angka, dan `#KJ-xxxx`.

## Yang sengaja TIDAK diambil (adopsi selektif — tak didukung API)

- ★ rating KPI; lokasi/alamat santri; program (Tahsin/Iqro); spesialisasi ustadz; tipe sesi "Privat/Intensif" — tidak ada di list API.
- Filter metode pembayaran & rentang tanggal — API tidak punya parameter; filter klien pada cursor pagination hanya menyaring halaman aktif (menyesatkan).
- Nomor halaman 1/2/3 — API cursor-based; tetap Sebelumnya/Berikutnya.
- Batch checkbox, toggle Kolom, Unduh Excel, panel "FOKUS ORDER", "Buka Chat WA", "Lembar Penilaian" — butuh endpoint/detail tambahan (kandidat Tahap 2).
- "Ekspor Laporan" di banner — tidak dibuat (tanpa backend export).

## Refactor ikut serta

- `[id]/page.tsx`: `load` diefaktor — fetch murni `muatData()` (tanpa setState) + effect `.then` + flag `ignore` + handler `load()` (memenuhi aturan `set-state-in-effect` yang sebelumnya error di file ini).
- **Fix indikator "1 Issue"**: peringatan Base UI (`nativeButton`) dari tombol "Buka" yang merender `<Link>` — diberi `nativeButton={false}`; konsol kini 0 peringatan/0 error (terverifikasi pasca reload).
- **Update rev 2 mockup (finansial):** banner 3 kartu (**Total Pendapatan bulan ini** + delta % vs bulan lalu + rata-rata/sesi; **Pendapatan Hari Ini** + selesai/mendatang; **Menunggu Pembayaran** nominal + rincian channel) dan baris **nominal rupiah** pada kelima KPI (Bruto / Nominal / Net Selesai / Refund). Semua dihitung dari **seluruh pesanan** via cursor loop (`muatSemua`, guard 25 halaman) — akurat untuk keseluruhan data, bukan halaman aktif. Contoh nyata saat UAT: Bruto Rp 2.888.000, Net Selesai Rp 10.000, Refund Rp 910.000, delta bulan ini −95,7% (dihitung dari jadwal nyata).
- **Update rev 3 mockup (animasi & micro-interaction):** count-up rupiah (`AnimatedRupiah`, ease-out 900 ms, hormat `prefers-reduced-motion`), entrance stagger section (tw-animate-css, `motion-safe:`), hover lift kartu KPI/banner, `active:scale` tombol, `animate-pulse` pada badge "Perlu Verifikasi", spin ikon saat memuat, dan garis aksen hover baris tabel (`.visits-row`, scope globals, mati pada reduced-motion). Shimmer kontinu dari mockup sengaja tidak diambil (distraktif & boros GPU).

## Verifikasi

- ESLint visits + `next.config.ts`: **0 masalah**; `tsc --noEmit` lulus; `next build` ✓.
- Browser (backend asli): 5 KPI terisi angka nyata (Total 36 = 1 Menunggu Bayar + 1 Terjadwal + 1 Selesai & Dinilai + 33 Dibatalkan/Ditolak — konsisten); klik KPI/segmented memfilter tabel (1 baris "Menunggu pembayaran" untuk REQUESTED); kolom & ID format sesuai; **konsol 0 error**; overflow 0 di 1440 & 375.
- Bukti: `m2-visits-1440.png`, `m2-visits-kpi.png`, `m2-visits-375.jpg`.

## Sisa / kandidat berikutnya

- Filter metode & tanggal, riwayat log lengkap, batch/Excel → butuh dukungan API (Tahap 2 modul kunjungan).
- Rating review bisa ditampilkan bila API list menyertakan skor review.

## Tambahan — Redesign Pembayaran (Xendit) sesuai mockup (adopsi selektif)

- **4 KPI nominal nyata** dari seluruh invoice (cursor loop, guard 10 halaman): Total Pemasukan bulan ini + delta % vs bulan lalu + rata-rata/sesi; Pemasukan Hari Ini (PAID, created/paid hari ini) + jumlah transaksi; Perlu Verifikasi (PENDING) nominal + jumlah; Dikembalikan ke Deposit (REFUNDED) nominal + jumlah.
- **Tab status + nominal**: Semua · Lunas · Menunggu ACC · Dikembalikan ke deposit · Kedaluwarsa · Gagal — klik tab = filter server (akurat).
- **Tabel**: No. · `#INV-{id}` mono + tombol salin · Jenis (badge) · Untuk/Keterangan · Nominal (mono, sort) · Metode · Status (pill + dot pulse untuk Menunggu ACC) · Dibuat · Dibayar · Aksi (Detail → kunjungan terkait; top-up = "—").
- **Select jenis** berlabel Indonesia via `items=`; **status PENDING** diberi dot `animate-pulse`.
- Refactor: komponen bersama `src/components/animated-rupiah.tsx` (dipakai visits & payments); fetch-all agregasi menggantikan 7 panggilan `/admin/count`.
- Tidak diambil (tak didukung backend): "+ Sinkronkan Xendit", "Lihat Log Webhook", "Download Rekap Finansial", nomor halaman (cursor), sort panah dekoratif.
- Verifikasi: ESLint 0, tsc lulus, build ✓; browser — KPI "Total bulan ini Rp 20.000 (−99,6% vs bln lalu)", Pending Rp 200.000 (4 invoice), Refund Rp 910.000 (12), tab Lunas 23 · Rp 3.328.000, tabel `#INV-55…` dengan copy ID; bukti `m5-payments-1440.png`, `m5-payments-final.png`.
