# Laporan Tahap 1 Skalabilitas + Perbaikan Risiko Tanggal — Admin Khatmil

**Tanggal:** 30 Oktober 2026
**Menjawab:** `USULAN_SKALABILITAS_DETAIL_KHATMIL_TANPA_TAB_2026-10-30.md` (ACC pemilik: Tahap 1 saja, cetak satu mode dengan label jujur, 5/10/5, satu peta aktif, bukti UAT dibuat ulang) dan syarat ACC di `VERIFIKASI_TINDAKLANJUT_CODEX_KHATMIL_2026-10-30.md` (dua risiko tanggal).
**Status:** selesai & terverifikasi (backend asli `mq_dev`). **Belum ada commit/push/deploy; backend tak disentuh.**

## A. Perbaikan risiko tanggal (syarat ACC final)

### A.1 Batalkan dengan GET detail gagal tidak lagi menghapus periode
- `patchCampaign()` (`shared.tsx`): rantai periode = **patch eksplisit → GET detail → fallback data daftar**. Bila GET gagal dan daftar tak menyimpan periode, PATCH **dibatalkan** dengan toast "Gagal membaca periode campaign — perubahan dibatalkan demi keamanan data" — tidak pernah mengirim `null` hasil kegagalan baca (backend `update_campaign` menulis ulang kolom periode dari payload).
- **Regresi terverifikasi (tanpa menulis DB):** intercept GET `campaigns/36` → 500; klik Batalkan (id 36, Aktif). Payload PATCH tertangkap:
  `period_start: '2026-09-14', period_end: '2026-10-14'` (dari daftar — **bukan null**), `min_minutes_per_juz: 30` (legacy ikut dipertahankan, tidak ditimpa default backend), name/description/mode/max_participants utuh. PATCH dijawab sukses sintetis → DB nyata tak tersentuh (diverifikasi API: 36 tetap ACTIVE). Bukti: `t1-batalkan-get-gagal.png`.
- Catatan kejujuran: percobaan pertama uji ini keliru sasaran (baris pertama daftar ternyata id 36, bukan 35) sehingga id 36 sempat dibatalkan sungguhan → **saya pulihkan via DB dev** (`UPDATE ... SET status='ACTIVE' WHERE id=36`), diverifikasi kembali ACTIVE dengan periode utuh. Id 35 tidak pernah tersentuh.
- Field lain pada payload aksi status ikut diperiksa: name/description/mode/target/group_count/verifikasi/kuota dikirim dari data `c` (tidak berubah), `cover_media_id` tidak dikirim (COALESCE backend mempertahankan), `min_minutes_per_juz` kini dipertahankan bila tersedia di respons daftar.

### A.2 Fetch lambat tidak lagi menimpa tanggal yang sedang diedit
- Effect GET detail kedua di form Ubah **dihapus** (edit page sudah memuat detail penuh sebelum form dipasang; `initialForm` mengisi periode dari `editing`). Tidak ada lagi penulisan asinkron ke field periode setelah form tampil — sumber satu-satunya adalah ketikan pengguna.

### A.3 Konsistensi pemanggil (P3 review sebelumnya)
- Daftar: `.then((ok) => ok && load())` — reload hanya bila sukses; kode & laporan kini sama.

## B. Tahap 1 skalabilitas (UI-only, sesuai ACC)

| Section | Perilaku baru |
|---|---|
| Kelompok & Peta Juz (multi) | Daftar baris ringkas **5/halaman** (nomor, badge KHATAM/Penuh/Terbuka, "x dari 30 juz selesai · y/30 terisi", pembina/Menunggu ACC, tombol pembina) + **cari nomor/pembina** + **filter status** (Semua/Perlu pembina/Menunggu ACC/Berjalan/Khatam) + pagination Sebelumnya/Berikutnya. **Satu panel peta 30 juz** untuk kelompok aktif (pilih baris → panel; ganti halaman → panel pindah ke kelompok pertama halaman itu; tombol tutup panel). Single-group: peta langsung seperti sebelumnya. |
| Peserta & Peringkat | Top-3 tetap; **cari nama**; **10/halaman** dengan nomor peringkat GLOBAL (hlm 2 = 11–13); label rentang "1–10 dari 13 peserta"; kartu mobile ikut dipaginasi. |
| Aktivitas Terbaru | **5 laporan terbaru** + desc "Menampilkan 5 laporan terbaru." — tanpa klaim riwayat lengkap, tanpa tautan (pagination server belum ada). |
| Cetak | Tombol **Cetak** di header → mode cetak merender `PrintView` terpisah: label cakupan jujur ("seluruh N kelompok (peta lengkap) · seluruh N peserta · **Aktivitas: N laporan terbaru** (API menyimpan maksimal 50 — bukan riwayat lengkap)"), semua kelompok + peta, tabel semua peserta, aktivitas ≤50, metadata. DOM layar (paginasi) tidak dipakai untuk cetak; kembali normal lewat event `afterprint`. |

