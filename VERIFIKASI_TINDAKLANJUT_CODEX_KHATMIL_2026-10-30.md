# Verifikasi tindak lanjut OMP — Admin Khatmil

**Tanggal:** 30 Oktober 2026  
**Acuan:** `TINDAKLANJUT_REVIEW_CODEX_KHATMIL_2026-10-30.md`  
**Putusan:** **belum ACC final**. Bukti dan perbaikan UI utama sudah cocok, tetapi masih ada satu jalur pembaruan yang dapat menghapus periode campaign ketika GET detail gagal. Review ini hanya membaca kode, laporan, dan artefak; tidak mengubah backend, database, atau data campaign.

## Yang sudah terverifikasi

| Temuan sebelumnya | Hasil verifikasi |
|---|---|
| P1-1 — gagal Simpan keluar dari form | **Lulus.** `patchCampaign()` mengembalikan `false` pada kegagalan PATCH; form hanya memanggil `onDone()` jika `ok`. Screenshot gagal menunjukkan form dan isian tetap ada dengan toast `Gagal (500)`; screenshot sukses menunjukkan halaman detail dan toast `Perubahan tersimpan`. |
| P1-2 — periode kosong saat fetch ulang gagal | **Lulus untuk skenario form yang diuji.** `initialForm(editing)` kini mengisi kedua tanggal dari data awal. Screenshot fetch ulang 500 menunjukkan tanggal tetap tampil. Masih ada risiko lain pada aksi **Batalkan** dan fetch lambat; lihat temuan di bawah. |
| P1-3 — kolom kanan PDF terpotong | **Lulus.** Seluruh halaman `khatmil-final-33.pdf` (2 halaman) dan `khatmil-final-35.pdf` (3 halaman) dibuka secara visual. Kolom `Tugas & Kontribusi` dan nilainya utuh; tidak ada halaman kosong. |
| P1-4 — bukti UAT hilang | **Lulus untuk 18 berkas dalam tabel laporan.** Berkas yang dirujuk sekarang ada di `C:/Users/jauha/artifacts/shots/mq/`. Screenshot 10 kelompok, terminal, form, gagal/sukses Simpan, error/recovery, dan responsif dapat dibuka. Bukti gambar khusus keyboard `uat-juz-kosong-keyboard.png` masih belum diregenerasi, dan laporan sudah menyatakannya. |
| P2-1 — area cover kosong di mobile | **Lulus untuk fallback yang diuji.** `CoverImg` menghilangkan gambar saat `onError`; screenshot 375 px ketika cover dipaksa gagal memperlihatkan kartu ringkas tanpa kotak kosong. |
| P2-2 — `devIndicators: false` | **Dicatat sebagai keputusan repo.** Pengaturan dan komentar alasannya ada di `next.config.ts`; bukan penghalang review Khatmil. |

Artefak yang dibuka: `uat-p11-gagal-tetap-di-form.png`, `uat-p11-sukses-kembali.png`, `uat-p12-periode-awal-fetch-gagal.png`, `uat-cover-fallback-375.jpg`, `uat-detail-10grup-1440.png`, serta seluruh halaman dua PDF final tersebut. Pemeriksaan statik lokal: ESLint folder Khatmil dan `next.config.ts` lulus; `npx tsc --noEmit --incremental false` lulus; `git diff --check` tanpa error. Hasil `next build` berasal dari laporan OMP dan tidak saya ulangi.

## Temuan yang masih harus diperbaiki

### P1 — Batalkan dapat menghapus tanggal periode jika GET detail gagal

**Lokasi:** `src/app/(dashboard)/khatmil/page.tsx:253` → `src/app/(dashboard)/khatmil/shared.tsx:214–239`; backend `C:/Users/jauha/ZCodeProject/mq-backend/src/modules/khatmil/service.rs:173–177`.

