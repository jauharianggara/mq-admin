# Report untuk Codex — UI Admin Khatmil (mq-admin)

**Tanggal:** 30 Oktober 2026
**Dari:** OMP (sesi implementasi + UAT)
**Untuk:** Codex (handover lanjutan)
**Status pekerjaan:** selesai di sisi OMP; menunggu review/ACC pemilik. **Tidak ada commit, push, atau deploy.**

---

## 1. Konteks wajib dibaca dulu

- Project: `C:\Users\jauha\ZCodeProject\mq-admin` (Next.js 16, App Router, Tailwind v4, Base UI, ESLint 9).
- Backend: `C:\Users\jauha\ZCodeProject\mq-backend` (Rust/Axum/SQLx, MySQL Laragon `mq_dev` @127.0.0.1:3306, listen `127.0.0.1:8290`).
- Webadmin dev: `http://localhost:3210` (`npm run dev`).
- Plan sumber: `C:\Users\jauha\ZCodeProject\mq-admin\PLAN_KHATMIL_ADMIN_TANPA_TAB.md`.
- Evaluasi pemilik: `C:\Users\jauha\ZCodeProject\mq-admin\EVALUASI_OMP_KHATMIL_ADMIN_2026-10-30.md` (2 gelombang: 5 poin revisi + P1/P2 tindak lanjut — semua telah ditindaklanjuti, lihat §4).
- Login webadmin dev: `admin@mq.local` / `rahasia123` (password di-reset oleh OMP 29 Okt langsung di DB `mq_dev` user id 1; password lama acak dan tidak tersimpan di mana pun).
- Akun "Belum Diisi" di tangkapan = profil admin dev yang belum diisi — bukan bug UI, jangan "diperbaiki".

## 2. Baseline git & file yang berubah

`git status` (per 30 Okt, belum di-commit):

```
M  next.config.ts
M  src/app/(dashboard)/khatmil/[id]/edit/page.tsx
M  src/app/(dashboard)/khatmil/[id]/page.tsx
M  src/app/(dashboard)/khatmil/baru/page.tsx
M  src/app/(dashboard)/khatmil/page.tsx
M  src/app/(dashboard)/khatmil/shared.tsx
M  src/app/globals.css
?? src/app/(dashboard)/khatmil/[id]/sections.tsx   (file baru)
?? PLAN_KHATMIL_ADMIN_TANPA_TAB.md, EVALUASI_OMP_KHATMIL_ADMIN_2026-10-30.md (dokumen pemilik)
```

`.graphify/*` dan `tsconfig.tsbuildinfo` adalah artefak tooling — abaikan. **Jangan menimpa perubahan di atas tanpa membaca dulu.**

## 3. Ringkasan pekerjaan yang sudah selesai

### Gelombang 1 — redesign detail tanpa tab (per plan)
- `/khatmil/[id]` dirombak dari 6 tab (Ringkasan/Kelompok/Peta/Peserta/Aktivitas/Peringkat) menjadi satu alur scroll: **Progres Khatmil → Kelompok & Peta Juz → Peserta & Peringkat → Aktivitas Terbaru → Detail Khatmil**. Semua `Tabs*` dihapus dari detail.
- TOC anchor (`BAGIAN`) hanya di ≥ lg, `print:hidden`, tidak menyembunyikan konten.
- Lebar konten `max-w-4xl` → `max-w-6xl`.
- Komponen presentasi baru: `src/app/(dashboard)/khatmil/[id]/sections.tsx` (ProgressSection, GroupCard + peta juz per kelompok, ParticipantsSection, ActivitySection, MetaSection).
- Peserta+Peringkat digabung **satu** daftar terperingkat (`juz_done_count` desc → nama); sorotan top-3 hanya bila ada yang menyelesaikan juz; progres bacaan per juz aktif (bar per juz, bukan juz pertama mewakili semua); peserta 0 juz tetap tampil.
- Peta juz per kelompok: kartu per kelompok dengan mini-bar 30 segmen, badge KHATAM/Penuh/Terbuka, status pembina **dan** `pending_pembina` ditampilkan bersamaan ("Pembina: X · Menunggu ACC: Y"), disclosure per kartu (K1 default terbuka; satu kelompok = peta langsung tanpa disclosure), detail juz inline + tombol tutup, label selalu "X dari 30 juz".
- Header: "Kembali ke Khatmil", cover kecil bila ada, tombol **Ubah** (bukan "Edit"), meta periode/mode/peserta/slug.
- State baru: panel error fetch + tombol **Coba Lagi** (sebelumnya skeleton selamanya saat fetch gagal).

