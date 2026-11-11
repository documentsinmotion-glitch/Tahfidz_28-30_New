/* Penyesuaian khusus pada proyek android/ (idempotent — aman dijalankan berulang kali, mis. setelah `cap sync`). */
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');

// 1) AndroidManifest: portrait + izin mikrofon (cadangan) + penjelasan fitur mikrofon opsional
const mf = path.join(root, 'android/app/src/main/AndroidManifest.xml');
let m = fs.readFileSync(mf, 'utf8');
if (!/screenOrientation/.test(m)) m = m.replace('android:launchMode="singleTask"', 'android:launchMode="singleTask"\n            android:screenOrientation="portrait"');
if (!/RECORD_AUDIO/.test(m)) m = m.replace('<uses-permission android:name="android.permission.INTERNET" />', '<uses-permission android:name="android.permission.INTERNET" />\n    <uses-permission android:name="android.permission.RECORD_AUDIO" />');
if (!/android.hardware.microphone/.test(m)) m = m.replace('</manifest>', '    <uses-feature android:name="android.hardware.microphone" android:required="false" />\n</manifest>');
if (!/android.speech.RecognitionService/.test(m)) m = m.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService" />\n        </intent>\n    </queries>\n</manifest>');
m = m.replace('android:allowBackup="true"', 'android:allowBackup="false"');
fs.writeFileSync(mf, m);

// 2) build.gradle: versi dari package.json + penandatanganan rilis (opsional, via variabel lingkungan)
const gf = path.join(root, 'android/app/build.gradle');
let g = fs.readFileSync(gf, 'utf8');
const pkg = require(path.join(root, 'package.json'));
const [ma, mi, pa] = String(pkg.version).split('.').map(n => parseInt(n, 10) || 0);
const code = ma * 10000 + mi * 100 + pa;
g = g.replace(/versionCode \d+/, 'versionCode ' + code).replace(/versionName "[^"]*"/, 'versionName "' + pkg.version + '"');
if (!/signingConfigs/.test(g)) {
  g = g.replace('    buildTypes {', `    signingConfigs {
        release {
            // Diisi otomatis oleh GitHub Actions bila secret keystore tersedia (lihat README).
            if (System.getenv("KEYSTORE_FILE")) {
                storeFile file(System.getenv("KEYSTORE_FILE"))
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
    buildTypes {`);
  g = g.replace("        release {\n            minifyEnabled false", `        release {
            if (System.getenv("KEYSTORE_FILE")) { signingConfig signingConfigs.release }
            minifyEnabled false`);
}
fs.writeFileSync(gf, g);

// 3) nama berkas keluaran APK
console.log('android/ dipatch: versi ' + pkg.version + ' (versionCode ' + code + ')');
