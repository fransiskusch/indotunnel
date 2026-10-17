# Google OAuth + Cloudflare Turnstile — Design Spec

- **Date**: 2026-10-17
- **Scope**: Tambah "Continue with Google" dan captcha pada halaman login/signup.
- **Status**: Approved (in-chat design), spec written for review

## 1. Tujuan & Konteks

Menambah dua jalur masuk yang lebih aman dan lebih rendah friksi pada IndoTunnel:

1. **Login dengan Google** — developer bisa masuk tanpa membuat/mengingat password.
2. **Cloudflare Turnstile** — melindungi form signup dan login dari bot.

- **Tujuan bisnis**: menurunkan friksi signup (lebih banyak developer mencoba) dan
  menutup brute-force/credential-stuffing di form login.
- **Audiens**: developer, QA engineer, integrator webhook.
- **Batasan**: semua auth yang ada berada di Go API (`internal/api`, `internal/auth`);
  dashboard Next.js hanya UI. Session tetap cookie `indotunnel_session` + CSRF Origin.
  Tidak menambah jalur auth kedua.
- **Definisi sukses**: user bisa signup/login lewat Google dan langsung masuk dashboard;
  form signup/login menolak submit tanpa captcha valid; `go test ./...`,
  `go build ./...`, `npx tsc --noEmit`, `npm run build` lolos.

### Keputusan yang disetujui

| Pertanyaan | Keputusan |
|---|---|
| Lokasi OAuth | Go API (`golang.org/x/oauth2`), bukan NextAuth |
| Provider captcha | Cloudflare Turnstile |
| Titik pasang captcha | Signup + login (bukan device activation) |
| Email Google = email akun existing | Auto-link by email (aman karena `email_verified`) |
| Penyimpanan identitas | Tabel `oauth_accounts` (mendukung provider lain nanti) |

### Non-goals

- Tidak menambah provider OAuth lain sekarang (GitHub dll). Skema siap, implementasi tidak.
- Tidak mengubah device login (CLI), API keys, plans, atau session format.
- Tidak menambah captcha di `/activate` atau endpoint API lain.
- Tidak menambah 2FA / password reset.
- Tidak mengubah desain visual landing page.

## 2. Arsitektur & Alur

### 2.1 OAuth flow

```text
Dashboard /login  ->  <a href="/api/auth/google">
Go API  GET /v1/auth/google
  -> set state cookie (httpOnly, SameSite=Lax, 10 menit)
  -> 302 ke accounts.google.com/o/oauth2/v2/auth
Google  ->  302 /api/auth/google/callback?code=...&state=...
Go API  GET /v1/auth/google/callback
  -> verify state cookie == query state (hapus cookie, sekali pakai)
  -> tukar code -> id_token (verifikasi signature, iss, aud, exp, email_verified)
  -> cari oauth_accounts(provider='google', provider_user_id=sub)
       ada     -> login user itu
       tak ada -> cari users by email
                    ada     -> link (insert oauth_accounts)
                    tak ada -> buat user baru (password_hash='') + oauth_accounts
  -> startSession (cookie sama seperti login password)
  -> 302 ke /dashboard
```

### 2.2 Captcha flow

```text
Form signup/login
  -> widget Turnstile menghasilkan token
  -> POST body menyertakan { email, password, captcha_token }
Go API handleSignup / handleLogin
  -> captcha.Verify(token, clientIP) SEBELUM proses apa pun
  -> gagal => 400 CAPTCHA_FAILED
```

### 2.3 Unit baru

- **`internal/oauth`** — konfigurasi Google, `AuthCodeURL`, `Exchange`, verifikasi
  id_token, state cookie. Bergantung pada `golang.org/x/oauth2` + `google`.
- **`internal/captcha`** — interface `Verifier` + implementasi Turnstile
  (`challenges.cloudflare.com/turnstile/v0/siteverify`). Interface agar bisa di-stub.
- **`internal/store`** — `CreateUserWithoutPassword`, `OAuthAccountByProviderID`,
  `CreateOAuthAccount`.
- **`internal/api`** — `handleGoogleStart`, `handleGoogleCallback`; gate captcha di
  `handleSignup` dan `handleLogin`.
- **`migrations/0004_oauth.sql`** — tabel `oauth_accounts`.
- **Frontend** — tombol Google, widget Turnstile, kirim `captcha_token`.

### 2.4 Yang tidak berubah

Session cookie, CSRF Origin check, device login (CLI), API keys, plans, gateway,
tunnel transport, dashboard lain.

## 3. Skema Database

```sql
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(32) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(320),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_user_id)
);
CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);
```

- `users.password_hash` sudah `DEFAULT ''` sejak `0003`, jadi user OAuth baru tidak
  butuh perubahan skema.
- `auth.VerifyPassword("", plain)` mengembalikan `false` tanpa panic (terverifikasi di
  `internal/auth/password.go:41`), sehingga user OAuth tidak bisa login lewat password.

## 4. Keamanan

