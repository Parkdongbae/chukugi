// 측우기 — 순수 함수 (DOM·three 의존 금지, node에서 테스트)
// 단위: mm. 근거는 각 상수 옆에 적음. 「가정」= 자료가 없어 사진 비율 등으로 정한 값.

// ---------- 치수 ----------
// 측우기: 공주 충청감영 측우기(1837, 국보) — 높이 32cm, 바깥지름 15cm, 안지름 14cm, 상·중·하 3단 분리 (한국민족문화대백과)
// 세종 24년(1442) 규격: 높이 1척 5촌, 지름 7촌 (주척)
export const GAUGE = { h: 320, rOut: 75, rIn: 70, parts: 3, ring: 6 };
// 측우대: 대구 경상감영 측우대(1770, 乾隆庚寅五月造, 보물) — 높이 46cm, 너비 37cm, 윗면 홈 지름 16cm·깊이 4.3cm
//   (한국민족문화대백과·매일신문). 너비는 사진에서 앞·옆이 같아 보여 정사각으로 둠(가정).
export const STAND = { w: 370, d: 370, h: 460, holeR: 80, holeD: 43 };
// 주척: Lee et al. 2024 — 1척 = 200mm, 1촌 = 1/10척, 1푼 = 1/10촌
export const CHEOK = 200;
export const CHON = CHEOK / 10;
export const PUN = CHON / 10;

// mm → 척·촌·푼 (기록 방식: 「雨水 深 一寸五分」)
const HAN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
export function toChukPun(mm) {
  const pun = Math.round(mm / PUN);            // 푼 단위까지 읽음(2mm)
  const cheok = Math.floor(pun / 100), chon = Math.floor((pun % 100) / 10), p = pun % 10;
  const ko = [cheok && cheok + '척', chon && chon + '촌', p && p + '푼'].filter(Boolean).join(' ') || '0푼';
  const hj = [cheok && HAN[cheok] + '尺', chon && HAN[chon] + '寸', p && HAN[p] + '分'].filter(Boolean).join('') || '無';
  return { pun, cheok, chon, p, ko, hj, mm: pun * PUN };
}

// 빗물 깊이는 그릇 넓이와 상관없다: 넓이 A로 받은 물의 부피 = 비의 깊이 × A → 깊이 = 비의 깊이
export function waterDepth(rainMm, rIn = GAUGE.rIn) {
  const area = Math.PI * rIn * rIn;              // mm²
  const vol = rainMm * area;                     // mm³
  return { area, vol, depth: vol / area, ml: vol / 1000, overflow: rainMm > GAUGE.h };
}

// 측정 장면: 비가 t초 동안 내려 total mm가 된다 → 물 높이, 주척 꽂기, 읽기
export const MEASURE = [
  { key: 'rain', dur: 8, cap: '비가 내린다 — 측우기 입구로 들어온 빗물이 그대로 고인다' },
  { key: 'stop', dur: 2, cap: '비가 그쳤다(또는 정해진 시각) — 관상감 관원이 측우기로 간다' },
  { key: 'ruler', dur: 4, cap: '주척(자)을 측우기 안에 똑바로 세워 넣는다' },
  { key: 'read', dur: 4, cap: '자를 꺼내 젖은 자국까지의 깊이를 척·촌·푼으로 읽는다' },
  { key: 'record', dur: 4, cap: '「雨水 深 ○寸○分」으로 적어 보고한다 — 승정원일기·일성록에 남음' },
  { key: 'empty', dur: 3, cap: '물을 비우고 다음 비를 기다린다' },
];
export const MEASURE_TOTAL = MEASURE.reduce((a, p) => a + p.dur, 0);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = u => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
export function measureAt(t, total) {
  let rest = clamp(t, 0, MEASURE_TOTAL), i = 0;
  for (; i < MEASURE.length - 1 && rest >= MEASURE[i].dur; i++) rest -= MEASURE[i].dur;
  const ph = MEASURE[i], e = smooth(rest / ph.dur);
  const water = Math.min(GAUGE.h, ph.key === 'rain' ? total * (rest / ph.dur) : ph.key === 'empty' ? total * (1 - e) : total);
  // 자 끝 높이(측우기 바닥 기준): 위에서 내려와 바닥에 닿았다가 다시 올라감
  let ruler = null;
  if (ph.key === 'ruler') ruler = GAUGE.h + 120 - (GAUGE.h + 120) * e;
  else if (ph.key === 'read') ruler = (GAUGE.h + 120) * e;
  else if (ph.key === 'record') ruler = GAUGE.h + 120;
  return { key: ph.key, index: i, cap: ph.cap, raining: ph.key === 'rain', water, ruler, wet: ['read', 'record'].includes(ph.key) ? total : ph.key === 'ruler' && e > .99 ? total : null, reading: toChukPun(total) };
}

