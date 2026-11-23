// 측우기 — 순수 함수 (DOM·three 의존 금지, node에서 테스트)
// 단위: mm. 근거는 각 상수 옆에 적음. 「가정」= 자료가 없어 사진 비율 등으로 정한 값.

// ---------- 치수 ----------
// 측우기: 공주 충청감영 측우기(1837, 국보) — 높이 32cm, 바깥지름 15cm, 안지름 14cm, 상·중·하 3단 분리 (한국민족문화대백과)
// 세종 24년(1442) 규격: 높이 1척 5촌, 지름 7촌 (주척)
export const GAUGE = { h: 320, rOut: 75, rIn: 70, parts: 3, ring: 6 };
// 측우대: 창덕궁 측우대(정조 6년 1782, 대리석, 국립고궁박물관) — 높이 30.3cm, 가로 45.3cm, 세로 45.5cm
//   윗면 홈은 치수 자료가 없어 대구 경상감영 측우대 값(지름 16cm·깊이 4.3cm)을 빌림(가정).
export const STAND = { w: 453, d: 455, h: 303, holeR: 80, holeD: 43 };
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
  { key: 'rain', dur: 8, cap: '비가 내린다 — 측우기 입구로 들어온 빗물이 그대로 고인다', easy: '비가 내려요. 빗물이 측우기 안에 그대로 고여요.' },
  { key: 'stop', dur: 2, cap: '비가 그쳤다(또는 정해진 시각) — 관상감 관원이 측우기로 간다', easy: '비가 그쳤어요. 관원이 측우기로 가요.' },
  { key: 'ruler', dur: 4, cap: '주척(자)을 측우기 안에 똑바로 세워 넣는다', easy: '자(주척)를 똑바로 세워 넣어요.' },
  { key: 'read', dur: 4, cap: '자를 꺼내 젖은 자국까지의 깊이를 척·촌·푼으로 읽는다', easy: '자를 꺼내서 젖은 곳까지의 깊이를 읽어요.' },
  { key: 'record', dur: 4, cap: '「雨水 深 ○寸○分」으로 적어 보고한다 — 승정원일기·일성록에 남음', easy: '읽은 값을 「雨水 深 ○寸○分」으로 적어요.' },
  { key: 'empty', dur: 3, cap: '물을 비우고 다음 비를 기다린다', easy: '물을 비우고 다음 비를 기다려요.' },
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
  { key: 'site', t: '1. 자리 고르기', d: '건물·나무·담에서 떨어진 트인 마당을 고른다. 처마나 나뭇가지에서 떨어지는 물, 바람에 꺾이는 비를 피하기 위해서다. 서울은 관상감(지금의 서울 종로구 원서동 일대)과 창덕궁·경희궁 마당에 두었다.',
    easy: '건물과 나무에서 떨어진, 하늘이 트인 마당에 놓아요. 지붕이나 나뭇가지에서 떨어지는 물이 섞이면 안 되거든요.', rec: ['서울의 설치 장소: 관상감(종로구 원서동 일대)·창덕궁·경희궁 마당'], est: ['처마·나뭇가지 물과 바람을 피하려는 까닭'] },
  { key: 'base', t: '2. 바닥 다지기', d: '땅을 고르고 다져 박석(얇은 돌)을 깐다. 측우대가 기울면 측우기도 기울어 입구로 들어오는 비의 양이 달라진다.',
    easy: '땅을 평평하게 다지고 납작한 돌을 깔아요. 바닥이 기울면 측우기도 기울어요.', est: ['측우대가 기울면 측우기도 기운다는 설명'] },
  { key: 'stand', t: '3. 측우대 놓기', d: '대리석으로 만든 측우대를 놓고 수평을 맞춘다. 높이(창덕궁 측우대는 30.3cm)를 두는 까닭은 땅에서 튀어 오르는 빗물이 들어가지 않게 하고, 높이를 늘 같게 하기 위해서다.',
    easy: '돌로 만든 받침대(측우대)를 수평으로 놓아요. 땅에서 튀는 물이 들어가지 않고, 늘 같은 높이에서 잴 수 있어요.', rec: ['창덕궁 측우대(1782) 높이 30.3cm, 대리석'], est: ['높이를 두는 까닭(튀는 물 방지, 같은 높이)'] },
  { key: 'hole', t: '4. 윗면 홈', d: '윗면 가운데에 홈을 판다(대구 측우대는 지름 16cm, 깊이 4.3cm). 측우기 밑동이 꼭 끼어 바람에 넘어지거나 기울지 않는다.',
    easy: '받침대 윗면에 동그란 홈을 파요. 측우기 아래쪽이 꼭 끼어서 바람에도 쓰러지지 않아요.', est: ['밑동이 끼어 넘어지지 않게 한다는 설명'], asm: ['홈 지름 16cm·깊이 4.3cm(대구 측우대 값 빌림)'] },
  { key: 'g1', t: '5. 하단 넣기', d: '측우기는 위·가운데·아래 세 마디로 나뉜다. 먼저 바닥이 막힌 하단을 홈에 끼운다.',
    easy: '측우기는 세 마디예요. 먼저 바닥이 막힌 맨 아래 마디를 홈에 끼워요.', rec: ['상·중·하 3단 분리'], asm: ['마디 띠 두께·폭(사진 비율)'] },
  { key: 'g2', t: '6. 중단 잇기', d: '가운데 마디를 맞물려 올린다. 마디를 나눈 까닭은 물을 쏟거나 씻기 쉽고, 비가 적을 때 하단만 꺼내 자를 넣기 좋게 하려는 것으로 본다.',
    easy: '가운데 마디를 맞물려 올려요. 마디가 나뉘어 있으면 물을 비우고 씻기 쉬웠을 것으로 보여요.', est: ['마디를 나눈 까닭(「~로 본다」)'] },
  { key: 'g3', t: '7. 상단 잇기', d: '맨 위 마디를 올리면 높이 32cm, 안지름 14cm의 원통이 완성된다(세종 대 규격 1척 5촌 × 7촌과 거의 같음). 가운데 마디에는 「錦營 測雨器 高一尺五寸 徑七寸 道光丁酉製 重十一斤」(충청감영 측우기, 높이 1척 5촌, 지름 7촌, 1837년 만듦, 무게 11근)이 새겨져 있다. 마디 이음매의 띠는 이음을 단단히 하고 둥근 모양을 지킨다.',
    easy: '맨 위 마디까지 올리면 높이 32cm 통이 돼요. 세종 때 정한 크기(1척 5촌, 지름 7촌)와 거의 같아요.', rec: ['높이 32cm, 안지름 14cm(공주 충청감영 측우기, 1837)', '세종 24년(1442) 규격 1척 5촌 × 지름 7촌', '명문 6줄'], asm: ['마디 이음매 띠의 두께·폭'] },
  { key: 'ruler', t: '8. 주척 준비', d: '깊이를 잴 주척(1척 = 약 20cm, 1촌 = 2cm, 1푼 = 2mm)을 곁에 둔다. 이제 비가 오면 잴 준비가 끝났다.',
    easy: '깊이를 잴 자(주척)를 옆에 둬요. 1척은 약 20cm, 1촌은 2cm, 1푼은 2mm예요.', rec: ['주척 1척 200mm = 1촌 20mm = 1푼 2mm(Lee 외 2024)'] },
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
export const ERAS = { joseon: [1778, 1906], mid: [1908, 1990], modern: [1991, 2020] };

