// 강수량 그래프 (SVG 직접 그림). 색: --c1 조선(1778–1907), --c2 근대(1907.10–). 축은 하나만.
import { MONTHS, annual, climatology, wettestCounts, wettestMonth, stats, movingAvg, summerShare, yearRow, ERAS } from './sim.js';
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
const fmt = v => v === null ? '결측' : Math.round(v).toLocaleString('ko-KR') + 'mm';
const eraColor = y => y <= 1907 ? 'var(--c1)' : 'var(--c2)';

function card(host, title, sub, legend) {
  const c = document.createElement('section'); c.className = 'chart';
  c.innerHTML = `<h3>${title}</h3><div class="sub">${sub}</div>` + (legend ? `<div class="legend">${legend}</div>` : '');
  const tip = document.createElement('div'); tip.className = 'tip'; tip.hidden = true; c.appendChild(tip);
  host.appendChild(c);
  const show = (ev, html) => { tip.innerHTML = html; tip.hidden = false; const r = c.getBoundingClientRect(); let x = ev.clientX - r.left + 12; if (x > r.width - 170) x -= 190; tip.style.left = x + 'px'; tip.style.top = (ev.clientY - r.top - 10) + 'px'; };
  return { c, show, hide: () => (tip.hidden = true) };
}
const LEG = `<span><i style="background:var(--c1)"></i>조선 (승정원일기 복원, 1778–1907.9)</span><span><i style="background:var(--c2)"></i>근대 우량계 (기상청, 1907.10–)</span>`;
const LEGSQ = `<span><i class="sq" style="background:var(--c1)"></i>조선 1778–1906</span><span><i class="sq" style="background:var(--c2)"></i>현재 평년 1991–2020</span>`;

function yAxis(svg, x0, x1, y, ticks, fmtT) {
  for (const t of ticks) { el('line', { x1: x0, x2: x1, y1: y(t), y2: y(t), stroke: 'var(--grid)', 'stroke-width': 1 }, svg); el('text', { x: x0 - 6, y: y(t) + 4, 'text-anchor': 'end' }, svg).textContent = fmtT(t); }
}

