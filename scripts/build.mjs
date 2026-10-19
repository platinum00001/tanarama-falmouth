// Copies the site to dist/ and swaps original text (content/baseline.json) for CMS-edited text (content/*.json).
import fs from 'node:fs'; import path from 'node:path';
const root = process.cwd(), out = path.join(root, 'dist');
const skip = new Set(['dist', 'admin', 'content', 'scripts', '.git', 'node_modules']);
const baseline = JSON.parse(fs.readFileSync('content/baseline.json', 'utf8')); delete baseline._note;
const current = {};
for (const f of fs.readdirSync('content')) if (f.endsWith('.json') && f !== 'baseline.json') Object.assign(current, JSON.parse(fs.readFileSync(path.join('content', f), 'utf8')));
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const jsEsc = s => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
const swap = (txt, from, to) => from === to ? txt : txt.split(from).join(to);
fs.rmSync(out, { recursive: true, force: true });
function copy(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    if (src === root && (skip.has(e.name) || e.name.startsWith('.'))) continue;
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { copy(s, d); continue; }
    if (/\.(html|js|webmanifest)$/.test(e.name)) {
      let t = fs.readFileSync(s, 'utf8'); const isJs = e.name.endsWith('.js');
      for (const k of Object.keys(baseline)) {
        const from = baseline[k], to = current[k] ?? from;
        if (k === 'street') { t = t.replace(/365 Main St(?!reet)/g, isJs ? jsEsc(to) : esc(to)); continue; }
        if (k === 'phone_link') { t = swap(t, 'tel:' + from, 'tel:' + to); continue; }
        t = isJs ? swap(t, jsEsc(from), jsEsc(to)) : swap(swap(t, esc(from), esc(to)), from, esc(to));
      }
      fs.writeFileSync(d, t);
    } else fs.copyFileSync(s, d);
  }
}
copy(root, out);
// Decap admin is served from /admin
fs.cpSync('admin', path.join(out, 'admin'), { recursive: true });
console.log('built dist/');
