# Redesign Detail Kunjungan (`/visits/[id]`) — 31 Okt 2026

Implementasi mockup "MQ Admin — Kunjungan #28 (Detail & Penanganan Dispute)" ke halaman existing `src/app/(dashboard)/visits/[id]/page.tsx`. ACC user via plan (skip tombol Invoice).

## Yang berubah

| Section | Sebelum | Sesudah |
|---|---|---|
| Header | Judul + badge polos, ikon refresh | Kartu banner: tombol back, badge status pill + dot, tombol "Sinkronkan" (ikon spin saat loading) |
| Informasi Kunjungan | Grid teks `Info` | Strip gradien emerald atas, chip pihak santri/ustadz (avatar inisial + `tel:` link ustadz), tile per field (jadwal long-date + "Pukul …", durasi + menit, tarif, Total Infaq besar emerald + chip "Lunas terverifikasi") |
| Pembayaran | Info sederhana | Badge status di header kartu, nominal besar, external ID + tombol Salin, breakdown Biaya Pengajaran/Total Dibayar, chip channel |
| Lokasi | Map penuh + info bawah | Grid 7/12: peta kiri, panel kanan (patokan + Salin, koordinat + Salin, tombol Google Maps) |
| Chat | Bubble polos | Divider sistem, bubble dua sisi (santri emerald kanan, ustadz muted kiri), avatar inisial, role pill, tombol **Ekspor Chat** (download `.txt` client-side) |
| Tindakan Admin | Tombol bertumpuk | Dua tombol sejajar; form alasan cancel **tetap inline** (mockup pakai `prompt()` — melanggar aturan anti-popup, tidak diikuti) |

## Keputusan penting

- **Breakdown "Biaya Platform / Pencairan ke Ustadz" dari mockup TIDAK diimplementasi** — split income (`visit_income_split`, default 80/20) dieksekusi backend saat COMPLETED dan jumlah per-kunjungan tidak diekspos `GET /admin/visits/{id}`. Angka mockup (platform Rp 0) kontradiksi dengan default backend. Ditampilkan: Biaya Pengajaran + Total Dibayar + Refund (bila ada) — semua dari data nyata.
- **Tombol Invoice di-skip** — `invoice_url` dari API admin detail selalu `null` (service.rs meng-hardcode None). ACC user.
- Style mockup (Tailwind CDN emerald) diadaptasi ke primitif shadcn project (Card/CardAction/Badge/Button), bukan CDN.
- `rp`/`fmt` pakai `src/lib/format.ts` (helper baru: `fmtDateLong`, `fmtTime`) sesuai rule "jangan definisikan formatter lokal di page".
- Warna badge CONFIRMED dinaikkan ke `emerald-800` biar konsisten aksen emerald halaman; mapping status lain tetap.

## File

- `src/app/(dashboard)/visits/[id]/page.tsx` — rewrite tampilan, logika fetch/aksi tidak berubah (muatData, force-complete, force-cancel inline).
- `src/lib/format.ts` — tambah `fmtDateLong()`, `fmtTime()`.

## Verifikasi (31 Okt 2026)

- `eslint` + `tsc --noEmit`: bersih.
- Browser (dev localhost:3210, akun QA admin sementara di `mq_dev`, **dihapus setelah uji**): kunjungan #44 (CONFIRMED, PAID, 2 pesan).
  - 0 error console (warning Base UI `nativeButton` diperbaiki dengan `nativeButton={false}` pada 2 Button anchor — konvensi visits/khatmil/payments).
  - Toast salin external ID muncul; form cancel inline terbuka (bukan dialog); peta Leaflet + tile OSM termuat; Ekspor Chat aktif.
- Bukti: `C:/Users/jauha/artifacts/shots/mq-admin/visit-44-redesign-20261031.webp` (+ viewport).
