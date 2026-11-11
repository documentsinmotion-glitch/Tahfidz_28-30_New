# Tahfidz 28-30 — Aplikasi Android (APK)

Kuis hafalan Al-Qur'an **Juz 28, 29 & 30** yang dibungkus menjadi aplikasi Android memakai **Capacitor**.
Semua tampilan, font, dan skrip sudah **dibundel di dalam APK** (tidak memakai CDN), sehingga aplikasi terbuka cepat.
Teks ayat & audio murottal tetap diambil dari Alquran.cloud, jadi **butuh internet saat kuis berjalan**.

> **Status jujur:** proyek ini sudah dirakit dan diuji sebagai bundel web dengan plugin suara tiruan, tetapi **APK belum
> pernah dikompilasi atau dijalankan di HP/emulator sungguhan** (lingkungan tempat proyek ini dibuat tidak punya Android SDK).
> Lihat bagian *Uji pertama di HP* di bawah untuk hal-hal yang perlu Anda cek.

---

## Isi proyek

| Berkas / folder | Fungsi |
|---|---|
| `src/index.html` | **Aplikasi** (versi yang sama dengan web, tanpa CDN + pengait Android). Ubah aplikasi di sini. |
| `src/native-bridge.js` | Jembatan Android: pengenalan suara native, tombol Kembali, warna status bar. |
| `scripts/prepare-web.js` | Membangun folder `www/` (Tailwind → CSS statis, font lokal, Alpine, Lucide). |
| `scripts/patch-android.js` | Menambah izin mikrofon, mengunci portrait, versi, dan penandatanganan rilis pada `android/`. |
| `scripts/make-icons.js` | Membuat ulang ikon & splash (oktagram Rub al-Hizb) ke folder `assets/`. |
| `assets/` | Ikon adaptif + splash (sudah dihasilkan ke `android/app/src/main/res`). |
| `android/` | Proyek Android native (Gradle). |
| `.github/workflows/build-apk.yml` | Membangun APK otomatis di GitHub (tanpa memasang apa pun di komputer). |
| `capacitor.config.json` | ID aplikasi `id.tahfidz.juz2830`, nama "Tahfidz 28-30". |

---

## Cara 1 — Bangun APK lewat GitHub Actions (disarankan, tanpa instalasi)

1. Buat akun gratis di <https://github.com> lalu buat repositori baru (misalnya `tahfidz-28-30`, boleh **Private**).
2. Ekstrak ZIP proyek ini, lalu unggah **seluruh isinya** ke repositori:
   - Termudah: di halaman repositori klik **Add file → Upload files**, seret **semua isi folder** (termasuk folder
     tersembunyi `.github`, `android`, `src`, `scripts`, `assets`), lalu **Commit changes**.
   - Atau dengan Git: `git init && git add . && git commit -m "Tahfidz 28-30" && git branch -M main && git remote add origin <URL> && git push -u origin main`.
   - Pastikan berkas `.github/workflows/build-apk.yml` ikut terunggah (folder berawalan titik kadang terlewat di Windows/Mac).
3. Buka tab **Actions** → workflow **Build APK Tahfidz 28-30** akan berjalan otomatis (atau klik **Run workflow**).
   Build pertama sekitar 8–15 menit.
4. Setelah hijau ✔, buka run tersebut → bagian **Artifacts** → unduh **Tahfidz-28-30-APK**. Di dalamnya ada
   `Tahfidz-28-30-debug.apk` yang langsung bisa dipasang di HP.
5. (Opsional) Beri tag `v1.0.0` pada commit untuk menerbitkan **Release** berisi APK yang bisa diunduh lewat tautan.

### Memasang APK di HP
Kirim berkas APK ke HP → buka → izinkan **"Pasang aplikasi dari sumber ini/tidak dikenal"** bila diminta → **Pasang**.
APK *debug* aman dipakai pribadi/uji coba. Untuk dibagikan luas atau Play Store, buat APK **rilis** (di bawah).

---

## Cara 2 — Bangun sendiri di komputer

Prasyarat: **Node.js 22+**, **JDK 21**, dan **Android Studio** (atau Android SDK platform 36).

```bash
npm install
npm run sync          # membangun www/ lalu `cap sync android`
node scripts/patch-android.js
cd android
./gradlew assembleDebug          # Windows: gradlew.bat assembleDebug
# hasil: android/app/build/outputs/apk/debug/app-debug.apk
```
Atau buka folder `android/` dengan Android Studio → **Run ▶** ke HP/emulator.

---

## APK rilis bertanda tangan (untuk dibagikan / Play Store)

1. Buat keystore **sekali saja** dan **simpan baik-baik** (jika hilang, aplikasi tidak bisa diperbarui di Play Store):
   ```bash
   keytool -genkeypair -v -storetype JKS -keystore tahfidz.keystore -alias tahfidz -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 tahfidz.keystore > keystore.b64        # macOS: base64 -i tahfidz.keystore -o keystore.b64
   ```