### Gelombang 2 — tindak lanjut evaluasi
- `timeAgo()` (shared.tsx): backend mengirim ISO **sudah ber-Z** → tidak menambah "Z" lagi (regex deteksi `Z`/offset); tanggal invalid → fallback `"—"`.
- Label metrik: angka besar = "**progres bacaan**"; baris kedua = "**Juz selesai: 0 dari 30**" (satu kelompok) / "**Kelompok khatam: 0 dari N**" (multi); footer "**N peserta menyelesaikan juz**" (bukan "menyumbang").
- Tabel peserta desktop diringkas 8 → 6 kolom: waktu lapor pindah ke bawah nama, Tugas + Kontribusi digabung satu sel dua bar. Semua data tetap ada.
- Tanggal Indonesia: reuse `fmtDate`/`fmtDateInput` dari `src/lib/format.ts` (jangan buat formatter baru).
- ESLint `react-hooks/set-state-in-effect`: 3 error lama diselesaikan dengan pola resmi React (fetch di effect via promise `.then` + flag `ignore`; state awal form via `useState(() => initialForm(editing))` + `key` di route `baru/` dan `[id]/edit/`). Sekarang **0 masalah** di folder khatmil. Catatan: pola sama masih ada di modul lain (`src/lib/infaq.ts` dkk.) — sengaja tidak disentuh (di luar cakupan).
- `@media print` di-scoped ke Khatmil saja: semua rule diawali `body:has([data-khatmil-print])` (atribut di root detail); selector global `header`/`.rounded-*` dihapus; pemenggalan kartu via utility `break-inside-avoid`.
- `next.config.ts`: `devIndicators: false` (overlay "N" tidak mengotori tangkapan/PDF review; hanya efek dev).
- **Transisi status sesuai backend** (`mq-backend/src/modules/khatmil/service.rs:146` — baca saja, jangan ubah): Cancel sah hanya dari SCHEDULED/ACTIVE. Akibatnya: tombol **Batalkan** di daftar hanya tampil untuk Terjadwal/Aktif; opsi Status di form edit = `nextStatuses(c.status)` (sebelumnya Draf diberi tombol Batalkan dan backend menolak dengan `invalid_status_transition`).

## 4. Hasil verifikasi (dilakukan OMP, backend asli `mq_dev`, bukan mock)

Statis: `eslint` folder khatmil 0 masalah; `tsc --noEmit` lulus; `next build` ✓.

