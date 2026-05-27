// scripts/copy-mathjax.mjs
// Copies the mathjax browser bundle into public/mathjax/ so Vite serves it
// as a plain static file — no middleware or CDN needed.

import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src  = path.resolve(__dirname, '../node_modules/mathjax');
const dest = path.resolve(__dirname, '../public/mathjax');

copyDirSync(src, dest);
console.log('[copy-mathjax] node_modules/mathjax → public/mathjax');

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src,  entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDirSync(s, d) : fs.copyFileSync(s, d);
  }
}