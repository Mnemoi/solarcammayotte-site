// Fusionne le build Vite en un seul fichier HTML autonome (ouvrable par double-clic).
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const out = new URL('../standalone/coach-muscu.html', import.meta.url).pathname;
let html = readFileSync(join(dist, 'index.html'), 'utf8');

const read = (href) => readFileSync(join(dist, href.replace(/^\.?\//, '')), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_, href) => `<style>${read(href)}</style>`);
html = html.replace(/<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g, (_, src) => {
  const code = read(src).replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${code}</script>`;
});
const icon = readFileSync(join(dist, 'icon.svg'), 'utf8');
html = html.replace(/<link rel="icon"[^>]*>/, `<link rel="icon" href="data:image/svg+xml;base64,${Buffer.from(icon).toString('base64')}" />`);
html = html.replace(/<link rel="manifest"[^>]*>\s*/, '');

if (/src="\.?\/assets|href="\.?\/assets/.test(html)) throw new Error('Des ressources externes subsistent dans le HTML.');
writeFileSync(out, html);
console.log(`OK : ${out} (${(html.length / 1024).toFixed(0)} Ko)`);
