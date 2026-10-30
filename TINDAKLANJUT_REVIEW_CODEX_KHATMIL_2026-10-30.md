# Tindak Lanjut Review Codex — Admin Khatmil (OMP)

**Tanggal:** 30 Oktober 2026
**Menjawab:** `REVIEW_CODEX_ATAS_REPORT_OMP_KHATMIL_ADMIN_2026-10-30.md`
**Status:** 4 P1 + 2 P2 ditindaklanjuti; jalur gagal diuji; semua bukti kini ada di disk. **Belum ada commit/push/deploy; backend/DB tak diubah.**

## P1-1 — Gagal simpan tidak lagi mengeluarkan pengguna dari form

- `patchCampaign()` (`src/app/(dashboard)/khatmil/shared.tsx`) kini `Promise<boolean>`: `true` hanya bila PATCH sukses; toast error tetap dari helper.
- `CampaignForm.submit()`: `if (!ok) return;` — `onDone()` hanya setelah PATCH sukses. Pemanggil lain (Batalkan di daftar) menyesuaikan: `.then((ok) => ok && load())`.
- **Uji jalur gagal (nyata):** backend di-stop → form Ubah campaign 35 → Simpan → **tetap di form**, URL tak berubah, nama & kedua tanggal utuh, toast "Gagal (500)", tanpa toast sukses. Bukti: `uat-p11-gagal-tetap-di-form.png`.
- **Jalur sukses:** backend hidup → Simpan (nilai dikirim identik, tanpa perubahan data) → redirect ke detail + toast "Perubahan tersimpan". Bukti: `uat-p11-sukses-kembali.png`.

## P1-2 — Periode form Ubah tak lagi berisiko terhapus

- `initialForm(editing)` kini mengisi `period_start`/`period_end` dari data campaign list yang sudah tersedia; fetch detail tambahan hanya melengkapi (`.catch(() => {})`), sehingga kegagalan/lambat fetch tidak pernah menghasilkan `null`.
- **Uji jalur gagal (nyata, tanpa menyentuh DB):** request interception — GET `campaigns/35` pertama diloloskan (form muat), GET berikutnya dijawab 500 (`fetchDetailKe: 3`, dua terakhir gagal). Hasil: input periode tetap `2026-09-07` → `2026-12-06`. Bukti: `uat-p12-periode-awal-fetch-gagal.png`.

## P1-3 — PDF A4: kolom tabel utuh

- CSS cetak Khatmil ditambah (masih di scope `body:has([data-khatmil-print])`): tabel cetak 11px, padding sel 4×6px, **bar MiniBar disembunyikan saat cetak** (angka % tetap tercetak sebagai teks).
- Pengukuran layout cetak (viewport 794px = A4 @96dpi, media print): lebar tabel **745px**, tepi kanan kolom terakhir **770px < 794** — tidak terpotong.
- PDF dicetak ulang dan dibaca per halaman: `khatmil-final-33.pdf` (2 hlm, header "Tugas & Kontribusi" utuh) dan `khatmil-final-35.pdf` (3 hlm, semua nilai % peserta hadir di setiap baris; tidak ada halaman kosong).

## P1-4 — Bukti hilang: akar masalah + 18/18 kini ada

**Akar:** `tab.screenshot({path})` di lingkulan OMP ternyata tidak menulis berkas ke disk (hanya mengembalikan gambar inline); 11 bukti lalu hilang. Hanya `page.screenshot`/`page.pdf` lewat `tab.run` yang benar-benar menulis.
**Tindakan:** semua bukti diregenerasi lewat `page.screenshot` dan diverifikasi ada di disk — 18/18 OK di `C:/Users/jauha/artifacts/shots/mq/`:

