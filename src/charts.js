// 강수량 그래프 (SVG 직접 그림). 축은 하나만.
// 색(시대): --c1 조선 1778–1906 · --c3 근대 1908–1990 · --c2 현재 평년 1991–2020(2021– 도 같은 색)
import { MONTHS, annual, climatology, wettestCounts, wettestMonth, stats, movingAvg, summerShare, yearRow, ERAS } from './sim.js';
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const fmt = v => v === null ? '결측' : Math.round(v).toLocaleString('ko-KR') + 'mm';
const ERA_LIST = [
  { key: 'joseon', nm: '조선 1778–1906', col: 'var(--c1)' },
  { key: 'mid', nm: '근대 1908–1990', col: 'var(--c3)' },
  { key: 'modern', nm: '현재 평년 1991–2020', col: 'var(--c2)' },
];
export const eraOf = y => y <= 1907 ? ERA_LIST[0] : y <= 1990 ? ERA_LIST[1] : ERA_LIST[2];
export const SRC_J = '<a href="https://zenodo.org/records/11076768" target="_blank" rel="noopener">Lee, Shin &amp; Hong (2024), Zenodo doi:10.5281/zenodo.11076768</a>';
export const SRC_K = '<a href="https://data.kma.go.kr/cmmn/main.do" target="_blank" rel="noopener">기상청 기상자료개방포털, 서울(108) 일 강수량</a>';
const SRC = `출처: 1778–1907.9 ${SRC_J} · 1907.10–2026.11.7 ${SRC_K}`;

function card(host, title, sub, legend) {
  const c = document.createElement('section'); c.className = 'chart';
  c.innerHTML = `<h3>${title}</h3><div class="sub">${sub}</div>` + (legend ? `<div class="legend">${legend}</div>` : '');
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; c.appendChild(tip);
  host.appendChild(c);
  const show = (ev, html) => { tip.innerHTML = html; tip.hidden = false; const r = c.getBoundingClientRect(); let x = ev.clientX - r.left + 12; if (x > r.width - 190) x -= 210; tip.style.left = x + 'px'; tip.style.top = (ev.clientY - r.top - 10) + 'px'; };
  return { c, show, hide: () => (tip.hidden = true), foot: html => { const f = document.createElement('div'); f.className = 'src'; f.innerHTML = html; c.appendChild(f); } };
}
const LEG = ERA_LIST.map(e => `<span><i style="background:${e.col}"></i>${e.nm}${e.key === 'modern' ? ' (2021–2025 포함)' : ''}</span>`).join('');
const LEGSQ = ERA_LIST.map(e => `<span><i class="sq" style="background:${e.col}"></i>${e.nm}</span>`).join('');

function yAxis(svg, x0, x1, y, ticks, fmtT) {
  for (const t of ticks) { el('line', { x1: x0, x2: x1, y1: y(t), y2: y(t), stroke: 'var(--grid)', 'stroke-width': 1 }, svg); el('text', { x: x0 - 6, y: y(t) + 4, 'text-anchor': 'end' }, svg).textContent = fmtT(t); }
}
const bar = (svg, bx, top, bot, bw, col) => el('path', { d: `M${bx} ${bot}V${Math.min(bot - .5, top + 3)}q0 -3 3 -3h${bw - 6}q3 0 3 3V${bot}Z`, fill: col }, svg);