## C. Verifikasi

Statis: ESLint khatmil + `next.config.ts` **0 masalah**; `tsc --noEmit` lulus; `next build` ✓.

UAT nyata (backend `mq_dev`; bukti `C:/Users/jauha/artifacts/shots/mq/`, semua ditulis via `page.screenshot`/`page.pdf`):

| Kasus | Hasil | Bukti |
|---|---|---|
| Multi kelompok (2): baris ringkas + panel peta aktif | 2 baris, panel K1 (30 sel), label "halaman 1 dari 1" | `t1-groups-33.png` |
| Pindah kelompok aktif | panel "Kelompok 2", 30 sel | `t1-groups-33-kelompok2.png` |
| Peserta 13: hlm 1 (rank 1–10) → hlm 2 (rank 11–13) | rentang "1–10 dari 13 peserta" | `t1-peserta-hlm1.png`, `t1-peserta-hlm2.png` |
| Cari peserta ("ridwan") | 1 hasil, rank global 9, rentang "1–1 dari 1 peserta" | `t1-peserta-cari.png` |
| 10 kelompok (id 41): hlm 1 (K1–5) → hlm 2 (K6–10), panel otomatis pindah ke K6 | label "10 kelompok · halaman 1 dari 2" | `t1-groups41-hlm1.png`, `t1-groups41-hlm2.png` |
| Keyboard: Tab + Enter pada baris kelompok | panel terpilih | tercantum di sesi (`panelSetelahEnter: 'Kelompok 1'`) |
| Regresi tanggal Batalkan (GET 500) | PATCH membawa periode daftar + min_minutes, DB aman | `t1-batalkan-get-gagal.png` |
| Fail-path Simpan (PATCH 500) | tetap di form, nilai utuh, toast error | `t1-simpan-gagal-tetap-form.png` |
| Print mode PrintView | label cakupan jujur, 13 peserta penuh | `t1-printview-35.png` |
| PDF A4 ulang via mode cetak | 33: 2 kelompok+peta, 10 peserta; 35: 13 peserta, peta, aktivitas+label | `khatmil-final-33.pdf`, `khatmil-final-35.pdf` |
| Mobile 375 / tablet 768 | overflow-x 0, kartu & pagination dapat dipakai | `t1-groups41-375.jpg`, `t1-peserta-375.jpg`, `t1-768.png` |
| Konsol | 0 error | log sesi |

Uji 50 kelompok & 500 peserta tidak dilakukan pada data nyata (maks saat ini 10 kelompok / 40 peserta); pagination murni lokal sehingga perilaku pada jumlah besar mengikuti mekanisme yang sama dan sudah terbukti di 10 kelompok/13 peserta.

## D. Keputusan & catatan

- Pagination murni klien — data tetap diunduh penuh (sesuai ACC: API menyusul bila volume menuntut).
- Ctrl+P (di luar tombol Cetak) mencetak halaman aktif yang terlihat; jalur laporan lengkap adalah tombol **Cetak**.
- Insiden saat UAT: id 36 sempat terbatal sungguhan karena salah sasaran klik — sudah dipulihkan ke ACTIVE via DB dev dan diverifikasi (periode utuh).
- Berubah: `sections.tsx` (rework), `shared.tsx` (patchCampaign, hapus effect, tipe `min_minutes_per_juz`), `page.tsx` daftar & detail (tombol Cetak, PrintView, kondisi reload), sisanya seperti laporan sebelumnya.
