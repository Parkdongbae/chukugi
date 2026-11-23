// 강수량 그래프 (SVG 직접 그림). v2: 한 번에 그래프 하나, 그릴 곳의 폭에 맞춰 다시 그림(viewBox 1단위 = 화면 1px → 좁은 화면에서도 글자가 줄지 않음).
// 색(시대): --c1 조선 1778–1906 · --c3 근대 1908–1990 · --c2 현재 평년 1991–2020(2021– 도 같은 색). template.html에서 키트 색(--warn·--ok·--info)에 이어 테마마다 바뀜
import { MONTHS, annual, climatology, wettestCounts, wettestMonth, stats, movingAvg, summerShare, yearRow, ERAS, eraKeyOf } from './sim.js';
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
export const fmt = v => v === null ? '결측' : Math.round(v).toLocaleString('ko-KR') + 'mm';
export const ERA_LIST = [
  { key: 'joseon', nm: '조선 1778–1906', col: 'var(--c1)' },
  { key: 'mid', nm: '근대 1908–1990', col: 'var(--c3)' },
  { key: 'modern', nm: '현재 평년 1991–2020', col: 'var(--c2)' },
];
export const eraOf = y => ERA_LIST.find(e => e.key === eraKeyOf(y));
export const SRC_J = '<a href="https://zenodo.org/records/11076768" target="_blank" rel="noopener">Lee, Shin &amp; Hong (2024), Zenodo doi:10.5281/zenodo.11076768</a>';
export const SRC_K = '<a href="https://data.kma.go.kr/cmmn/main.do" target="_blank" rel="noopener">기상청 기상자료개방포털, 서울(108) 일 강수량</a>';
export const SRC = `출처: 1778–1907.9 ${SRC_J} · 1907.10–2026.11.7 ${SRC_K}`;
const LEG = ERA_LIST.map(e => `<span><i style="background:${e.col}"></i>${e.nm}${e.key === 'modern' ? ' (2021–2025 포함)' : ''}</span>`).join('');
const LEGSQ = ERA_LIST.map(e => `<span><i class="sq" style="background:${e.col}"></i>${e.nm}</span>`).join('');

// ---------- 자료 준비 (한 번) ----------
export function prepare(ROWS) {
  const A = annual(ROWS).filter(p => p.y <= 2025);
  const S = ERA_LIST.map(e => stats(A.filter(p => p.y >= ERAS[e.key][0] && p.y <= ERAS[e.key][1])));
  const C = ERA_LIST.map(e => climatology(ROWS, ...ERAS[e.key]));
  const N = ERA_LIST.map(e => wettestCounts(ROWS, ...ERAS[e.key])), T = N.map(n => n.reduce((a, b) => a + b)), P = N.map((n, j) => n.map(v => v / T[j] * 100));
  return { ROWS, A, MA: movingAvg(A, 11), S, C, N, T, P, all: stats(A) };
}

