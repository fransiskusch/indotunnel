# Design Specification: API Keys Management & CLI Device Authorization Flow

- Date: 2026-10-06
- Status: Draft
- Author: indotunnel team

## 1. Context & Motivation

Saat ini, developer yang mengunduh CLI `indotunnel` harus mengambil API key secara manual dan menjalankan:
```bash
indotunnel login <api-key>
```
Namun, di dashboard web belum tersedia UI untuk melihat atau membuat API key, dan alur copy-paste manual rentan human-error dan kurang mulus (friction).

Tujuan perbaikan ini:
1. Menyediakan halaman **Settings / API Keys** di dashboard Next.js untuk membuat, menyalin, dan me-revoke API key secara mandiri.
2. Mengimplementasikan alur **Device Authorization (RFC 8628 variant)** sehingga developer cukup mengetik `indotunnel login`. Browser terbuka otomatis, developer klik tombol "Approve", dan CLI langsung terautentikasi tanpa harus copy-paste secret secara manual.

---

## 2. Architecture & Components

```
+------------------+         1. POST /v1/auth/device/code         +--------------------+
|                  | -------------------------------------------> |                    |
|   CLI Agent      | <------------------------------------------- |   Control API      |
| (indotunnel login) |         device_code, user_code, url          |    (Go Server)     |
|                  |                                              +---------+----------+
|                  |         4. Poll POST /device/token                     |
|                  | ------------------------------------------->           |
|                  | <-------------------------------------------           |
|                  |           approved: {api_key: sk_...}                  |
+--------+---------+                                                        |
         |                                                                  |
         | 2. Buka Browser (/activate?code=ABCD-1234)                       |
         v                                                                  |
+------------------+                                                        |
| Browser          |         3. POST /v1/auth/device/verify (Cookie)        |
| (Next.js Dash)   | -----------------------------------------------------> |
+------------------+                                                        |
                                                                            v
                                                                 +----------------------+
                                                                 | Redis (TTL 600s)     |
                                                                 | Ephemeral state      |
                                                                 +----------------------+
                                                                 | PostgreSQL           |
                                                                 | api_keys table       |
                                                                 +----------------------+
```

### Components Involved:
1. **PostgreSQL Store (`internal/store`)**: Method CRUD untuk tabel `api_keys` (`CreateAPIKey`, `ListAPIKeys`, `RevokeAPIKey`).
2. **Control Plane API (`internal/api`)**:
   - Handler API Key: `GET /v1/api-keys`, `POST /v1/api-keys`, `DELETE /v1/api-keys/{id}` (authed via Session Cookie).
   - Handler Device Auth:
     - `POST /v1/auth/device/code` (Public)
     - `POST /v1/auth/device/verify` (Authed via Session Cookie)
     - `POST /v1/auth/device/token` (Public, polled by CLI)
3. **Dashboard Web (`apps/dashboard`)**:
   - Update `components/nav.tsx` untuk menyertakan navigasi `Settings`.
   - Halaman `app/(app)/settings/page.tsx` untuk manajemen API keys.
   - Halaman `app/(app)/activate/page.tsx` untuk konfirmasi / approval device login CLI.
4. **CLI Agent (`cmd/agent`)**:
   - Update subcommand `login`: jika tanpa argumen, inisiasi device flow, cetak instruksi, buka browser native, poll token, simpan key ke config lokal.

---

## 3. Data Model & Database Storage

Tabel `api_keys` sudah ada di schema database (`migrations/0001_init.sql`):
```sql
CREATE TABLE api_keys (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    key_prefix VARCHAR(16) NOT NULL,
    secret_hash VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Store Struct & Methods (`internal/store/store.go`):
```go
type APIKey struct {
    ID         uuid.UUID
    UserID     uuid.UUID
    Name       string
    KeyPrefix  string
    Status     string
    LastUsedAt *time.Time
    ExpiresAt  *time.Time
    CreatedAt  time.Time
}

