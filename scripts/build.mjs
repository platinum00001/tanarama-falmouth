// Builds dist/ from the static site copy.
//  1. Swaps original text (content/baseline.json) for CMS-edited text (content/*.json).
//  2. Swaps original photos (baseline "photo_*" keys) for CMS-uploaded photos (content/photos.json).
//  3. Optional BASE_PATH env var (e.g. "/tanarama-falmouth" for GitHub Pages project sites).
//     Default "" = site served from the domain root (Vercel, custom domain).
import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd(), out = path.join(root, 'dist');
const BASE = ('/' + (process.env.BASE_PATH || '').trim().replace(/^\/+|\/+$/g, '')).replace(/^\/$/, '');
const skip = new Set(['dist', 'admin', 'content', 'scripts', 'node_modules', 'README.md', 'vercel.json', 'netlify.toml']);
const baseline = JSON.parse(fs.readFileSync('content/baseline.json', 'utf8')); delete baseline._note;
const current = {};
for (const f of fs.readdirSync('content')) if (f.endsWith('.json') && f !== 'baseline.json') Object.assign(current, JSON.parse(fs.readFileSync(path.join('content', f), 'utf8')));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const jsEsc = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const swap = (txt, from, to) => from === to ? txt : txt.split(from).join(to);
const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- extra sections (pricing, private room, lotions) rendered from content/pricing.json + content/extras.json ----
// The page files hold a "__TANORAMA_EXTRAS__" marker (Home and Services pages); it is replaced with this HTML.
const imgSrc = v => { v = String(v || '').trim(); return /^https?:\/\//i.test(v) ? encodeURI(decodeURI(v)) : encodeURI(decodeURI('/' + v.replace(/^\/+/, ''))); };
function renderExtras(c) {
  const e = s => esc(String(s ?? ''));
  const eyebrow = s => `<p class="text-xs tracking-[0.22em] text-sea uppercase">${e(s)}</p>`;
  const groups = (c.pricing_groups || []).map(g => `<div class="rounded-xl bg-cream p-6 ring-1 ring-line"><h3 class="font-display text-2xl text-ink">${e(g.name)}</h3><ul class="mt-4 text-sm">${(g.items || []).map(i => `<li class="flex justify-between gap-4 border-b border-line py-2"><span class="text-ink">${e(i.label)}</span><span class="tabular-nums text-muted">${e(i.price)}</span></li>`).join('')}</ul>${g.note ? `<p class="mt-4 text-sm text-sea">${e(g.note)}</p>` : ''}</div>`).join('');
  const lot = (c.lotions_list || []).filter(Boolean).map(e);
  const lotText = lot.length ? `${e(c.lotions_intro || 'In-store lotions include')} ${lot.length > 1 ? lot.slice(0, -1).join(', ') + ', and ' + lot[lot.length - 1] : lot[0]}.` : '';
  const photo = (src, alt) => src ? `<img src="${imgSrc(src)}" alt="${e(alt)}" loading="lazy" decoding="async" width="1600" height="2133" class="w-full rounded-xl object-cover" style="aspect-ratio:4/5"/>` : '';
  return `<section id="pricing" class="bg-paper/60 py-20 scroll-mt-28"><div class="mx-auto max-w-6xl px-4 sm:px-6">${eyebrow('Pricing')}<h2 class="font-display mt-2 text-4xl text-ink">${e(c.pricing_title)}</h2>${c.pricing_intro ? `<p class="mt-4 max-w-2xl text-sm leading-relaxed text-muted">${e(c.pricing_intro)}</p>` : ''}<div class="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">${groups}</div>${c.pricing_note ? `<p class="mt-6 text-xs text-muted">${e(c.pricing_note)}</p>` : ''}</div></section>`
    + `<section id="private-room" class="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 scroll-mt-28">${photo(c.room_photo, c.room_photo_alt)}<div>${eyebrow(c.room_eyebrow)}<h2 class="font-display mt-3 text-4xl text-ink">${e(c.room_title)}</h2><p class="mt-5 leading-relaxed text-muted">${e(c.room_text)}</p></div></section>`
    + `<section id="lotions" class="bg-cream py-20 scroll-mt-28"><div class="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2"><div>${eyebrow(c.lotions_eyebrow)}<h2 class="font-display mt-3 text-4xl text-ink">${e(c.lotions_title)}</h2>${lotText ? `<p class="mt-5 leading-relaxed text-muted">${lotText}</p>` : ''}${c.lotions_note ? `<p class="mt-4 text-sm text-sea">${e(c.lotions_note)}</p>` : ''}</div>${photo(c.lotions_photo, c.lotions_photo_alt)}</div></section>`;
}
const extrasHtml = renderExtras(current);

// ---- photos: original path -> new path (all swapped in one pass so swaps never chain) ----
const normPhoto = v => {
  v = String(v || '').trim(); if (!v) return null;
  if (/^https?:\/\//i.test(v)) return encodeURI(decodeURI(v));
  return encodeURI(decodeURI('/' + v.replace(/^\/+/, '')));
};
const photoMap = {};
for (const k of Object.keys(baseline)) if (k.startsWith('photo_')) {
  const to = normPhoto(current[k]); if (to && to !== baseline[k]) photoMap[baseline[k]] = to;
}
const photoRe = Object.keys(photoMap).length ? new RegExp('(?<![\\w/.-])(' + Object.keys(photoMap).map(reEsc).join('|') + ')(?![\\w.-])', 'g') : null;
const swapPhotos = t => photoRe ? t.replace(photoRe, m => photoMap[m]) : t;

// ---- Cloudflare email obfuscation left over from the scrape: decode to plain mailto links ----
const cfDecode = hex => { const k = parseInt(hex.slice(0, 2), 16); let s = ''; for (let i = 2; i < hex.length; i += 2) s += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ k); return s; };
const fixCfEmail = t => t
  .replace(/<script[^>]*cdn-cgi\/scripts\/[^>]*email-decode[^>]*><\/script>/g, '')
  .replace(/<a href="\/cdn-cgi\/l\/email-protection" class="__cf_email__" data-cfemail="([0-9a-f]+)">\[email(?:&#160;|\u00a0| )protected\]<\/a>/g, (_, h) => cfDecode(h)) // plain-text email Cloudflare turned into a link
  .replace(/href="\/cdn-cgi\/l\/email-protection#([0-9a-f]+)"/g, (_, h) => `href="mailto:${cfDecode(h)}"`)
  .replace(/<span class="__cf_email__" data-cfemail="([0-9a-f]+)">\[email(?:&#160;|\u00a0| )protected\]<\/span>/g, (_, h) => cfDecode(h));

// ---- base path rewriting (no-op when BASE is "") ----
const ASSET = '((?:assets|images|__grok)/|og\\.jpg|favicon-32\\.png|apple-touch-icon\\.png)';
const assetRe = new RegExp('(["\'`])/' + ASSET, 'g');
function rebase(t, kind) {
  if (!BASE) return t;
  if (kind === 'html') t = t.replace(/(\s(?:href|src|action|poster)=")\/(?!\/)/g, `$1${BASE}/`);
  t = t.replace(assetRe, `$1${BASE}/$2`);                          // asset URLs in inline scripts / JS strings
  if (kind === 'js') {
    t = t.replace(/\.update\(\{basepath:``,/g, `.update({basepath:\`${BASE}\`,`);   // TanStack Router basepath
    t = t.replace(/function\(e\)\{return`\/`\+e\}/g, `function(e){return\`${BASE}/\`+e}`); // Vite preload base
    t = t.replace(/href:`\/`/g, `href:\`${BASE}/\``);                // plain <a href="/"> (not-found page)
  }
  if (kind === 'manifest') t = t.replace(/"(id|start_url|scope)":\s*"\/"/g, `"$1": "${BASE}/"`);
  return t;
}

fs.rmSync(out, { recursive: true, force: true });
function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (src === root && (skip.has(e.name) || e.name.startsWith('.'))) continue;
    if (e.name === '.gitkeep') continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { copy(s, d); continue; }
    if (/\.(html|js|webmanifest)$/.test(e.name)) {
      let t = fs.readFileSync(s, 'utf8'); const isJs = e.name.endsWith('.js');
      const kind = isJs ? 'js' : e.name.endsWith('.html') ? 'html' : 'manifest';
      if (kind === 'html') t = fixCfEmail(t);
      t = t.split('__TANORAMA_EXTRAS__').join(isJs ? jsEsc(extrasHtml) : extrasHtml);
      t = swapPhotos(t);
      for (const k of Object.keys(baseline)) {
        if (k.startsWith('photo_')) continue;
        const from = baseline[k], to = current[k] ?? from;
        if (k === 'street') { t = t.replace(/365 Main St(?!reet)/g, isJs ? jsEsc(to) : esc(to)); continue; }
        if (k === 'phone_link') { t = swap(t, 'tel:' + from, 'tel:' + to); continue; }
        t = isJs ? swap(t, jsEsc(from), jsEsc(to)) : swap(swap(t, esc(from), esc(to)), from, esc(to));
      }
      fs.writeFileSync(d, rebase(t, kind));
    } else fs.copyFileSync(s, d);
  }
}
copy(root, out);

// SPA fallback for unknown / old URLs: send aliases to the right page, everything else home.
const aliases = { 'about-us': 'about', contact: 'book', 'contact-book': 'book', visit: 'book', home: '' };
fs.writeFileSync(path.join(out, '404.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/><meta name="robots" content="noindex"/>
<title>Tanorama Falmouth</title><script>(function(){var b=${JSON.stringify(BASE)},a=${JSON.stringify(aliases)};
var p=location.pathname;if(b&&p.indexOf(b)===0)p=p.slice(b.length);p=p.replace(/^\\/+|\\/+$/g,'');
var t=Object.prototype.hasOwnProperty.call(a,p)?a[p]:'';location.replace(b+'/'+(t?t+'/':'')+location.hash);})();</script>
</head><body><p>Page not found. <a href="${BASE}/">Go to the Tanorama Falmouth home page</a>.</p></body></html>\n`);
fs.writeFileSync(path.join(out, '.nojekyll'), '');   // GitHub Pages: serve __grok/ and other _ folders as-is

// Decap admin is served from /admin
fs.cpSync('admin', path.join(out, 'admin'), { recursive: true });
console.log(`built dist/ (BASE_PATH="${BASE}", ${Object.keys(photoMap).length} photo swap(s))`);
