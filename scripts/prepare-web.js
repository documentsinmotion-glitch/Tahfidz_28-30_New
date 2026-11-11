/* Menyiapkan folder www/ (isi aplikasi untuk APK) dari src/ — tanpa CDN, semuanya lokal/offline.
   Dijalankan otomatis oleh: npm run sync */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.resolve(__dirname, '..');
const www = path.join(root, 'www');
const nm = p => path.join(root, 'node_modules', p);
const rm = p => fs.rmSync(p, { recursive: true, force: true });
const mk = p => fs.mkdirSync(p, { recursive: true });

rm(www); ['css', 'js', 'fonts'].forEach(d => mk(path.join(www, 'assets', d)));

// 1) HTML + skrip
fs.copyFileSync(path.join(root, 'src/index.html'), path.join(www, 'index.html'));
fs.copyFileSync(path.join(root, 'src/native-bridge.js'), path.join(www, 'assets/js/native-bridge.js'));
fs.copyFileSync(nm('alpinejs/dist/cdn.min.js'), path.join(www, 'assets/js/alpine.min.js'));
fs.copyFileSync(nm('lucide/dist/umd/lucide.min.js'), path.join(www, 'assets/js/lucide.min.js'));

// 2) Tailwind -> CSS statis
const twOut = path.join(www, 'assets/css/tw.css');
cp.execFileSync(process.execPath, [nm('tailwindcss/lib/cli.js'), '-c', path.join(root, 'tailwind.config.js'), '-i', path.join(root, 'src/tailwind.css'), '-o', twOut, '--minify'], { stdio: 'inherit', cwd: root });

// 3) Font lokal (Plus Jakarta Sans, Amiri, Amiri Quran) dari paket @fontsource
const FONTS = [
  { pkg: 'plus-jakarta-sans', weights: [400, 500, 600, 700, 800], subsets: ['latin'] },
  { pkg: 'amiri', weights: [400, 700], subsets: ['arabic', 'latin'] },
  { pkg: 'amiri-quran', weights: [400], subsets: ['arabic', 'latin'] }
];
let fontCss = '';
for (const f of FONTS) {
  for (const w of f.weights) {
    const cssFile = nm(`@fontsource/${f.pkg}/${w}.css`);
    const blocks = fs.readFileSync(cssFile, 'utf8').split(/(?=\/\* [^*]+ \*\/)/);
    for (const b of blocks) {
      const name = (b.match(/^\/\* ([^*]+?) \*\//) || [])[1]; if (!name) continue;
      const sub = name.replace(new RegExp('^' + f.pkg + '-'), '').replace(/-\d+-normal$/, '');
      if (!f.subsets.includes(sub)) continue;
      const file = (b.match(/url\(\.\/files\/([^)]+?\.woff2)\)/) || [])[1]; if (!file) continue;
      fs.copyFileSync(nm(`@fontsource/${f.pkg}/files/${file}`), path.join(www, 'assets/fonts', file));
      fontCss += b.replace(/src:[^;]+;/, `src: url(../fonts/${file}) format('woff2');`).replace(/^\/\*[^]*?\*\/\s*/, '').trim() + '\n';
    }
  }
}
fs.writeFileSync(path.join(www, 'assets/css/app.css'), fontCss + fs.readFileSync(twOut, 'utf8'));
rm(twOut);

// 4) Ringkasan
const size = d => fs.readdirSync(d, { withFileTypes: true }).reduce((a, e) => a + (e.isDirectory() ? size(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0);
console.log(`www/ siap: ${(size(www) / 1024).toFixed(0)} KB, font: ${fs.readdirSync(path.join(www, 'assets/fonts')).length} berkas`);
