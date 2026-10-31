# Laporan Pola Tabel Baku `No | Aksi | Status | Nomor` (2026-10-31)

Eksekusi `PLAN_POLA_TABEL_BAKU_2026-10-31.md` (ACC user via "ACC"). **17 file berubah, 0 backend.**

## Kit (satu sumber pola) — `src/components/data-table.tsx`
- `RowNo({ i, page, perPage })` — sel No mono 2 digit, reset per halaman.
- `NomorChip({ label, title })` — chip mono nomor entri.
- `AksiCell({ children, onClick })` — sel aksi kiri (opsional cegah klik baris).
- `TombolAksi({ label, onClick, title })` — tombol "Detail" baku dengan stopPropagation bawaan.

## Tabel yang diubah (14 tabel di 14 file)
| Halaman | Pola | Nomor |
|---|---|---|
| `/santri` | penuh | `#ID` (dipisah dari nama — sesuai poin ACC §2.3) |
| `/payments` | penuh | **`external_id` Xendit** (fallback `#INV-id`), tombol salin |
| `/payouts` | penuh (ACC/Tolak/Sudah ditransfer pindah ke kiri) | `#WD-0001` |
| `/visits` | penuh (`Buka`; kolom No ditambahkan) | `#KJ-0001` |
| `/khatmil` | penuh (Detail/Edit/Batalkan di kiri) | `#ID` campaign |
| `/ustadz` | penuh (kolom Aksi baru) | `#ID` |
| `/pengguna` | penuh (Aktifkan/Suspend ke kiri) | `#ID` |
| `/penerima` | penuh (kolom Aksi/No/Nomor baru) | `#ID` |
| `/deposit` rekap saldo | Aksi (Lihat Detail/+Koreksi) + Nomor ke kiri | `#user_id` |
| `/deposit` penyesuaian | **parsial** `No\|Status\|Nomor` — tidak ada aksi tersedia (ACC dilakukan santri/ustadz di aplikasinya) — deviasi dari plan §3A, alasan data | `#ID` |
| `/deposit` mutasi | parsial `No\|Nomor(Rujukan)` | `subject #id` |
| `/pengaturan/audit` | parsial | `#ID` log |
| `/notifikasi` | parsial | `#ID` kirim |
| `/rekap-infaq` ×2, `/infaq-saya`, `/penerima/[id]` | parsial | `#visit_id` / `#user_id` / `#ID` mutasi |
| `/santri/[id]`, `/ustadz/[id]` | riwayat kunjungan penuh (Aksi `Buka`) | `#KJ-0001` (sebelumnya No = id mentah) |

**Kecualikan** sesuai plan: leaderboard/tabel peserta `/khatmil/[id]` (No = rank) + PrintView + tabel form `/pengaturan/pembagian-infaq`. **Skip**: `/reviews` — halaman sudah dihapus user sebelum eksekusi.

## Efek samping wajib (perbaikan lint)
Aturan `react-hooks/set-state-in-effect` menyibak 5 pelanggaran lama di file yang disentuh — semua diperbaiki dengan pola RAF repo (`notifikasi/client.tsx` ×2, `rekap-infaq`, `santri/[id]`, `ustadz/[id]`, ditambah `use-admin-list` yang sudah diperbaiki sebelumnya); import `Table/TableBody/TableHeader` tak terpakai dibuang dari `data-table.tsx`; directive `eslint-disable` mati dihapus (auto-fix).

## Verifikasi (dev server + Chromium, 12 halaman)
| Uji | Hasil |
|---|---|
| `tsc --noEmit` / `eslint` (17 file) | 0 error, 0 warning |
| Loop 12 halaman | semua render: kolom pertama `01`, aksi ada (santri/payments/payouts/visits/khatmil/ustadz/penerima/rekap), chip nomor ada |
| payments Nomor | `visit-47-86886a0a` + title "(invoice #55)" — external_id nyata |
| pengguna | kolom 2 `Suspend`, kolom 3 `Aktif`, kolom 4 `#421` |
| deposit ADJ / mutasi | Status `Ditolak` + Nomor `#3`; mutasi `Rujukan` |
| `santri/[id]` & `ustadz/[id]` | `01 \| Buka \| REVIEWED \| #KJ-0047` (ustadz: `#KJ-0045`) |
| Console | bersih (error lama hanya sesi 401 sebelum relogin + 1 gambar S3 eksternal) |
| Screenshot 11 halaman | `artifacts/shots/mq/pola-tabel-*.png` |

## Catatan
- Sesi admin 401 dua kali selama pengujian (mq_at 15 menit) — login ulang via UI, bukan bug kode.
- Commit menunggu perintah.
