# 🎓 Synalabs Smart Attendance System (UNM)

Sistem Presensi Wajah Interaktif berbasis **AI (Artificial Intelligence)** dan **Geofencing** untuk Mahasiswa Universitas Nusa Mandiri (UNM) atau instansi akademik umum. Sistem ini mendeteksi wajah secara real-time melalui web browser, memvalidasi keberadaan mahasiswa di radius kampus yang tepat, dan mensinkronisasikan kehadiran berdasarkan sistem penjadwalan kelas yang sangat akurat.

---

## ⚡ Fitur Utama (Features)

1. **Biometric Face Recognition (AI) 🤖**
   * Pengenalan wajah secara cerdas, otomatis, dan akurat menggunakan model jaring saraf tiruan dari `face-api.js` (`Tensorflow.js`).
   * Evaluasi persentase ketepatan wajah (*Confidence Score Threshold*) yang diolah murni di Client-Side untuk keamanan privasi dan kecepatan maksimal.
2. **Dynamic Live Geofencing 📍**
   * Validasi posisi absensi berbasis GPS. Kamera Face Scan tidak akan mau dijalankan jika pengguna tidak mengizinkan akses deteksi lokasi.
   * Menampilkan titik Peta Lokasi Akurat *Live* (berbasis OpenStreetMap) di dalam antarmuka pemindaian yang menunjukkan seberapa jauh jarak Anda (dalam meter) dari *koordinat pusat kampus*.
3. **Smart Schedule-Based Attendance 🗓️**
   * Absensi tidak lagi berbasis *Office Hour* (karyawan), tetapi berbasis **Kelas Perkuliahan Mahasiswa**.
   * Admin mendaftarkan masing-masing profil ke satu "Kelas". Ketika mahasiswa mengambil Face Scan, backend menelusuri jadwal yang relevan pada `Day of Week` hari tersebut untuk mencatat status **Hadir** atau **Terlambat** dengan toleransi dinamis.
4. **PWA Mobile-First Navigation & Responsive 📱**
   * Dirancang semirip mungkin dengan aplikasi *Native* lewat tab menu simetris melayang (floating dock). Navigasi ekstra halus untuk pengguna *Mobile Device*.
5. **Admin Management & Reporting Dashboard 📊**
   * Panel admin (*protected routes*) untuk mengelola Data Kelas, Jadwal Matkul, Pengelolaan Siswa (tambah biodata, daftarkan wajah manual / hapus).
   * Visualisasi Laporan Kehadiran.
   * Modifikasi batas radius presensi dan pengaturan akurasi AI langsung ditangani via Pengaturan Dashboard.

---

## 💻 Tech Stack

Aplikasi ini mendemonstrasikan fondasi arsitektur pengembangan web modern (Jamstack + Serverless Concept):
- **Framework Core**: `Next.js 16.x` (App Router React 19)
- **Styling**: `TailwindCSS v4`, `Lucide React` (Iconography)
- **AI / Machine Learning Engine**: `@vladmandic/face-api` (Browser-based ML Face Detection)
- **Database & ORM**: `MySQL 8+` (Local/Cloud), `Prisma v6` (Type-safe Database Schema)
- **Authentication**: `JSON Web Tokens (JWT)`, `bcryptjs`
- **Data Export & Maps**: `ExcelJS`, `jsPDF`, `Leaflet/OpenStreetMap Embed`

---

## 🛠️ Persiapan Awal (Prerequisites)

* **Node.js** V18.x atau yang lebih baru. Disarankan V22.x LTS.
* **Database MySQL** (Gunakan Laragon, XAMPP, atau Database Cloud/Docker). Server default mengarah ke localhost.
* (Opsional) Jika di-test di jaringan LAN / HP, gunakan `ngrok` (baca bagian Testing).

---

## 🚀 Panduan Instalasi (Installation Guide)

**1. Clone atau Ekstrak Repository Project**
```bash
cd synalabs-attendance
```

**2. Instalasi NPM Dependencies**
```bash
npm install
```

**3. Konfigurasi Variabel Environment**
Duplikat file `.env.example` ke `.env` (atau buat manual) dan sesuaikan string koneksi Prisma dengan kredensial database lokal (MySQL) dan secret Anda:
```env
# Contoh Konfigurasi .env
DATABASE_URL="mysql://root:@localhost:3306/attendance_db"
JWT_SECRET="isi-dengan-string-sangat-rahasia-anda-disini"
```

**4. Migrasi Skema dan Seeding Database Dasar**
Perintah ini akan melakukan pembuatan tabel dan menyuntikkan (seeding) **Data Admin, Konfigurasi Kampus, Data Dummy Kelas/Jadwal** secara otomatis:
```bash
npx prisma db push
npm run prisma:seed
```
*Note: Script seed juga otomatis menanamkan koordinat Universitas Nusa Mandiri Kampus Rawamangun.*

**5. Build Sistem (Opsional untuk Lingkungan Production Test)**
```bash
npm run build
```

---

## 🏃‍♂️ Menjalankan Aplikasi

**A. Mode Pengembangan Lanjutan (Developer)**
```bash
npm run dev
```

**B. Mode Produksi Optimal (Server Deploy)**
Catatan: Pastikan sudah mengeksekusi `npm run build` sebelum perintah ini.
```bash
npm run start
```
*Aplikasi kini dapat diakses di http://localhost:3000.*

### Default Login
Akses menu dengan email *Super Admin* yang telah ditanamkan oleh `seed.js`:
- Email: **admin@nusamandiri.ac.id**
- Password: **P@ssw0rd123!!**

---

## 📱 Testing di Jaringan Lokal (WiFi/HP)

Aplikasi dibangun *Bind to All IPs* (`0.0.0.0`). Anda dan kerabat/guru terkait bisa mengakses Web Presensi bersamaan (satu lingkup LAN Local WiFi).
Misal buka dari HP Anda: `http://192.168.1.15:3000`

> [!WARNING]
> Karena kebijakan OS *(Apple Safari & Google Chrome Android)* yang melarang web mengakses **Kamera** tanpa adanya Enkripsi SSL **HTTPS**, HP teman Anda TIDAK AKAN bisa menyalakan Camera AI apabila diakses **via HTTP**.

**✓ Solusi Menguji Kamera API di Lingkungan Lokal Non-HTTPS:**

**Cara 1: Gunakan Ngrok (Paling Direkomendasikan)**
Jembatani localhost Anda menjadi alamat publik HTTPS sementera:
```bash
npx ngrok http 3000
```
Bagikan URL `https://xxxx.ngrok.app` ke perangkat lain! Otomatis Kamera 100% tereksekusi.

**Cara 2: Bypass Flags (Sisi Client)**
Di Browser Google Chrome HP yang membuka website ini, ketik di kotak URL: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
Masukkan URL LAN *(e.g. `http://192.168.x.x:3000`)* lalu `Enable`. Lakukan Relaunch pada browser dan kamera siap menyorot!

---

*Didevelop oleh TIM Synalabs dengan teknologi Agentic Web.*