export function buildCharts(host, ROWS, onPick) {
  host.innerHTML = '';
  const A = annual(ROWS).filter(p => p.y <= 2025);
  const MA = movingAvg(A, 11);
  const sJ = stats(A.filter(p => p.y <= 1906)), sK = stats(A.filter(p => p.y >= ERAS.modern[0] && p.y <= ERAS.modern[1]));
  const api = { pick: () => {} };

  // ① 연 강수량 흐름
  {
    const k = card(host, '서울의 연 강수량, 1778–2025', `가는 선 = 해마다 값 · 굵은 선 = 11년 이동 평균 · 점선 = 시대 평균(조선 ${Math.round(sJ.mean)}mm, 현재 평년 ${Math.round(sK.mean)}mm). 그래프를 누르면 그 해를 오른쪽에서 봅니다.`, LEG + '<span><i style="background:var(--mut)"></i>11년 이동 평균</span>');
    const W = 900, H = 300, L = 46, R = 12, T = 12, B = 26;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '연 강수량 꺾은선 그래프' }, k.c);
    const x = y => L + (y - 1778) / (2025 - 1778) * (W - L - R), y = v => H - B - v / 2800 * (H - T - B);
    yAxis(svg, L, W - R, y, [0, 500, 1000, 1500, 2000, 2500], t => t.toLocaleString());
    for (let yr = 1800; yr <= 2020; yr += 20) el('text', { x: x(yr), y: H - 8, 'text-anchor': 'middle' }, svg).textContent = yr;
    // 결측(전쟁) 띠
    el('rect', { x: x(1950), y: T, width: x(1953) - x(1950), height: H - T - B, fill: 'var(--nul)', opacity: .7 }, svg);
    el('text', { x: x(1953) + 4, y: T + 28 }, svg).textContent = '6·25 전쟁 결측';
    // 이음선
    el('line', { x1: x(1907.75), x2: x(1907.75), y1: T, y2: H - B, stroke: 'var(--fg)', 'stroke-dasharray': '3 3', 'stroke-width': 1 }, svg);
    el('text', { x: x(1907.75) + 4, y: T + 12 }, svg).textContent = '1907.10 근대 우량계로 바뀜';
    // 시대 평균
    for (const [s, a, b, col] of [[sJ, 1778, 1906, 'var(--c1)'], [sK, 1991, 2020, 'var(--c2)']]) el('line', { x1: x(a), x2: x(b), y1: y(s.mean), y2: y(s.mean), stroke: col, 'stroke-dasharray': '6 4', 'stroke-width': 2 }, svg);
    // 해마다 선(시대별 색, 결측에서 끊김)
    const path = (pts, attrs) => { let d = '', pen = false; for (const p of pts) { if (p.v === null) { pen = false; continue; } d += (pen ? 'L' : 'M') + x(p.y).toFixed(1) + ' ' + y(p.v).toFixed(1); pen = true; } el('path', { d, fill: 'none', 'stroke-linejoin': 'round', ...attrs }, svg); };
    path(A.filter(p => p.y <= 1907), { stroke: 'var(--c1)', 'stroke-width': 1.2, opacity: .75 });
    path(A.filter(p => p.y >= 1907), { stroke: 'var(--c2)', 'stroke-width': 1.2, opacity: .75 });
    path(MA, { stroke: 'var(--fg)', 'stroke-width': 2.4 });
    // 가장 많은·적은 해 표시
    const all = stats(A);
    for (const [p, t] of [[all.max, '최다'], [all.min, '최소']]) { el('circle', { cx: x(p.y), cy: y(p.v), r: 4, fill: eraColor(p.y), stroke: 'var(--pn)', 'stroke-width': 2 }, svg); el('text', { x: x(p.y) + 7, y: y(p.v) + (t === '최다' ? 4 : -4), class: 'lab' }, svg).textContent = `${p.y}년 ${t} ${fmt(p.v)}`; }
    // 고른 해 · 십자선
    const sel = el('line', { y1: T, y2: H - B, stroke: 'var(--ac)', 'stroke-width': 2 }, svg);
    const cross = el('line', { y1: T, y2: H - B, stroke: 'var(--mut)', 'stroke-width': 1, visibility: 'hidden' }, svg);
    const hit = el('rect', { x: L, y: T, width: W - L - R, height: H - T - B, fill: 'transparent', style: 'cursor:crosshair' }, svg);
    const yearAt = ev => { const r = svg.getBoundingClientRect(); const px = (ev.clientX - r.left) / r.width * W; return Math.max(1778, Math.min(2025, Math.round(1778 + (px - L) / (W - L - R) * (2025 - 1778)))); };
    hit.addEventListener('pointermove', ev => { const yr = yearAt(ev), p = A.find(q => q.y === yr), m = MA.find(q => q.y === yr), wm = wettestMonth(yearRow(ROWS, yr));
      cross.setAttribute('x1', x(yr)); cross.setAttribute('x2', x(yr)); cross.setAttribute('visibility', 'visible');
      k.show(ev, `<b>${yr}년</b> ${fmt(p.v)}<br>11년 평균 ${m.v ? fmt(m.v) : '—'}<br>가장 많은 달 ${wm === null ? '—' : MONTHS[wm]}`); });
    hit.addEventListener('pointerleave', () => { cross.setAttribute('visibility', 'hidden'); k.hide(); });
    hit.addEventListener('click', ev => onPick(yearAt(ev)));
    const prev = api.pick; api.pick = yr => { prev(yr); sel.setAttribute('x1', x(yr)); sel.setAttribute('x2', x(yr)); };
  }

  // ② 월별 평균 (두 시대)
  const cJ = climatology(ROWS, ...ERAS.joseon), cK = climatology(ROWS, ...ERAS.modern);
  {
    const k = card(host, '어느 달에 비가 가장 많이 올까? — 월 평균 강수량', `두 시대 모두 <b>7월</b>이 가장 많고 8월이 뒤따릅니다(장마·여름 소나기). 7월 평균: 조선 ${Math.round(cJ[6])}mm → 현재 ${Math.round(cK[6])}mm. 겨울 값 차이에는 측우기가 눈을 재지 못한 영향도 섞여 있습니다.`, LEGSQ);
    const W = 900, H = 260, L = 46, R = 12, T = 14, B = 26;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '월 평균 강수량 막대 그래프' }, k.c);
    const y = v => H - B - v / 450 * (H - T - B), gw = (W - L - R) / 12, bw = gw * .34;
    yAxis(svg, L, W - R, y, [0, 100, 200, 300, 400], t => t);
    MONTHS.forEach((mn, i) => {
      const gx = L + i * gw + gw / 2;
      el('text', { x: gx, y: H - 8, 'text-anchor': 'middle', class: i === 6 ? 'lab' : '' }, svg).textContent = mn;
      [[cJ[i], 'var(--c1)', -1, '조선 1778–1906'], [cK[i], 'var(--c2)', 1, '현재 평년 1991–2020']].forEach(([v, col, s, nm]) => {
        const bx = gx + (s < 0 ? -bw - 1 : 1), h = H - B - y(v);
        const r = el('path', { d: `M${bx} ${H - B}V${y(v) + 3}q0 -3 3 -3h${bw - 6}q3 0 3 3V${H - B}Z`, fill: col }, svg);
        const hit = el('rect', { x: bx - 2, y: T, width: bw + 4, height: H - T - B, fill: 'transparent' }, svg);
        hit.addEventListener('pointermove', ev => { r.setAttribute('opacity', .8); k.show(ev, `<b>${mn}</b> · ${nm}<br>평균 ${fmt(v)}`); });
        hit.addEventListener('pointerleave', () => { r.removeAttribute('opacity'); k.hide(); });
        if (i === 6) el('text', { x: bx + bw / 2, y: y(v) - 6, 'text-anchor': 'middle', class: 'lab' }, svg).textContent = Math.round(v);
      });
    });
  }

  // ③ 해마다 가장 비가 많은 달
  {
    const nJ = wettestCounts(ROWS, ...ERAS.joseon), nK = wettestCounts(ROWS, ...ERAS.modern);
    const tJ = nJ.reduce((a, b) => a + b), tK = nK.reduce((a, b) => a + b);
    const pJ = nJ.map(v => v / tJ * 100), pK = nK.map(v => v / tK * 100);
    const k = card(host, '해마다 「가장 비가 많은 달」은 언제였나?', `그 해 12달 중 비가 가장 많은 달을 세어 비율로 나타냄. 7월인 해: 조선 ${Math.round(pJ[6])}% · 현재 ${Math.round(pK[6])}%, 8월인 해: ${Math.round(pJ[7])}% · ${Math.round(pK[7])}%. 평균만 보면 7월이지만, 해에 따라 6·8·9월이 1위인 때도 많습니다.`, LEGSQ);
    const W = 900, H = 220, L = 46, R = 12, T = 14, B = 26;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': '가장 비가 많은 달의 비율' }, k.c);
    const y = v => H - B - v / 70 * (H - T - B), gw = (W - L - R) / 12, bw = gw * .34;
    yAxis(svg, L, W - R, y, [0, 20, 40, 60], t => t + '%');
    MONTHS.forEach((mn, i) => {
      const gx = L + i * gw + gw / 2;
      el('text', { x: gx, y: H - 8, 'text-anchor': 'middle' }, svg).textContent = mn;
      [[pJ[i], nJ[i], tJ, 'var(--c1)', -1, '조선'], [pK[i], nK[i], tK, 'var(--c2)', 1, '현재 평년']].forEach(([v, n, t, col, s, nm]) => {
        if (!n) return; const bx = gx + (s < 0 ? -bw - 1 : 1);
        const r = el('path', { d: `M${bx} ${H - B}V${Math.min(H - B - 1, y(v) + 3)}q0 -3 3 -3h${bw - 6}q3 0 3 3V${H - B}Z`, fill: col }, svg);
        const hit = el('rect', { x: bx - 2, y: T, width: bw + 4, height: H - T - B, fill: 'transparent' }, svg);
        hit.addEventListener('pointermove', ev => k.show(ev, `<b>${mn}</b>이 1위인 해 · ${nm}<br>${n}해 / ${t}해 (${v.toFixed(0)}%)`));
        hit.addEventListener('pointerleave', k.hide);
      });
    });
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
  }

  // ⑤ 표로 보기
  {
    const d = document.createElement('details'); d.className = 'chart';
    d.innerHTML = `<summary>표로 보기 — 해마다 월 강수량(mm)</summary><div class="tw" style="max-height:360px"><table class="t"><tr><th>연도</th>${MONTHS.map(m => `<th>${m.replace('월', '')}</th>`).join('')}<th>합계</th></tr>${ROWS.map(r => `<tr><td>${r[0]}</td>${r.slice(1).map(v => `<td>${v === null ? '—' : Math.round(v)}</td>`).join('')}<td>${r.slice(1).some(v => v === null) ? '—' : Math.round(r.slice(1).reduce((a, b) => a + b))}</td></tr>`).join('')}</table></div>`;
    host.appendChild(d);
  }
  return { ...api, sJ, sK, cJ, cK, A };
}

