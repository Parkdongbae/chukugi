// 아주 작은 xlsx 읽개(압축 푼 폴더에서 sharedStrings + sheetN.xml 해석). 의존성 없음.
const fs = require('fs');
function sheet(n, d) {
  const ss = [...fs.readFileSync(d + '/xl/sharedStrings.xml', 'utf8').matchAll(/<si>(.*?)<\/si>/gs)].map(m => m[1].replace(/<[^>]+>/g, ''));
  const x = fs.readFileSync(d + '/xl/worksheets/sheet' + n + '.xml', 'utf8'), rows = [];
  for (const r of x.matchAll(/<row [^>]*>(.*?)<\/row>/gs)) {
    const row = {};
    for (const c of r[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>(.*?)<\/c>)/gs)) {
      const v = (c[3] || '').match(/<v>(.*?)<\/v>/); let val = v ? v[1] : '';
      if (/t="s"/.test(c[2])) val = ss[+val]; row[c[1]] = val;
    }
    rows.push(row);
  }
  return rows;
}
module.exports = { sheet };
