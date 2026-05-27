import { defineConfig } from 'vite';

// mathjax is copied into public/mathjax/ by scripts/copy-mathjax.mjs
// (run automatically via the "prepare" npm script before dev/build).
// Vite serves public/ as static files with no extra config needed.
export default defineConfig({});