# PLAN — Standarisasi Tombol Aksi Tabel: Bentuk, Style, Label (2026-10-31)

STATUS: **DIEKSEKUSI (ACC 31 Okt).** Hasil verifikasi di §5b. Laporan: `LAPORAN_STANDARD_TOMBOL_TABEL_2026-10-31.md`.
Lingkup: tombol aksi di dalam tabel (row action) + tombol baris di halaman detail. Di luar lingkup: tombol toolbar/halaman (Muat Ulang, Ekspor, Tambah…) yang sudah memakai `Button` shadcn.

## 1. Temuan (inventaris 31 Okt)
- Satu aksi semantik "buka detail" memakai 4 label: `Detail` (45), `Buka` (7), `Lihat Detail` (1), `Lihat mutasi →` (1).
- Ukuran bercampur: `sm` (34), `xs` (5), `icon` (8), `icon-xs` (2).
- Komponen bercampur: `TombolAksi` (`<button>` manual) vs `Button` Base UI (variant outline/default/ghost).
- Hover berbeda: `TombolAksi` hover emerald; `Button outline` hover netral.

## 2. Standar baku (matriks semantik → bentuk)
Satu komponen: **`TombolAksi`** di `data-table.tsx` — dibangun DI ATAS `Button` (Base UI) agar radius/hover/fokus mengikuti komponen, bukan `<button>` manual. Ukuran dalam tabel **selalu `size="xs"`**; shape default komponen (rounded-md); tinggi 24px.

| Semantik | Variant | Label baku | Ikon |
|---|---|---|---|
| Buka detail entri (row action utama) | `outline` | **Detail** | — |
| Setujui / aktifkan | `default` (solid primary) | ACC / Aktifkan | CheckCircle2 (payouts) |
| Tolak / suspend / batalkan | `destructive` | Tolak / Suspend / Batalkan | XCircle |
| Proses lanjutan (non-destruktif) | `outline` | Sudah ditransfer | — |
| Edit baris | `ghost` icon-only | — (title="Edit …") | Pencil |
| Batalkan campaign | `ghost` icon-only destructive | — (title/aria) | Ban |
| Salin nomor/ID | ghost mini (sudah seragam) | — (aria-label) | Copy |

Glosarium label (yang dilarang): ~~Buka~~, ~~Lihat Detail~~, ~~Lihat mutasi →~~ → ganti `Detail`; aksi mutasi pakai label `Mutasi`.
Tombol non-aksi dalam tabel (salin) tidak berubah.

## 3. Per layar (perubahan konkret)
| Layar | Sebelum → Sesudah |
|---|---|
| `/payments` | `Button xs outline` Link "Detail" → `TombolAksi href` label `Detail` |
| `/visits` | `Button sm outline` "Buka" → `TombolAksi` "Detail" |
| `/santri/[id]`, `/ustadz/[id]` | `Button sm outline` "Buka" → "Detail" |
| `/deposit` rekap | "Lihat Detail" → "Detail"; "+ Koreksi" → tetap, ukuran ikut `xs` |
| `/rekap-infaq` | "Lihat mutasi →" → `Mutasi` |
| `/payouts` | ACC (default) / Tolak (destructive) / Sudah ditransfer (outline) → `TombolAksi` dgn prop `variant` + ikon |
| `/pengguna` | Aktifkan (default) / Suspend (destructive) → `TombolAksi` dgn variant |
| `/khatmil` | "Detail" → `TombolAksi href`; icon Edit/Batalkan tetap `icon-xs ghost` |
| `/penerima`, `/santri`, `/ustadz` (list) | sudah `TombolAksi` — hanya berganti bentuk ke `Button` |

Baris tetap bisa diklik; `stopPropagation` tetap bawaan `TombolAksi`.

## 4. API `TombolAksi` (usulan)
```ts
TombolAksi({
  label = "Detail",
  variant = "outline",            // "outline" | "default" | "destructive" | "ghost"
  icon?: React.ReactNode,         // kiri label
  href?: string,                  // render <Link> (Base UI render prop)
  onClick?: (e) => void,          // stopPropagation bawaan
  title?: string,
  disabled?: boolean,
})
```
Ikon-only (Edit/Batalkan/salin) tetap `Button size="icon-xs" variant="ghost"` — TIDAK dipaksa lewat `TombolAksi`.

