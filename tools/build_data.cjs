// 원자료 → src/data.js (월별 강수량 mm)
// 1778-01 ~ 1907-09 : Lee et al. 2024 (Scientific Data 11:566) daily_data 의 rrn(복원 강수량, mm)을 달마다 합산
// 1907-10 ~        : 기상청 서울(108) 일 강수량. 빈칸 = 비 없음(0), 행 자체가 없는 날 = 결측
// 겹치는 1907-10~12는 기상청 자료를 씀(근대 우량계로 바뀐 때).
const fs = require('fs'), path = require('path');
const { sheet } = require('./xlsx_read.cjs');
const root = path.join(__dirname, '..');
const tmp = path.join(require('os').tmpdir(), 'chukugi_xlsx');
require('child_process').execFileSync(process.platform === 'win32' ? 'C:/Windows/System32/tar.exe' : 'unzip', ['-xf', path.join(root, 'data/Seoul_precipitation_1778-1907_Lee_etal_2024.xlsx'), '-C', (fs.mkdirSync(tmp, { recursive: true }), tmp)]);

const M = {}; // 'YYYY' -> [12] (null = 결측)
const put = (y, m, v) => { (M[y] ||= Array(12).fill(0)); if (M[y][m - 1] !== null) M[y][m - 1] += v; };
const daily = sheet(1, tmp).slice(1);
let rainDaysJ = {};
for (const r of daily) {
  const y = +r.A, m = +r.B; if (y === 1907 && m >= 10) continue;
  const v = +r.I || 0; put(y, m, v);
}
const csv = fs.readFileSync(path.join(root, 'data/kma_seoul108_daily_utf8.csv'), 'utf8').split(/\r?\n/).filter(l => /^\d{4}-/.test(l));
const have = new Set();
for (const l of csv) {
  const [d, , v] = l.split(','); const y = +d.slice(0, 4), m = +d.slice(5, 7);
  if (y === 1907 && m < 10) continue;
  have.add(d); put(y, m, v ? +v : 0);
}
// 결측 달: 하루라도 행이 없으면 그 달은 null
const LAST = '2026-11-07';
for (let t = new Date('1907-10-01T00:00Z'); t.toISOString().slice(0, 10) <= LAST; t.setUTCDate(t.getUTCDate() + 1)) {
  const s = t.toISOString().slice(0, 10); if (!have.has(s)) { const y = +s.slice(0, 4), m = +s.slice(5, 7); (M[y] ||= Array(12).fill(0))[m - 1] = null; }
}
// 2026: 11월 이후는 아직 없음
M[2026][10] = null; M[2026][11] = null;
const years = Object.keys(M).map(Number).sort((a, b) => a - b);
const out = years.map(y => [y, ...M[y].map(v => v === null ? null : Math.round(v * 10) / 10)]);
const js = `// 자동 생성: tools/build_data.cjs — 손으로 고치지 말 것\n// [연도, 1월…12월] mm, null = 결측(1950~52 전쟁, 2026년 11~12월)\n// 1778-01~1907-09: Lee, Shin & Hong (2024) Sci Data 11:566 · 1907-10~2026-10: 기상청 서울(108)\nexport const SEAM = 1907.75;\nexport const ROWS = ${JSON.stringify(out)};\n`;
fs.writeFileSync(path.join(root, 'src/data.js'), js);
console.log('years', years[0], years.at(-1), out.length, 'bytes', js.length);