// 세 시대 묶음 막대 (월 평균, 1위 달 비율에 같이 씀)
function groupBars(k, values, { H, max, ticks, tickFmt, tipFmt, labelMonth }) {
  const W = 900, L = 46, R = 12, T = 14, B = 26;
  const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img' }, k.c);
  const y = v => H - B - v / max * (H - T - B), gw = (W - L - R) / 12, bw = gw * .26;
  yAxis(svg, L, W - R, y, ticks, tickFmt);
  MONTHS.forEach((mn, i) => {
    const gx = L + i * gw + gw / 2;
    el('text', { x: gx, y: H - 8, 'text-anchor': 'middle', class: i === labelMonth ? 'lab' : '' }, svg).textContent = mn;
    ERA_LIST.forEach((e, j) => {
      const v = values[j][i], bx = gx + (j - 1.5) * (bw + 2) + 1;
      if (v > 0) bar(svg, bx, y(v), H - B, bw, e.col);
      const hit = el('rect', { x: bx - 1, y: T, width: bw + 2, height: H - T - B, fill: 'transparent' }, svg);
      hit.addEventListener('pointermove', ev => k.show(ev, `<b>${mn}</b> · ${e.nm}<br>${tipFmt(j, i)}`));
      hit.addEventListener('pointerleave', k.hide);
      if (i === labelMonth) el('text', { x: bx + bw / 2, y: y(v) - 6, 'text-anchor': 'middle', class: 'lab' }, svg).textContent = tickFmt(Math.round(v));
    });
  });
  svg.setAttribute('aria-label', k.c.querySelector('h3').textContent);
}