// 오른쪽: 고른 해의 12달 막대
export function yearCard(box, ROWS, yr, ctx, onPick) {
  const r = yearRow(ROWS, yr), v = r.slice(1), wm = wettestMonth(r), A = ctx.A.find(p => p.y === yr);
  const era = yr <= 1907 ? '조선 기록(측우기)' : '근대 우량계';
  const mean = yr <= 1907 ? ctx.sJ.mean : ctx.sK.mean, rankList = ctx.A.filter(p => p.v !== null).sort((a, b) => b.v - a.v), rank = A && A.v !== null ? rankList.findIndex(p => p.y === yr) + 1 : null;
  const ss = summerShare(r);
  const W = 320, H = 150, L = 4, B = 18, T = 14, mx = Math.max(100, ...v.filter(x => x !== null));
  let bars = '';
  v.forEach((x, i) => { const bw = (W - L * 2) / 12, bx = L + i * bw + 2, h = x === null ? 0 : x / mx * (H - B - T);
    bars += x === null ? `<rect x="${bx}" y="${T}" width="${bw - 4}" height="${H - B - T}" fill="var(--nul)" rx="3"/>` : `<path d="M${bx} ${H - B}V${H - B - h + Math.min(3, h)}q0 -${Math.min(3, h)} 3 -${Math.min(3, h)}h${bw - 10}q3 0 3 ${Math.min(3, h)}V${H - B}Z" fill="${i === wm ? 'var(--ac)' : yr <= 1907 ? 'var(--c1)' : 'var(--c2)'}"><title>${MONTHS[i]} ${Math.round(x)}mm</title></path>`;
    bars += `<text x="${bx + (bw - 4) / 2}" y="${H - 4}" text-anchor="middle">${i + 1}</text>`;
    if (i === wm) bars += `<text x="${bx + (bw - 4) / 2}" y="${H - B - h - 4}" text-anchor="middle" class="lab">${Math.round(x)}</text>`; });
  box.innerHTML = `<h2>${yr}년 <small>${era}</small></h2>
   <div class="row"><button id="yPrev" aria-label="앞 해">◀</button><input id="yS" type="range" min="1778" max="2026" value="${yr}" aria-label="연도"><button id="yNext" aria-label="다음 해">▶</button></div>
   <div class="chart" style="border:none;padding:4px 0 0"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${yr}년 월별 강수량">${bars}</svg></div>
   <div class="reads"><div>연 강수량 <b>${A && A.v !== null ? Math.round(A.v).toLocaleString() + 'mm' : '—'}</b></div><div>가장 많은 달 <b>${wm === null ? '—' : MONTHS[wm]}</b></div>
   <div>시대 평균 대비 <b>${A && A.v !== null ? (A.v >= mean ? '+' : '') + Math.round((A.v / mean - 1) * 100) + '%' : '—'}</b></div><div>여름(6–8월) 비율 <b>${ss === null ? '—' : Math.round(ss * 100) + '%'}</b></div>
   <div>많은 순위 <b>${rank ? rank + ' / ' + rankList.length : '—'}</b></div><div>측우기 높이로 <b>${A && A.v !== null ? (A.v / 320).toFixed(1) + '통' : '—'}</b></div></div>
   <div class="m">${yr === 2026 ? '2026년은 11월 7일까지라 연 합계를 내지 않았습니다.' : A && A.v === null ? '전쟁으로 빠진 달이 있어 연 합계를 비웠습니다.' : wm !== null ? `「측우기 높이로」: 한 해 비를 32cm 측우기에 모두 모은다면 몇 통이 넘칠지.` : ''}</div>`;
  const go = y => onPick(Math.max(1778, Math.min(2026, y)));
  box.querySelector('#yS').oninput = e => go(+e.target.value);
  box.querySelector('#yPrev').onclick = () => go(yr - 1); box.querySelector('#yNext').onclick = () => go(yr + 1);
}

