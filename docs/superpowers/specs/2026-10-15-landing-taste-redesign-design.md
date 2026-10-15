# Landing Page — Taste-Skill Redesign (One Motif) — Design Spec

- **Date**: 2026-10-15
- **Scope**: Full redesign of the IndoTunnel landing page (`/`) using the `design-taste-frontend` (taste-skill v2) art direction.
- **Status**: Approved (in-chat design), spec written for review

## 1. Tujuan & Konteks

Mengganti halaman landing IndoTunnel dengan desain ber-art-direction, mengikuti
`design-taste-frontend` (taste-skill v2). Halaman lama gagal gate skill karena penuh
"generated-page tells": gradient, glow, shadow, pill badge, mono label, penomoran
01/02/03, dan grid kartu ikon seragam.

- **Tujuan halaman**: membuat developer menjalankan `npx indotunnel 3000` atau daftar
  ke `/signup`.
- **Audiens**: developer, QA engineer, integrator webhook (`PRODUCT.md`).
- **Batasan**: Next.js 16, React 19, Tailwind 4, `lucide-react`, GSAP + `@gsap/react`
  (baru). Brand `DESIGN.md` dipertahankan (dark charcoal + emerald), disiplin
  taste-skill diterapkan.
- **Definisi sukses**: `lint.mjs` dan `inspect.mjs` (gate skill) 0 FAIL di 1440/768/390,
  `npm run build` + `npx tsc --noEmit` lolos, halaman terasa dirancang bukan digenerate.

### Keputusan yang disetujui

| Pertanyaan | Keputusan |
|---|---|
| Scope | Full gpt-taste / taste-skill redesign |
| Direction | `one-motif` (seed 1465055558, dari `draw.mjs`) |
| Palet | Dark devtool — brand `DESIGN.md` dipertahankan, ambil komposisi + disiplin saja |
| Font | General Sans (Fontshare CDN), satu typeface |
| Aset | Mockup produk + CSS (tanpa picsum, tanpa request eksternal) |
| Social proof | Strip kapabilitas jujur (protokol/tech), bukan testimoni palsu |
| Motion | GSAP (`@gsap/react` + ScrollTrigger) |

### Non-goals

- Tidak menambah testimoni, logo pelanggan, atau statistik bisnis fiktif.
- Tidak memakai foto stok picsum (keputusan: mockup produk + CSS).
- Tidak mengubah route dashboard/auth/API. Hanya `/`.
- Tidak menambah backend.

## 2. Art Direction (hasil `draw.mjs`)

**Direction: One motif.** Satu bentuk dari subjek menjalankan seluruh sistem.

**Ide** (kalimat wajib skill):
> On this page, **the tunnel's arch — the mouth a request passes through** becomes
> **the stage the product's interface sits on, the mask on every panel, the bullet
> beside list items, and the one full-width band that splits the page.**

Motif = **arch (portal)**. Muncul di 4 skala:
1. Stage hero raksasa (crop viewport, di belakang fragmen terminal).
2. Mask `clip-path` pada panel/picture (sudut arch).
3. Bullet di samping item list.
4. Satu band full-width yang memisahkan dua paruh halaman.

**Live thing**: terminal demo interaktif (`Trigger Request`) — sudah ada, dinaikkan
jadi fragmen UI sungguhan ber-`data-ui` dengan label dan angka yang masuk akal.

**Competitor test**: "arch = tunnel mouth" hanya milik produk yang menamai dirinya
tunnel. Nama produk yang menentukan motif, bukan kategorinya.

## 3. Yang Dihapus (tells gate skill)

Gate `lint.mjs` pada halaman lama: 7 kategori FAIL. Semua dihapus.

| Lama | Baru |
|---|---|
| gradient (radial/linear) | field flat; surface = step tone |
| glow / box-shadow saat rest | hanya dialog/menu boleh shadow |
| pill badge di atas headline | dihapus |
| mono label uppercase ("WORKFLOW", dll) | dihapus |
| penomoran 01/02/03 | dihapus; urutan dari posisi/ukuran |
| grid kartu ikon seragam | mosaic board + accordion |
| `font-mono` di UI | General Sans; mono hanya di `<pre>`/`<code>` |
| nav glass pill (backdrop-blur) | bar polos: wordmark + 4 link + 1 aksi |
| accent ungu | dihapus (violet = tell) |

## 4. Struktur & Section

Urutan mengikuti argumen (klaim + bukti), bukan formula.

```
app/layout.tsx              # General Sans via Fontshare <link>; hapus Geist
app/globals.css             # token warna/type/motion; util arch; hapus glow/gradient
app/page.tsx                # composer; <main class="overflow-x-hidden">
components/landing/
  site-header.tsx           # bar polos: wordmark + 4 link + 1 aksi
  hero.tsx                  # "Fragment on a shaped stage"
  features.tsx              # mosaic board 6 tile (ukuran berbeda, gapless)
  how-it-works.tsx          # accordion panel bertingkat tone (quickstart)
  showcase.tsx              # object-on-arch: HTTP inspector, list bisa dipilih
  pricing.tsx               # nama plan sebagai list + satu figure hidup
  faq.tsx                   # kartu bertumpuk dengan tab
  cta.tsx                   # field aksen + dialog "buat workspace"
  site-footer.tsx           # wordmark dibangun dari blok
  terminal-demo.tsx         # fragmen UI ber-data-ui (live thing)
  motion.tsx                # helper GSAP: useGSAP + gsap.matchMedia
  arch.tsx                  # komponen motif arch (clip-path) yang dipakai ulang
```

