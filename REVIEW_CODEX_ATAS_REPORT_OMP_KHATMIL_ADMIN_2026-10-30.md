# Review Codex atas laporan OMP — Admin Khatmil

**Tanggal:** 30 Oktober 2026  
**Dokumen yang ditinjau:** `REPORT_OMP_KE_CODEX_KHATMIL_ADMIN_2026-10-30.md`  
**Putusan:** **belum ACC final**. Arah UI sudah baik, tetapi ada dua risiko penyimpanan data dan dua masalah bukti/artefak yang perlu dibereskan. Review ini tidak mengubah kode, database, atau deployment.

## Dasar pemeriksaan

- Membaca laporan OMP dan membandingkan dengan `PLAN_KHATMIL_ADMIN_TANPA_TAB.md` serta evaluasi sebelumnya.
- Memeriksa source lokal Khatmil, aturan cetak, dan transisi status backend secara **read-only**.
- Membuka bukti yang tersedia di `C:/Users/jauha/artifacts/shots/mq/`: tiga JPG responsif dan PDF final campaign 33/35. PDF dirender dan seluruh halamannya diperiksa.
- Menjalankan `git diff --check`, ESLint untuk folder Khatmil beserta `next.config.ts`, dan `npx tsc --noEmit --incremental false`; ketiganya lulus. Klaim `next build` dari OMP belum saya ulangi.

## Yang terverifikasi baik

1. Detail Khatmil memakai satu alur halaman tanpa `Tabs*`. Ringkasan, kelompok/peta, peserta/peringkat, aktivitas, dan metadata tetap ada.
2. PDF campaign 33 membuktikan dua kelompok ditampilkan dengan penyebut **30 juz per kelompok**; status pembina lama dan penugasan pending baru sama-sama terlihat. PDF campaign 35 membuktikan label progres bacaan dan daftar peserta yang disatukan.
3. `timeAgo()` kini menerima waktu ISO yang sudah memiliki `Z`/offset dan memiliki fallback tanggal invalid. Format periode Indonesia dan label “peserta menyelesaikan juz” tampak pada bukti.
4. `nextStatuses()` di frontend cocok dengan `transition_ok()` di backend: Draf → Terjadwal/Aktif; Terjadwal → Aktif/Dibatalkan; Aktif → Selesai/Dibatalkan. Tombol Batalkan pada daftar dibatasi untuk Terjadwal/Aktif.
5. Aturan `@media print` sudah dibatasi ke `body:has([data-khatmil-print])`. PDF baru tidak lagi mempunyai halaman kedua yang hampir kosong. Ini memperbaiki temuan review sebelumnya, walau masih ada masalah lebar tabel pada PDF (lihat P1-3).

## Temuan yang harus ditindaklanjuti

### P1-1 — Gagal menyimpan Ubah tetap mengalihkan pengguna keluar form

**Lokasi:** `src/app/(dashboard)/khatmil/shared.tsx`, sekitar baris 203–232 dan 343–361.

`patchCampaign()` menangkap error `apiPatch()`, menampilkan toast, lalu **mengembalikan promise yang dianggap sukses**. Pemanggil di `CampaignForm.submit()` menunggu helper tersebut dan selalu memanggil `onDone()`. Jadi jika backend mengembalikan 409/500 atau jaringan gagal, pengguna melihat pesan gagal tetapi langsung diarahkan ke halaman detail; perubahan yang belum tersimpan hilang dari form. Keberhasilan UAT untuk jalur sukses tidak menutup risiko jalur gagal ini.

**Perbaikan:** buat helper melempar ulang error atau mengembalikan status keberhasilan yang eksplisit. Panggil `onDone()` hanya setelah PATCH benar-benar berhasil. Pertahankan toast error dan isi form ketika gagal. Uji dengan kegagalan PATCH yang disengaja tanpa mengubah data campaign nyata.

**Kriteria selesai:** pada PATCH gagal, halaman tetap di form, nilai input tetap ada, dan tidak ada toast sukses. Pada PATCH berhasil, halaman kembali ke detail dan nilai baru terlihat.

### P1-2 — Tanggal periode form Ubah mulai kosong dan dapat terhapus jika fetch kedua gagal/terlambat

**Lokasi:** `src/app/(dashboard)/khatmil/shared.tsx`, `initialForm()` sekitar baris 237–255, effect sekitar baris 307–317, dan payload submit sekitar baris 343–360.

Objek campaign edit sudah memiliki `period_start`/`period_end`, tetapi `initialForm(editing)` mengisi keduanya dengan string kosong. Form lalu mengambil detail lagi secara asinkron untuk mengisinya; error fetch ini diabaikan. Tombol Simpan tidak menunggu pengisian periode. Bila pengguna menyimpan sebelum fetch kedua selesai, atau fetch kedua gagal, payload mengirim `period_start: null` dan `period_end: null` sehingga periode yang sebelumnya ada dapat terhapus.

**Perbaikan:** inisialisasi periode dari `editing.period_start`/`editing.period_end` yang sudah tersedia. Jika sumber data masih perlu dilengkapi lewat fetch lain, tampilkan loading/error dan cegah Simpan sampai data dasar siap. Jangan mengubah tanggal yang tidak disentuh pengguna menjadi `null` karena kegagalan memuat.

**Kriteria selesai:** edit campaign berperiode, hambat/gagalkan fetch detail tambahan, lalu simpan perubahan nama saja; periode lama harus tetap utuh. Uji juga jalur fetch lambat.

### P1-3 — PDF final masih memotong sisi kanan tabel peserta

