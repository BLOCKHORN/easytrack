// scripts/prepare-tesseract-assets.cjs
// Copia los binarios del worker/wasm desde node_modules a /public/tesseract
// y descarga los idiomas (eng, spa) a /public/tesseract/lang/.
// Ejecuta:  npm run prepare:tess

const fs = require('fs');
const path = require('path');
const https = require('https');

const ROOT = process.cwd();
const SRC_DIST = path.join(ROOT, 'node_modules', 'tesseract.js', 'dist');
const PUB = path.join(ROOT, 'public', 'tesseract');
const LANG = path.join(PUB, 'lang');

function ensureDir(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }

function cp(from, to) {
  fs.copyFileSync(from, to);
  console.log('✔ Copiado', path.basename(from), '→', path.relative(ROOT, to));
}

function dl(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} ${url}`)); return; }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', reject);
  });
}

(async () => {
  ensureDir(PUB);
  ensureDir(LANG);

  // 1) Copiamos worker/core/umd locales desde node_modules
  const files = [
    'tesseract.min.js',
    'worker.min.js',
    'tesseract-core.wasm.js',
    // el .wasm tiene nombre ligeramente distinto según versión; copiamos todos los posibles si existen:
    'tesseract-core.wasm.wasm',
    'tesseract-core-simd.wasm.wasm',
    'tesseract-core-simd.wasm.js', // por si tu paquete lo trae
  ].filter(f => fs.existsSync(path.join(SRC_DIST, f)));

  if (!files.length) {
    console.error('✖ No se encontró tesseract.js en node_modules. Ejecuta: npm i tesseract.js');
    process.exit(1);
  }

  for (const f of files) {
    cp(path.join(SRC_DIST, f), path.join(PUB, f));
  }

  // 2) Descargamos datos de idioma (FAST) a /public/tesseract/lang/
  const base = 'https://tessdata.projectnaptha.com/4.0.0_fast';
  const langs = ['eng', 'spa'];
  for (const code of langs) {
    const url = `${base}/${code}.traineddata.gz`;
    const dest = path.join(LANG, `${code}.traineddata.gz`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 10_000) {
      console.log('• Ya existe', path.relative(ROOT, dest));
      continue;
    }
    console.log('↓ Descargando', url);
    await dl(url, dest);
    console.log('✔ Guardado', path.relative(ROOT, dest));
  }

  console.log('\n✅ Tesseract listo en /public/tesseract');
})().catch(err => {
  console.error('✖ Error preparando assets:', err.message);
  process.exit(1);
});