Section **proof** dibuang (tidak ada pelanggan nyata; skill melarang proof palsu).
Diganti strip kapabilitas jujur: HTTP/2, WebSocket, SSE, TLS 1.3, Go, Redis.

### Isi tiap section

1. **Hero** — headline 2 baris kiri-atas (`max-w` lebar, clamp ~5.2vw), satu kalimat
   pendukung, satu aksi. Stage arch raksasa berisi fragmen terminal sungguhan
   (di-crop, bukan seluruh window, tanpa device frame). Tidak ada yang menimpa headline.
2. **Features** — mosaic 6 tile ukuran berbeda, `grid-flow-dense`, tanpa sel kosong.
   Tiap tile = satu close-up UI (toggle, status word, satu angka, slider, dsb) + nama
   kapabilitas. Satu tile berisi heading saja.
3. **How it works** — 3 langkah quickstart sebagai accordion panel bertingkat tone
   (satu terbuka default). Order dari posisi/tone, bukan angka.
4. **Showcase** — HTTP inspector sebagai "object on arch": daftar request bisa dipilih,
   panel detail bertukar. Semua teks full ink (bukan fade).
5. **Pricing** — nama plan sebagai list; figure harga milik plan terpilih (bukan 3
   kartu). Plan tengah terpilih saat load.
6. **FAQ** — kartu bertumpuk dengan tab, satu terbuka.
7. **CTA** — field aksen; dialog "buat workspace" (`data-ui`) dengan field editable +
   pilihan segmented; tombol primer = aksi halaman.
8. **Footer** — wordmark dibangun dari blok (SVG/div), bukan type biasa.

## 5. Sistem Visual

- **Warna**: satu ground (charcoal `#0b0f14`), satu ink (`#f4f6f8`), satu aksen
  (emerald). Surface = step tone kecil, bukan garis atau shadow. Aksen hanya di aksi
  + satu tempat lain.
- **Type**: General Sans (Fontshare). Dua-tiga ukuran yang bekerja: display besar
  (6-10vw) dan body 16-19px, tidak ada di antaranya. Tracking -0.02em pada display.
  Mono hanya di blok kode.
- **Space**: satu grid, margin 16-32px; jarak antar-section 120-220px desktop. Tiap
  section komposisi berbeda dari tetangganya; tak ada yang grid kartu.
- **Motif**: arch dari `clip-path` (satu bentuk, dipakai konsisten).

## 6. Motion (GSAP)

Baca `references/motion.md`. Layer wajib (inspector gagal < 8 elemen bergerak):

- **Signature — Shutter**: fragmen hero membuka via `clip-path: inset()` + scale
  1.12→1, sekali, ~1.1s. GSAP.
- **Section entrances**: heading → text → picture, stagger 60-90ms, naik 16-32px,
  sekali per section. Choreographed, bukan satu preset seragam.
- **Feedback**: `:active` scale 0.97; hover menaikkan kontras (bukan menurunkan).
- **One moving picture**: drift scroll-linked pada stage (travel < 8%).
- **Tokens**: `--ease-out`, `--ease-soft`, `--t-press/hover/ui/reveal`.
- **Reduced motion (wajib)**: semua dibungkus `gsap.matchMedia()`
  `(prefers-reduced-motion: no-preference)`; mode reduce = end-state statis.
- **Anti-blank**: default SSR visible; GSAP hanya menyembunyikan di dalam blok
  `no-preference` + `useGSAP`. Gate `.js` class agar tanpa JS konten tetap terlihat.
- Transform/opacity/clip-path saja; tanpa animasi layout; tanpa scroll hijacking.

## 7. Error Handling & Aksesibilitas

- Nav mobile: tombol toggle `aria-expanded` + `aria-controls`; Escape menutup.
- Accordion/FAQ/pricing/tab: pakai elemen semantik (`button`, `<ol>` kalau urutan
  penting), fokus terlihat, keyboard-operable.
- Kontras teks full ink memenuhi WCAG AA (4.5:1).
- Tanpa JS: seluruh konten terbaca (gate `.js` + reveal hanya di dalam blok motion).
- `prefers-reduced-motion: reduce`: konten terlihat penuh, tanpa travel/scrub.

## 8. Verifikasi

- `node <skill>/scripts/lint.mjs apps/dashboard/app apps/dashboard/components/landing`
  → 0 FAIL (hanya blok kode yang boleh mono).
- `node <skill>/scripts/inspect.mjs http://localhost:3000` → 0 FAIL di 1440/768/390.
- `npm run build` + `npx tsc --noEmit` lolos.
- Screenshot 3 viewport → critique (`references/critique.md`) → fix, maks 3 ronde.