## 5. Eksekusi & verifikasi
1. Refactor `TombolAksi` (wrap Button) → 2. Ganti pemakaian di 9 layar (tabel §3) → 3. `tsc` + `eslint` → 4. Browser: semua tabel render, klik Detail tetap navigasi & tidak dobel, klik baris tetap jalan, hover konsisten → 5. Screenshot `artifacts/shots/mq/tombol-standar-*.png` (payments, payouts, visits, deposit) → laporan singkat.
Commit menunggu perintah.

### 5b. Hasil eksekusi (31 Okt)
- `TombolAksi` kini wrap `Button size="xs"` + prop `variant/icon/href/disabled`; API lama (label/onClick/title) kompatibel.
- 9 layar diganti; audit browser: label `Detail`/`ACC`/`Suspend` sesuai matriks, **semua 24px / radius 8px / font 12px** di 9 halaman.
- Klik `Detail` di /santri → navigasi ke `/santri/420` sekali (tidak dobel). Console 0 error.
- `tsc` + `eslint` bersih; screenshot `tombol-standar-{payments,payouts,visits,deposit}.png`.
- Catatan: `santri/[id]` ditulis ulang pihak lain saat eksekusi (layout baru + filter kunjungan) — pola diterapkan ke tabel versi barunya.

## 6. Yang tidak berubah
Logika/endpoint/izin, posisi kolom pola `No|Aksi|Status|Nomor`, tombol toolbar & halaman, ikon-only, tombol dialog (Batal/Tolak & Kembalikan Dana dll.).

## 7. REVISI (feedback user 31 Okt): setiap tombol WAJIB berikon
Status: **DIEKSEKUSI (ACC 31 Okt)** — `ICON_BY_LABEL` (Record statis) di `data-table.tsx`; `TombolAksi` resolusi ikon: `icon` eksplisit → bawaan peta → tanpa ikon.
Verifikasi: /santri 10/10 · /payments 36/36 · /payouts (ACC+Tolak) · /visits 20/20 · /khatmil 2/2 · /penerima 1/1 · /deposit (Detail & + Koreksi) — semua tombol berikon svg; tsc+eslint bersih; console 0 error. Bukti: `artifacts/shots/mq/tombol-berikon-payments.png`.

- `TombolAksi` **selalu menampilkan ikon**: bila pemanggil tidak mengirim `icon`, dipetakan dari label
  lewat tabel statis `ICON_BY_LABEL` (Record) di `data-table.tsx` — satu sumber, tidak ada pemanggil yang berubah.
- Gaya (border outline, h-6) **tetap seperti sekarang**; ikon membuat tombol jelas "kontrol" dan
  memisahkannya dari StatusPill (pill tint tanpa ikon, rounded-4xl).
- Peta default:

| Label | Ikon (lucide) |
|---|---|
| Detail | Eye |
| ACC | CheckCircle2 |
| Tolak | XCircle |
| Aktifkan | CheckCircle2 |
| Suspend | Ban |
| Sudah ditransfer | Banknote |
| Mutasi | ArrowLeftRight |
| + Koreksi | Pencil |

- Label di luar peta + tanpa `icon` eksplisit → tanpa ikon (tidak menebak-nebak).
- Ukuran ikon mengikuti `size="xs"` (size-3 bawaan Button).
- Opsional bila setelah ini masih terasa mirip: turunkan detail ke `ghost` (Opsi A lama) — terpisah, tidak dieksekusi sekarang.
- Verifikasi: tsc/eslint + screenshot `/santri`, `/payments`, `/payouts`, `/deposit` (ikon terlihat di semua tombol aksi).

## 8. REVISI 2 (feedback user 31 Okt): tombol halaman detail & tombol ad-hoc ikut distandarkan
Status: **DIEKSEKUSI.** Tombol di luar tabel tidak lagi dikecualikan (pencabutan lingkup §6 "tombol halaman").

| Lokasi | Sebelum → Sesudah |
|---|---|
| `/ustadz/[id]` Tindakan Admin | 5 tombol tanpa ikon → semua berikon: Suspend akun (destructive, Ban) · Aktifkan akun (default, CheckCircle2) · Batalkan Verifikasi (destructive, XCircle) · Verifikasi Ustadz (default, BadgeCheck) · Reset Kata Sandi (outline, KeyRound) |
| `/santri/[id]` Tindakan Admin | "Suspend akun" class merah ad-hoc (border-red-200 bg-red-50…) → `variant="destructive"` polos + Ban (konsisten peta `Suspend: Ban`); "Aktifkan akun" + CheckCircle2 |
| `/khatmil/[id]` "+ Tambah Kelompok" | `<button>` dashed ad-hoc (disabled) → `Button variant="outline" size="sm"` + ikon Plus (tetap disabled — butuh backend) |
| `/pengguna` "+ USTADZ" | Badge dashed dipakai sebagai tombol → `Button variant="outline" size="xs"` + ikon Plus (title "Tambah role USTADZ") |

