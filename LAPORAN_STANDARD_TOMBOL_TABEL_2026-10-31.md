# Laporan Standarisasi Tombol Aksi Tabel (2026-10-31)

Eksekusi `PLAN_STANDARD_TOMBOL_TABEL_2026-10-31.md` (ACC via "ACC").

## Standar
`TombolAksi` di `data-table.tsx` kini **wrap `Button` (Base UI) `size="xs"`** — bentuk/radius/hover/fokus ikut komponen, bukan `<button>` manual. API: `label`, `variant` (`outline` detail · `default` ACC/Aktifkan · `destructive` Tolak/Suspend), `icon`, `href` (render `<Link>`, stopPropagation bawaan), `onClick`, `title`, `disabled`. API lama tetap kompatibel.

## Perubahan per layar
| Layar | Sebelum → Sesudah |
|---|---|
| `/payments` | `Button xs outline` Link → `TombolAksi href` "Detail" |
| `/visits` | `Button sm outline` "Buka" → `TombolAksi` "Detail" |
| `/santri/[id]`, `/ustadz/[id]` | `Button sm outline` "Buka" → `TombolAksi` "Detail" |
| `/deposit` | "Lihat Detail" → `Detail`; "+ Koreksi" tetap, ukuran `xs` |
| `/rekap-infaq` | "Lihat mutasi →" (ghost) → `Mutasi` |
| `/payouts` | ACC (`default`+CheckCircle2), Tolak (`destructive`+XCircle), Sudah ditransfer (`outline`) → `TombolAksi` |
| `/pengguna` | Aktifkan (`default`), Suspend (`destructive`) → `TombolAksi` |
| `/khatmil` | Detail → `TombolAksi href`; ikon Edit/Batalkan tetap `icon-xs ghost` |
| `/penerima`, `/santri`, `/ustadz` (list) | sudah `TombolAksi`, kini otomatis bentuk `Button` |

Import mati dibuang (Link di payments/visits/khatmil/ustadz/[id]; Button di pengguna).

## Verifikasi (Chromium, 31 Okt)
- Audit 9 halaman: label sesuai matriks (`Detail`/`ACC`/`Suspend`), **semua tombol 24px / radius 8px / font 12px** — seragam.
- Klik `Detail` di `/santri` → navigasi ke `/santri/420` tepat satu kali; klik baris tetap jalan.
- `tsc --noEmit` + `eslint` bersih (0 error 0 warning pada file tersentuh).
- Console 0 error; screenshot `artifacts/shots/mq/tombol-standar-{payments,payouts,visits,deposit}.png`.

## Catatan
- `santri/[id]` ditulis ulang pihak lain di tengah eksekusi (layout baru + filter kunjungan, file bertambah 379→634 baris) — pola diterapkan ke tabel versi barunya; import kit dipasang ulang.
- Commit menunggu perintah.

## Tindak lanjut feedback "aksi khatmil jelek" (31 Okt)
Tiga tombol bergaya campuran (Detail outline + ikon Edit + ikon Batalkan merah) dalam satu sel → sesuai plan §2 (>1 aksi = tombol utama + `⋮`): sel kini hanya `👁 Detail` + `⋯`; **Edit campaign** & **Batalkan campaign** (merah) pindah ke dropdown (`DropdownMenu` Base UI). Konfirmasi batalkan tetap `confirm()`. Verifikasi: menu terbuka, item `["Edit campaign","Batalkan campaign"]`, console 0 error. Bukti: `khatmil-aksi-rapi.png` (sel bersih) & `khatmil-aksi-menu.png` (menu terbuka) di `artifacts/shots/mq/`.
