# LAPKEU — Frontend (GitHub Pages)

Aplikasi keuangan pribadi & berdua. Frontend statis (HTML/CSS/JS murni) yang memanggil backend
Google Apps Script lewat `fetch()`. Data tersimpan di Google Sheets & Drive milik Anda.

```
index.html          ← halaman utama (harus di root repo)
css/style.css       ← seluruh tampilan
js/config.js        ← ✏️ SATU-SATUNYA file yang perlu Anda edit (isi GAS_URL)
js/app.js           ← logika aplikasi
PANDUAN-INSTALASI.md
```

## Konfigurasi
Buka `js/config.js`, ganti `ISI_URL_EXEC_DI_SINI` dengan URL Web App Apps Script
(berakhiran `/exec`). Simpan, lalu push ke GitHub.

## Catatan keamanan
- Repo ini **publik**, dan itu aman: tidak ada kata sandi atau kunci di dalamnya.
- Semua data keuangan tetap butuh login (PIN) dan hanya dikirim backend setelah token sesi diperiksa.
- Jangan pernah menaruh PIN, token, atau data keuangan di file mana pun di repo ini.
