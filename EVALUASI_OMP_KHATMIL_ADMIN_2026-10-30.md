# Evaluasi untuk OMP — UI Admin Khatmil tanpa tab

**Tanggal:** 30 Oktober 2026  
**Status:** Review hasil revisi; **belum merupakan persetujuan final atau izin deploy**  
**Sumber visual:** `C:/Users/jauha/Downloads/2601c239-865d-43af-a7d4-f9e663371bf0.pdf` (2 halaman, dibuat 30 Oktober 2026 pukul 07.26 WIB)  
**Acuan:** `PLAN_KHATMIL_ADMIN_TANPA_TAB.md` dan implementasi lokal `mq-admin` saat review.

## Ringkasan keputusan

**Detail desktop satu kelompok sudah berada pada arah yang benar.** Enam tab telah diganti dengan satu alur halaman: Progres Khatmil → Kelompok & Peta Juz → Peserta & Peringkat → Aktivitas Terbaru → Detail Khatmil. Tiga masalah pada review sebelumnya juga sudah diperbaiki: waktu tidak lagi `NaN hari lalu`, angka 4% diberi label sebagai **progres bacaan**, dan tabel peserta tidak lagi memerlukan scroll horizontal pada tangkapan desktop yang dilampirkan.

**Belum dapat dinyatakan selesai untuk seluruh cakupan plan.** PDF hanya menunjukkan detail desktop untuk satu kelompok. Belum ada bukti visual dan uji alur untuk mobile/tablet, banyak kelompok, status terminal, daftar campaign, form baru/Ubah, dan penugasan pembina. Ekspor PDF masih menyisakan halaman kedua yang hampir kosong. Perubahan CSS cetak yang ditambahkan bersifat global sehingga perlu dibatasi atau dikeluarkan.

## Apa yang sudah baik

| Area | Hasil yang terlihat | Penilaian |
|---|---|---|
| Arsitektur informasi | Semua bagian utama muncul dalam satu halaman; daftar isi di desktop menuju anchor bagian, bukan menyembunyikan konten | Sesuai permintaan tanpa tab |
| Progres | `4% progres bacaan` dibedakan dari `0 dari 30 juz selesai`; legenda membedakan selesai, aktif, kosong | Makna angka jauh lebih jelas |
| Kelompok dan peta | Ringkasan kelompok, status pembina, 30 tombol juz, dan legenda berada dalam konteks yang sama | Mudah dipindai pada contoh satu kelompok |
| Peserta | Daftar peserta dan peringkat disatukan; waktu laporan berada di bawah nama; progres tugas dan kontribusi digabung dalam satu kolom | Duplikasi dan lebar tabel berkurang |
| Bahasa tanggal | Periode memakai format seperti `14 Sep 2026 – 14 Okt 2026` | Lebih mudah dibaca daripada tanggal mentah |
| Pemeriksaan kode | ESLint pada enam berkas route/komponen Khatmil terkait dan `tsc --noEmit --incremental false` sama-sama lulus saat review | Tidak ada error statis pada pemeriksaan ini |

**Batas penilaian:** PDF merupakan tangkapan visual, bukan bukti bahwa tombol, navigasi, pembaruan data, dan keadaan responsif telah diuji. Build produksi dan pengujian pengguna belum saya jalankan pada review ini.

## Tindak lanjut prioritas

### P1 — Selesaikan artefak PDF tanpa mengubah perilaku cetak seluruh admin

**Bukti:** PDF terbaru tetap memiliki dua halaman; halaman kedua hampir seluruhnya kosong, hanya menyisakan bagian akhir halaman dan tombol overlay pengembangan. Berkas `src/app/globals.css` kini menambahkan aturan `@media print` di sekitar baris 151. Aturan itu memakai selector umum seperti `header`, `.rounded-lg`, dan `.rounded-md`, sehingga dapat memengaruhi semua halaman admin saat dicetak. Hasil PDF saat ini menunjukkan perubahan tersebut belum menyelesaikan masalah artefak yang dilaporkan.

