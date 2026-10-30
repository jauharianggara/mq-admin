# Usulan agar detail Admin Khatmil tetap ringkas saat data membesar

**Tanggal:** 30 Oktober 2026  
**Status:** rancangan untuk OMP/Claude Code; belum ada instruksi implementasi.  
**Prinsip:** tetap satu halaman detail tanpa tab. Admin melihat ringkasan dulu, lalu membuka rincian yang sedang dibutuhkan. Banyaknya data tidak boleh membuat halaman awal tumbuh tanpa batas.

## Masalah pada implementasi sekarang

Di `src/app/(dashboard)/khatmil/[id]/sections.tsx`, `GroupsSection` merender seluruh `petaGroups`, `ParticipantsSection` merender seluruh `ranked` pada tabel desktop dan kartu mobile, dan `ActivitySection` merender seluruh `activity`. Sebagian besar peta juz memang tertutup pada awalnya, tetapi setiap kartu kelompok tetap menambah tinggi halaman. Di `page.tsx`, detail campaign, seluruh peserta, dan aktivitas diambil bersamaan sebelum halaman tampil.

API saat ini juga membatasi aktivitas ke 50 secara default dan maksimum 100 (`mq-backend/src/modules/khatmil/handler.rs`), sedangkan endpoint peserta mengembalikan seluruh peserta. Karena itu, sekadar memotong tampilan di frontend akan memperpendek halaman, tetapi belum menyelesaikan biaya transfer dan rendering untuk campaign sangat besar. Tombol “Lihat semua aktivitas” juga tidak boleh mengklaim riwayat lengkap dengan API sekarang.

## Tata letak yang disarankan

```text
Header campaign + status + aksi
Ringkasan progres dan angka utama

Kelompok & Peta Juz       [Cari/pilih kelompok] [status] [5 per halaman]
  Ringkasan kelompok dalam baris ringkas
  Peta 30 juz hanya untuk satu kelompok yang dipilih

Peserta & Peringkat        [Cari peserta] [Urutkan] [10 per halaman]
  Sorotan 3 peserta teratas
  Tabel/kartu peserta yang dipaginasi

Aktivitas Terbaru          [5 peristiwa terbaru]
  Tautan Riwayat aktivitas ke halaman tersendiri bila dibutuhkan

Detail Khatmil             metadata ringkas
```

Daftar isi anchor desktop tetap ada. Pada mobile, pakai tombol “Lompat ke bagian” yang membuka daftar anchor pada halaman yang sama. Keduanya adalah navigasi halaman, bukan tab konten.

## Aturan per bagian

### 1. Kelompok & Peta Juz

- Tampilkan **5 kelompok per halaman** sebagai baris/kartu ringkas: nomor, status, `x/30` juz selesai, `x/30` terisi, pembina, dan status ACC. Sediakan cari nomor/pembina dan filter “Semua / Perlu pembina / Menunggu ACC / Berjalan / Khatam” bila jumlah kelompok besar.
- Saat satu kelompok dipilih, tampilkan **satu** peta 30 juz beserta rincian juz. Jangan membuka peta banyak kelompok sekaligus. Aksi Tetapkan/Ganti Pembina tetap tersedia pada baris kelompok dan panel yang dipilih.
- Pada campaign satu kelompok, langsung tampilkan petanya seperti sekarang. Pada banyak kelompok, pilih kelompok pertama secara awal atau ingat kelompok terakhir yang dipilih. Perubahan halaman kelompok menutup panel kelompok yang tidak lagi terlihat.
- Gunakan nomor halaman atau kontrol Sebelumnya/Berikutnya; jangan gunakan “Tampilkan semua” yang membuat halaman kembali panjang.

### 2. Peserta & Peringkat

