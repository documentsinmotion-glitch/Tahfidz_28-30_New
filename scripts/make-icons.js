/* Membuat ikon & splash (oktagram Rub al-Hizb) -> folder assets/. Jalankan: node scripts/make-icons.js (butuh playwright-core + Chromium) */
const fs = require('fs'), path = require('path');
const { chromium } = require(process.env.PW_CORE || 'playwright-core');
const root = path.resolve(__dirname, '..');
const font = 'file://' + path.join(root, 'www/assets/fonts/amiri-quran-arabic-400-normal.woff2');

function mark(size, { r = 230, cx = 512, cy = 512, text = true } = {}) {
  const k = r * Math.SQRT2;
  const sq1 = `M${cx - r} ${cy - r}H${cx + r}V${cy + r}H${cx - r}Z`;
  const sq2 = `M${cx} ${cy - k}L${cx + k} ${cy}L${cx} ${cy + k}L${cx - k} ${cy}Z`;
  return `
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#F3DB86"/><stop offset=".55" stop-color="#D4AF37"/><stop offset="1" stop-color="#B8932A"/></linearGradient></defs>
  <g fill="rgba(212,175,55,.10)" stroke="url(#g)" stroke-width="16" stroke-linejoin="round"><path d="${sq1}"/><path d="${sq2}"/></g>
  <circle cx="${cx}" cy="${cy}" r="${r * 0.62}" fill="#064E3B" stroke="url(#g)" stroke-width="10"/>
  ${text ? `<text x="${cx}" y="${cy + r * 0.17}" text-anchor="middle" font-family="AmiriQ" font-size="${r * 0.5}" fill="url(#g)">حفظ</text>` : ''}`;
}
const page = (body, bg) => `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:AmiriQ;src:url(${font})}
html,body{margin:0;background:${bg}}svg{display:block}</style>${body}`;

(async () => {
  const out = path.join(root, 'assets'); fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch({ executablePath: process.env.CHROME || undefined });
  const shot = async (html, file, size, transparent) => {
    const p = await b.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, file), omitBackground: !!transparent }); await p.close();
  };
  const bgGrad = `<defs><radialGradient id="b" cx=".5" cy=".35" r=".9"><stop offset="0" stop-color="#047857"/><stop offset=".6" stop-color="#064E3B"/><stop offset="1" stop-color="#022C22"/></radialGradient></defs><rect width="1024" height="1024" fill="url(#b)"/>`;
  await shot(page(`<svg width="1024" height="1024" viewBox="0 0 1024 1024">${bgGrad}${mark(1024, { r: 250 })}</svg>`, '#064E3B'), 'icon-only.png', 1024);
  await shot(page(`<svg width="1024" height="1024" viewBox="0 0 1024 1024">${mark(1024, { r: 215 })}</svg>`, 'transparent'), 'icon-foreground.png', 1024, true);
  await shot(page(`<svg width="1024" height="1024" viewBox="0 0 1024 1024">${bgGrad}</svg>`, '#064E3B'), 'icon-background.png', 1024);
  const splash = `<svg width="2732" height="2732" viewBox="0 0 2732 2732"><rect width="2732" height="2732" fill="#022C22"/><g transform="translate(854 854) scale(1)">${mark(1024, { r: 250 })}</g></svg>`;
  await shot(page(splash, '#022C22'), 'splash.png', 2732);
  await shot(page(splash, '#022C22'), 'splash-dark.png', 2732);
  await b.close(); console.log('ikon & splash dibuat di', out);
})();