Tombol Batalkan mengirim hanya `{ status: "CANCELLED" }`. Karena tanggal tidak ada di patch, `patchCampaign()` meminta GET detail tambahan. Bila GET ini gagal, `base` tetap kosong, tetapi helper **tetap melanjutkan PATCH** dengan `period_start: null` dan `period_end: null`. Data daftar `c` sebenarnya sudah memiliki kedua tanggal, tetapi tidak dipakai sebagai fallback. Backend memperbarui kedua kolom tanggal dari nilai request, sehingga PATCH yang berhasil akan menghapus periode secara permanen sambil membatalkan campaign. Jalur ini tidak tercakup oleh pengujian form Ubah dengan GET kedua 500.

**Perbaikan yang disarankan:** gunakan tanggal dari `c.period_start`/`c.period_end` sebagai fallback saat detail GET gagal. Untuk field yang wajib dipertahankan tetapi tidak tersedia dari daftar maupun detail, hentikan PATCH dan tampilkan error; jangan mengirim `null` sebagai hasil kegagalan baca. Periksa juga field lain yang dikirim dalam payload lengkap agar aksi mengubah status tidak diam-diam mengubah nilainya.

Catatan preservasi lain pada payload yang sama: `min_minutes_per_juz` tersedia dalam respons daftar backend tetapi tidak dikirim oleh helper. DTO backend memberi default `30` ketika field ini tidak ada, lalu `update_campaign()` menulis default itu ke DB. Kolom ini ditandai legacy dan tidak dipakai untuk completion v2, jadi prioritasnya lebih rendah; tetap perlu dipertahankan bila campaign lama mungkin memiliki nilai selain 30.

**Uji regresi tanpa menulis DB nyata:** mock/intercept GET detail khusus aksi Batalkan agar gagal, lalu tangkap payload PATCH dan pastikan `period_start`/`period_end` tetap sama dengan campaign di daftar. Mock respons PATCH berhasil, kemudian pastikan daftar hanya dimuat ulang setelah sukses. Gunakan campaign QA yang boleh dibatalkan bila ingin menguji jalur end-to-end nyata.

### P2 — Fetch detail form Ubah masih dapat menimpa edit tanggal yang sedang diketik

**Lokasi:** `src/app/(dashboard)/khatmil/shared.tsx:320–332`.

Setelah form Ubah tampil dengan tanggal dari `editing`, effect mengambil detail sekali lagi. Ketika responsnya berhasil, `setForm()` selalu mengganti `period_start` dan `period_end`. Jika admin sudah mengubah tanggal saat request kedua masih lambat, respons lama akan mengembalikan tanggal awal tanpa peringatan. Ini bukan skenario GET gagal yang diuji OMP. Halaman edit sudah mengambil detail sebelum `CampaignForm` dipasang (`[id]/edit/page.tsx`), sehingga fetch kedua tampaknya tidak diperlukan.

**Perbaikan yang disarankan:** hapus fetch kedua bila data awal memang lengkap, atau isi hanya field yang belum pernah disentuh pengguna. **Uji:** tahan respons GET kedua; ubah tanggal pada form; lepaskan respons; pastikan tanggal yang diketik tetap ada dan menjadi nilai payload Simpan.

### P3 — Narasi laporan berbeda dari pemanggil Batalkan saat ini

Laporan menyebut pemanggil sudah menggunakan `.then((ok) => ok && load())`, tetapi kode pada `page.tsx:253` masih `.then(load)`. Kegagalan PATCH sekarang tetap memicu reload daftar. Ini tidak menghapus data secara langsung, tetapi perilaku dan dokumentasi perlu disamakan setelah P1 di atas ditangani.

## Kriteria ACC final

1. Aksi Batalkan yang GET detailnya gagal tidak mengirim tanggal `null` dan tidak mengubah field campaign lain di luar status yang dimaksud.
2. Respons GET detail yang lambat tidak menimpa perubahan tanggal pada form Ubah.
3. Laporan mencerminkan kode akhir, lalu ESLint, TypeScript, dan build tetap lulus.

**Batas kerja:** perbaikan cukup di frontend `mq-admin`; backend, database, izin, dan aplikasi mobile tidak perlu diubah. Review ini tidak memberi instruksi commit, push, atau deploy.
