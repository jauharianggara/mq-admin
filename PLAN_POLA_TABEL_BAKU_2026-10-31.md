# PLAN — Pola Tabel Baku: NO | AKSI | STATUS | NOMOR (2026-10-31)

STATUS: **PLAN — menunggu ACC. Belum ada kode yang diubah.**

## 1. Anatomi pola baku
Urutan kolom kiri setiap tabel daftar:

```
No | Aksi | Status | Nomor | …kolom konten (urutan lama, tidak diubah)…
```

- **No** — nomor urut mono 2 digit (`01`, `02`, …), increment per halaman (reset tiap halaman), gaya sama dgn halaman Santri.
- **Aksi** — tombol aksi utama modul (umumnya "Detail"), dipindah dari kanan ke kolom 2. Baris tetap bisa diklik. Bila modul punya >1 aksi (mis. review: Detail + Sembunyikan): tombol utama + menu `⋮` di sel yang sama.
- **Status** — pill status modul (StatusPill / pill setara), pindah ke kolom 3. Kolom status yang sortable tetap sortable.
- **Nomor** — chip mono identitas entri. Prioritas: nomor eksternal bila ada → `#ID` internal. Sudah tersedia di API, **tanpa perubahan backend**:
  - payments → `external_id` (referensi Xendit) — sudah dikembalikan `GET /admin/payments`
  - payouts → `#ID` tarik; visits → ID Pesanan (sudah ada); santri/ustadz/pengguna → `#ID` user;
  - khatmil → `#ID` campaign; reviews → `#ID` review; penerima → `#ID` user;
  - deposit penyesuaian → `#ID` penyesuaian; mutasi deposit → **Rujukan**;
  - notifikasi/audit → `#ID` / nomor entitas.

## 2. Keputusan default yang perlu ACC (boleh dikoreksi)
1. **Aksi pindah ke kiri** (kolom 2) di semua tabel daftar — bukan lagi kanan.
2. **Nomor memakai ID internal / external_id yang sudah ada** — tidak menambah kolom baru dari backend.
3. **Santri**: chip `#ID` yang kini menempel di nama dipisah jadi kolom "Nomor" sendiri (mengubah desain yang baru di-ACC kemarin).
4. Klasifikasi di §3: kategori **B parsial** dan **C kecualikan**.

## 3. Inventaris 19 tabel → klasifikasi
### Kategori A — penuh `No|Aksi|Status|Nomor` (11 tabel)
| Halaman | Tabel | Nomor |
|---|---|---|
| `/santri` | daftar santri | `#ID` (dipisah dari nama) |
| `/payments` | daftar pembayaran | `external_id` (fallback `#ID`) |
| `/payouts` | daftar penarikan | `#ID` tarik |
| `/visits` | daftar kunjungan | ID Pesanan (sudah ada; tambah kolom No) |
| `/khatmil` | daftar campaign | `#ID` campaign |
| `/ustadz` | daftar ustadz | `#ID` ustadz |
| `/pengguna` | daftar pengguna | `#ID` user |
| `/reviews` | daftar review (status = Keterlihatan) | `#ID` review |
| `/penerima` | daftar penerima infaq | `#ID` user |
| `/deposit` | tabel penyesuaian | `#ID` penyesuaian |
| `/santri/[id]`, `/ustadz/[id]` | riwayat kunjungan (punya Status; aksi = Detail) | `#ID` kunjungan |

### Kategori B — parsial `No|Nomor` saja (6 tabel; tak ada aksi/status relevan)
| Halaman | Tabel | Nomor |
|---|---|---|
| `/deposit` | mutasi deposit | **Rujukan** |
| `/notifikasi` | riwayat kirim | `#ID` kirim |
| `/pengaturan/audit` | audit log | `#ID` + entitas |
| `/rekap-infaq` | 2 tabel laporan (per kunjungan & per penerima) | `#visit_id` / `#user_id` |
| `/infaq-saya`, `/penerima/[id]` | mutasi saldo | `#ID` / rujukan |

### Kategori C — dikecualikan (bukan tabel daftar)
- Leaderboard & tabel peserta di `/khatmil/[id]` + PrintView — `No` = **rank**, bukan nomor urut.
- Tabel pengaturan `/pengaturan/pembagian-infaq` — tabel form edit.

## 4. Perubahan teknis
1. `src/components/data-table.tsx` — tambah 3 komponen kit (satu sumber pola, bukan konvensi baru per halaman):
   - `RowNo({ i, page, perPage })` — sel No mono 2 digit;
   - `NomorChip({ label, title? })` — chip mono nomor;
   - `AksiCell` — pembungkus sel aksi kiri (tombol utama + `⋮` opsional).
2. Semua baris daftar memakai kelas `.row-accent` (alias CSS sudah ada di globals.css).
3. `COLS` + `TableSkeleton cols` disesuaikan tiap tabel; urutan `<TableRow>` dirapikan; render tombol aksi lama di kanan dihapus (cutover bersih, tanpa duplikasi).
4. Logika fetch/sort/pagination/izin **tidak berubah** — murni susunan kolom + komponen sel.
5. A11y: tombol aksi diberi label kontekstual ("Detail #420", "Detail INV-88").

## 5. Gelombang eksekusi (tiap wave: tsc + eslint + uji browser halaman + screenshot `artifacts/shots/mq/` + console bersih; commit menunggu perintah)
- **Wave 1 — kit + tabel transaksional**: `data-table.tsx` (RowNo/NomorChip/AksiCell) → santri, payments, payouts.
- **Wave 2 — daftar orang & kunjungan**: visits, khatmil, ustadz, pengguna, reviews.
- **Wave 3 — kategori B + sisa A**: penerima, deposit (penyesuaian + mutasi), notifikasi, audit, rekap-infaq ×2, infaq-saya, penerima/[id], riwayat kunjungan santri/[id] & ustadz/[id].
- **Wave 4 — poles akhir**: cek lebar tabel 1440/768/390 (overflow-x), konsistensi empty-state & skeleton, screenshot semua halaman.

## 6. Tidak berubah
Logika data, endpoint, hak akses, pagination, sort, filter, halaman detail non-tabel, PrintView khatmil.