export const ERA_KEYS = ['joseon', 'mid', 'modern'];
// 해 → 시대(그래프 색·비교용). 1907년(이음 해)은 조선 색, 2021–2026은 현재 색
export const eraKeyOf = y => (y <= 1907 ? 'joseon' : y <= 1990 ? 'mid' : 'modern');

// ================= v2: 주척 읽기 도전 · 별 · 퀴즈 · 배지 · 질문 카드 =================
// 출제: 비는 2mm 간격 짝수(측정 슬라이더와 같음), 구간마다 하나씩 → 셋째 문제에서 「1척」을 읽게 된다 (v2 신규)
export const MISSION_BANDS = [[2, 60], [62, 198], [200, 300]];
export function drawMission(rng = Math.random) {
  return MISSION_BANDS.map(([a, b]) => {
    const n = (b - a) / 2 + 1, rainMm = a + 2 * Math.min(n - 1, Math.floor(rng() * n));
    return { rainMm, truePun: toChukPun(rainMm).pun };
  });
}
// 판정: ±1푼(±2mm)이면 성공, 0푼 차이면 「정확」
export function judgeReading(truePun, ansPun) {
  const diff = Math.abs(ansPun - truePun);
  return { ok: diff <= 1, exact: diff === 0, diff };
}
export const readingPun = (cheok, chon, pun) => cheok * 100 + chon * 10 + pun;
// 미션 별: 성공 2개 이상 ★, 3개 모두 성공 ★★, 3개 모두 정확 ★★★
export function missionStars(results) {
  const ok = results.filter(r => r.ok).length, exact = results.filter(r => r.exact).length;
  return ok === 3 && exact === 3 ? 3 : ok === 3 ? 2 : ok >= 2 ? 1 : 0;
}
// 퀴즈 별: 8문항 중 4개 이상 ★, 6개 이상 ★★, 8개 ★★★
export const quizStars = (correct, total = 8) => (correct >= total ? 3 : correct >= total * .75 ? 2 : correct >= total * .5 ? 1 : 0);

