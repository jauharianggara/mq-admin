# Plan UI Admin Khatmil — elegan, tanpa tab

Tanggal: 29 Oktober 2026  
Status: **plan untuk OMP / Claude Code; belum diimplementasikan**

## Tujuan dan batas kerja

Rancang ulang pengalaman admin Khatmil agar pengurus dapat segera melihat kondisi khatmil, mengenali kelompok yang perlu perhatian, membaca rincian juz dan peserta, serta menugaskan pembina tanpa berpindah tab. Fokus utama adalah halaman detail `/khatmil/[id]`; rapikan daftar `/khatmil` dan form `/khatmil/baru` serta `/khatmil/[id]/edit` agar terasa sebagai satu modul.

Ini pekerjaan UI pada `mq-admin`. Pertahankan kontrak API, izin, perhitungan, lifecycle, dan alur mobile yang ada. Jangan mengubah backend atau melakukan deploy dalam tugas ini. Jangan menambahkan metrik atau aturan bisnis dari plan lama yang belum terbukti ada pada kode sekarang.

## Kondisi saat ini yang harus dipertahankan

- Detail saat ini memiliki **enam** tab: Ringkasan, Kelompok, Peta Juz, Peserta, Aktivitas, Peringkat. Komentar dalam kode yang menyebut lima tab sudah usang.
- Data diambil dari `GET /khatmil/campaigns/{id}`, `/participants`, dan `/activity`. Penugasan pembina memakai `POST /khatmil/campaigns/{id}/groups/{group_no}/assign-pembina`, lalu menunggu ACC ustadz. Aksi Ubah menuju halaman form terpisah.
- Satu kelompok = **30 juz**. Pada banyak kelompok, tampilkan progres **setiap kelompok** dengan penyebut 30. Persentase campaign boleh tampil sebagai agregat, tetapi jangan menulis angka seperti `42/90 juz`.
- Peta juz mencakup status kosong, aktif, selesai; pemilik; posisi QS surah:ayat; dan tanggal selesai jika ada. Peserta mencakup juz dipegang/selesai, progres bacaan, progres tugas, kontribusi, dan waktu laporan terakhir. Peserta yang belum mengambil juz tetap muncul dalam peringkat.
- Status terminal `COMPLETED`/`CANCELLED` tetap dapat dibaca, tetapi aksi Ubah dan penugasan pembina tidak tersedia. Form saat ini mengunci field terminal.
- Desain mengikuti identitas MQ yang sudah terlihat pada shell admin: logo, huruf sans, permukaan netral hangat, hijau sebagai warna aksi, warna status seperlunya. Jangan merombak token global karena berlaku untuk modul lain.

## Arah desain

**Satu halaman yang dibaca dari atas ke bawah.** Hapus seluruh `Tabs`, `TabsList`, `TabsTrigger`, dan `TabsContent` dari detail. Setiap bagian memiliki judul, deskripsi singkat bila perlu, dan ruang yang jelas. Desktop boleh memakai daftar isi kecil berisi *anchor link* ke bagian halaman; semua konten tetap ada dalam satu alur scroll. Di mobile, gunakan urutan bagian biasa, bukan chip horizontal yang tampak seperti tab.

Tampilan diarahkan ke administrasi yang tenang: ruang napas cukup, tipografi bertingkat jelas, garis pemisah halus, satu area informasi utama, serta aksen hijau/emas yang hemat. Gunakan komponen dan token repo; hindari emoji sebagai ikon utama, gradient besar, podium mencolok, atau banyak kartu statistik dengan bobot visual sama. Lebarkan area detail dari `max-w-4xl` secukupnya agar tabel dan peta juz nyaman, namun batasi panjang teks deskripsi.

### Susunan halaman detail

```text
Kembali ke Khatmil   Judul Khatmil + status                 [Ubah]
Periode · mode · jumlah peserta · slug (sekunder)
[cover kecil/terkendali bila ada]

PROGRES KHATMIL
Angka utama: progres campaign (%) / kelompok khatam
Ringkasan ringkas: peserta, kelompok, pembina, verifikasi
Rincian progres K1 18/30, K2 30/30, ... selalu terlihat

KELOMPOK & PETA JUZ
Kartu per kelompok: progres 0–30, terisi, status pembina,
[Tetapkan/Ganti Pembina] bila diizinkan
Peta 30 juz berada di dalam konteks kelompok; klik juz
menampilkan rincian tepat di bawah petanya

PESERTA & PERINGKAT
Sorotan tiga teratas yang ringkas bila ada capaian
SATU daftar/tabel semua peserta, dengan nomor peringkat,
juz selesai/dipegang, progres bacaan, tugas, kontribusi,
dan terakhir lapor

AKTIVITAS TERBARU
Feed laporan terbaru (data API yang sudah ada)

DETAIL KHATMIL
Deskripsi, periode, mode, kuota, kebijakan verifikasi,
slug sebagai metadata sekunder
```

**Kelompok:** semua kartu kelompok dan angka `X dari 30 juz selesai` selalu terlihat. Untuk banyak kelompok, peta 30 juz dapat dibuka per kartu dengan disclosure/accordion yang jelas; buka kelompok pertama secara default. Ini menjaga halaman tetap terukur hingga batas 10 kelompok tanpa menyembunyikan ringkasan. Pada satu kelompok, peta langsung terbuka. Disclosure bukan navigasi tab. Saat juz dipilih, tampilkan detail inline yang dapat ditutup dan pastikan label tombol menyebut nomor kelompok serta juz.

