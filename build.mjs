// src/template.html + src/kit/kit.css + src/app.js(묶음) → index.html 한 파일 (인터넷 없이도 열림)
import * as esbuild from 'esbuild'; import fs from 'fs';
const r = await esbuild.build({ entryPoints: ['src/app.js'], bundle: true, minify: true, format: 'iife', write: false, target: 'es2020', legalComments: 'none' });
const js = r.outputFiles[0].text.replace(/<\/script/g, '<\/script');
const css = fs.readFileSync('src/kit/kit.css', 'utf8');
const html = fs.readFileSync('src/template.html', 'utf8').replace('%%CSS%%', () => css).replace('%%SCRIPT%%', () => js);
fs.writeFileSync('index.html', html);
console.log('index.html', (html.length / 1024).toFixed(0) + 'KB');