| Risiko | Mitigasi |
|---|---|
| CSRF pada callback | `state` acak di cookie httpOnly, dibandingkan, dihapus setelah dipakai |
| Open redirect | `redirect_uri` diambil dari env `OAUTH_REDIRECT_URL`, tidak dari query |
| id_token palsu | Verifikasi signature (JWKS Google), `iss`, `aud`, `exp` lewat library resmi |
| Email belum terverifikasi | Tolak bila `email_verified != true` |
| Account takeover via auto-link | Auto-link hanya setelah `email_verified == true` |
| Captcha bypass | Verifikasi server-side sebelum proses; fail closed saat error |
| Replay token captcha | Token Turnstile sekali pakai, diverifikasi tiap submit |
| Secret bocor ke client | Hanya `NEXT_PUBLIC_TURNSTILE_SITE_KEY` yang publik |

### Env baru

```text
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_REDIRECT_URL=https://indotunnel.my.id/api/auth/google/callback
TURNSTILE_SECRET=
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
```

### Perilaku saat env kosong

- `GOOGLE_CLIENT_ID` atau `GOOGLE_CLIENT_SECRET` kosong: route `/v1/auth/google`
  mengembalikan `503 OAUTH_NOT_CONFIGURED`; tombol Google disembunyikan di UI
  (dikendalikan flag yang dikirim server, bukan tebakan client).
- `TURNSTILE_SECRET` kosong: captcha di-skip. Ini eksplisit untuk pengembangan lokal,
  dicatat di log startup sekali (`captcha disabled`).
- Jika `TURNSTILE_SECRET` di-set tetapi verifikasi gagal karena error jaringan,
  request **ditolak** (fail closed).

## 5. Perubahan per File

### Backend baru

```text
internal/oauth/oauth.go
internal/oauth/oauth_test.go
internal/captcha/captcha.go
internal/captcha/captcha_test.go
internal/api/oauth_handlers.go
internal/api/oauth_handlers_test.go
internal/store/oauth_test.go
migrations/0004_oauth.sql
```

### Backend diubah

```text
internal/config/config.go        # +5 field env
internal/config/config_test.go
internal/store/store.go          # +3 method
internal/api/api.go              # Deps +OAuth +Captcha
internal/api/auth_handlers.go    # captcha gate
cmd/server/main.go               # wiring
```

### Frontend

```text
apps/dashboard/components/auth-form.tsx     # tombol Google + Turnstile
apps/dashboard/components/turnstile.tsx     # baru, client component
apps/dashboard/app/(auth)/login/page.tsx
apps/dashboard/app/(auth)/signup/page.tsx
apps/dashboard/lib/api.ts                   # +captcha_token
```

### Deploy

```text
deploy/docker-compose.vps.yml   # +5 env vars
```

`deploy/nginx.vps.conf` tidak berubah: `/api/` sudah diproxy ke `127.0.0.1:8081`,
dan callback memakai path `/api/auth/google/callback` yang menjadi
`/v1/auth/google/callback` di API.

## 6. Error Handling

| Kondisi | Respons |
|---|---|
| State tidak cocok / kedaluwarsa | `400 OAUTH_STATE_INVALID`, redirect ke `/login?error=oauth_state` |
| Google menolak (user cancel) | `302 /login?error=oauth_cancelled` |
| Exchange gagal / jaringan | `502 OAUTH_EXCHANGE_FAILED`, redirect `/login?error=oauth_failed` |
| `email_verified` false | `403 OAUTH_EMAIL_UNVERIFIED`, redirect `/login?error=oauth_email` |
| Captcha gagal | `400 CAPTCHA_FAILED` dengan pesan yang bisa ditampilkan |
| Captcha service error | `503 CAPTCHA_UNAVAILABLE` (fail closed) |
| OAuth belum dikonfigurasi | `503 OAUTH_NOT_CONFIGURED` |
| Email sudah ada saat signup password | `409 EMAIL_TAKEN` (perilaku lama, tidak berubah) |

Semua kegagalan OAuth berakhir di `/login` dengan query `error`, sehingga user melihat
pesan, bukan halaman kosong. Dashboard menampilkan pesan dari query itu.

## 7. Testing

Unit test Go (repo tidak punya framework test JS):

- `internal/oauth`: state mismatch ditolak; `aud` salah ditolak; `email_verified=false`
  ditolak; `exp` lewat ditolak; exchange error dipetakan ke error yang benar.
- `internal/captcha`: token invalid → false; secret kosong → true (dev); error jaringan
  → false (fail closed).
- `internal/api`: signup tanpa `captcha_token` saat captcha aktif → 400; callback state
  valid → session cookie ter-set; email existing → link (tidak ada user duplikat);
  email baru → user dibuat dengan `password_hash=''`; user OAuth tidak bisa login
  password.
- `internal/store`: `UNIQUE(provider, provider_user_id)` menolak duplikat; cascade
  delete saat user dihapus.

Gate:

```bash
go test ./...
go build ./...
cd apps/dashboard && npx tsc --noEmit && npm run build
```

## 8. Verifikasi Manual

1. `/login` menampilkan tombol "Continue with Google" bila OAuth dikonfigurasi.
2. Klik tombol → consent Google → kembali ke `/dashboard` dengan session aktif.
3. Signup dengan email Google yang sudah punya akun password → masuk ke akun yang sama,
   tidak membuat duplikat.
4. Submit signup tanpa menyelesaikan Turnstile → ditolak dengan pesan.
5. Matikan JS: tombol Google tetap berupa link biasa (tidak butuh JS untuk redirect).
6. Env Google kosong → tombol hilang, `/api/auth/google` mengembalikan 503.
