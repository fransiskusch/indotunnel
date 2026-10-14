# Landing Page Redesign — Design Spec

- **Date**: 2026-10-14
- **Scope**: Redesign total halaman landing IndoTunnel (`/`)
- **Status**: Approved (in-chat design), spec written for review

## 1. Tujuan & Konteks

Redesign halaman landing publik (`apps/dashboard/app/page.tsx`, route `/`) agar terasa
modern dan premium, tanpa mengubah fungsi konversi.

- **Tujuan halaman**: mengedukasi developer soal nilai IndoTunnel (expose localhost instan,
  inspect request, webhook replay) dan mengonversi ke `/signup` atau langsung jalankan
  `npx indotunnel 3000`.
- **Target audiens**: developer, QA engineer, integrator webhook (lihat `PRODUCT.md`).
- **Batasan**: Next.js 16, React 19, Tailwind CSS 4 (`@import "tailwindcss"`), ikon
  `lucide-react`, tema dark dari `DESIGN.md` dan `indotunnel-docs/26-landing-page.md`.
- **Definisi sukses**: halaman terasa premium dan tidak generik, mobile tetap benar,
  `npm run build` dan `npm run lint` lolos, bundle tidak membengkak tanpa alasan.

### Keputusan yang disetujui

| Pertanyaan | Keputusan |
|---|---|
| Scope | Redesign total |
| Arah visual | Dark devtool, dipertajam (bukan ganti palet) |
| Section | Pertahankan semua section, rapikan + optimasi urutan |
| Motion | Cinematic — boleh tambah dependency |
| Pendekatan | B — pecah jadi komponen section + `motion` (framer-motion) |

### Non-goals

- Tidak menulis ulang copy/headline (konten tetap; hanya struktur & visual berubah).
- Tidak menambah section baru (social proof, FAQ, perbandingan kompetitor) — dicatat
  sebagai kandidat lanjutan, bukan bagian dari spec ini.
- Tidak memakai GSAP / pinning / scroll-scrub (jalur C ditolak).
- Tidak menyentuh route dashboard, auth, atau API.

## 2. Arsitektur

`app/page.tsx` saat ini 468 baris dan menangani seluruh halaman — file terlalu besar.
Dipecah menjadi komponen section per bagian.

```text
apps/dashboard/
├── app/
│   ├── page.tsx                 # komposer section (~40 baris), Server Component
│   ├── layout.tsx               # + next/font (Geist Sans + Geist Mono)
│   └── globals.css              # token, keyframes, utility
└── components/landing/
    ├── site-header.tsx          # nav + mobile menu
    ├── hero.tsx
    ├── terminal-demo.tsx        # dipertahankan, di-polish
    ├── quickstart.tsx
    ├── features.tsx
    ├── ai-section.tsx
    ├── pricing.tsx
    ├── site-footer.tsx
    └── reveal.tsx               # "use client" — wrapper motion
```

### Batas client/server

- Server Component (default): `page.tsx`, `site-header.tsx`, `quickstart.tsx`,
  `features.tsx`, `ai-section.tsx`, `pricing.tsx`, `site-footer.tsx`.
- Client Component (`"use client"`): `hero.tsx` (butuh `useScroll` + `useTransform`),
  `reveal.tsx` (butuh motion), `terminal-demo.tsx` (sudah client — state + clipboard).
- Section server yang butuh animasi membungkus kontennya dengan `<Reveal>` / `<Stagger>`
  dari `reveal.tsx`, sehingga logika animasi tetap di satu tempat.
- `page.tsx` mengimpor komponen section; tidak ada state global baru.

### Dependency baru

- `motion` (paket framer-motion terbaru untuk React 19). Satu dependency, dipakai hanya
  oleh `reveal.tsx` dan `hero.tsx`.

## 3. Sistem Visual (token)

Pertahankan arah dark industrial devtool; naikkan kelas tanpa ganti palet.

- **Palet**: charcoal `#080c14` (base), surface `slate-900/40` + border `zinc-800`.
  Emerald = aksen primer, cyan = aksen sekunder, amber = **hanya** status/warning.
- **Disiplin warna**: hentikan pemakaian 5 warna aksen seragam (emerald/cyan/purple/
  amber/blue) yang menjadi sumber kesan "template generik". Ikon fitur tidak lagi
  memakai warna sendiri-sendiri.
- **Tipografi**: font via `next/font` (Geist Sans + Geist Mono — bawaan Next, tanpa
  dependency tambahan). Skala heading diperbesar; body `text-zinc-400`; `.text-balance`
  pada heading.
- **Detail premium**: tekstur noise overlay halus, gradient/spotlight radial,
  `bg-grid-pattern` yang sudah ada dipertahankan dan diperhalus.
- **Keyframes baru**: `fade-up`, `shimmer`, `pulse-glow`, `grid-drift`.

Token didefinisikan di `globals.css` (sudah punya `@theme inline` + custom utility
`.glow-emerald`, `.bg-grid-pattern`).

## 4. Motion

Pakai `motion`. Prinsip: halus, tidak mengganggu, hormati `prefers-reduced-motion`.

- **`Reveal`**: opacity 0→1, y 24→0, durasi 0.6s, ease `[0.22, 1, 0.36, 1]`,
  `viewport={{ once: true }}`.
- **`Stagger`**: dipakai untuk grid fitur dan kartu pricing.
- **Hero**: entrance bertahap; background grid dan terminal demo parallax halus
  (`useScroll` + `useTransform`).
- **Header**: blur dan tinggi berubah saat scroll.
- **Reduced motion**: semua animasi non-esensial dimatikan saat
  `prefers-reduced-motion: reduce`.
- **Dilarang**: pinning dan scroll-scrub (jalur GSAP/C ditolak).

## 5. Per-Section

Urutan section tetap seperti sekarang.

| Section | Perubahan |
|---|---|
| Header | Lebih tipis, blur saat scroll, **mobile menu** (bug saat ini: nav hilang total di mobile), penanda anchor aktif |
| Hero | Skala tipografi naik, badge, dua CTA, command chip copy-to-clipboard, baris trust (gratis / tanpa kartu / latensi ID), terminal demo dengan parallax |
| Quickstart | Timeline 3 langkah terhubung, bukan tiga kartu identik |
| Features | Layout **bento** asimetris (satu kartu besar + sisanya), bukan grid 6 seragam |
| AI | Konten tetap, latar spotlight agar berbeda dari section lain |
| Pricing | Tiga tier tetap, tier tengah unggul, hierarki lebih jelas |
| Footer | Kolom link + status sistem + versi, lebih rapi |

Copy tidak berubah.

## 6. Error Handling & Aksesibilitas

- Nav mobile: tombol toggle punya `aria-expanded` + `aria-controls`; menu bisa ditutup
  dengan Escape.
- Semua tombol/link punya label yang jelas; kontras teks tetap memenuhi WCAG AA pada
  latar charcoal.
- Animasi tidak boleh menyembunyikan konten secara permanen — jika JS gagal, konten
  tetap terlihat (progressive enhancement lewat CSS fallback).
- `next/font` gagal load → jatuh ke font stack sistem.

## 7. Verifikasi

- `npm run build` dan `npm run lint` lolos (UI murni; tidak ada framework test di repo).
- Manual di dev server: responsive (mobile/tablet/desktop), mobile menu buka/tutup,
  `prefers-reduced-motion` aktif, tidak ada layout shift besar.
- Tidak menambah file test — satu build sukses adalah buktinya.