Tidak diubah: `Tolak`/`ACC` di `/payouts` dan `Aktifkan`/`Suspend` di `/pengguna` — sudah sesuai matriks §2 + ikon §7.
Verifikasi: tsc + eslint bersih; browser: ustadz/415 · santri/420 · pengguna · khatmil/44 — semua tombol berikon dan variant konsisten, console 0 error (error "Ban is not defined" pertama = chunk basi pra-HMR, hilang setelah reload). Bukti: `artifacts/shots/mq-admin/tombol-standar-{ustadz-detail,pengguna,tambah-kelompok}.webp`.

## 9. REVISI 3 (feedback user 31 Okt): audit menyeluruh — semua tombol ber-teks WAJIB berikon
Status: **DIEKSEKUSI.** Audit otomatis (parser `<Button` vs `</Button>`, deteksi ikon `<Icon className=`) atas seluruh `src/app`: 75 tombol, 20 tersisa tanpa ikon → semuanya dilengkapi.

| File | Tombol → Ikon |
|---|---|
| `payouts` | Daftar Transfer → FileDown · Unggah Bukti Transfer → Upload · Unduh CSV → Download · Batal (dialog) → X · Tolak & Kembalikan Dana (dialog) → XCircle |
| `deposit` | Riwayat Penyesuaian → History · Unduh Rekap Saldo → Download · Batal (dialog) → X · Ajukan (dialog) → Send |
| `khatmil/[id]/sections` | Bagikan → Share2 · Cetak Laporan → Printer · Ubah Sesi → Pencil · Tetapkan/Ganti Pembina → UserCog · Sebelumnya/Berikutnya → ChevronLeft/Right |
| `khatmil/shared` | Ganti (cover) → ImagePlus · Hapus (cover) → Trash2 |
| `rekap-infaq` | Semua (reset filter bulan) → CalendarDays |
| `visits/[id]` | Batalkan pesanan ini… → destructive + XCircle (class rose ad-hoc dihapus) · Batalkan (submit) → Ban · Batal → X |

Tombol non-aksi TIDAK diubah: tab pill filter (raw `<button>`), kartu juz/kelompok, pilih pembina, dropzone cover, salin nomor, nama campaign sebagai link — semuanya kontrol, bukan tombol aksi.
Verifikasi: scan ulang = 0 tombol ber-teks tanpa ikon; tsc bersih; eslint: 3 error `react-hooks/set-state-in-effect` pre-existing (notifikasi/tarik/pengaturan — di luar cakupan tombol, tidak disentuh); browser payouts + visits 44 render konsisten. Bukti: `artifacts/shots/mq-admin/audit-tombol-{payouts,visits-cancel}.webp`.

## 10. REVISI 4 (feedback user 31 Okt): audit kolom Aksi di semua tabel
Status: **DIEKSEKUSI.** Inventaris kolom Aksi 12 tabel (visits, payments, payouts, pengguna, santri, santri/[id], ustadz, ustadz/[id], khatmil, deposit, penerima, rekap-infaq).

| Temuan | Perbaikan |
|---|---|
| `payouts` ACC/Tolak kirim `icon` eksplisit `size-3.5` — ukuran beda dari standar §7 (size-3) | Prop `icon` dihapus; ikon lewat `ICON_BY_LABEL` (ACC→CheckCircle2, Tolak→XCircle) otomatis size-3 |
| `penerima`: toggle aktif/nonaktif = `<button>` + Badge mentah di kolom Status (affordance tersembunyi, beda pola dari `/pengguna`) | Kolom Status jadi `StatusPill` statis; kolom Aksi dapat tombol eksplisit **Nonaktifkan** (destructive, Ban — mapping baru `ICON_BY_LABEL`) / **Aktifkan** (default, CheckCircle2); `toggleStatus(e,r)` → `changeStatus(userId, next)` |

Sisanya sudah patuh: Detail (href/onClick) di 9 tabel, Mutasi, + Koreksi, Aktifkan/Suspend pengguna, dropdown ghost icon-xs khatmil (aria-label ✓), sel "—" payments, tombol salin nomor (ghost mini).
Verifikasi: tsc + eslint bersih (warning `CheckCircle2` tak terpakai di payouts dibersihkan); browser /penerima: Detail + Nonaktifkan render, toggle SUSPENDED↔ACTIVE dua arah sukses lalu data dikembalikan ke Aktif, console 0 error. Bukti: `artifacts/shots/mq-admin/audit-aksi-penerima.webp`.