UAT alur nyata (bukti di `C:\Users\jauha\artifacts\shots\mq\`):

| Kasus | Bukti |
|---|---|
| Desktop 1440 detail satu & multi kelompok | `khatmil2-detail35-1440.png`, `uat-detail-10grup-1440.png` |
| Tablet 768 / mobile 375, overflow-x = 0 | `uat-final-768.jpg`, `uat-final-detail-375.jpg`, `uat-final-list-375.jpg` |
| 10 kelompok (batas atas) — 10 kartu, 10 chip "0 dari 30 juz", disclosure K2–K10 | `uat-detail-10grup-1440.png` |
| Pilih juz klik & keyboard (focus ring + Enter) | `khatmil2-detail35-juz.png`, `uat-juz-kosong-keyboard.png` |
| Assign pembina → "Menunggu ACC: Ustadz Yusuf Hamdani" sambil pembina lama tampil | `khatmil2-assign-menunggu-acc-fixed.png` (campaign 33 kelompok 2) |
| Terminal COMPLETED & CANCELLED tanpa tombol tulis | `khatmil2-terminal-1440.png`, `uat-detail-cancelled.png` |
| Daftar: filter Draf/Dibatalkan/Aktif, tombol Detail/Ubah/Batalkan kondisional | `uat-list-draft.png`, `uat-list-dibatalkan.png` |
| Form baru (10 kelompok, kuota) & Ubah/Simpan | `uat-form-baru-10grup.png`; simpan "(rev 2)" terverifikasi via h1 + API |
| Error state backend mati → "Gagal (500) + Coba Lagi" → pulih | `uat-error-state.png`, `uat-recovery.png` |
| PDF A4 rapi tanpa halaman kosong, tanpa sidebar/header/TOC/overlay | `khatmil-final-33.pdf` (2 hlm), `khatmil-final-35.pdf` (3 hlm) |

Siklus demo yang meninggalkan data di `mq_dev`: campaign id 41 "Uji Siklus OMP — 10 Kelompok (rev 2)" status **CANCELLED** (10 kelompok, slug `omp-uji-siklus-10grup`) — aman dihapus bila tidak diperlukan.

## 5. Keputusan desain yang harus dipertahankan

1. Tanpa tab di detail; anchor TOC tidak menyembunyikan konten.
2. Penyebut kelompok selalu 30 juz ("X dari 30 juz"), progres % = progres bacaan.
3. Anti-emoji sebagai ikon utama; ikon lucide ber-`aria-label` (Pencil=Ubah, Ban=Batalkan).
4. Dialog HANYA untuk form kecil (pembina: 1 input pencarian); konten padat tetap halaman/section inline.
5. `StatusPill` (`src/components/status-pill.tsx`) satu-satunya sumber gaya status; label status lewat `STATUS_LABEL`/`statusLabel`.
6. Select Base UI: beri prop `items={{value: label}}` agar nilai tampil berbahasa manusia (konvensi dari modul notifikasi).
7. Jangan mengubah backend, izin, aplikasi mobile, atau token tema global.

## 6. Yang belum / menunggu

- **ACC pemilik** atas hasil gelombang 2 (belum diberikan; evaluasi menyatakan "belum merupakan persetujuan final").
- **Commit/push/deploy: TUNGGU PERINTAH EKSPLISIT pemilik.**
- Pola `set-state-in-effect` di modul lain (± 14 error) — backlog terpisah bila pemilik menghendaki.
- Refresh sesi webadmin: access token 15 menit; proxy auto-refresh (`src/proxy.ts`) kadang gagal di sesi headless lama → re-login. Di pemakaian normal belum terbukti bermasalah; belum diinvestigasi lebih jauh.
- Panel error detail muncul ±15 detik setelah backend mati (proxy menunggu upstream). Perilaku fetch proxy, bukan UI; belum dioptimalkan.

## 7. Guardrails untuk Codex

1. Jangan commit, push, deploy, atau build release tanpa perintah eksplisit pemilik.
2. Jangan mengubah `mq-backend`, DB schema, izin, atau aplikasi mobile.
3. Pertahankan baseline git di §2; jangan menimpa perubahan yang sudah ada.
4. Data QA pada `mq_dev` hanya campaign id 41 (lihat §4); jangan batalkan/ubah campaign nyata (id 31–38 adalah data pemilik; id 35/36 ACTIVE, 33 SCHEDULED dengan pembina pending Ustadz Yusuf Hamdani di kelompok 2).
5. Password admin dev `rahasia123` adalah hasil reset OMP — jangan reset lagi.
6. Kalau menemukan perilaku berbeda dari laporan ini, cek dulu apakah backend (8290) hidup dan sesi belum kadaluarsa sebelum menyimpulkan bug UI.