**Dampak:** PDF review tampak belum rapi, dan aturan cetak global dapat menyembunyikan header atau memaksa pemotongan kartu pada modul lain. Ini masalah **ekspor/review**, terpisah dari mutu UI web Khatmil yang terlihat pada halaman pertama.

**Arahan perbaikan:**

1. Periksa cara PDF dibuat (metadata menyebut `jsPDF 4.0.0`); atur tinggi tangkapan dan pembagian halaman pada proses ekspor agar tidak membuat halaman hampir kosong.
2. Hapus aturan cetak global bila tidak diperlukan oleh produk. Jika memang diperlukan untuk Khatmil, batasi dengan class/wrapper khusus Khatmil, bukan selector `header` atau kelas radius umum di seluruh aplikasi.
3. Buat ulang PDF dan periksa setiap halaman hasilnya. Jangan menganggap perubahan CSS berhasil hanya karena halaman web terlihat baik.

**Selesai bila:** PDF hasil review tidak memiliki halaman hampir kosong dan proses cetak modul admin lain tidak berubah tanpa alasan produk yang jelas.

### P1 — Lengkapi UAT visual dan alur sesuai cakupan plan

**Bukti saat ini:** hanya tersedia satu tangkapan detail desktop dengan **satu kelompok**, sembilan peserta, belum ada juz selesai. Belum ada bukti untuk keadaan yang paling berisiko pada layout dan interaksi.

**Minta OMP memeriksa dan menyertakan bukti berikut:**

| Kasus | Yang harus terlihat/berhasil |
|---|---|
| Detail desktop sekitar 1440 px | Bagian terbaca, tabel muat, peta juz dapat dipilih, tidak ada tombol ganda |
| Tablet sekitar 768 px | Tidak ada overflow halaman; tabel/kartu dan aksi kelompok tetap dapat digunakan |
| Mobile sekitar 375 px | Semua bagian bisa dibaca dengan scroll vertikal biasa; tidak muncul navigasi mirip tab atau scroll horizontal seluruh halaman |
| Satu kelompok | Peta 30 juz langsung tersedia; angka selesai selalu `X dari 30` |
| Beberapa kelompok, termasuk batas 10 | Ringkasan **semua** kelompok terlihat; tiap peta punya konteks kelompok sendiri; disclosure membuka peta yang tepat |
| Juz kosong, aktif, selesai | Detail inline menampilkan pemilik, status, posisi QS, atau tanggal selesai sesuai datanya; tombol dapat dipakai dengan keyboard |
| Penugasan pembina | Tetapkan/Ganti Pembina membuka pencarian, sukses menampilkan `Menunggu ACC`, setelah ACC tampil pembina resmi |
| Campaign `COMPLETED` dan `CANCELLED` | Data tetap terbaca; aksi Ubah dan Tetapkan/Ganti Pembina tidak tampil |
| Daftar `/khatmil` | Filter status, pencarian, rincian progres per kelompok, Detail, Ubah, Batalkan bekerja; kartu mobile rapi |
| Form baru/Ubah | Field/default lama tetap ada; cover, penyimpanan, validasi, dan keadaan terminal terkunci bekerja |
| Empty, error, loading | Penjelasan dan jalan pemulihan jelas; tidak ada layout pecah atau konten `NaN`/`undefined` |

**Selesai bila:** ada tangkapan desktop, tablet, mobile, dan catatan uji alur untuk kasus di atas. PDF tunggal yang sekarang belum cukup sebagai bukti penerimaan seluruh modul.

### P2 — Rapikan bahasa antarmuka dan data demo