## 11. REVISI 5 (feedback user 31 Okt): kolom Aksi payouts & pengguna
Status: **DIEKSEKUSI (frontend) + backend menunggu restart.**

- **Bug ditemukan (payouts):** `GET /admin/payouts` tidak men-SELECT `pr.rejected_reason` (`payments.rs::admin_list_payouts`) — baris Ditolak tidak pernah menampilkan alasan; span "Detail alasan" di kolom Aksi = kode mati. Fix backend: SELECT + tuple `Option<String>` + json `rejected_reason` (kolom nullable ✓). Frontend: span mati dihapus (alasan tampil di kolom Status, sudah ada).
- **Gap ditemukan (pengguna):** user SUSPENDED tidak punya tombol apa pun di kolom Aksi (tidak bisa diaktifkan ulang dari list). Fix: `Aktifkan` (default, CheckCircle2) untuk status SUSPENDED.
- Verifikasi frontend: tsc/eslint bersih; uji UI /pengguna user #420: Suspend → baris berubah "Aktifkan" + pill Ditangguhkan → Aktifkan → kembali Aktif, console 0 error. Bukti: `artifacts/shots/mq-admin/audit-aksi-pengguna-suspended.webp`.
- ~~Menunggu restart backend~~ **SELESAI (ACC user):** build via `vcvarsall x64_arm64` (shell biasa gagal: ring/clang tanpa INCLUDE MSVC), server lama (PID 14240) dimatikan, binary baru jalan — alasan tolak kini tampil merah di kolom Status payouts ("Uji tolak — dana kembali", "Nomor rekening tidak sesuai"), 0 error console. Bukti: `audit-aksi-payouts-alasan.webp`. **Catatan sesi:** backend dev sekarang terdaftar sebagai service `mq-backend-dev` di sesi ini (handle sesi lama mati saat restart); env clang: build wajib lewat `mq-backend/build-be.cmd` (vcvarsall) atau shell ber-MSVC.

## 12. REVISI 6 (feedback user 31 Okt): style tombol destructive kolom Aksi
Status: **DIEKSEKUSI.** Diagnosis: variant `destructive` Button = tint 10% **tanpa border** → Suspend/Tolak tampak seperti pill status, bukan tombol. Fix satu sumber di `TombolAksi` (data-table.tsx): destructive + `border-destructive/30`, hover menguatkan (`border-destructive/60`, bg 20%) — berlaku konsisten ke semua tabel (pengguna Suspend, payouts Tolak, penerima Nonaktifkan). Variant default (ACC/Aktifkan, solid primary) tidak berubah. tsc/eslint bersih; computed style terverifikasi; bukti `style-aksi-{pengguna,payouts}-border.webp`. Backend diambil alih sesi lain (PID baru 29068, binary sama — fix rejected_reason tetap jalan); service `mq-backend-dev` di sesi ini dicabut.

### REVISI 6b — Opsi A (feedback user 31 Okt, dipilih via mockup): background tombol aksi tabel DIKOSONGKAN
Status: **DIEKSEKUSI.** Semua `TombolAksi` ber-teks kini bg transparan, warna hanya di border + ikon + teks (user pilih Opsi A dari mockup 3 opsi):
- `default` (ACC/Aktifkan): solid primary → **putih + border `primary/45` + teks/ikon primary**, hover tint `primary/10`.
- `destructive` (Tolak/Suspend/Nonaktifkan): tint → **putih + border `destructive/45`**, hover tint `destructive/10` (revisi 6 digantikan).
- `outline` (Detail) & `ghost` tidak berubah.
Verifikasi: computed style `rgba(0,0,0,0)` + border warna di pengguna/payouts; tsc + eslint bersih; bukti `style-opsiA-{pengguna,payouts-penerima}.webp`.

### REVISI 6c — ACC kembali solid (ACC user 31 Okt)
Override `default` dihapus → ACC (payouts) & Aktifkan (pengguna/penerima, satu keluarga semantik setujui/aktifkan) kembali **solid primary**; Tolak/Suspend/Nonaktifkan/Detail tetap Opsi A (putih + border). Verifikasi: tsc/eslint bersih, computed style ACC solid + Tolak transparan; bukti `style-acc-solid-payouts.webp`.