// 퀴즈 8문항 (v1 문항·보기·풀이 그대로) — [질문, 보기, 정답 번호, 풀이, 메뉴]
export const QUIZ = [
  ['측우기로 잰 값은 무엇인가?', ['빗물의 무게', '고인 빗물의 깊이', '빗방울의 수', '비가 내린 시간'], 1, '주척을 넣어 고인 물의 깊이를 척·촌·푼으로 읽었습니다.', 'measure'],
  ['측우기 지름을 두 배로 키우면 같은 비에 물 깊이는?', ['두 배', '네 배', '같다', '절반'], 2, '받는 물의 부피도 넓이에 비례해 늘어나므로 깊이는 같습니다.', 'measure'],
  ['측우대를 땅보다 높게 둔 까닭으로 가장 알맞은 것은?', ['보기 좋게 하려고', '땅에서 튀는 물이 들어가지 않게', '물을 빨리 증발시키려고', '도둑을 막으려고'], 1, '튀어 오르는 빗물과 흙탕물을 막고, 늘 같은 높이에서 재기 위해서입니다.', 'install'],
  ['기록 「雨水 深 二寸三分」은 몇 mm인가? (1푼 = 2mm)', ['23mm', '46mm', '230mm', '4.6mm'], 1, '2촌 3푼 = 23푼 = 46mm.', 'measure'],
  ['서울에서 평균적으로 비가 가장 많은 달은?', ['6월', '7월', '8월', '9월'], 1, '조선 시대와 지금 모두 7월이 가장 많습니다(장마).', 'data'],
  ['1778–1906년 서울 연평균 강수량에 가장 가까운 값은?', ['약 800mm', '약 1,200mm', '약 1,800mm', '약 2,400mm'], 1, 'Lee 외(2024) 복원값 평균 약 1,200mm, 현재 평년(1991–2020)은 약 1,418mm.', 'data'],
  ['조선 측우기 기록이 겨울 강수량을 작게 보이게 만든 까닭은?', ['겨울에는 관상감이 쉬어서', '눈을 녹여 재지 않아서', '측우기가 얼어 깨져서', '겨울에는 비가 오지 않아서'], 1, '눈은 날씨 기록만 남기고 양은 재지 않았습니다.', 'data'],
  ['측우기 기록이 강수량 연구에서 특별한 까닭은?', ['세계에서 가장 큰 측우기여서', '같은 곳에서 오랫동안 매일 잰 정량 기록이어서', '눈까지 정확히 재서', '자동으로 기록돼서'], 1, '1778년부터 130년 동안 서울에서 매일 잰 값이 승정원일기·일성록에 남아 있습니다.', 'data'],
];

export const BADGES = [
  { id: 'groundwork', ico: '🧱', name: '터 닦은 이', how: '설치 8단계를 끝까지 보기' },
  { id: 'firstRain', ico: '💧', name: '첫 빗물', how: '측정 장면을 처음부터 끝까지 한 번 보기' },
  { id: 'readRuler1', ico: '📏', name: '눈금 읽기', how: '주척 읽기에서 1문제 성공' },
  { id: 'exactReader', ico: '🎯', name: '정확한 관원', how: '주척 읽기 3문제 모두 정확(0푼 차이)' },
  { id: 'sameDepth', ico: '🥛', name: '깊이는 같다', how: '「넓이가 다른 그릇과 비교」를 켜고 장면을 한 번 재생' },
  { id: 'timeTravel', ico: '⏳', name: '시간 여행자', how: '조선·근대·현재 시대의 해를 하나씩 골라 보기' },
  { id: 'quizMaster', ico: '🎓', name: '측우 박사', how: '퀴즈 별 3개(8문항 모두 정답)' },
];

// 강수량 자료 질문 카드 4장 + 더 알아보기 묶음
export const CARDS = [
  { id: 'q1', q: '비가 가장 많이 오는 달은?', chart: 'month' },
  { id: 'q2', q: '해마다 비의 양은 같을까?', chart: 'annual' },
  { id: 'q3', q: '옛날과 지금, 비의 양이 달라졌을까?', chart: 'era' },
  { id: 'q4', q: '내가 고른 해는 어땠을까?', chart: 'year' },
];
export const MORE = [
  { id: 'wettest', name: '해마다 「가장 비가 많은 달」' },
  { id: 'heat', name: '249년 × 12달 열지도' },
  { id: 'stats', name: '세 시대 통계 전체 표' },
  { id: 'table', name: '표로 보기 — 해마다 월 강수량' },
  { id: 'src', name: '치수와 자료의 출처' },
];