// ---------- 질문 카드 글: 한 줄 답(자료에서 계산) + 자세히(v1 그래프 부제·통계 설명) ----------
export function cardText(ctx, id, yr) {
  const { S, C, P, all } = ctx, r = Math.round;
  if (id === 'q1') return { answer: `세 시대 모두 7월! 조선 ${r(C[0][6])} · 근대 ${r(C[1][6])} · 현재 ${r(C[2][6])}mm`,
    detail: `세 시대 모두 <b>7월</b>이 가장 많고 8월이 뒤따릅니다(장마·여름 소나기). 7월 평균: 조선 ${r(C[0][6])} → 근대 ${r(C[1][6])} → 현재 ${r(C[2][6])}mm. 겨울 값 차이에는 측우기가 눈을 재지 못한 영향도 섞여 있습니다.` };
  if (id === 'q2') return { answer: `많이 달라요. 가장 많은 해 ${all.max.y}년 ${fmt(all.max.v)}, 가장 적은 해 ${all.min.y}년 ${fmt(all.min.v)}.`,
    detail: `가는 선 = 해마다 값 · 굵은 선 = 11년 이동 평균 · 점선 = 시대 평균(조선 ${r(S[0].mean)} · 근대 ${r(S[1].mean)} · 현재 평년 ${r(S[2].mean)}mm). 그래프를 누르면 그 해를 질문 4에서 봅니다.` };
  if (id === 'q3') { const mm = v => r(v).toLocaleString() + 'mm';
    return { answer: `평균이 ${r(S[0].mean).toLocaleString()} → ${r(S[1].mean).toLocaleString()} → ${r(S[2].mean).toLocaleString()}mm. 다만 조선 값은 눈을 못 재서 조금 작을 수 있어요.`,
      detail: `평균은 조선 → 근대 → 현재 평년으로 ${mm(S[0].mean)} → ${mm(S[1].mean)} → ${mm(S[2].mean)}입니다. 측우기는 눈과 아주 적은 비(1푼=2mm 미만)를 재지 못하고 기록 방법이 달라 조선 값이 조금 작게 나올 수 있습니다(Lee 외 2024). 근대 1908–1990은 전쟁으로 빠진 1950–1952년을 뺀 ${S[1].n}해. 추세는 최소제곱 직선의 기울기입니다.<br>짧은 구간(특히 30해)의 추세는 크게 흔들립니다. 세 시대 통계 전체 표는 아래 「더 많은 그래프」에 있습니다.` }; }
  if (id === 'q4') { const y = yearInfo(ctx, yr);
    return { answer: y.v === null ? (yr === 2026 ? `${yr}년은 11월 7일까지라 연 합계를 내지 않았어요.` : `${yr}년은 전쟁으로 빠진 달이 있어 합계를 비웠어요.`) : `${yr}년은 ${fmt(y.v)}. 가장 많은 달은 ${MONTHS[y.wm]}이에요.`,
      detail: y.html }; }
  return { answer: '', detail: '' };
}
// 고른 해의 읽을 값 6개 (v1 yearCard)
export function yearInfo(ctx, yr) {
  const r = yearRow(ctx.ROWS, yr), wm = wettestMonth(r), A = ctx.A.find(p => p.y === yr), v = A ? A.v : null;
  const e = eraOf(yr), j = ERA_LIST.indexOf(e), mean = ctx.S[j].mean;
  const src = yr < 1907 ? '조선 기록(측우기) · Lee 외 2024' : yr === 1907 ? '1–9월 조선 기록 + 10–12월 기상청' : '근대 우량계 · 기상청';
  const rankList = ctx.A.filter(p => p.v !== null).sort((a, b) => b.v - a.v), rank = v !== null ? rankList.findIndex(p => p.y === yr) + 1 : null, ss = summerShare(r);
  const html = `<div class="k-reads"><div>연 강수량 <b>${v !== null ? Math.round(v).toLocaleString() + 'mm' : '—'}</b></div><div>가장 많은 달 <b>${wm === null ? '—' : MONTHS[wm]}</b></div>
   <div>${e.nm.split(' ')[0]} 평균 대비 <b>${v !== null ? (v >= mean ? '+' : '') + Math.round((v / mean - 1) * 100) + '%' : '—'}</b></div><div>여름(6–8월) 비율 <b>${ss === null ? '—' : Math.round(ss * 100) + '%'}</b></div>
   <div>많은 순위 <b>${rank ? rank + ' / ' + rankList.length : '—'}</b></div><div>측우기 높이로 <b>${v !== null ? (v / 320).toFixed(1) + '통' : '—'}</b></div></div>
   <p class="k-note">${yr === 2026 ? '2026년은 11월 7일까지라 연 합계를 내지 않았습니다.' : v === null ? '전쟁으로 빠진 달이 있어 연 합계를 비웠습니다.' : '「측우기 높이로」: 한 해 비를 32cm 측우기에 모두 모은다면 몇 통이 넘칠지.'}<br>자료: ${src}</p>`;
  return { v, wm, html };
}

