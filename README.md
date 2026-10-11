# PERGI KELUAR — Trip Information Hub & CMS (2026)

Website mobile-first + dashboard CMS admin, dibangun berdasarkan `system_map.md` v1.0.

## Fitur

**Website publik (tanpa login):** `/`, `/trip`, `/trip/:slug`, `/t/:token`, `/destinasi`, `/destinasi/:slug`, `/tentang`, halaman 404. Halaman detail trip memiliki Ringkasan, Itinerary, Peta Perjalanan, Destinasi, Info Penting, Galeri, tombol Google Maps, dan kontak WhatsApp (muncul setelah diatur admin).

**Admin (wajib login):** `/admin/login`, `/admin`, `/admin/trips`, `/admin/trips/create`, `/admin/trips/:id/edit`, `/admin/preview/:id`, `/admin/destinations`, `/admin/media`, `/admin/settings`. Editor trip bisa mengatur informasi dasar, agenda per hari, destinasi yang ditautkan, titik lokasi, info penting, galeri, draft/publish, dan public/private.

**Di luar MVP:** sistem booking, pembayaran, profil customer, data pribadi peserta, check-in digital. Tidak ada tombol login untuk pengunjung.

## Persyaratan

- Node.js **20+**
- PostgreSQL **14+**
- npm

## Cara instal (Debian/Ubuntu/Windows)

```bash
# Buat database PostgreSQL (jalankan sebagai user postgres)
createdb pergi_keluar

# Di folder project
cp .env.example .env
# EDIT .env: DATABASE_URL, SESSION_SECRET acak minimal 32 karakter,
# ADMIN_EMAIL serta ADMIN_PASSWORD kuat dan unik
npm install
npm start
```

Buka `http://localhost:3000` untuk website publik dan `http://localhost:3000/admin/login` untuk CMS. **Skema database dibuat otomatis saat pertama dijalankan**, termasuk data awal contoh 1 trip dan 4 destinasi. Admin pertama dibuat dari `ADMIN_EMAIL` dan `ADMIN_PASSWORD` saat tabel admin masih kosong. Mengubah `.env` setelah admin dibuat tidak mereset password admin.

**Peringatan:** `ADMIN_PASSWORD` pada contoh sengaja invalid dan harus diganti. Jangan commit `.env` ke Git. Data dan foto contoh menggunakan placeholder dan URL Unsplash; ganti lewat CMS sebelum produksi.

## Cara menggunakan

1. Login admin, buka **Pengaturan Website**, ubah nama, warna oranye, gambar hero, footer dan WhatsApp (nomor internasional `628...`).
2. Masuk ke **Destinasi**, tambahkan lokasi dan koordinat latitude/longitude.
3. Masuk ke **Trip → Tambah Trip**. Isi informasi dasar, simpan draft.
4. Buka tab **Itinerary** untuk menambah hari dan agenda. Pilih destinasi, titik lokasi, info penting, serta galeri foto. Setiap tab perlu disimpan lewat tombol **Simpan perubahan**; navigasi tab mempertahankan perubahan di form selama halaman tidak dimuat ulang.
5. Klik **Preview** untuk melihat rancangan, kemudian **Preview & Publish → Publish Trip**.
6. Untuk trip privat, ubah visibilitas ke **private**, simpan, kemudian klik **Buat / rotasi private link**. **Salin tautan saat dihasilkan** karena backend hanya menyimpan hash-nya. Private trip baru bisa dibuka lewat tautan jika statusnya published.
7. Refresh halaman publik untuk melihat konten baru.

## Teknologi & struktur

```text
server.js                  Express REST API + autentikasi + upload + seed
public/index.html           Shell aplikasi responsif
public/assets/styles.css   Design system mobile/desktop
public/assets/app.js       Semua halaman publik dan CMS (vanilla JS)
db/schema.sql               PostgreSQL schema
storage/uploads/            Foto unggahan (persisten)
.env.example                Template konfigurasi
```