- Pertahankan ringkasan **3 peserta teratas** sebagai sorotan, lalu tampilkan **10 peserta per halaman** di tabel desktop/kartu mobile. Beri pencarian nama dan pengurutan yang konsisten; jumlah total dan rentang hasil harus jelas, misalnya “11–20 dari 238 peserta”.
- Peringkat harus mengikuti urutan seluruh peserta, sehingga halaman kedua dimulai dari nomor 11, bukan 1. Pencarian menampilkan jumlah hasil yang cocok dan empty state yang jelas.
- Bila admin membutuhkan detail seseorang, buka rincian pada baris atau halaman peserta. Hindari memuat puluhan badge juz dan bar progres untuk seluruh peserta dalam DOM sekaligus.

### 3. Aktivitas Terbaru

- Di halaman detail cukup **5 aktivitas terbaru**. Judul tetap “Aktivitas Terbaru” dan sertakan waktu, nama, juz, serta status penting.
- Untuk sejarah lengkap, buat halaman `/khatmil/[id]/aktivitas` dengan pagination/cursor dan filter dasar. Tautan “Lihat riwayat aktivitas” hanya tampil setelah API mampu mengembalikan halaman lanjutan. Jangan pakai “Muat lebih banyak” tanpa batas di halaman detail karena tinggi halaman akan terus bertambah.

### 4. Cetak/PDF

- Bedakan tampilan layar dan keluaran cetak. Pagination layar tidak boleh diam-diam membuat PDF berisi hanya 5 kelompok, 10 peserta, dan 5 aktivitas seolah laporan lengkap.
- Tetapkan pilihan yang eksplisit: **Cetak ringkasan** (data pilihan/terbaru dengan label cakupan) dan, bila dibutuhkan, **Unduh laporan lengkap** yang menyusun seluruh data secara bertahap dengan page break. Jangan mengandalkan DOM halaman yang sedang dipaginasi untuk laporan lengkap.

## Tahapan implementasi yang disarankan

1. **Tahap UI, cepat:** batasi rendering awal 5 kelompok, 10 peserta, 5 aktivitas; satu peta juz aktif; tambah pencarian/pagination lokal untuk kelompok dan peserta. Ini memperbaiki tinggi halaman, tetapi data masih diunduh seluruhnya. Jangan beri label “riwayat lengkap” pada aktivitas.
2. **Tahap skala data:** tambah endpoint daftar kelompok ringkas dan detail peta per kelompok; pagination/filter/sort peserta di server beserta `total`; cursor pagination aktivitas. Muat setiap section secara mandiri agar kegagalan aktivitas tidak menghalangi ringkasan campaign.
3. **Tahap laporan:** pisahkan data dan layout cetak ringkasan/lengkap agar pagination layar tidak memotong laporan.

Tahap kedua memerlukan rancangan API backend dan pengujian kontrak. Itu adalah pekerjaan baru; dokumen ini tidak memberi izin untuk mengubah backend atau deploy.

## Kriteria penerimaan untuk OMP/Claude Code

- Pada 1, 10, dan 50 kelompok, panjang awal halaman tetap terkendali; paling banyak satu peta 30 juz terbuka. Cari/pilih kelompok dan aksi pembina tetap bisa dipakai lewat keyboard.
- Pada 0, 20, dan 500 peserta, jumlah yang terlihat per halaman dibatasi 10, nomor peringkat dan total benar, pencarian/sort tidak kehilangan hasil.
- Pada 0, 50, dan 1.000 aktivitas, halaman detail menampilkan 5 terbaru; jalur riwayat lengkap hanya dinyatakan tersedia bila pagination backend memang ada.
- Tidak ada scroll vertikal bertingkat di dalam kartu/tabel sebagai jalan pintas. Perpindahan halaman membawa fokus atau posisi scroll kembali ke judul section terkait.
- Viewport 375, 768, dan 1440 px tetap mudah dinavigasi. Cetak ringkasan dan laporan lengkap menyebut cakupannya secara jujur.
- Alur tanpa tab, anchor, status terminal, penugasan pembina, dan rincian juz yang sudah ada tetap berfungsi.
