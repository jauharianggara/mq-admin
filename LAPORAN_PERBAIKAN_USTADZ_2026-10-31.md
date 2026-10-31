# Perbaikan Halaman List Ustadz (2026-10-31)

## Masalah
`/ustadz` masih memakai header/toolbar kit lama (PageHeader + Toolbar polos) — tidak selevel dengan santri/payments yang sudah di-redesign; tabel 12 kolom pola baku tanpa konteks KPI/filter yang jelas.

## Perubahan (satu file: `src/app/(dashboard)/ustadz/page.tsx`, ditulis ulang)
- **Header**: judul + badge "N ustadz terdaftar" (users-count role USTADZ), subtitle, tombol **Ekspor Data** (CSV nyata dari baris tampil, BOM UTF-8). Tanpa tombol Tambah — BE tidak punya endpoint create (ustadz dibuat via registrasi aplikasi).
- **4 KPI grounded** (full-fetch ≤100 + users-count per status):
  1. Total Saldo Penghasilan — Σ `saldo_penghasilan` (count-up, kartu gelap + shimmer) + rata-rata/ustadz;
  2. Ustadz Aktif — `users-count` ACTIVE/total + rasio + "N menunggu verifikasi";
  3. Menerima Kunjungan — `is_accepting === true` + rincian tutup/belum diatur;
  4. Rating Rata-Rata — rata-rata tertimbang `rating_avg × rating_count` + total review.
  Tanpa angka rekaan; field yang tidak ada di API tidak ditampilkan.
- **Panel filter**: pil status dgn count (Semua/Aktif/Menunggu/Ditangguhkan), Reset, pencarian (⌘K, debounce 350ms, server `q`), sort dropdown server-side (Terbaru/Nama A-Z/Saldo Tertinggi — whitelist sort BE), Muat Ulang (spin, reload list+KPI).
- **Tabel**: tetap pola baku `No|Aksi|Status|Nomor` + 12 kolom konten; footer "Menampilkan x–y dari N" + pager kursor.
- Perbaikan kecil: paginasi "Hal. N", Rating kosong "belum ada".

## Verifikasi (Chromium, 31 Okt)
| Uji | Hasil |
|---|---|
| `tsc` + `eslint` | bersih |
| Render | 20 baris, badge "37 ustadz terdaftar", KPI Rp 453.500 / ★5.0 (data dev) — semua API 200 |
| Pil Aktif | 1–20 dari 37 (37 = semua aktif di dev DB; count pil: 37/37/0/0) |
| Pil Menunggu | 0 baris, "0–0 dari 0" |
| Sort Saldo Tertinggi | Rp 443.500 → Rp 10.000 → Rp 0 |
| Ekspor CSV | toast "20 baris diekspor ke CSV" |
| ⌘K | fokus pencarian |
| Mobile 390px | overflow-x 0 |
| Console | 0 error |
| Screenshot | `artifacts/shots/mq/ustadz-list-baru-{desktop,mobile}.png` |

Commit menunggu perintah.