2. Di GitHub: **Settings → Secrets and variables → Actions → New repository secret**, buat 4 secret:
   `KEYSTORE_BASE64` (isi `keystore.b64`), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (`tahfidz`), `KEY_PASSWORD`.
3. Jalankan ulang workflow. Selain APK debug akan muncul **`Tahfidz-28-30.apk`** (rilis, bertanda tangan) dan
   **`Tahfidz-28-30.aab`** (untuk Google Play).
4. Naikkan versi: ubah `"version"` di `package.json` (mis. `1.1.0`); `versionCode` dihitung otomatis.

Jangan pernah mengunggah berkas `.keystore` ke repositori (sudah diabaikan oleh `.gitignore`).

---

## Cara kerja khusus Android

**Pengenalan suara (mode 2 & 4).** WebView Android tidak punya Web Speech API, jadi `src/native-bridge.js` menyediakan
pengganti `SpeechRecognition` yang memakai mesin suara Android lewat plugin `@capacitor-community/speech-recognition`.
- Izin mikrofon diminta saat pertama kali menekan tombol rekam.
- Mesin Android berhenti sendiri saat Anda jeda ±1–2 detik; aplikasi otomatis memulainya lagi dan **menggabungkan**
  potongan bacaan, sehingga perilakunya tetap seperti mode *continuous* di web.
- Bahasa: `ar-SA` (ayat & nama surah Arab) dan `id-ID` (nama surah Indonesia). Pada HP tanpa layanan suara, aplikasi
  menampilkan pesan dan tetap menyediakan tombol *evaluasi mandiri* / *pilihan ganda*.
- Syarat di HP: aplikasi **Google** (atau layanan suara bawaan) aktif; untuk hasil terbaik pasang paket bahasa
  Arab di *Pengaturan → Google → Layanan suara*. Umumnya butuh internet.
- Beberapa HP membunyikan "ding" sistem setiap mesin suara mulai/berhenti. Itu perilaku Android dan tidak bisa
  dimatikan dari aplikasi.

**Tombol Kembali perangkat.** Beranda: mundur satu langkah wizard; di langkah 1 → tekan dua kali untuk keluar.
Saat kuis: tekan dua kali untuk menghentikan kuis. Layar hasil: kembali ke beranda.

**Status bar & navigation bar** mengikuti tema (terang/gelap) dan tata letak *edge-to-edge* memakai *safe area*.

**Layar terkunci portrait.** Ubah/hapus `android:screenOrientation` di `scripts/patch-android.js` bila ingin landscape.

---

## Uji pertama di HP (mohon dicek)

Karena belum diuji di perangkat sungguhan, cek berurutan:
1. Aplikasi terbuka, font Arab tampil benar, ikon & splash oktagram muncul.
2. Tampilan **tidak tertutup status bar/gesture bar** (safe area), tombol *Lanjut/Mulai Kuis* terlihat penuh.
3. **Mode 1** (pilihan ganda) — murottal otomatis terputar; volume mengikuti tombol volume HP.
4. **Mode 4** (Sambung Ayat Vokal) — izin mikrofon muncul, bacaan terdeteksi, penilaian muncul. Coba jeda di tengah ayat.
5. **Mode 2** (Tebak Surah Vokal) — ucapkan nama surah (Arab & Indonesia).
6. Mode gelap, tombol Kembali, dan putar layar.

Jika audio murottal tidak bisa dinormalisasi (batasan CORS di WebView), aplikasi otomatis memakai pemutar biasa —
suara tetap terdengar, hanya penyeragaman volume yang tidak aktif.

---

## Mengubah aplikasi

- **Isi/fitur:** edit `src/index.html` (atau salin versi terbarunya dari file web, lalu terapkan ulang pengait Android:
  blok CSS `html.is-native`, pemanggilan `NativeBridge` di `init()`, dan metode `onNativeBack()`), lalu commit → APK baru dibangun.
- **Ikon/splash:** ubah `scripts/make-icons.js` (atau ganti PNG di `assets/`), lalu `npm run assets`.
- **ID aplikasi** (`id.tahfidz.juz2830`): ubah di `capacitor.config.json`, hapus folder `android/`, lalu
  `npx cap add android && node scripts/patch-android.js && npm run assets`.

## Pemecahan masalah

| Gejala | Penyebab / solusi |
|---|---|
| Workflow tidak muncul di tab Actions | Folder `.github/workflows/` belum terunggah — unggah ulang. |
| Gagal "SDK location not found" saat build lokal | Buat `android/local.properties` berisi `sdk.dir=/jalur/ke/Android/sdk`. |
| Mic: "Layanan suara diblokir/tidak tersedia" | Aktifkan aplikasi Google/layanan suara, pasang paket bahasa Arab, cek internet. |
| Layar putih saat dibuka | Jalankan `npm run sync` sebelum build (folder `www/` harus terbentuk). |
| APK tidak bisa dipasang ("aplikasi tidak terpasang") | Hapus versi lama yang beda tanda tangan, atau gunakan APK dengan tanda tangan yang sama. |