**Peserta:** gabungkan tab Peserta dan Peringkat yang kini menduplikasi daftar orang. Pertahankan seluruh informasi yang sudah ada, termasuk progres pribadi dan kontribusi yang merupakan dua ukuran berbeda. Tiga teratas hanya sorotan visual kecil; tabel/kartu tunggal menjadi sumber daftar lengkap. Pertahankan urutan peringkat yang dipakai kode saat ini (`juz_done_count` menurun, lalu nama) kecuali aturan produk yang berlaku saat implementasi terbukti berbeda. Jangan mengada-adakan metrik menit. Untuk peserta dengan beberapa juz aktif, tampilkan progres per juz dengan jelas, bukan memberi kesan bar juz pertama mewakili semua juz.

**Aktivitas:** pertahankan urutan dan jumlah yang diberikan API, gunakan tanggal/waktu yang mudah dipahami; `laporan lama`, catatan, serta posisi QS tetap terbaca. Jangan mengubah feed menjadi komponen yang mendominasi halaman.

### Daftar dan form

- `/khatmil`: pertahankan pencarian, filter status default Aktif, urutan/sort, status, cover, peserta, rincian tiap kelompok, progres, Detail, Ubah, dan Batalkan. Rapikan hierarki tabel desktop agar nama/status/progres paling mudah dipindai; aksi sekunder cukup dalam menu yang jelas bila kepadatan menuntut. Kartu mobile tetap satu kolom tanpa scroll horizontal. Jangan mengganti **Batalkan** dengan **Hapus**, karena aksi bisnisnya berbeda.
- Form baru/Ubah: tetap satu halaman dengan bagian `Informasi Khatmil`, `Pengaturan Pembacaan`, dan `Periode & Status`; tidak perlu tab. Perjelas label dan bantuan untuk jumlah kelompok (masing-masing 30 juz), mode, verifikasi, serta konsekuensi status terminal. Pertahankan semua field dan default yang ada, upload/hapus cover, validasi, serta keadaan terkunci. Gunakan label aksi ringkas dan konsisten: **Simpan** untuk menyimpan, **Ubah** untuk membuka edit; Batalkan untuk membatalkan campaign.

## Langkah implementasi yang disarankan

1. Audit cepat kode aktual dan perubahan lokal sebelum mengedit; `.graphify` dibuat dari commit lama dan harus diverifikasi terhadap source. Periksa tiga route Khatmil dan `shared.tsx`. Jangan menimpa perubahan kerja lain.
2. Bentuk komponen presentasi kecil untuk ringkasan progres, kartu kelompok/peta juz, daftar peserta, dan aktivitas. Jaga sumber data dan fungsi `assignPembina` tetap sama. Hapus duplikasi tabel peserta/peringkat.
3. Susun ulang detail menjadi section semantik dengan ID anchor. Terapkan layout desktop/mobile dan keadaan loading, kosong, error, terminal, serta kelompok tunggal/banyak.
4. Rapikan daftar dan form secara terbatas agar serasi dengan detail; jangan menyentuh shell admin atau modul lain tanpa kebutuhan nyata.
5. Jalankan lint/build, lalu uji lewat alur pengguna: daftar → detail → pilih juz → lihat peserta/aktivitas → tetapkan pembina → kembali → Ubah/Simpan. Uji juga campaign terminal tanpa tombol tulis.

## Kriteria penerimaan

- Tidak ada tab pada halaman detail desktop maupun mobile; semua bagian penting bisa dicapai dengan scroll biasa. Anchor link, bila dipakai, tidak menyembunyikan konten.
- Pengurus dapat melihat status, progres campaign, dan rincian **semua kelompok** segera; setiap kelompok selalu memakai penyebut 30 juz. Peta juz dan status pembina benar untuk satu maupun banyak kelompok.
- Informasi peserta lengkap tersedia dalam **satu** daftar, termasuk yang belum mengambil juz; peringkat dan progres tidak saling bertentangan. Sorotan tiga teratas muncul hanya bila datanya ada.
- Tetapkan/Ganti Pembina dan Ubah bekerja sesuai izin/status yang sudah ada; hasil penugasan tetap ditandai `Menunggu ACC` sampai diterima ustadz. Tidak ada aksi tulis pada campaign terminal.
- Empty, loading, error, gambar cover hilang/kedaluwarsa, data posisi kosong, nama panjang, serta 1–10 kelompok tetap rapi dan terbaca.
- Periksa tampilan nyata pada desktop sekitar 1440 px, tablet sekitar 768 px, dan mobile sekitar 375 px; tidak ada overflow, tombol ganda, atau tabel yang memaksa scroll seluruh halaman. Periksa light/dark, fokus keyboard, nama tombol untuk pembaca layar, dan kontras status.
- Tidak ada perubahan endpoint, struktur database, izin, aplikasi mobile, atau deployment sebagai bagian dari pekerjaan UI ini.

## Berkas utama

- `src/app/(dashboard)/khatmil/[id]/page.tsx` — susunan ulang detail tanpa tab.
- `src/app/(dashboard)/khatmil/page.tsx` — perapian daftar.
- `src/app/(dashboard)/khatmil/shared.tsx` — komponen/helper bersama dan form.
- Komponen baru di bawah `src/app/(dashboard)/khatmil/` bila pemecahan file membuat kode lebih mudah dirawat.

**Catatan sumber:** plan ini disusun dari kode lokal dan keputusan historis MQ yang diverifikasi pada implementasi saat ini. Mockup lama yang disebut plan September tidak tersedia di lokasi arsip; gunakan perilaku kode sekarang sebagai acuan fungsi.