export function buildCharts(host, ROWS, onPick) {
  host.innerHTML = '';
  const A = annual(ROWS).filter(p => p.y <= 2025);
  const MA = movingAvg(A, 11);
  const S = ERA_LIST.map(e => stats(A.filter(p => p.y >= ERAS[e.key][0] && p.y <= ERAS[e.key][1])));
  const C = ERA_LIST.map(e => climatology(ROWS, ...ERAS[e.key]));
  const api = { pick: () => {} };

  // ① 연 강수량 흐름
  {
    const k = card(host, '서울의 연 강수량, 1778–2025', `가는 선 = 해마다 값 · 굵은 선 = 11년 이동 평균 · 점선 = 시대 평균(조선 ${Math.round(S[0].mean)} · 근대 ${Math.round(S[1].mean)} · 현재 평년 ${Math.round(S[2].mean)}mm). 그래프를 누르면 그 해를 오른쪽에서 봅니다.`, LEG + '<span><i style="background:var(--fg)"></i>11년 이동 평균</span>');
    const W = 900, H = 300, L = 46, R = 12, T = 12, B = 26;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '연 강수량 꺾은선 그래프' }, k.c);
    const x = y => L + (y - 1778) / (2025 - 1778) * (W - L - R), y = v => H - B - v / 2800 * (H - T - B);
    yAxis(svg, L, W - R, y, [0, 500, 1000, 1500, 2000, 2500], t => t.toLocaleString());
    for (let yr = 1800; yr <= 2020; yr += 20) el('text', { x: x(yr), y: H - 8, 'text-anchor': 'middle' }, svg).textContent = yr;
    el('rect', { x: x(1950), y: T, width: x(1953) - x(1950), height: H - T - B, fill: 'var(--nul)', opacity: .7 }, svg);
    el('text', { x: x(1953) + 4, y: T + 28 }, svg).textContent = '6·25 전쟁 결측';
    el('line', { x1: x(1907.75), x2: x(1907.75), y1: T, y2: H - B, stroke: 'var(--fg)', 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg);
    el('text', { x: x(1907.75) + 4, y: T + 12 }, svg).textContent = '1907.10 근대 우량계로 바뀜';
    ERA_LIST.forEach((e, j) => el('line', { x1: x(ERAS[e.key][0]), x2: x(ERAS[e.key][1]), y1: y(S[j].mean), y2: y(S[j].mean), stroke: e.col, 'stroke-dasharray': '6 4', 'stroke-width': 2 }, svg));
    const path = (pts, attrs) => { let d = '', pen = false; for (const p of pts) { if (p.v === null) { pen = false; continue; } d += (pen ? 'L' : 'M') + x(p.y).toFixed(1) + ' ' + y(p.v).toFixed(1); pen = true; } el('path', { d, fill: 'none', 'stroke-linejoin': 'round', ...attrs }, svg); };
    path(A.filter(p => p.y <= 1907), { stroke: 'var(--c1)', 'stroke-width': 1.2, opacity: .8 });
    path(A.filter(p => p.y >= 1907 && p.y <= 1991), { stroke: 'var(--c3)', 'stroke-width': 1.2, opacity: .8 });
    path(A.filter(p => p.y >= 1990), { stroke: 'var(--c2)', 'stroke-width': 1.2, opacity: .8 });
    path(MA, { stroke: 'var(--fg)', 'stroke-width': 2.4 });
    const all = stats(A);
    for (const [p, t] of [[all.max, '최다'], [all.min, '최소']]) { el('circle', { cx: x(p.y), cy: y(p.v), r: 4, fill: eraOf(p.y).col, stroke: 'var(--pn)', 'stroke-width': 2 }, svg); el('text', { x: x(p.y) + 7, y: y(p.v) + (t === '최다' ? 4 : -4), class: 'lab' }, svg).textContent = `${p.y}년 ${t} ${fmt(p.v)}`; }
    const sel = el('line', { y1: T, y2: H - B, stroke: 'var(--ac)', 'stroke-width': 2 }, svg);
    const cross = el('line', { y1: T, y2: H - B, stroke: 'var(--mut)', 'stroke-width': 1, visibility: 'hidden' }, svg);
    const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent', style: 'cursor:crosshair' }, svg);
    const yearAt = ev => { const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * W; return Math.max(1778, Math.min(2025, Math.round(1778 + (px - L) / (W - L - R) * (2025 - 1778)))); };
    hit.addEventListener('pointermove', ev => { const yr = yearAt(ev), p = A.find(q => q.y === yr), m = MA.find(q => q.y === yr), wm = wettestMonth(yearRow(ROWS, yr));
      cross.setAttribute('x1', x(yr)); cross.setAttribute('x2', x(yr)); cross.setAttribute('visibility', 'visible');
      k.show(ev, `<b>${yr}년</b> ${fmt(p.v)}<br>11년 평균 ${m.v ? fmt(m.v) : '—'}<br>가장 많은 달 ${wm === null ? '—' : MONTHS[wm]}<br><span style="opacity:.75">${yr <= 1907 && !(yr === 1907) ? '승정원일기·일성록 복원' : yr === 1907 ? '1–9월 복원 + 10–12월 기상청' : '기상청 관측'}</span>`); });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); k.hide(); });
    hit.addEventListener('click', ev => onPick(yearAt(ev)));
    const prev = api.pick; api.pick = yr => { prev(yr); sel.setAttribute('x1', x(yr)); sel.setAttribute('x2', x(yr)); };
    k.foot(SRC + '. 이동 평균은 앞뒤 5년을 포함한 11년 평균(결측 해 제외).');
  }

  // ② 월별 평균 (세 시대)
  {
    const k = card(host, '어느 달에 비가 가장 많이 올까? — 월 평균 강수량', `세 시대 모두 <b>7월</b>이 가장 많고 8월이 뒤따릅니다(장마·여름 소나기). 7월 평균: 조선 ${Math.round(C[0][6])} → 근대 ${Math.round(C[1][6])} → 현재 ${Math.round(C[2][6])}mm. 겨울 값 차이에는 측우기가 눈을 재지 못한 영향도 섞여 있습니다.`, LEGSQ);
    groupBars(k, C, { H: 260, max: 450, ticks: [0, 100, 200, 300, 400], tickFmt: t => t, tipFmt: (j, i) => `평균 ${fmt(C[j][i])}`, labelMonth: 6 });
    k.foot(SRC + '. 시대별로 해마다 같은 달 값을 평균(결측 달 제외). 1907년은 두 자료가 섞여 시대 통계에서 뺌.');
  }

  // ③ 해마다 가장 비가 많은 달
  {
    const N = ERA_LIST.map(e => wettestCounts(ROWS, ...ERAS[e.key])), T = N.map(n => n.reduce((a, b) => a + b)), P = N.map((n, j) => n.map(v => v / T[j] * 100));
    const k = card(host, '해마다 「가장 비가 많은 달」은 언제였나?', `그 해 12달 중 비가 가장 많은 달을 세어 비율로 나타냄. 7월인 해: 조선 ${Math.round(P[0][6])}% · 근대 ${Math.round(P[1][6])}% · 현재 ${Math.round(P[2][6])}%, 8월인 해: ${Math.round(P[0][7])}% · ${Math.round(P[1][7])}% · ${Math.round(P[2][7])}%. 평균만 보면 7월이지만, 해에 따라 6·8·9월이 1위인 때도 많습니다.`, LEGSQ);
    groupBars(k, P, { H: 220, max: 70, ticks: [0, 20, 40, 60], tickFmt: t => t + '%', tipFmt: (j, i) => `${N[j][i]}해 / ${T[j]}해 (${P[j][i].toFixed(0)}%)`, labelMonth: 6 });
    k.foot(SRC + '. 12달이 모두 있는 해만 셈.');
  }

  // ④ 해 × 달 열지도
  {
    const k = card(host, '249년 × 12달 열지도', '진할수록 비가 많음(한 가지 색). 여름 띠가 해마다 굵기·위치를 바꾸는 모습을 볼 수 있습니다. 칸을 누르면 그 해를 봅니다.', '<span><i class="sq" style="background:#eef3f8;border:1px solid var(--bd)"></i>0</span><span><i class="sq" style="background:#6f9fca"></i>200mm</span><span><i class="sq" style="background:#163f6b"></i>500mm 이상</span><span><i class="sq" style="background:var(--nul)"></i>결측</span>');
    const yrs = ROWS.map(r => r[0]), W = 900, L = 34, R = 4, T = 4, B = 22, ch = 15, H = T + B + ch * 12;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '연도와 달별 강수량 열지도' }, k.c);
    const cw = (W - L - R) / yrs.length;
    const ramp = ['#eef3f8', '#cfdeec', '#a9c5df', '#6f9fca', '#3f78ae', '#245a8e', '#163f6b'], stops = [0, 30, 80, 150, 250, 380, 500];
    const col = v => { if (v === null) return 'var(--nul)'; let i = 0; while (i < stops.length - 1 && v >= stops[i + 1]) i++; return ramp[i]; };
    MONTHS.forEach((mn, m) => { if (m % 2 === 0 || m === 6) el('text', { x: L - 4, y: T + m * ch + ch * .72, 'text-anchor': 'end' }, svg).textContent = mn; });
    ROWS.forEach((r, i) => { for (let m = 0; m < 12; m++) el('rect', { x: L + i * cw, y: T + m * ch, width: cw + .3, height: ch, fill: col(r[m + 1]) }, svg); });
    for (let yr = 1800; yr <= 2020; yr += 20) el('text', { x: L + (yr - 1778 + .5) * cw, y: H - 6, 'text-anchor': 'middle' }, svg).textContent = yr;
    el('line', { x1: L + (1907.75 - 1778) * cw, x2: L + (1907.75 - 1778) * cw, y1: T, y2: T + 12 * ch, stroke: 'var(--fg)', 'stroke-dasharray': '3 3' }, svg);
    const hl = el('rect', { y: T - 1, height: 12 * ch + 2, width: cw + 2, fill: 'none', stroke: 'var(--ac)', 'stroke-width': 2 }, svg);
    const hit = el('rect', { x: L, y: T, width: W - L - R, height: 12 * ch, fill: 'transparent', style: 'cursor:pointer' }, svg);
    const at = ev => { const b = svg.getBoundingClientRect(), px = (ev.clientX - b.left) / b.width * W, py = (ev.clientY - b.top) / b.height * H; return [Math.max(0, Math.min(yrs.length - 1, Math.floor((px - L) / cw))), Math.max(0, Math.min(11, Math.floor((py - T) / ch)))]; };
    hit.addEventListener('pointermove', ev => { const [i, m] = at(ev); k.show(ev, `<b>${yrs[i]}년 ${MONTHS[m]}</b> ${fmt(ROWS[i][m + 1])}`); });
    hit.addEventListener('pointerleave', k.hide);
    hit.addEventListener('click', ev => onPick(yrs[at(ev)[0]]));
    const prev = api.pick; api.pick = yr => { prev(yr); hl.setAttribute('x', L + (yr - 1778) * cw - 1); };
    k.foot(SRC + '. 2026년 11·12월은 아직 없음.');
  }

  // ⑤ 표로 보기
  {
    const d = document.createElement('details'); d.className = 'chart';
    d.innerHTML = `<summary>표로 보기 — 해마다 월 강수량(mm)</summary><div class="tw" style="max-height:360px"><table class="t"><tr><th>연도</th>${MONTHS.map(m => `<th>${m.replace('월', '')}</th>`).join('')}<th>합계</th></tr>${ROWS.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map(v => `<td>${v === null ? '—' : Math.round(v)}</td>`).join('')}<td>${r.slice(1).some(v => v === null) ? '—' : Math.round(r.slice(1).reduce((a, b) => a + b))}</td></tr>`).join('')}</table></div><div class="src">${SRC}</div>`;
    host.appendChild(d);
  }
  return { ...api, S, C, A };
}

// 오른쪽: 고른 해의 12달 막대
export function yearCard(box, ROWS, yr, ctx, onPick) {
  const r = yearRow(ROWS, yr), v = r.slice(1), wm = wettestMonth(r), A = ctx.A.find(p => p.y === yr);
  const e = eraOf(yr), j = ERA_LIST.indexOf(e), mean = ctx.S[j].mean;
  const src = yr < 1907 ? '조선 기록(측우기) · Lee 외 2024' : yr === 1907 ? '1–9월 조선 기록 + 10–12월 기상청' : '근대 우량계 · 기상청';
  const rankList = ctx.A.filter(p => p.v !== null).sort((a, b) => b.v - a.v), rank = A && A.v !== null ? rankList.findIndex(p => p.y === yr) + 1 : null;
  const ss = summerShare(r);
  const W = 320, H = 150, L = 4, B = 18, T = 14, mx = Math.max(100, ...v.filter(x => x !== null));
  let bars = '';
  v.forEach((x, i) => { const bw = (W - L * 2) / 12, bx = L + i * bw + 2, h = x === null ? 0 : x / mx * (H - B - T), c = Math.min(3, h);
    bars += x === null ? `<rect x="${bx}" y="${T}" width="${bw - 4}" height="${H - B - T}" fill="var(--nul)" rx="3"/>` : `<path d="M${bx} ${H - B}V${H - B - h + c}q0 -${c} 3 -${c}h${bw - 10}q3 0 3 ${c}V${H - B}Z" fill="${i === wm ? 'var(--ac)' : e.col}"><title>${MONTHS[i]} ${Math.round(x)}mm</title></path>`;
    bars += `<text x="${bx + (bw - 4) / 2}" y="${H - 4}" text-anchor="middle">${i + 1}</text>`;
    if (i === wm) bars += `<text x="${bx + (bw - 4) / 2}" y="${H - B - h - 4}" text-anchor="middle" class="lab">${Math.round(x)}</text>`; });
  box.innerHTML = `<h2>${yr}년 <small>${src}</small></h2>
   <div class="row"><button id="yPrev" aria-label="앞 해">◀</button><input id="yS" type="range" min="1778" max="2026" value="${yr}" aria-label="연도"><button id="yNext" aria-label="다음 해">▶</button></div>
   <div class="chart" style="border:none;padding:4px 0 0"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${yr}년 월별 강수량">${bars}</svg></div>
   <div class="reads"><div>연 강수량 <b>${A && A.v !== null ? Math.round(A.v).toLocaleString() + 'mm' : '—'}</b></div><div>가장 많은 달 <b>${wm === null ? '—' : MONTHS[wm]}</b></div>
   <div>${e.nm.split(' ')[0]} 평균 대비 <b>${A && A.v !== null ? (A.v >= mean ? '+' : '') + Math.round((A.v / mean - 1) * 100) + '%' : '—'}</b></div><div>여름(6–8월) 비율 <b>${ss === null ? '—' : Math.round(ss * 100) + '%'}</b></div>
   <div>많은 순위 <b>${rank ? rank + ' / ' + rankList.length : '—'}</b></div><div>측우기 높이로 <b>${A && A.v !== null ? (A.v / 320).toFixed(1) + '통' : '—'}</b></div></div>
   <div class="m">${yr === 2026 ? '2026년은 11월 7일까지라 연 합계를 내지 않았습니다.' : A && A.v === null ? '전쟁으로 빠진 달이 있어 연 합계를 비웠습니다.' : '「측우기 높이로」: 한 해 비를 32cm 측우기에 모두 모은다면 몇 통이 넘칠지.'}</div>
   <div class="src">출처: ${yr <= 1907 ? SRC_J : ''}${yr === 1907 ? ' · ' : ''}${yr >= 1907 ? SRC_K : ''}</div>`;
  const go = y => onPick(Math.max(1778, Math.min(2026, y)));
  box.querySelector('#yS').oninput = ev => go(+ev.target.value);
  box.querySelector('#yPrev').onclick = () => go(yr - 1); box.querySelector('#yNext').onclick = () => go(yr + 1);
}

export function statCard(box, ctx) {
  const { S, C } = ctx, mm = v => Math.round(v).toLocaleString() + 'mm', sg = v => (v >= 0 ? '+' : '') + v.toFixed(0) + 'mm';
  const row = (n, f) => `<tr><td>${n}</td>${S.map((s, j) => `<td>${f(s, j)}</td>`).join('')}</tr>`;
  box.innerHTML = `<h2>세 시대 비교 <small>연 강수량 통계</small></h2><div class="tw"><table class="t">
   <tr><th></th>${ERA_LIST.map(e => `<th><i class="sw" style="background:${e.col}"></i>${e.nm.replace(' ', '<br>')}</th>`).join('')}</tr>
   ${row('해 수', s => s.n)}${row('평균', s => mm(s.mean))}${row('표준편차', s => mm(s.sd))}${row('변동계수', s => (s.cv * 100).toFixed(0) + '%')}
   ${row('가장 많은 해', s => `${s.max.y}<br>${mm(s.max.v)}`)}${row('가장 적은 해', s => `${s.min.y}<br>${mm(s.min.v)}`)}
   ${row('추세(10년마다)', s => sg(s.slope10))}${row('7월 평균', (s, j) => mm(C[j][6]))}</table></div>
   <div class="m">평균은 조선 → 근대 → 현재 평년으로 ${mm(S[0].mean)} → ${mm(S[1].mean)} → ${mm(S[2].mean)}입니다. 측우기는 눈과 아주 적은 비(1푼=2mm 미만)를 재지 못하고 기록 방법이 달라 조선 값이 조금 작게 나올 수 있습니다(Lee 외 2024). 근대 1908–1990은 전쟁으로 빠진 1950–1952년을 뺀 ${S[1].n}해. 추세는 최소제곱 직선의 기울기입니다.</div>
   <div class="src">출처: 조선 — ${SRC_J} (승정원일기·일성록 복원, 논문 <i>Scientific Data</i> 11:566) · 근대·현재 — ${SRC_K}. 통계 계산은 이 앱(tools/build_data.cjs, src/sim.js).</div>`;
}
