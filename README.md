# Deploy Cloudflare Worker (full dari HP, gak perlu laptop)

## 1. Bikin akun Cloudflare
Buka dash.cloudflare.com di browser HP → daftar/login (gratis).

## 2. Bikin Worker baru
- Di sidebar, cari menu **Workers & Pages**
- Tap **Create** → **Create Worker**
- Kasih nama, misal `wa-crm-proxy`
- Tap **Deploy** (ini deploy versi default dulu, nanti ditimpa)

## 3. Edit kode Worker
- Setelah deploy, tap **Edit code** (buka online code editor langsung di browser)
- **Hapus semua kode default**, ganti dengan isi file `worker.js` di folder ini
  (copy dari file yang udah gue siapin, paste di editor Cloudflare)
- Tap **Save and Deploy**

## 4. Isi Environment Variables (di sinilah API key disimpen aman)
- Balik ke halaman Worker lo, tap **Settings** → **Variables**
- Tap **Add variable**, bikin 2 variable:
  - `WA_API_KEY` = API key dari provider WA lo (misal dari Fonnte), tap **Encrypt** biar tersembunyi
  - `ADMIN_TOKEN` = bikin sendiri kode rahasia acak, misal `crm2026-rahasia-xyz`, ini juga di-**Encrypt**
- Tap **Save**

## 5. Catat URL Worker lo
Bentuknya kayak: `https://wa-crm-proxy.USERNAME.workers.dev`
URL ini dipakai di `admin-panel/script.js`, pada baris `const WORKER_URL = "..."`

## 6. Isi token yang sama di Admin Panel
Buka admin panel lo (setelah di-deploy) → halaman **Setting API WA** → masukin `ADMIN_TOKEN` yang sama persis kayak yang diisi di langkah 4 → Simpan.

## Cara test
Isi form "Broadcast" di admin panel dengan nomor WA lo sendiri, kirim pesan test. Kalau berhasil, berarti alurnya udah nyambung: Admin Panel → Worker → Provider WA.

## Catatan keamanan
- `WA_API_KEY` cuma ada di Cloudflare, gak pernah ada di kode HTML/JS manapun
- `ADMIN_TOKEN` cuma disimpen di localStorage browser HP admin, gak ikut ke-commit ke GitHub
- Kalau token bocor, cukup ganti `ADMIN_TOKEN` di Cloudflare, gak perlu ubah kode