// ---------- 설치 순서 ----------
export const INSTALL = [
  { key: 'site', t: '1. 자리 고르기', d: '건물·나무·담에서 떨어진 트인 마당을 고른다. 처마나 나뭇가지에서 떨어지는 물, 바람에 꺾이는 비를 피하기 위해서다. 서울은 관상감(지금의 서울 종로구 원서동 일대)과 창덕궁·경희궁 마당에 두었다.' },
  { key: 'base', t: '2. 바닥 다지기', d: '땅을 고르고 다져 박석(얇은 돌)을 깐다. 측우대가 기울면 측우기도 기울어 입구로 들어오는 비의 양이 달라진다.' },
  { key: 'stand', t: '3. 측우대 놓기', d: '돌로 만든 측우대를 놓고 수평을 맞춘다. 높이(이 측우대는 46cm)를 두는 까닭은 땅에서 튀어 오르는 빗물이 들어가지 않게 하고, 높이를 늘 같게 하기 위해서다.' },
  { key: 'hole', t: '4. 윗면 홈', d: '윗면 가운데에 지름 16cm, 깊이 4.3cm 홈을 판다. 측우기 밑동이 꼭 끼어 바람에 넘어지거나 기울지 않는다.' },
  { key: 'g1', t: '5. 하단 넣기', d: '측우기는 위·가운데·아래 세 마디로 나뉜다. 먼저 바닥이 막힌 하단을 홈에 끼운다.' },
  { key: 'g2', t: '6. 중단 잇기', d: '가운데 마디를 맞물려 올린다. 마디를 나눈 까닭은 물을 쏟거나 씻기 쉽고, 비가 적을 때 하단만 꺼내 자를 넣기 좋게 하려는 것으로 본다.' },
  { key: 'g3', t: '7. 상단 잇기', d: '맨 위 마디를 올리면 높이 32cm, 안지름 14cm의 원통이 완성된다(세종 대 규격 1척 5촌 × 7촌과 거의 같음). 마디 이음매의 띠는 이음을 단단히 하고 둥근 모양을 지킨다.' },
  { key: 'ruler', t: '8. 주척 준비', d: '깊이를 잴 주척(1척 = 약 20cm, 1촌 = 2cm, 1푼 = 2mm)을 곁에 둔다. 이제 비가 오면 잴 준비가 끝났다.' },
];

// ---------- 강수량 통계 ----------
export const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const sum = a => a.reduce((x, y) => x + y, 0);
export const yearRow = (rows, y) => rows.find(r => r[0] === y);
// 연 강수량: 12달이 다 있어야 계산(결측 달이 있으면 null)
export function annual(rows) {
  return rows.map(r => ({ y: r[0], v: r.slice(1).some(v => v === null) ? null : sum(r.slice(1)) }));
}
export function climatology(rows, y0, y1) {
  const R = rows.filter(r => r[0] >= y0 && r[0] <= y1);
  return Array.from({ length: 12 }, (_, m) => { const v = R.map(r => r[m + 1]).filter(v => v !== null); return v.length ? sum(v) / v.length : null; });
}
export function wettestMonth(row) {
  const v = row.slice(1); if (v.some(x => x === null)) return null;
  let k = 0; for (let i = 1; i < 12; i++) if (v[i] > v[k]) k = i; return k;
}
export function wettestCounts(rows, y0, y1) {
  const c = Array(12).fill(0);
  for (const r of rows) if (r[0] >= y0 && r[0] <= y1) { const k = wettestMonth(r); if (k !== null) c[k]++; }
  return c;
}
export function stats(series) {   // series: [{y,v}] (v null 제외)
  const s = series.filter(p => p.v !== null), n = s.length;
  const mean = sum(s.map(p => p.v)) / n;
  const sd = Math.sqrt(sum(s.map(p => (p.v - mean) ** 2)) / (n - 1));
  const my = sum(s.map(p => p.y)) / n;
  const slope = sum(s.map(p => (p.y - my) * (p.v - mean))) / sum(s.map(p => (p.y - my) ** 2));
  let mx = s[0], mn = s[0]; for (const p of s) { if (p.v > mx.v) mx = p; if (p.v < mn.v) mn = p; }
  return { n, mean, sd, cv: sd / mean, slope10: slope * 10, max: mx, min: mn };
}
export function movingAvg(series, w = 11) {
  const h = (w - 1) / 2;
  return series.map((p, i) => {
    const win = series.slice(Math.max(0, i - h), i + h + 1).filter(q => q.v !== null);
    return { y: p.y, v: win.length >= h + 1 ? sum(win.map(q => q.v)) / win.length : null };
  });
}
// 여름(6~8월) 비율
export function summerShare(row) { const v = row.slice(1); if (v.some(x => x === null)) return null; const t = sum(v); return t ? (v[5] + v[6] + v[7]) / t : null; }
export const ERAS = { joseon: [1778, 1906], modern: [1991, 2020] };