// ---------- 그래프 틀: 제목 · 범례 · svg · 출처, 툴팁 ----------
function frame(host, { title, legend, foot, label }) {
  host.innerHTML = '';
  const c = document.createElement('section'); c.className = 'chart';
  c.innerHTML = `<h3>${title}</h3>` + (legend ? `<div class="legend">${legend}</div>` : '');
  host.appendChild(c);
  const fs = parseFloat(getComputedStyle(document.documentElement).fontSize) * .8125;   // 그래프 글자(보통 13px, 글자 크기 설정에 따름)
  const W = Math.max(260, Math.floor(c.clientWidth));
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true;
  const svgWrap = document.createElement('div'); svgWrap.className = 'svgw'; c.appendChild(svgWrap); c.appendChild(tip);
  if (foot) { const f = document.createElement('div'); f.className = 'src'; f.innerHTML = foot; c.appendChild(f); }
  const show = (ev, html) => {
    tip.innerHTML = html; tip.hidden = false; const r = c.getBoundingClientRect(), tw = tip.offsetWidth;
    let x = ev.clientX - r.left + 14; if (x + tw > r.width) x = ev.clientX - r.left - tw - 14; tip.style.left = Math.max(0, x) + 'px'; tip.style.top = (ev.clientY - r.top - tip.offsetHeight - 8) + 'px';
  };
  const hide = () => (tip.hidden = true);
  // 마우스는 올리면 보이고 나가면 숨김. 손가락은 누르면 보이고 바깥을 누르면 숨김
  const hover = (target, html, onLeave) => {
    target.addEventListener('pointermove', ev => show(ev, html(ev)));
    target.addEventListener('pointerdown', ev => show(ev, html(ev)));
    target.addEventListener('pointerleave', ev => { if (ev.pointerType === 'mouse') { hide(); onLeave?.(); } });
  };
  const outside = ev => { if (!c.isConnected) { document.removeEventListener('pointerdown', outside); return; } if (!c.contains(ev.target)) hide(); };
  document.addEventListener('pointerdown', outside);
  const svg = H => el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': label || title, style: `font-size:${fs}px` }, svgWrap);
  return { c, W, fs, narrow: W < 520, svg, hover, hide };
}
function yAxis(svg, x0, x1, y, ticks, fmtT) {
  for (const t of ticks) { el('line', { x1: x0, x2: x1, y1: y(t), y2: y(t), stroke: 'var(--grid)', 'stroke-width': 1 }, svg); el('text', { x: x0 - 6, y: y(t) + 4, 'text-anchor': 'end' }, svg).textContent = fmtT(t); }
}
const bar = (svg, bx, top, bot, bw, col, extra = {}) => { const c = Math.min(3, bw / 2, Math.max(0, bot - top)); return el('path', { d: `M${bx} ${bot}V${top + c}q0 -${c} ${c} -${c}h${Math.max(0, bw - 2 * c)}q${c} 0 ${c} ${c}V${bot}Z`, fill: col, ...extra }, svg); };
const monthLab = (i, narrow) => narrow ? (i % 2 === 0 || i === 6 ? String(i + 1) : '') : MONTHS[i];