**Bukti:** `C:/Users/jauha/artifacts/shots/mq/khatmil-final-33.pdf` dan `khatmil-final-35.pdf`, terutama halaman yang memuat tabel peserta.

Halaman kosong sudah hilang, namun pada A4 portrait kolom paling kanan “Tugas & Kontribusi” melewati tepi halaman; sebagian heading dan nilai bar terpotong. Ini masalah **artefak PDF**, bukan bukti bahwa tabel web desktop juga terpotong.

**Perbaikan:** untuk cetak, sesuaikan lebar/struktur tabel (misalnya sembunyikan bar visual dan cetak nilai teks, ubah ke baris ringkas, atau gunakan A4 landscape untuk halaman tabel). Periksa setiap halaman PDF pada ukuran A4 yang sebenarnya, bukan hanya jumlah halamannya.

**Kriteria selesai:** heading dan semua nilai peserta, termasuk Tugas & Kontribusi, terlihat penuh pada setiap halaman PDF.

### P1-4 — Sebagian besar nama bukti UAT dalam laporan tidak tersedia di path yang disebut

**Lokasi yang dilaporkan:** `C:/Users/jauha/artifacts/shots/mq/`.

Dari 16 nama file gambar/PDF yang dirujuk laporan, **5 tersedia dan 11 tidak ditemukan** pada lokasi tersebut. Yang tersedia: `uat-final-768.jpg`, `uat-final-detail-375.jpg`, `uat-final-list-375.jpg`, `khatmil-final-33.pdf`, `khatmil-final-35.pdf`. Contoh yang tidak ditemukan: `uat-detail-10grup-1440.png`, `khatmil2-assign-menunggu-acc-fixed.png`, `khatmil2-terminal-1440.png`, `uat-form-baru-10grup.png`, `uat-error-state.png`, dan `uat-recovery.png`.

PDF campaign 33 memberi bukti dua kelompok dan penugasan pending, tetapi **tidak membuktikan 10 kelompok, status terminal, error/recovery, atau form baru**. JPG mobile yang tersedia hanya menampilkan viewport awal, belum seluruh bagian detail.

**Perbaikan:** salin bukti ke path yang ditulis dalam laporan atau perbarui laporan dengan path aktual yang dapat dibuka. Untuk klaim 10 kelompok, terminal, form, keyboard, dan pemulihan error, sertakan bukti sesuai nama/kasus. Cantumkan lebar viewport CSS dan DPR pada bukti responsif; dimensi berkas JPG saja tidak cukup untuk memastikan ukuran viewport.

**Kriteria selesai:** setiap path bukti yang disebut laporan dapat dibuka, dan tiap klaim UAT utama memiliki bukti visual/log yang cocok.

### P2-1 — Kartu daftar mobile menyisakan area cover kosong yang besar

**Bukti:** `C:/Users/jauha/artifacts/shots/mq/uat-final-list-375.jpg` menunjukkan area putih tinggi di atas nama pada dua kartu. **Lokasi kode:** `src/app/(dashboard)/khatmil/page.tsx` sekitar baris 285–287; kartu merender `<img>` besar bila `cover_url` ada tanpa fallback kegagalan gambar.

Penyebab persisnya belum dapat dipastikan hanya dari tangkapan: URL gambar dapat gagal/kedaluwarsa, belum selesai dimuat saat tangkapan, atau asetnya memang sangat putih. Hasil yang terlihat tetap kurang efektif: dua kartu menghabiskan banyak ruang tanpa memberi informasi visual.

**Perbaikan:** uji `load`/`error` gambar. Bila gambar tidak dapat ditampilkan, hilangkan area cover dan tampilkan kartu ringkas; bila aset valid tetapi terlalu kosong, pilih ukuran/crop yang membuat informasi tetap terbaca. Tambahkan fallback yang stabil untuk presigned URL yang kedaluwarsa.

**Kriteria selesai:** kartu dengan cover valid tampil jelas; kartu dengan cover gagal/kedaluwarsa tidak meninggalkan ruang kosong besar dan tetap mudah dibuka.

### P2-2 — Perubahan pengaturan dev berada di luar modul Khatmil

**Lokasi:** `next.config.ts`, `devIndicators: false`.

Perubahan ini menyembunyikan indikator pengembangan untuk seluruh aplikasi agar screenshot bersih. Ini bukan bug produk, tetapi efeknya global dan ditambahkan demi artefak review. Pertahankan hanya jika memang menjadi keputusan repo; bila tidak, gunakan metode pengambilan screenshot yang tidak memerlukan perubahan konfigurasi aplikasi.

## Permintaan verifikasi akhir untuk OMP

1. Perbaiki P1-1 dan P1-2, lalu tunjukkan pengujian jalur **gagal**, bukan hanya Simpan sukses.
2. Cetak ulang PDF campaign 33/35 dan tunjukkan semua kolom tabel utuh.
3. Lengkapi/cocokkan 11 path bukti yang hilang, terutama 10 kelompok, terminal, form, dan error/recovery.
4. Periksa area cover kosong pada daftar mobile dan uji fallback URL kedaluwarsa.
5. Jalankan lagi ESLint, TypeScript, dan build setelah perbaikan; sertakan ringkasan hasil.

**Batas kerja:** tetap pada `mq-admin`. Jangan mengubah backend, schema DB, izin, atau aplikasi mobile untuk menutup temuan UI ini. Belum ada instruksi commit, push, atau deploy produksi. Data demo/QA di DB tidak perlu diubah dalam review ini.