// Method signatures:
CreateAPIKey(ctx context.Context, userID uuid.UUID, name string) (rawKey string, key APIKey, err error)
ListAPIKeys(ctx context.Context, userID uuid.UUID) ([]APIKey, error)
RevokeAPIKey(ctx context.Context, userID, keyID uuid.UUID) error
```

`CreateAPIKey` memanggil `auth.GenerateKey()` yang menghasilkan format `sk_live_<64-hex>`, menghitung prefix (`rawKey[:12]`), dan hash SHA-256 (`secret_hash`), lalu menyimpannya ke tabel `api_keys`. Nilai plaintext `rawKey` dikembalikan ke pemanggil dan tidak pernah disimpan di DB.

---

## 4. Redis Ephemeral State for Device Auth

Prefix Redis:
1. `indotunnel:device:user:{user_code}` (TTL 600s)
   - Value: JSON `{"device_code": "...", "client_name": "...", "status": "pending"}`
2. `indotunnel:device:dev:{device_code}` (TTL 600s saat pending, TTL 120s saat approved)
   - Value: JSON `{"user_code": "...", "client_name": "...", "status": "pending|approved", "api_key": ""}`

Format `user_code`: 8 karakter alfanumerik huruf besar tanpa karakter membingungkan (contoh subset: `23456789BCDFGHJKMNPQRSTVWXYZ`), diformat `XXXX-XXXX`.
Format `device_code`: 32-byte hex string (64 karakter) random crypto.

---

## 5. API Specification

### 5.1 API Key Management Endpoints (Session-Authenticated / Cookie)

#### `GET /v1/api-keys`
- Headers: `Cookie: indotunnel_session=...`
- Response 200:
  ```json
  {
    "api_keys": [
      {
        "id": "c1f7b0b2-...",
        "name": "CLI (work-laptop)",
        "key_prefix": "sk_live_a1b2",
        "status": "active",
        "created_at": "2026-10-06T12:00:00Z",
        "last_used_at": "2026-10-06T12:05:00Z"
      }
    ]
  }
  ```

#### `POST /v1/api-keys`
- Request:
  ```json
  { "name": "CI Server" }
  ```
- Response 201:
  ```json
  {
    "id": "c1f7b0b2-...",
    "name": "CI Server",
    "key_prefix": "sk_live_a1b2",
    "key": "sk_live_a1b2c3d4e5f6...",
    "created_at": "2026-10-06T12:00:00Z"
  }
  ```

#### `DELETE /v1/api-keys/{id}`
- Response 204 No Content

---

### 5.2 Device Authorization Endpoints

#### `POST /v1/auth/device/code` (Public)
- Request:
  ```json
  { "client_name": "Frans-MacBook.local" }
  ```
- Response 200:
  ```json
  {
    "device_code": "d7a8e...",
    "user_code": "WD4R-8K2M",
    "verification_uri": "http://localhost:3001/activate",
    "verification_uri_complete": "http://localhost:3001/activate?code=WD4R-8K2M",
    "expires_in": 600,
    "interval": 2
  }
  ```

#### `POST /v1/auth/device/verify` (Session-Authenticated / Cookie + CSRF)
- Request:
  ```json
  { "user_code": "WD4R-8K2M" }
  ```
- Validasi:
  - Cek user di session cookie.
  - Cari `indotunnel:device:user:{user_code}` di Redis. Jika tidak ada / expired -> return 404 `CODE_NOT_FOUND` atau `CODE_EXPIRED`.
  - Buat API key via `store.CreateAPIKey(ctx, user.ID, "CLI (" + clientName + ")")`.
  - Update `indotunnel:device:dev:{device_code}` dengan status `approved` dan `api_key: rawKey`, TTL set 120s.
  - Hapus `indotunnel:device:user:{user_code}` dari Redis.
- Response 200:
  ```json
  { "status": "approved" }
  ```

#### `POST /v1/auth/device/token` (Public)
- Request:
  ```json
  { "device_code": "d7a8e..." }
  ```
- Response:
  - Jika pending: HTTP 200 / 428 dengan JSON:
    ```json
    { "status": "pending" }
    ```
  - Jika approved: HTTP 200 dengan JSON:
    ```json
    { "status": "approved", "api_key": "sk_live_..." }
    ```
    Lalu Redis key `indotunnel:device:dev:{device_code}` dihapus.
  - Jika expired / tidak ada di Redis: HTTP 400 dengan JSON:
    ```json
    { "error": { "code": "EXPIRED_TOKEN", "message": "Device authorization expired or not found." } }
    ```

---

## 6. CLI Implementation Details

File: `cmd/agent/main.go`

1. Perilaku `indotunnel login`:
   - Jika `len(args) > 0`: perilaku lama tetap bekerja (`login(args)` menyimpan key manual).
   - Jika `len(args) == 0`: panggil `deviceLogin()`.
2. `deviceLogin()`:
   - Ambil hostname local (`os.Hostname()`).
   - Kirim `POST {API}/v1/auth/device/code` dengan body `{"client_name": hostname}`.
   - Cetak:
     ```text
     To authenticate, please visit:
       https://dashboard.indotunnel.com/activate?code=WD4R-8K2M

     Confirmation code: WD4R-8K2M
     Waiting for confirmation in browser...
     ```
   - Coba buka URL di browser default OS:
     - Windows: `cmd.exe /c start <url>`
     - macOS: `open <url>`
     - Linux: `xdg-open <url>`
     (Gagal membuka browser tidak membatalkan flow; instruksi URL sudah tercetak).
   - Polling loop: interval 2 detik, timeout 10 menit (300 iterasi).
   - Pada status `approved`:
     - Simpan kredensial via `cfg.Save(cfg.Credentials{Token: apiKey})`.
     - Cetak: `Successfully authenticated! API key saved.`
     - Selesai (exit 0).

---

## 7. Dashboard Frontend Details

1. **`components/nav.tsx`**:
   - Tambah link navigasi: `Settings` (`/settings`) dengan icon `KeyRound` atau `Settings`.
2. **`app/(app)/settings/page.tsx`**:
   - Menampilkan list API Keys user: Name, Prefix (`sk_live_****`), Created date, tombol Revoke.
   - Tombol "Create API Key": membuka modal dialog untuk memasukkan nama key.
   - Setelah create: menampilkan dialog "API Key Created" dengan raw secret, copy button, dan peringatan bahwa secret tidak akan ditampilkan lagi.
3. **`app/(app)/activate/page.tsx`**:
   - Halaman otorisasi device.
   - Membaca search param `?code=XXXX-XXXX`. Jika tidak ada di URL, menampilkan input text box.
   - Menampilkan detail permintaan otorisasi dan tombol besar "Approve CLI Login".
   - Mengirim request `clientFetch("/auth/device/verify", { method: "POST", body: { user_code } })`.
   - Menampilkan notifikasi sukses: "CLI telah berhasil diotorisasi. Anda dapat kembali ke terminal."

---

## 8. Error Handling & Edge Cases

1. **Kode Kedaluwarsa**:
   - Jika user terlambat membuka link (>10 menit), Redis otomatis menghapus key. Dashboard menampilkan error "Kode sudah kedaluwarsa atau tidak valid". CLI menerima `EXPIRED_TOKEN` dan menghentikan polling.
2. **Rate Limiting**:
   - Endpoint `POST /v1/auth/device/code` diberi rate limit per IP untuk mencegah abuse spamming key generation.
3. **CSRF & Origin Protection**:
   - Endpoint `POST /v1/auth/device/verify` dan `/v1/api-keys` menggunakan middleware `auth.CSRFMiddleware` yang sudah ada untuk memvalidasi Origin dashboard.

---

## 9. Testing & Verification

1. **Unit Tests Store (`internal/store/store_test.go`)**:
   - Test `CreateAPIKey`, `ListAPIKeys`, `RevokeAPIKey`.
2. **Unit Tests API Handlers (`internal/api/apikey_handlers_test.go`, `internal/api/device_handlers_test.go`)**:
   - Test pembuatan API key via session cookie.
   - Test alur device code generation -> verification -> polling token.
   - Test rejection saat unauthorized / expired code.
3. **End-to-End Simulation**:
   - CLI simulasi `indotunnel login` memanggil mock server atau real dev server, membuka link activate, lalu memverifikasi credential tersimpan di disk.