Frontend: HTML/CSS/JavaScript tanpa React. Backend: Node.js ESM + Express. Database: PostgreSQL. Auth: session cookie tersimpan di PostgreSQL (`connect-pg-simple`), bcrypt, CSRF via custom header & pemeriksaan Origin, rate limit pada endpoint login, audit log. Media menerima JPG/PNG/WebP hingga 5 MB dan diverifikasi dengan magic bytes dasar.

## Jalankan di produksi

- Pastikan `NODE_ENV=production`, HTTPS pada Nginx, `SESSION_SECRET` kuat, firewall PostgreSQL internal saja, backup DB + `storage/uploads`, serta `TRUST_PROXY=1` **hanya jika** aplikasi dijalankan di belakang reverse proxy tepercaya.
- Integrasikan transformasi gambar, pemeriksaan antivirus upload bila diperlukan, dan kebijakan media/alt text sebelum digunakan secara luas.
- Pastikan seluruh data trip/koordinat yang dipublikasikan sesuai kenyataan; tautan Maps berupa navigasi ke **titik**, bukan rute jalan otomatis.
- Jika diperlukan deployment high availability atau trafik besar, pertimbangkan object storage/CDN, CSP ketat, migration tool formal, automated tests, dan penguatan validasi schema JSON untuk itinerary/stops.
- Gunakan `pm2`/`systemd` dan reverse proxy untuk produksi.

## Catatan cakupan

Ini adalah **implementasi MVP** dengan halaman navigasi dan CRUD dasar yang bisa dijalankan dengan PostgreSQL, bukan layanan booking/pembayaran. Beberapa keputusan yang masih perlu disepakati: domain final, media local vs object storage, jumlah admin, pilihan peta/routing, dan PIN optional untuk private trip.

## File referensi mockup untuk proses slicing

Folder `design-references/` berisi **empat gambar referensi**, termasuk screenshot desain customer awal, rancangan detail trip, beberapa variasi homepage/mobile, dan rancangan public/admin lengkap. Lihat `design-references/README.md` untuk pemetaan. Referensi adalah gambar raster yang tidak mempunyai layer CSS/Figma; frontend dibuat sebagai adaptasi kode dan tidak diklaim pixel-perfect terhadap semua variasi mockup yang saling berbeda.

## Peta komponen visual dan halaman

| Route / Modul | Sumber slicing utama |
|---|---|
| `/` Homepage | `public/assets/app.js` → `home()`, `styles.css` → `.hero`, `.features`, `.cards` |
| `/trip` dan `/destinasi` | `listing()`, `tripCard()`, `destCard()`, `.list-hero`, `.filters` |
| `/trip/:slug` dan `/t/:token` | `detail()`, `.detail-hero`, `.tabbar`, `.timeline`, `.gallery`, `.info-row` |
| `/destinasi/:slug` | `destinationDetail()`, `.about-grid`, `.gallery` |
| `/tentang` dan 404 | `about()`, `notFound()` |
| `/admin/login` | `login()`, `.auth-shell`, `.auth-form` |
| `/admin` | `dashboard()`, `.kpis`, `.admin-hero` |
| `/admin/trips` | `tripsAdmin()`, `.table-scroll`, `.status` |
| `/admin/trips/create` & editor | `tripEditor()`, `editorRender()`, `.editor`, `.editor-tabs` |
| `/admin/preview/:id` | `detail()` dalam mode preview |
| `/admin/destinations` | `destinationsAdmin()` |
| `/admin/media` | `mediaAdmin()` |
| `/admin/settings` | `settingsAdmin()` |

**Integrasi:** `public/assets/app.js` memanggil API `/api/public/*` dan `/api/admin/*`. Backend yang disertakan memproses endpoint tersebut dan menyimpan ke PostgreSQL. Perubahan desain dilakukan pada `styles.css`, sementara HTML komponen yang di-render lewat JS berada di `app.js`. Gunakan `system_map.md` sebagai ruang lingkup final fitur MVP.