- Daftar peserta masih memakai kata **`join`** (`sections.tsx` sekitar baris 576 dan 649). Gunakan `bergabung` atau `sejak` agar konsisten dengan UI berbahasa Indonesia. Pastikan label singkat tetap muat pada lebar kecil.
- Nama **`Belum Diisi`** muncul sebagai akun di header, peserta, aktivitas, dan pembina kelompok pada tangkapan. Ini dapat berupa data demo yang sah, jadi jangan mengubah aturan hanya berdasarkan screenshot. Untuk bukti final, gunakan contoh data representatif atau jelaskan bahwa `Belum Diisi` adalah nama akun, agar pembaca tidak salah mengira status pembina kosong.
- Ketika semua peserta memiliki **0 juz selesai**, kolom nomor `#` tetap menampilkan 1–9 berdasarkan urutan nama. Kode memang mengurutkan `juz_done_count` lalu nama. Pertahankan aturan produk, tetapi jangan memberi kesan ada pemenang berbasis capaian saat belum ada yang menyelesaikan juz. Sorotan tiga teratas sudah benar tidak muncul pada keadaan ini; label bagian atau bantuan urutan dapat diperjelas bila dibutuhkan.
- Saat membuat bukti final, sembunyikan tombol overlay pengembangan `N` agar artefak review hanya memperlihatkan UI produk.

## Pemeriksaan terhadap plan awal

| Kriteria plan | Status review 30 Oktober | Catatan |
|---|---|---|
| Detail tanpa tab | **Terlihat terpenuhi** | Tidak ada tab pada PDF desktop maupun impor `Tabs` pada detail saat ini |
| Satu alur scroll dan anchor desktop | **Terlihat terpenuhi** | Daftar isi kiri adalah anchor; bagian utama tetap tersusun vertikal |
| Tiap kelompok selalu memakai 30 juz | **Terlihat untuk satu kelompok** | Contoh banyak kelompok masih perlu UAT |
| Peta juz dalam konteks kelompok | **Terlihat untuk satu kelompok** | Klik juz, detail inline, dan disclosure banyak kelompok masih perlu uji interaksi |
| Peserta dan peringkat dalam satu daftar | **Terlihat terpenuhi** | Tabel sekarang enam kolom utama; informasi tugas dan kontribusi tetap ada |
| Peserta belum mengambil juz tetap terlihat | **Terlihat terpenuhi** | Sembilan peserta dengan 0 juz selesai tetap muncul |
| Loading/error/terminal | **Ada implementasi kode, belum ada bukti UI** | Perlu tangkapan serta uji status dan pemulihan error |
| Daftar serta form baru/Ubah | **Belum dinilai visual** | PDF hanya memuat detail |
| Responsif 1440/768/375 | **Belum lengkap** | Baru ada satu tangkapan desktop |
| Lint dan TypeScript | **Lulus** | Pemeriksaan ini bukan pengganti build dan UAT |

## Berkas yang relevan bagi OMP

- `src/app/(dashboard)/khatmil/[id]/page.tsx` — susunan detail, fetch, anchor, status terminal, dan dialog pembina.
- `src/app/(dashboard)/khatmil/[id]/sections.tsx` — progres, kartu kelompok/peta, peserta, aktivitas, metadata.
- `src/app/(dashboard)/khatmil/shared.tsx` — `timeAgo()` yang sudah menangani ISO dengan akhiran zona waktu dan fallback tanggal tidak valid, serta form bersama.
- `src/app/(dashboard)/khatmil/page.tsx` — daftar campaign.
- `src/app/(dashboard)/khatmil/baru/page.tsx` dan `[id]/edit/page.tsx` — route form.
- `src/app/globals.css` — aturan cetak global yang perlu dievaluasi kembali.

## Paket handoff yang diminta dari OMP

1. Perbaikan P1 dan polesan P2 yang tidak mengubah aturan bisnis.
2. Ringkasan perubahan per berkas, termasuk keputusan mengenai `@media print` global.
3. Hasil ESLint, TypeScript, dan build; bila suatu perintah gagal, laporkan penyebabnya secara spesifik.
4. Bukti visual desktop/tablet/mobile serta kasus multi-kelompok dan terminal.
5. Catatan uji alur: buka daftar → detail → pilih juz → lihat peserta/aktivitas → tetapkan pembina → Ubah/Simpan; sertakan hasil untuk aksi yang harus tersembunyi pada status terminal.
6. PDF review yang tidak menyisakan halaman hampir kosong, jika PDF tetap dipakai sebagai artefak handoff.

**Keputusan sementara:** desain detail desktop dapat diteruskan; persetujuan akhir menunggu bukti cakupan dan pembenahan artefak PDF. Tidak ada instruksi untuk deploy produksi dalam evaluasi ini.