| Berkas | Kasus | Viewport CSS (DPR) |
|---|---|---|
| `uat-detail-10grup-1440.png` | 10 kelompok + terminal CANCELLED (id 41) | 1440×900 (1.0) |
| `khatmil2-terminal-1440.png` | Terminal COMPLETED (id 37) | 1440×900 (1.0) |
| `khatmil2-assign-menunggu-acc-fixed.png` | Multi kelompok + "Menunggu ACC" (id 33) | 1440×900 (1.0) |
| `khatmil2-detail35-1440.png`, `khatmil2-detail35-juz.png` | Detail satu kelompok + panel juz terpilih | 1440×900 (1.0) |
| `uat-list-dibatalkan.png` | Daftar filter Dibatalkan via keyboard, tanpa tombol tulis | 1440×900 (1.0) |
| `uat-form-baru-10grup.png` | Form baru terisi (dibuka, **tidak disimpan** — tanpa tulis DB) | 1440×900 (1.0) |
| `uat-p12-periode-awal-fetch-gagal.png` | P1-2 fetch detail gagal, periode bertahan | 1440×900 (1.0) |
| `uat-p11-gagal-tetap-di-form.png`, `uat-p11-sukses-kembali.png` | P1-1 jalur gagal & sukses | 1440×900 (1.0) |
| `uat-error-state.png`, `uat-recovery.png` | Backend mati → panel "Gagal (500) + Coba Lagi" → pulih | 1440×900 (1.0) |
| `uat-final-768.jpg` | Tablet 768×1024 | 768 (1.0) |
| `uat-final-detail-375.jpg`, `uat-final-list-375.jpg`, `uat-cover-fallback-375.jpg` | Mobile 375×812, overflow-x 0 | 375 (1.0) |
| `khatmil-final-33.pdf`, `khatmil-final-35.pdf` | PDF A4 final (dicetak ulang pasca P1-3) | A4 print |

Catatan jujur: tangkapan `uat-final-list-375.jpg` lama menampilkan kotak kosong — itu melahirkan P2-1 di bawah; berkas kini diganti versi pasca-perbaikan. Keyboard/anchor: fokus peta juz lewat Tab+Enter terbukti di `uat-juz-kosong-keyboard.png` (regenerasi menyusul bila diminta; bukti teks `aria-label` + panel "kosong — belum diklaim" ada di log sesi).

## P2-1 — Cover kartu mobile: kotak kosong hilang

- Komponen baru `CoverImg` (`shared.tsx`): `onError` → komponen merender `null`; dipakai di thumbnail daftar desktop, cover kartu mobile, dan header detail.
- Temuan lanjutan saat uji: `loading="lazy"` + `aspect-[16/6]` mencadangkan kotak putih untuk cover di bawah lipatan yang tak pernah termuat. `aspect-[16/6]` diganti `max-h-40` — gambar belum termuat = tinggi nol, bukan kotak.
- **Uji:** 4 cover dipaksa gagal (`src` ke port mati) → img terhapus, kartu menyusut ke 32px (baris nama saja), overflow-x 0. Bukti: `uat-cover-fallback-375.jpg`; daftar final: `uat-final-list-375.jpg` (diganti).

## P2-2 — `devIndicators: false` dipertahankan sebagai keputusan repo

Dipertahankan: satu baris, hanya efek **dev** (produksi tak berubah), menyelesaikan kelas masalah "overlay ikut tertangkap" untuk semua artefak review ke depan tanpa trik per-screenshot. Komentar alasan ada di `next.config.ts`. Bila pemilik tidak setuju, revert satu baris tanpa dampak lain.

## Pemeriksaan ulang setelah semua perbaikan

- ESLint folder khatmil + `next.config.ts`: 0 masalah.
- `tsc --noEmit`: lulus.
- `next build`: ✓ Compiled successfully.
- Backend/DB/izin/mobile: tidak disentuh. Data demo tetap hanya campaign id 41 (CANCELLED). Penugasan pending "Ustadz Yusuf Hamdani" di campaign 33 kelompok 2 dibiarkan sebagai bukti hidup status Menunggu ACC.

## Sisa (jujur)

- Klaim keyboard (fokus ring peta juz) bukti gambarnya belum diregenerasi ulang pasca-fix; log sesi mencatat `aria-label "Kelompok 1 juz 5, kosong"` sebagai activeElement + panel inline tampil. Bisa diregenerasi bila diminta.
- Panel error detail butuh ±15 detik sebelum tampil saat backend mati (proxy menunggu upstream) — perilaku fetch proxy, di luar cakupan UI.
- Refresh sesi (token 15 menit) kadang gagal di browser headless berumur panjang — re-login menyelesaikan; belum diinvestigasi.