// 세 시대 묶음 막대 (월 평균, 1위 달 비율)
function groupBars(f, values, { H, max, ticks, tickFmt, tipFmt, labelMonth }) {
  const { W, fs, narrow } = f, L = fs * 3.4, R = 8, T = fs * 1.6, B = fs * 2;
  const svg = f.svg(H), y = v => H - B - v / max * (H - T - B), gw = (W - L - R) / 12, bw = Math.max(5, gw * .27);
  yAxis(svg, L, W - R, y, narrow ? ticks.filter((_, k) => k % 2 === 0) : ticks, tickFmt);
  MONTHS.forEach((mn, i) => {
    const gx = L + i * gw + gw / 2;
    el('text', { x: gx, y: H - B + fs * 1.35, 'text-anchor': 'middle', class: i === labelMonth ? 'lab' : '' }, svg).textContent = monthLab(i, narrow);
    ERA_LIST.forEach((e, j) => {
      const v = values[j][i], bx = gx + (j - 1.5) * (bw + 1.5) + .75;
      if (v > 0) bar(svg, bx, y(v), H - B, bw, e.col);
      const hit = el('rect', { x: bx - .75, y: T, width: bw + 1.5, height: H - T - B, fill: 'transparent' }, svg);
      f.hover(hit, () => `<b>${mn}</b> · ${e.nm}<br>${tipFmt(j, i)}`);
    });
    if (i === labelMonth) { const top = Math.min(...values.map(v => y(v[i]))); el('text', { x: gx, y: top - 6, 'text-anchor': 'middle', class: 'lab' }, svg).textContent = values.map(v => tickFmt(Math.round(v[i]))).join(' · '); }
  });
  el('text', { x: L - 6, y: T - fs * .55, 'text-anchor': 'end' }, svg).textContent = tickFmt === pct ? '%' : 'mm';
  el('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: 'var(--mut)' }, svg);
}
const pct = t => t + '%', num = t => t.toLocaleString();

// ① Q1 월 평균 (v1 ②)
export function chartMonth(host, ctx) {
  const f = frame(host, { title: '어느 달에 비가 가장 많이 올까? — 월 평균 강수량', legend: LEGSQ, foot: SRC + '. 시대별로 해마다 같은 달 값을 평균(결측 달 제외). 1907년은 두 자료가 섞여 시대 통계에서 뺌.' });
  groupBars(f, ctx.C, { H: f.narrow ? 250 : 300, max: 450, ticks: [0, 100, 200, 300, 400], tickFmt: num, tipFmt: (j, i) => `평균 ${fmt(ctx.C[j][i])}`, labelMonth: 6 });
}
// Q2 연 강수량 흐름 (v1 ①)
export function chartAnnual(host, ctx, { year, onPick }) {
  const { A, MA, S, all } = ctx;
  const f = frame(host, { title: '서울의 연 강수량, 1778–2025', legend: LEG + '<span><i style="background:var(--fg)"></i>11년 이동 평균</span>', foot: SRC + '. 이동 평균은 앞뒤 5년을 포함한 11년 평균(결측 해 제외).', label: '연 강수량 꺾은선 그래프' });
  const { W, fs, narrow } = f, H = narrow ? 260 : 320, L = fs * 3.4, R = 8, T = fs * 1.4, B = fs * 2;
  const svg = f.svg(H), x = yr => L + (yr - 1778) / (2025 - 1778) * (W - L - R), y = v => H - B - v / 2800 * (H - T - B);
  yAxis(svg, L, W - R, y, narrow ? [0, 1000, 2000] : [0, 500, 1000, 1500, 2000, 2500], num);
  for (let yr = 1800; yr <= 2020; yr += narrow ? 40 : 20) el('text', { x: x(yr), y: H - B + fs * 1.35, 'text-anchor': 'middle' }, svg).textContent = yr;
  el('rect', { x: x(1950), y: T, width: x(1953) - x(1950), height: H - T - B, fill: 'var(--nul)', opacity: .8 }, svg);
  el('text', { x: x(1953) + 4, y: T + fs * 2.3 }, svg).textContent = narrow ? '전쟁 결측' : '6·25 전쟁 결측';
  el('line', { x1: x(1907.75), x2: x(1907.75), y1: T, y2: H - B, stroke: 'var(--fg)', 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg);
  el('text', { x: x(1907.75) + 4, y: T + fs * .9 }, svg).textContent = narrow ? '1907.10 우량계로' : '1907.10 근대 우량계로 바뀜';
  ERA_LIST.forEach((e, j) => el('line', { x1: x(ERAS[e.key][0]), x2: x(ERAS[e.key][1]), y1: y(S[j].mean), y2: y(S[j].mean), stroke: e.col, 'stroke-dasharray': '6 4', 'stroke-width': 2 }, svg));
  const path = (pts, attrs) => { let d = '', pen = false; for (const p of pts) { if (p.v === null) { pen = false; continue; } d += (pen ? 'L' : 'M') + x(p.y).toFixed(1) + ' ' + y(p.v).toFixed(1); pen = true; } el('path', { d, fill: 'none', 'stroke-linejoin': 'round', ...attrs }, svg); };
  path(A.filter(p => p.y <= 1907), { stroke: 'var(--c1)', 'stroke-width': 1.3, opacity: .85 });
  path(A.filter(p => p.y >= 1907 && p.y <= 1991), { stroke: 'var(--c3)', 'stroke-width': 1.3, opacity: .85 });
  path(A.filter(p => p.y >= 1990), { stroke: 'var(--c2)', 'stroke-width': 1.3, opacity: .85 });
  path(MA, { stroke: 'var(--fg)', 'stroke-width': 2.6 });
  for (const [p, t] of [[all.max, '최다'], [all.min, '최소']]) { el('circle', { cx: x(p.y), cy: y(p.v), r: 4.5, fill: eraOf(p.y).col, stroke: 'var(--panel)', 'stroke-width': 2 }, svg); el('text', { x: x(p.y) + 8, y: y(p.v) + (t === '최다' ? fs * .35 : -fs * .35), class: 'lab' }, svg).textContent = `${p.y}년 ${t} ${fmt(p.v)}`; }
  el('text', { x: L - 6, y: T - fs * .4, 'text-anchor': 'end' }, svg).textContent = 'mm';
  const sel = el('line', { y1: T, y2: H - B, stroke: 'var(--ac)', 'stroke-width': 2.5, x1: x(year), x2: x(year) }, svg);
  const cross = el('line', { y1: T, y2: H - B, stroke: 'var(--mut)', 'stroke-width': 1, visibility: 'hidden' }, svg);
  const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent', style: 'cursor:pointer' }, svg);
  const yearAt = ev => { const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * W; return Math.max(1778, Math.min(2025, Math.round(1778 + (px - L) / (W - L - R) * (2025 - 1778)))); };
  f.hover(hit, ev => { const yr = yearAt(ev), p = A.find(q => q.y === yr), m = MA.find(q => q.y === yr), wm = wettestMonth(yearRow(ctx.ROWS, yr));
    cross.setAttribute('x1', x(yr)); cross.setAttribute('x2', x(yr)); cross.setAttribute('visibility', 'visible');
    return `<b>${yr}년</b> ${fmt(p.v)}<br>11년 평균 ${m.v ? fmt(m.v) : '—'}<br>가장 많은 달 ${wm === null ? '—' : MONTHS[wm]}<br><span style="opacity:.8">${yr < 1907 ? '승정원일기·일성록 복원' : yr === 1907 ? '1–9월 복원 + 10–12월 기상청' : '기상청 관측'}</span><br><span style="opacity:.8">한 번 더 누르면 질문 4에서 봐요</span>`; },
    () => cross.setAttribute('visibility', 'hidden'));
  let last = null;   // 손가락: 처음 누르면 값, 같은 해를 한 번 더 누르면 그 해로 이동. 마우스: 바로 이동
  hit.addEventListener('click', ev => { const yr = yearAt(ev); if (ev.pointerType === 'mouse' || last === yr) onPick(yr); last = yr; });
  return { pick: yr => { sel.setAttribute('x1', x(yr)); sel.setAttribute('x2', x(yr)); } };
}
// Q3 세 시대 평균 (v1 통계표의 평균 행) — 큰 숫자 3개 + 시대 색 막대
export function chartEra(host, ctx) {
  const f = frame(host, { title: '세 시대의 연평균 강수량', foot: `출처: 조선 — ${SRC_J} (승정원일기·일성록 복원, 논문 <i>Scientific Data</i> 11:566) · 근대·현재 — ${SRC_K}. 통계 계산은 이 앱(tools/build_data.cjs, src/sim.js).` });
  const { W, fs } = f, row = fs * 5.2, T = fs * .5, H = T + row * 3 + fs * 2, L = 4, R = 8, max = 1600;
  const svg = f.svg(H), x = v => L + v / max * (W - L - R);
  ERA_LIST.forEach((e, j) => {
    const s = ctx.S[j], y0 = T + j * row;
    el('text', { x: L, y: y0 + fs * 1.1, class: 'lab' }, svg).textContent = `${e.nm} · ${s.n}해`;
    el('rect', { x: L, y: y0 + fs * 1.7, width: x(s.mean) - L, height: fs * 2.2, rx: 3, fill: e.col }, svg);
    const big = el('text', { x: Math.min(x(s.mean) + 8, W - R - fs * 6), y: y0 + fs * 3.35, class: 'big' }, svg); big.textContent = Math.round(s.mean).toLocaleString() + 'mm';
    if (x(s.mean) + 8 > W - R - fs * 6) { big.setAttribute('x', x(s.mean) - 8); big.setAttribute('text-anchor', 'end'); big.setAttribute('class', 'big in'); }
    const hit = el('rect', { x: L, y: y0, width: W - L - R, height: row, fill: 'transparent' }, svg);
    f.hover(hit, () => `<b>${e.nm}</b><br>평균 ${fmt(s.mean)} · ${s.n}해<br>가장 많은 해 ${s.max.y}년 ${fmt(s.max.v)}<br>가장 적은 해 ${s.min.y}년 ${fmt(s.min.v)}`);
  });
  for (const v of [0, 500, 1000, 1500]) { el('line', { x1: x(v), x2: x(v), y1: T, y2: H - fs * 1.6, stroke: 'var(--grid)', 'stroke-dasharray': '2 3' }, svg); el('text', { x: x(v), y: H - fs * .4, 'text-anchor': v ? 'middle' : 'start' }, svg).textContent = v.toLocaleString() + (v === 1500 ? 'mm' : ''); }
}
// Q4 고른 해의 12달 (v1 yearCard 막대)
export function chartYear(host, ctx, { year: yr }) {
  const r = yearRow(ctx.ROWS, yr), v = r.slice(1), wm = wettestMonth(r), e = eraOf(yr);
  const f = frame(host, { title: `${yr}년의 달마다 강수량`, legend: `<span><i class="sq" style="background:${e.col}"></i>${e.nm}</span><span><i class="sq" style="background:${e.col};outline:2px solid var(--fg)"></i>가장 많은 달</span><span><i class="sq" style="background:var(--nul)"></i>결측</span>`,
    foot: `출처: ${yr <= 1907 ? SRC_J : ''}${yr === 1907 ? ' · ' : ''}${yr >= 1907 ? SRC_K : ''}` });
  const { W, fs, narrow } = f, H = narrow ? 230 : 280, L = fs * 3.4, R = 8, T = fs * 1.8, B = fs * 2, mx = Math.max(100, ...v.filter(x => x !== null)), top = Math.ceil(mx / 100) * 100;
  const svg = f.svg(H), y = q => H - B - q / top * (H - T - B), bw = (W - L - R) / 12;
  const step = top > 600 ? 200 : 100; yAxis(svg, L, W - R, y, Array.from({ length: Math.floor(top / step) + 1 }, (_, k) => k * step).filter((_, k, a) => !narrow || k % 2 === 0 || k === a.length - 1), num);
  v.forEach((q, i) => {
    const bx = L + i * bw + bw * .12, w = bw * .76;
    if (q === null) el('rect', { x: bx, y: T, width: w, height: H - T - B, fill: 'var(--nul)', rx: 3 }, svg);
    else bar(svg, bx, y(q), H - B, w, e.col, i === wm ? { stroke: 'var(--fg)', 'stroke-width': 2 } : { opacity: .78 });
    el('text', { x: bx + w / 2, y: H - B + fs * 1.35, 'text-anchor': 'middle', class: i === wm ? 'lab' : '' }, svg).textContent = narrow ? i + 1 : MONTHS[i];
    if (i === wm) el('text', { x: bx + w / 2, y: y(q) - 6, 'text-anchor': 'middle', class: 'lab' }, svg).textContent = Math.round(q).toLocaleString();
    const hit = el('rect', { x: L + i * bw, y: T, width: bw, height: H - T - B, fill: 'transparent' }, svg);
    f.hover(hit, () => `<b>${yr}년 ${MONTHS[i]}</b> ${fmt(q)}`);
  });
  el('text', { x: L - 6, y: T - fs * .55, 'text-anchor': 'end' }, svg).textContent = 'mm';
  el('line', { x1: L, x2: W - R, y1: H - B, y2: H - B, stroke: 'var(--mut)' }, svg);
}

// ---------- 더 알아보기 ----------
// 해마다 「가장 비가 많은 달」 (v1 ③)
export function chartWettest(host, ctx) {
  const { P, N, T } = ctx, r = Math.round;
  const f = frame(host, { title: '해마다 「가장 비가 많은 달」은 언제였나?', legend: LEGSQ, foot: SRC + '. 12달이 모두 있는 해만 셈.' });
  const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = `그 해 12달 중 비가 가장 많은 달을 세어 비율로 나타냄. 7월인 해: 조선 ${r(P[0][6])}% · 근대 ${r(P[1][6])}% · 현재 ${r(P[2][6])}%, 8월인 해: ${r(P[0][7])}% · ${r(P[1][7])}% · ${r(P[2][7])}%. 평균만 보면 7월이지만, 해에 따라 6·8·9월이 1위인 때도 많습니다.`;
  f.c.querySelector('h3').after(sub);
  groupBars(f, P, { H: f.narrow ? 230 : 270, max: 70, ticks: [0, 20, 40, 60], tickFmt: pct, tipFmt: (j, i) => `${N[j][i]}해 / ${T[j]}해 (${P[j][i].toFixed(0)}%)`, labelMonth: 6 });
}
// 249년 × 12달 열지도 (v1 ④). 한 가지 색의 진하기
export function chartHeat(host, ctx, { year, onPick }) {
  const ROWS = ctx.ROWS;
  const f = frame(host, { title: '249년 × 12달 열지도', label: '연도와 달별 강수량 열지도', foot: SRC + '. 2026년 11·12월은 아직 없음.',
    legend: '<span><i class="sq" style="background:#eef3f8;border:1px solid var(--bd)"></i>0</span><span><i class="sq" style="background:#6f9fca"></i>200mm</span><span><i class="sq" style="background:#163f6b"></i>500mm 이상</span><span><i class="sq" style="background:var(--nul)"></i>결측</span>' });
  const sub = document.createElement('p'); sub.className = 'sub'; sub.textContent = '진할수록 비가 많음(한 가지 색). 여름 띠가 해마다 굵기·위치를 바꾸는 모습을 볼 수 있습니다. 칸을 누르면 그 해를 봅니다.';
  f.c.querySelector('h3').after(sub);
  const { W, fs, narrow } = f, yrs = ROWS.map(r => r[0]), L = fs * 3, R = 4, T = 4, B = fs * 2, ch = narrow ? 16 : 18, H = T + B + ch * 12;
  const svg = f.svg(H), cw = (W - L - R) / yrs.length;
  const ramp = ['#eef3f8', '#cfdeec', '#a9c5df', '#6f9fca', '#3f78ae', '#245a8e', '#163f6b'], stops = [0, 30, 80, 150, 250, 380, 500];
  const col = v => { if (v === null) return 'var(--nul)'; let i = 0; while (i < stops.length - 1 && v >= stops[i + 1]) i++; return ramp[i]; };
  MONTHS.forEach((mn, m) => { if (m % 2 === 0 || m === 6) el('text', { x: L - 4, y: T + m * ch + ch * .72, 'text-anchor': 'end' }, svg).textContent = mn; });
  ROWS.forEach((r, i) => { for (let m = 0; m < 12; m++) el('rect', { x: L + i * cw, y: T + m * ch, width: cw + .35, height: ch, fill: col(r[m + 1]) }, svg); });
  for (let yr = 1800; yr <= 2020; yr += narrow ? 40 : 20) el('text', { x: L + (yr - 1778 + .5) * cw, y: H - fs * .5, 'text-anchor': 'middle' }, svg).textContent = yr;
  el('line', { x1: L + (1907.75 - 1778) * cw, x2: L + (1907.75 - 1778) * cw, y1: T, y2: T + 12 * ch, stroke: 'var(--fg)', 'stroke-dasharray': '3 3' }, svg);
  const hl = el('rect', { y: T - 1, height: 12 * ch + 2, width: Math.max(3, cw + 2), x: L + (year - 1778) * cw - 1, fill: 'none', stroke: 'var(--ac)', 'stroke-width': 2 }, svg);
  const hit = el('rect', { x: L, y: T, width: W - L - R, height: 12 * ch, fill: 'transparent', style: 'cursor:pointer' }, svg);
  const at = ev => { const b = svg.getBoundingClientRect(), px = (ev.clientX - b.left) / b.width * W, py = (ev.clientY - b.top) / b.height * H; return [Math.max(0, Math.min(yrs.length - 1, Math.floor((px - L) / cw))), Math.max(0, Math.min(11, Math.floor((py - T) / ch)))]; };
  f.hover(hit, ev => { const [i, m] = at(ev); return `<b>${yrs[i]}년 ${MONTHS[m]}</b> ${fmt(ROWS[i][m + 1])}`; });
  hit.addEventListener('click', ev => { if (ev.pointerType === 'mouse') onPick(yrs[at(ev)[0]]); });
  return { pick: yr => hl.setAttribute('x', L + (yr - 1778) * cw - 1) };
}
// 세 시대 통계 전체 표 (v1 statCard)
export function statTable(host, ctx) {
  const { S, C } = ctx, mm = v => Math.round(v).toLocaleString() + 'mm', sg = v => (v >= 0 ? '+' : '') + v.toFixed(0) + 'mm';
  const row = (n, f) => `<tr><td>${n}</td>${S.map((s, j) => `<td>${f(s, j)}</td>`).join('')}</tr>`;
  host.innerHTML = `<section class="chart"><h3>세 시대 비교 — 연 강수량 통계</h3><div class="tw"><table class="k-table">
   <tr><th></th>${ERA_LIST.map(e => `<th><i class="sw" style="background:${e.col}"></i>${e.nm.replace(' ', '<br>')}</th>`).join('')}</tr>
   ${row('해 수', s => s.n)}${row('평균', s => mm(s.mean))}${row('표준편차', s => mm(s.sd))}${row('변동계수', s => (s.cv * 100).toFixed(0) + '%')}
   ${row('가장 많은 해', s => `${s.max.y}<br>${mm(s.max.v)}`)}${row('가장 적은 해', s => `${s.min.y}<br>${mm(s.min.v)}`)}
   ${row('추세(10년마다)', s => sg(s.slope10))}${row('7월 평균', (s, j) => mm(C[j][6]))}</table></div>
   <p class="k-note">평균은 조선 → 근대 → 현재 평년으로 ${mm(S[0].mean)} → ${mm(S[1].mean)} → ${mm(S[2].mean)}입니다. 측우기는 눈과 아주 적은 비(1푼=2mm 미만)를 재지 못하고 기록 방법이 달라 조선 값이 조금 작게 나올 수 있습니다(Lee 외 2024). 근대 1908–1990은 전쟁으로 빠진 1950–1952년을 뺀 ${S[1].n}해. 추세는 최소제곱 직선의 기울기입니다.</p>
   <div class="src">출처: 조선 — ${SRC_J} (승정원일기·일성록 복원, 논문 <i>Scientific Data</i> 11:566) · 근대·현재 — ${SRC_K}. 통계 계산은 이 앱(tools/build_data.cjs, src/sim.js).</div></section>`;
}
// 표로 보기 (v1 ⑤)
export function dataTable(host, ctx) {
  const ROWS = ctx.ROWS;
  host.innerHTML = `<section class="chart"><h3>표로 보기 — 해마다 월 강수량(mm)</h3><div class="tw big"><table class="k-table"><thead><tr><th>연도</th>${MONTHS.map(m => `<th>${m.replace('월', '')}</th>`).join('')}<th>합계</th></tr></thead><tbody>${ROWS.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map(v => `<td>${v === null ? '—' : Math.round(v)}</td>`).join('')}<td>${r.slice(1).some(v => v === null) ? '—' : Math.round(r.slice(1).reduce((a, b) => a + b))}</td></tr>`).join('')}</tbody></table></div><div class="src">${SRC}</div></section>`;
}
