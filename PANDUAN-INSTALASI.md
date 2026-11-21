# LAPKEU v1.1 — Panduan Migrasi: Backend Google Apps Script + Frontend GitHub Pages

Sebelum: satu Web App Apps Script menyajikan HTML **dan** data.
Sesudah: **GitHub Pages** menyajikan tampilan, **Apps Script** hanya menjawab data (JSON).

| Bagian | Berkas | Dipasang di |
|---|---|---|
| Backend | `Kode.gs` (+ `appsscript.json`, tidak berubah) | Proyek Apps Script LAPKEU yang sudah ada |
| Frontend | `lapkeu-frontend.zip` | Repository GitHub (Public) → GitHub Pages |

> Spreadsheet `DB_LAPKEU`, folder Drive, akun, dan PIN **tidak berubah**. Tidak ada migrasi data.

---

## A. Backend (± 5 menit)

1. Buka proyek Apps Script LAPKEU Anda yang sudah ada (https://script.google.com).
2. Buka file **`Kode`** → hapus seluruh isinya → tempel seluruh isi **`Kode.gs`** baru → **Simpan** (Ctrl+S).
3. Hapus file **`Index`**, **`Stylesheet`**, dan **`JavaScript`** (arahkan ke file → ⋮ → *Delete*). Tidak dipakai lagi.
4. `appsscript.json` **tidak berubah**. Jika ingin memastikan, isinya harus memuat `"access": "ANYONE_ANONYMOUS"` dan `"executeAs": "USER_DEPLOYING"`.
5. ⚠️ **Jangan** menjalankan `setupAppEnvironment` lagi — backend Anda sudah ter-setup.
6. **Deploy → Manage deployments → ✏️ (Edit) → Version: New version → Deploy.**
   URL `/exec` **tetap sama** seperti sebelumnya. Salin URL itu.
   > Jangan pilih *New deployment* — itu menghasilkan URL baru.
7. **Uji:** tempel URL `/exec` di browser, tambahkan `?action=ping` di belakangnya:
   ```
   https://script.google.com/macros/s/XXXX/exec?action=ping
   ```
   Hasil benar (teks JSON, bukan halaman aplikasi):
   ```
   {"success":true,"data":{"app":"LAPKEU","versi":"1.1.0","siap":true},"message":"OK"}
   ```
   - Masih muncul halaman aplikasi lama / `versi` 1.0.0 → langkah 6 belum memakai *New version*.

---

## B. Frontend → GitHub Pages (Windows)

**Folder kerja = folder yang di dalamnya langsung ada `index.html`.** Di folder inilah `git init` dijalankan.

1. Ekstrak `lapkeu-frontend.zip`. Windows kadang membuat folder di dalam folder
   (`lapkeu-frontend\lapkeu-frontend\`). Masuklah sampai Anda melihat `index.html`, `css`, `js` langsung di dalamnya.
2. Buka `js\config.js` dengan Notepad. Ganti `ISI_URL_EXEC_DI_SINI` dengan URL `/exec` dari langkah A.7 (tanpa `?action=ping`). Simpan.
3. Install **Git** (https://git-scm.com/download/win, pengaturan default) dan siapkan akun GitHub.
4. Di GitHub: **+ → New repository** → beri nama → pilih **Public** → **jangan** centang README/.gitignore/license → *Create*.
5. Buka PowerShell di folder kerja (di File Explorer klik address bar → ketik `powershell` → Enter), lalu **verifikasi** dulu:
   ```powershell
   dir
   ```
   `index.html`, `css`, dan `js` harus terlihat. Jika yang terlihat folder lain, masuk lagi satu level. **Jangan lanjut** sebelum benar.
6. Jalankan satu per satu:
   ```powershell
   git init
   git add .
   git commit -m "Upload pertama"
   git branch -M main
   git remote add origin https://github.com/USERNAME/NAMA-REPO.git
   git push -u origin main
   ```
   Saat diminta *Password*, tempel **Personal Access Token** (bukan password akun). Layar tidak menampilkan apa pun saat Anda menempel — itu normal.
   Token: https://github.com/settings/tokens → *Generate new token (classic)* → centang **repo**.
7. Aktifkan Pages: repo → **Settings → Pages** → Source **Deploy from a branch** → Branch **main** / **(root)** → Save. Tunggu 1–2 menit.
   Situs Anda: `https://USERNAME.github.io/NAMA-REPO/`

**Update di kemudian hari** (dari folder kerja yang sama):
```powershell
git add .
git commit -m "Deskripsi perubahan"
git push
```
Jika tampilan lama masih muncul: **Ctrl+Shift+R**.

---

## C. Setelah situs online

1. Buka situs GitHub Pages Anda → masuk dengan email + PIN yang sama seperti sebelumnya.
2. **Tautan di email pengingat/undangan:** di Apps Script buka `Kode`, cari fungsi `aturUrlFrontend`, ganti `https://USERNAME.github.io/NAMA-REPO/` dengan URL situs Anda, pilih fungsi itu di dropdown → ▶ Run. Cukup sekali.
3. Data contoh masih ada: hapus kapan saja dengan menjalankan `hapusDataContoh` di editor Apps Script.
4. Membuka URL `/exec` langsung kini hanya menampilkan JSON. Itu normal. Aplikasi dibuka dari alamat GitHub Pages.

---

## Yang berubah dari versi sebelumnya

| Hal | Sebelum | Sesudah |
|---|---|---|
| Alamat aplikasi | URL `/exec` | `https://USERNAME.github.io/NAMA-REPO/` |
| Komunikasi | `google.script.run` | `fetch()` POST (JSON teks) ke `/exec` |
| Endpoint | semua fungsi publik | **daftar putih 30 endpoint**; fungsi setup/data contoh tidak bisa dipanggil dari internet |
| Embed iframe Blogger | didukung | tidak diperlukan lagi |
| Unduh laporan di Safari iOS | bermasalah di iframe | tidak lagi terkendala iframe |

Perilaku: panggilan pertama setelah lama tidak dipakai bisa 3–8 detik (Apps Script "bangun"). Setelahnya normal. Mencatat transaksi tetap terasa instan karena tampilan diperbarui lebih dulu.

---

## Pemecahan masalah

| Gejala | Penyebab | Solusi |
|---|---|---|
| Notifikasi "GAS_URL belum diisi dengan benar" | `js/config.js` belum/salah diisi | Isi URL `/exec` penuh, lalu `git add . && git commit -m "fix config" && git push` |
| "Tidak dapat terhubung ke server" | URL salah, offline, atau Web App belum diakses *Anyone* | Cek `?action=ping` di browser. Deploy: Execute as **Me**, access **Anyone** |
| "Respons server tidak valid" | Backend belum di-deploy *New version* | Langkah A.6 |
| Console: `blocked by CORS policy` | Akses Web App bukan *Anyone*, atau URL bukan `/exec` | Perbaiki setelan deploy, pakai URL berakhiran `/exec` |
| Halaman GitHub 404 | `index.html` tidak di root repo | Buka repo di browser; `index.html` harus terlihat di root. Jika terlihat folder lain, push ulang dari folder yang benar |
| Halaman tanpa warna/gaya | Folder `css`/`js` tidak ikut ter-push | Pastikan keduanya ada di repo; push lagi dari terminal (jangan "Upload files" di web) |
| Muncul "Aplikasi belum di-setup" | Backend belum di-setup | Jalankan `setupAppEnvironment` sekali (hanya untuk instalasi baru) |
| Tampilan lama setelah push | Cache | Ctrl+Shift+R atau jendela Incognito |
