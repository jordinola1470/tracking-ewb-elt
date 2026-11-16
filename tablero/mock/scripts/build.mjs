// Ensambla index.html (archivo único y autónomo) a partir de src/, data/ y vendor/.
// Uso: npm run build
import { readFileSync, writeFileSync } from 'node:fs';
const r = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const datos = JSON.stringify({ docentes: JSON.parse(r('data/mock_docentes.json')) });
const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mock · Tablero formación docente en inglés</title>
<style>${r('src/tokens.css')}</style>
<script>${r('vendor/d3.min.js')}</script>
<script>window.__DASH_DATA__ = ${datos};</script>
<script>${r('src/dash-shim.js')}</script>
</head>
<body>
<div id="dash-root" lang="es">
${r('src/dashboard.html')}
</div>
</body>
</html>
`;
writeFileSync(new URL('../index.html', import.meta.url), html);
console.log('index.html generado (' + (html.length / 1024).toFixed(0) + ' KB)');