export function statCard(box, ctx) {
  const row = (n, a, b) => `<tr><td>${n}</td><td>${a}</td><td>${b}</td></tr>`;
  const { sJ, sK } = ctx, mm = v => Math.round(v).toLocaleString() + 'mm';
  box.innerHTML = `<h2>두 시대 비교 <small>연 강수량 통계</small></h2><div class="tw"><table class="t">
   <tr><th></th><th style="color:var(--c1)">조선 1778–1906</th><th style="color:var(--c2)">평년 1991–2020</th></tr>
   ${row('해 수', sJ.n, sK.n)}${row('평균', mm(sJ.mean), mm(sK.mean))}${row('표준편차', mm(sJ.sd), mm(sK.sd))}${row('변동계수', (sJ.cv * 100).toFixed(0) + '%', (sK.cv * 100).toFixed(0) + '%')}
   ${row('가장 많은 해', `${sJ.max.y} (${mm(sJ.max.v)})`, `${sK.max.y} (${mm(sK.max.v)})`)}${row('가장 적은 해', `${sJ.min.y} (${mm(sJ.min.v)})`, `${sK.min.y} (${mm(sK.min.v)})`)}
   ${row('추세(10년마다)', (sJ.slope10 >= 0 ? '+' : '') + sJ.slope10.toFixed(0) + 'mm', (sK.slope10 >= 0 ? '+' : '') + sK.slope10.toFixed(0) + 'mm')}
   ${row('7월 평균', mm(ctx.cJ[6]), mm(ctx.cK[6]))}</table></div>
   <div class="m">현재 평년이 약 ${Math.round((sK.mean / sJ.mean - 1) * 100)}% 많습니다. 다만 측우기는 눈과 아주 적은 비(1푼=2mm 미만)를 재지 못하고, 기록 시각·방법이 달라 조선 값이 조금 작게 나올 수 있습니다(Lee 외 2024). 추세는 최소제곱 직선의 기울기입니다.</div>`;
}
