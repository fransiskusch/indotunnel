# Landing Page Specification & Documentation

Dokumentasi spesifikasi dan implementasi halaman landing page IndoTunnel (`apps/dashboard/app/page.tsx`).

---

## 1. Ringkasan & Tujuan

- **File Path**: `apps/dashboard/app/page.tsx`
- **Route**: `/` (Public Root)
- **Tujuan Utama**: 
  - Mengedukasi developer mengenai nilai IndoTunnel (expose localhost instan, inspect request, webhook replay).
  - Mengonversi pengunjung menjadi pengguna terdaftar (`/signup`) atau langsung menjalankan CLI (`indotunnel http 8080`).
  - Menampilkan live demo interaktif tanpa harus install CLI terlebih dahulu.

---

## 2. Arsitektur Komponen

```text
apps/dashboard/
├── app/
│   ├── page.tsx                          # Entry point landing page (Server Component)
│   ├── layout.tsx                        # Root layout & meta tags
│   └── globals.css                       # Color tokens & theme definition
└── components/
    └── landing/
        └── terminal-demo.tsx             # Interactive terminal & inspector simulator (Client Component)
```

---

## 3. Anatomi Halaman

### 3.1 Header / Navbar (`sticky top-0`)
- **Brand Identity**: Logo terminal icon dengan badge versi `v1.0`. Link menuju `/`.
- **Navigasi Internal**: Link anchor `#features`, `#quickstart`, `#pricing`.
- **Aksi Cepat**:
  - `Sign In` -> mengarah ke `/login`.
  - `Dashboard` (CTA Primer) -> mengarah ke `/dashboard`.

### 3.2 Hero Section
- **Pill Badge**: "High-Performance Reverse Proxy & Localhost Gateway".
- **Value Proposition**: "Expose localhost to the internet in seconds."
- **Deskripsi Nilai**: Instant public URLs, live HTTP request inspection, webhook replaying, custom subdomains.
- **Copy-Paste Command**: `$ indotunnel http 8080`.
- **Primary CTA**: Tombol "Get Started Free" -> mengarah ke `/signup`.
- **Terminal Emulator (`<TerminalDemo />`)**:
  - **Tab 1: Live Terminal**: Menampilkan status koneksi gateway (`ONLINE`), URL publik forwarding (`https://app-dev.indotunnel.com`), latensi (14ms), serta live stream incoming HTTP traffic dengan tombol simulasi "Trigger Request".
  - **Tab 2: HTTP Inspector**: Simulasi tampilan header dan payload JSON webhook Stripe (`POST /api/webhooks/stripe`).

### 3.3 Quickstart Section (`#quickstart`)
Format 3 langkah cepat menghubungkan localhost ke internet:
1. **01 Install CLI**: Instalasi paket binary/CLI.
2. **02 Start Tunnel**: Menjalankan command `indotunnel http 3000`.
3. **03 Inspect & Replay**: Membuka dashboard untuk inspeksi payload & replay request.

### 3.4 Features Grid (`#features`)
Menampilkan 6 kartu kapabilitas teknis:
1. **Instant Subdomains**: HTTPS publik otomatis dengan SSL certificate.
2. **Webhook Replaying**: Replay webhook 1-klik untuk debugging Stripe/GitHub.
3. **Ultra Low Latency**: Gateway node berbasis Go & Redis di Asia Tenggara.
4. **Token Authorization**: Proteksi endpoint dengan Basic Auth, Bearer token, & IP whitelisting.
5. **Traffic Metrics & Logs**: Monitoring throughput, latency histogram, dan error rate real-time.
6. **WebSocket Support**: Dukungan penuh untuk WebSocket, SSE, dan HTTP/2 multiplexing.

### 3.5 Pricing Table (`#pricing`)
Menampilkan komparasi 3 tier:
- **Free ($0)**: 1 concurrent tunnel, random subdomains, request history 1 jam. CTA aktif ke `/signup`.
- **Developer (Coming Soon)**: 5 concurrent tunnels, reserved subdomain, webhook replay, 30-day history.
- **Team (Coming Soon)**: Unlimited tunnels, custom domain CNAME, team workspace, priority gateway.

### 3.6 Footer
- Status sistem: Indikator pulsasi hijau ("IndoTunnel Gateways Operational").
- Copyright notice.

---

## 4. Visual Design Tokens

Mengikuti standar `DESIGN.md` (Dark Industrial DevTool):
- **Background Utama**: Deep Charcoal `#080c14` / `#090d16`.
- **Card & Surface**: `bg-slate-900/40` dengan border `border-zinc-800`.
- **Aksen Primer**: Emerald Neon (`#10b981`, `text-emerald-400`, glow badge).
- **Aksen Sekunder**: Cyber Cyan (`text-cyan-400`).
- **Typography**: Sans-serif untuk body/heading, Monospace (`font-mono`) untuk command dan log terminal.

---

## 5. Sinkronisasi Data & Spesifikasi

Landing page telah disinkronkan dengan spesifikasi MVP di `indotunnel-docs/`:

| Item di Landing Page | Nilai Sinkron | Keterangan |
|---|---|---|
| **Perintah Cepat** | `npx indotunnel 3000` | Selaras dengan package `indotunnel` di npm & `PRODUCT.md` |
| **URL Gateway Simulasi** | `https://a8f2x.indotunnel.id` ➔ `http://localhost:3000` | Sesuai format public tunnel di `indotunnel-docs/README.md` |
| **Port Dashboard** | `/dashboard` | Merujuk langsung ke route dashboard web IndoTunnel |
| **Batas Request Free** | `5,000 Requests / day` | Selaras dengan Free Tier di `01-product-requirements.md` |
| **Batas Bandwidth Free** | `10 GB Bandwidth / month` | Ditambahkan di kartu Free Tier |
| **Copy Harga Free** | `$0 / forever free` | Phrasing lebih jelas dan profesional |
