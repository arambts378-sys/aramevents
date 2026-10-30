// Copies the in-browser OCR worker and engine into public/tesseract so flyers are read on the
// site's own origin; the Content-Security-Policy does not allow scripts from a CDN.
// Runs before `dev` and `build` (see package.json), so the copies never go stale.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'public', 'tesseract');
const files = [
  ['node_modules/tesseract.js/dist/worker.min.js', 'worker.min.js'],
  ['node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js', 'tesseract-core-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-simd-lstm.wasm.js', 'tesseract-core-simd-lstm.wasm.js'],
  ['node_modules/tesseract.js-core/tesseract-core-relaxedsimd-lstm.wasm.js', 'tesseract-core-relaxedsimd-lstm.wasm.js'],
];

fs.mkdirSync(out, { recursive: true });
for (const [from, to] of files) {
  fs.copyFileSync(path.join(root, from), path.join(out, to));
}
console.log(`[copy-tesseract] ${files.length} files copied to public/tesseract`);
