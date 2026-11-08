import * as esbuild from 'esbuild'; import fs from 'fs';
// 자료가 없으면 먼저 만든다 (npm run data)
const r = await esbuild.build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\/script');
const f = fs.readFileSync('src/template.html', 'utf8').replace('%%SCRIPT%%', () => js);
fs.writeFileSync('index.html', '<!doctype html>\n<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n' + f.replace('<header>', '</head><body>\n<header>') + '\n</body></html>');
console.log('index.html', js.length);
