import * as THREE from 'three';
import { INSTALL, MEASURE, MEASURE_TOTAL, measureAt, waterDepth, GAUGE, toChukPun, QUIZ, BADGES, CARDS, MORE, drawMission, judgeReading, readingPun, missionStars, quizStars, eraKeyOf } from './sim.js';
import { buildWorld, PAVE } from './model.js';
import * as CH from './charts.js';
import { ROWS } from './data.js';
import { createStage } from './kit/stage.js';
import { initSettings } from './kit/settings.js';
import { initProgress } from './kit/progress.js';
import { initSfx } from './kit/sfx.js';
import { $, help, toast, stars } from './kit/ui.js';

const APP = 'chukugi';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const VIEWS = {
  site: [[-1.3, 7.2, 10.2], [0, .6, -1.4]],
  near: [[-1.2, .85, 1.55], [0, .3, 0]],
  gauge: [[-.6, .8, .85], [0, .48, 0]],
  measure: [[-.7, .92, 1.22], [.05, .45, 0]],
  cmp: [[-.35, 1.2, 2.9], [.08, .28, .1]],
  quiz: [[-1.0, .95, 1.35], [0, .38, 0]],
};

// ================= 공통: 설정 · 소리 · 무대 · 기록 =================
let stage = null, prog = null, tab = 'install';
const settings = initSettings(APP, {
  onChange(s, k) {
    if (!stage) return;
    if (k === 'quality') { stage.setQuality(s.quality); setRainCount(); }
    if (k === 'theme') stage.setTheme(s.theme);
    if (k === 'labels') stage.setLabels(s.labels);
    if (k === 'motion') { stage.setReducedMotion(settings.reducedMotion()); setRainCount(); }
    if ((k === 'text' || k === 'theme') && tab === 'data') drawChart();
  },
  onReset() { prog.reset(); toast('기록을 지웠습니다'); },
});
const sfx = initSfx(() => settings.all());
stage = createStage($('cv'), { yard: 9, far: 3000, pos: VIEWS.site[0], target: VIEWS.site[1], quality: settings.get('quality'), theme: settings.get('theme'), labels: settings.get('labels'), reducedMotion: settings.reducedMotion(), preserve: true });
const { scene, cam, ctl, renderer } = stage;
renderer.localClippingEnabled = true;
const W = buildWorld(scene);
// 지금의 「처음 시점」을 기억해 둔다(검증용 즉시 이동에 씀)
let curHome = VIEWS.near; const setHome0 = stage.setHome; stage.setHome = (p, t, go) => { curHome = [p, t]; setHome0(p, t, go); };
function jumpHome() { const [p, t] = curHome, k = cam.aspect < 1 ? Math.pow(1 / cam.aspect, .8) : 1, tv = new THREE.Vector3(...t); stage.stopCam(); ctl.target.copy(tv); cam.position.set(...p).sub(tv).multiplyScalar(k).add(tv); ctl.update(); }
const MENUS = [{ id: 'install', name: '설치' }, { id: 'measure', name: '측정' }, { id: 'data', name: '강수량 자료' }, { id: 'quiz', name: '퀴즈' }];
prog = initProgress(APP, { menus: MENUS, badges: BADGES, sfx, onChange: drawNav, scores: [{ id: 'ruler', name: '주척 읽기' }, { id: 'quiz', name: '퀴즈' }] });
const helpDlg = help(APP, [
  { ico: '👆', title: '3D를 돌려 보세요', text: '왼쪽 그림을 끌면 돌아가고, 마우스 휠이나 두 손가락으로 크게·작게 볼 수 있어요.' },
  { ico: '①②③④', title: '번호 순서대로 배워요', text: '위쪽 메뉴를 ① 설치부터 차례로 눌러 보세요. 다 본 메뉴에는 ✓ 표시가 생겨요.' },
  { ico: '⚙️', title: '설정에서 내게 맞게', text: '글자 크기, 화면 색, 소리, 그래픽 품질을 오른쪽 위 ⚙ 설정에서 바꿀 수 있어요.' },
]);
$('btnSet').onclick = () => settings.open(); $('btnProg').onclick = () => prog.open(); $('btnHelp').onclick = () => helpDlg.open();
$('zi').onclick = () => stage.zoom(.8); $('zo').onclick = () => stage.zoom(1.25); $('zr').onclick = () => stage.home();
document.addEventListener('click', e => { if (e.target.closest('button,summary,.k-check')) sfx.play('tap'); });
function drawNav() { document.querySelectorAll('#nav button').forEach(b => { b.classList.toggle('done', prog.isDone(b.dataset.tab)); if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); }
function finish(menu, badge) { if (!prog.isDone(menu)) { prog.done(menu); toast(`✓ 「${MENUS.find(m => m.id === menu).name}」 다 봤어요`); } if (badge) prog.award(badge); }
const detailOpen = () => settings.get('level') === 'detail';
// 이름표는 내용이 바뀔 때만 다시 만든다
let tagKey = '';
function setTags(list) { const k = JSON.stringify(list); if (k === tagKey) return; tagKey = k; stage.setTags(list); }

// ---- 반 잘라 보기 ----
const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
let cutOn = null;
function setCut(on) { if (on === cutOn) return; cutOn = on; for (const m of W.clipMats) { m.clippingPlanes = on ? [clip] : []; m.needsUpdate = true; } W.cap.visible = on; W.cuts.forEach(c => (c.visible = on)); }

// ---- 날씨·비 (측정 장면) ----
let wx = 0, wetG = 0;
function setRainCount() { W.rain.count = ({ low: 400, mid: 1400, high: 2800 })[stage.quality()] * (stage.isReduced() ? .5 : 1); }
setRainCount();
function weatherStep(dt, target) {
  if (stage.isReduced()) target = 0;                 // 움직임 줄이기: 하늘을 바꾸지 않음(갠 날)
  wx += (target - wx) * Math.min(1, dt * 1.5); if (Math.abs(target - wx) < .004) wx = target;
  stage.setWeather(wx);
  W.setWetGround(wetG);
}
let splashBudget = 0;
function rainHit(x, y, z, inMouth) {
  if (inMouth) { if (Math.random() < .35) W.ripple(x, z); return; }
  if (stage.quality() === 'low' || splashBudget <= 0) return; splashBudget--;
  stage.smoke.emit({ p: [x, y + .01, z], v: [(Math.random() - .5) * .3, .5 + Math.random() * .4, (Math.random() - .5) * .3], size: .018, grow: .03, life: .22, color: [.9, .94, .97], alpha: .55, drag: 3, rise: -6 });
}
function showGaugeAt(home) {   // 측우기·측우대를 제자리에 모두 보이게
  W.pad.visible = W.stand.visible = true; W.pad.scale.y = 1; W.stand.position.y = 0;
  W.parts.forEach(p => { p.visible = true; p.position.y = p.userData.home; });
  if (home) { W.ruler.visible = true; W.ruler.position.copy(W.rulerHome); W.ruler.rotation.z = W.rulerLean; W.setWet(null); }
}

// ================= ① 설치 =================
const order = INSTALL.map(s => s.key);
const title = s => s.t.replace(/^\d+\. /, '');
let step = 0, stepT = 1, iPlaying = false, iTimer = 0, placed = true;
$('steps').innerHTML = INSTALL.map((s, i) => `<button data-i="${i}">${title(s)}</button>`).join('');
$('iDots').innerHTML = INSTALL.map((s, i) => `<button data-i="${i}" aria-label="${s.t}"></button>`).join('');
$('steps').onclick = $('iDots').onclick = e => { const b = e.target.closest('button'); if (b) setStep(+b.dataset.i); };
function setStep(i, quiet) {
  const prev = step; step = clamp(i, 0, INSTALL.length - 1); stepT = 0; placed = false;
  const s = INSTALL[step], name = title(s);
  $('iK').textContent = `설치 ${step + 1} / ${INSTALL.length}`; $('iT').textContent = name; $('iE').textContent = s.easy; $('iD').textContent = s.d; $('cap').textContent = name;
  $('iTags').innerHTML = (s.rec || []).map(t => `<span class="k-tag rec">${t}</span>`).join('') + (s.est || []).map(t => `<span class="k-tag est">${t}</span>`).join('') + (s.asm || []).map(t => `<span class="k-tag asm">${t}</span>`).join('');
  $('iPrev').disabled = step === 0; $('iNext').textContent = step === INSTALL.length - 1 ? '② 측정으로 ▶' : '다음 ▶';
  const n = prog.see('install', s.key);
  [...$('steps').children].forEach((b, k) => b.classList.toggle('on', k === step));
  [...$('iDots').children].forEach((b, k) => { b.className = k === step ? 'on' : prog.seen('install', INSTALL[k].key) ? 'seen' : ''; });
  stage.setHome(...(s.key === 'site' ? VIEWS.site : step >= 4 ? VIEWS.gauge : VIEWS.near));
  const top = W.standTop;
  setTags(s.key === 'site' ? [['처마 물이 떨어짐 ✕', [-2.2, 2.4, -1.3], '#9e2f1e'], ['나뭇가지 물·바람 ✕', [2.9, 2.6, -.9], '#9e2f1e'], ['트인 마당 ○', [0, .9, 0], '#3d7a4a']]
    : s.key === 'base' ? [['박석을 깔고 다짐', [0, PAVE + .2, .55]]]
    : s.key === 'stand' ? [['측우대 30.3cm (대리석)', [.36, PAVE + .22, .2]], ['수평', [0, top + .08, 0]]]
    : s.key === 'hole' ? [['홈 (지름 16cm · 깊이 4.3cm, 가정)', [0, top + .12, 0]]]
    : s.key === 'g1' ? [['하단(바닥 막힘)', [.2, top + .08, 0]]]
    : s.key === 'g2' ? [['중단 · 명문 錦營 測雨器…', [.24, top + .17, 0]]]
    : s.key === 'g3' ? [['상단 · 높이 32cm', [.22, top + .26, 0]], ['안지름 14cm', [0, W.gaugeTop + .06, 0]]]
    : [['주척 1척 ≈ 20cm', [W.rulerHome.x - .02, W.base + .5, .2]]]);
  if (!quiet && prev !== step) sfx.play('step');
  if (n >= INSTALL.length) finish('install', 'groundwork');
}
function installFrame(dt) {
  stepT = Math.min(1, stepT + dt / (stage.isReduced() ? .05 : 1.1));
  const e = 1 - (1 - stepT) ** 3, k = order[step];
  const vis = key => order.indexOf(key) <= step;
  if (stepT >= 1 && !placed) { placed = true; if (tab === 'install' && k !== 'site') sfx.play(k[0] === 'g' ? 'knock' : k === 'ruler' ? 'tap' : 'thud'); }
  W.marks.group.visible = k === 'site';
  W.pad.visible = vis('base'); W.pad.scale.y = k === 'base' ? Math.max(.01, e) : 1;
  W.stand.visible = vis('stand'); W.stand.position.y = k === 'stand' ? (1 - e) * .6 : 0;
  W.parts.forEach((p, i) => { const key = 'g' + (i + 1); p.visible = vis(key); p.position.y = p.userData.home + (k === key ? (1 - e) * .35 : 0); });
  W.ruler.visible = vis('ruler'); W.ruler.position.copy(W.rulerHome); W.ruler.rotation.z = W.rulerLean; if (k === 'ruler') W.ruler.position.y += (1 - e) * .3;
  W.water.set(0); W.setWet(null); W.rain.obj.visible = false; W.cmp.visible = false;
  wetG = Math.max(0, wetG - dt * .3); weatherStep(dt, 0);
  if (iPlaying && stepT >= 1) { iTimer += dt; if (iTimer > 3.2) { iTimer = 0; if (step < INSTALL.length - 1) setStep(step + 1); else stopPlay(); } }
}
function stopPlay() { iPlaying = false; $('iPlay').textContent = '▶ 차례로 보기'; }
$('iPrev').onclick = () => setStep(step - 1);
$('iNext').onclick = () => { if (step === INSTALL.length - 1) setTab('measure'); else setStep(step + 1); };
$('iPlay').onclick = () => { iPlaying = !iPlaying; iTimer = 0; $('iPlay').textContent = iPlaying ? '⏸ 멈춤' : '▶ 차례로 보기'; if (iPlaying && step === INSTALL.length - 1) setStep(0); };

// ================= ② 측정 =================
let dbgRain = false, mt = 0, mPlaying = false, rainMm = 60, mMode = 'view', lastPhase = '', rainSnd = 0, cmpPlayed = false;
// 주척 읽기 도전
let mis = null;   // { list, i, results, watched, ans:[척,촌,푼], answered, done }
$('mT').max = MEASURE_TOTAL;
$('rainS').oninput = e => { rainMm = +e.target.value; $('rainV').textContent = rainMm + 'mm'; };
const playLabel = () => { $('mPlay').textContent = mPlaying ? '⏸ 멈춤' : mt >= MEASURE_TOTAL ? '⟲ 다시 재생' : '▶ 재생'; };
$('mPlay').onclick = () => { if (mt >= MEASURE_TOTAL) mt = 0; mPlaying = !mPlaying; if (mPlaying) { cmpPlayed = $('cmp').checked; } playLabel(); };
$('mReset').onclick = () => { mt = 0; mPlaying = false; playLabel(); };
$('mT').oninput = e => { mt = +e.target.value; mPlaying = false; playLabel(); };
$('cut').onchange = e => setCut(e.target.checked);
$('cmp').onchange = e => { if (e.target.checked) cmpPlayed = cmpPlayed && mPlaying; stage.setHome(...(e.target.checked ? VIEWS.cmp : VIEWS.measure)); };
$('mMode').onclick = e => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); };
function setMode(m) {
  mMode = m; mPlaying = false; mt = 0; lastPhase = '';
  [...$('mMode').children].forEach(b => { b.classList.toggle('on', b.dataset.m === m); b.setAttribute('aria-pressed', b.dataset.m === m); });
  $('mView').hidden = m !== 'view'; $('mMis').hidden = m !== 'mission'; $('p-why').hidden = m !== 'view' || tab !== 'measure';
  if (m === 'mission') { if (!mis || mis.done) newMission(); else drawMission_(); stage.setHome(...VIEWS.measure); }
  else { stage.setHome(...($('cmp').checked ? VIEWS.cmp : VIEWS.measure)); playLabel(); }
}
function newMission() { mis = { list: drawMission(), i: 0, results: [], watched: false, ans: [0, 0, 0], answered: false, done: false }; drawMission_(); }
function drawMission_() {
  const q = mis.list[mis.i];
  $('misN').textContent = mis.done ? '도전 결과' : `도전 ${mis.i + 1} / 3`;
  $('misS').innerHTML = mis.done ? '' : mis.results.map(r => (r.ok ? '✓' : '✕')).join(' ') || '';
  $('misIn').hidden = $('misH').hidden = $('misRain').hidden = mis.done; $('misOk').parentElement.hidden = mis.done;
  [0, 1, 2].forEach(k => ($('u' + k).textContent = mis.ans[k]));
  $('misIn').classList.toggle('locked', mis.answered); $('misIn').querySelectorAll('button').forEach(b => (b.disabled = mis.answered));
  $('misOk').disabled = !mis.watched || mis.answered;
  $('misRain').textContent = mis.watched ? '⟲ 장면 다시 보기' : '▶ 비 내리기';
  if (mis.done) {
    const n = missionStars(mis.results), ok = mis.results.filter(r => r.ok).length;
    $('misP').innerHTML = `3문제 중 <b>${ok}문제</b> 성공 ${stars(n)}`;
    $('misR').hidden = false; $('misR').className = 'k-msg' + (n ? ' good' : '');
    $('misR').innerHTML = mis.results.map((r, k) => `${k + 1}. ${r.ok ? '✓' : '✕'} 정답 ${toChukPun(mis.list[k].rainMm).ko}(${mis.list[k].rainMm}mm) · 내 답 ${r.ansKo}`).join('<br>') + (n < 3 ? '<br><span class="k-note">세 문제 모두 0푼 차이로 맞히면 별 3개!</span>' : '');
    $('misNav').hidden = false; $('misAgain').hidden = true; $('misNext').textContent = '⟲ 새 문제로 다시 도전';
  } else {
    $('misP').textContent = mis.answered ? '' : mis.watched ? '젖은 자국 맨 위가 주척의 몇 척·몇 촌·몇 푼인지 읽어 보세요.' : '비가 내렸어요. 주척의 젖은 자국을 읽어 보세요.';
    $('misR').hidden = !mis.answered; $('misNav').hidden = !mis.answered; $('misAgain').hidden = false;
    $('misNext').textContent = mis.i === 2 ? '결과 보기 ▶' : '다음 문제 ▶';
    if (!mis.answered) $('misR').className = 'k-msg';
  }
}
$('misIn').onclick = e => {
  const b = e.target.closest('button'); if (!b || !mis || mis.answered) return;
  const u = +b.dataset.u, max = u === 0 ? 1 : 9; mis.ans[u] = (mis.ans[u] + +b.dataset.d + max + 1) % (max + 1); $('u' + u).textContent = mis.ans[u];
};
$('misRain').onclick = () => { mt = 0; mPlaying = true; lastPhase = ''; stage.setHome(...VIEWS.measure); };
$('misAgain').onclick = () => { mt = 0; mPlaying = true; lastPhase = ''; stage.setHome(...VIEWS.measure); };
$('misOk').onclick = () => {
  if (!mis || mis.answered) return;
  const q = mis.list[mis.i], ans = readingPun(...mis.ans), j = judgeReading(q.truePun, ans), t = toChukPun(q.rainMm), mine = toChukPun(ans * 2);
  mis.answered = true; mis.results.push({ ...j, ansKo: mine.ko });
  $('misR').hidden = false; $('misR').className = 'k-msg' + (j.ok ? ' good' : '');
  $('misR').innerHTML = j.ok ? `<b>✓ ${j.exact ? '정확해요!' : '성공!'}</b> 정답은 ${t.ko}(${q.rainMm}mm) — 내 답과 ${j.diff}푼 차이.`
    : `<b>✕ 아쉬워요.</b> 정답은 ${t.ko}(${q.rainMm}mm)이에요. 1푼은 2mm니까 ${q.rainMm}mm ÷ 2 = ${q.truePun}푼! (내 답 ${mine.ko}, ${j.diff}푼 차이)<br><span class="k-note">1푼은 2mm, 가장 짧은 눈금 한 칸이 1푼이에요.</span>`;
  sfx.play(j.ok ? 'ok' : 'no'); if (j.ok) prog.award('readRuler1');
  drawMission_();
};
$('misNext').onclick = () => {
  if (mis.done) { newMission(); mt = 0; stage.setHome(...VIEWS.measure); return; }
  if (mis.i < 2) { mis.i++; mis.ans = [0, 0, 0]; mis.watched = false; mis.answered = false; mt = 0; mPlaying = false; drawMission_(); stage.setHome(...VIEWS.measure); return; }
  mis.done = true; const n = missionStars(mis.results);
  prog.setStar('ruler', n); if (mis.results.every(r => r.exact)) prog.award('exactReader');
  finish('measure'); sfx.play(n ? 'badge' : 'step'); mt = 0; mPlaying = false; drawMission_(); stage.setHome(...VIEWS.measure);
};
const MIS_END = MEASURE_TOTAL - MEASURE[MEASURE.length - 1].dur - .01;   // 도전: 「기록」 장면 끝(자를 든 채)에서 멈춤
function measureFrame(dt) {
  const mission = mMode === 'mission', end = mission ? MIS_END : MEASURE_TOTAL;
  if (mPlaying) { mt = Math.min(end, mt + dt); if (mt >= end) { mPlaying = false; sceneEnd(); } }
  if (!mission) { $('mT').value = mt; $('mTV').textContent = mt.toFixed(1) + '초'; }
  const total = mission ? (mis && mis.list[mis.i].rainMm) || 0 : rainMm, s = measureAt(mt, total);
  showGaugeAt(false); W.marks.group.visible = false;
  W.water.set(s.water);
  W.rain.obj.visible = s.raining && (mPlaying || dbgRain);
  splashBudget = 4;
  if (W.rain.obj.visible) W.rainStep(dt * (stage.isReduced() ? .5 : 1), rainHit);
  W.rippleStep(dt, W.gaugeBottom + .006 + s.water / 1000);
  // 자: 측우기 한가운데 위에서 내려가 바닥에 닿음
  W.ruler.visible = true;
  if (s.ruler !== null) { W.ruler.position.set(-.004, W.gaugeBottom + .006 + s.ruler / 1000, 0); W.ruler.rotation.z = 0; }
  else { W.ruler.position.copy(W.rulerHome); W.ruler.rotation.z = W.rulerLean; }
  W.setWet(s.wet);
  W.cmp.visible = !mission && $('cmp').checked; W.cmpWater.forEach(w => w.set(s.water));
  // 하늘: 비 오는 동안 흐림 → 자를 읽을 때 반쯤 갬 → 비울 때 갬. 재생 전(0초)은 갠 날
  const started = mt > 0 || mPlaying, target = !started ? 0 : s.key === 'rain' || s.key === 'stop' ? 1 : s.key === 'empty' ? 0 : .5;
  wetG = s.key === 'rain' && started ? Math.min(1, wetG + dt * .25) : Math.max(0, wetG - dt * .05);
  weatherStep(dt, target);
  // 소리
  if (s.key !== lastPhase && started) { if (s.key === 'ruler') sfx.play('whoosh'); if (s.key === 'empty') sfx.play('splash'); if (s.key === 'read') sfx.play('drip'); if (s.key === 'record') sfx.play('step'); }
  if (s.raining && mPlaying) { rainSnd -= dt; if (rainSnd <= 0) { sfx.play('rain'); rainSnd = 1.35; } if (Math.random() < dt * (1 + total / 40)) sfx.play('drip'); } else rainSnd = 0;
  // 도전: 「기록」 장면에 오면 젖은 자국 쪽으로 다가가서 본다
  if (mission && s.key === 'record' && lastPhase !== 'record' && started && mis) {
    const yTop = W.gaugeBottom + .006 + s.ruler / 1000 + total / 1000;
    stage.setHome([-.05, yTop + .015, .15], [-.004, yTop, 0]);
  }
  lastPhase = started ? s.key : '';
  $('cap').textContent = !started ? (mission ? '주척 읽기 도전' : '「재생」을 눌러 보세요') : mission && !mis?.answered && s.key === 'record' ? '젖은 자국을 읽어 보세요' : s.cap;
  if (!mission) {
    $('mE').textContent = started ? MEASURE[s.index].easy : '「재생」을 누르면 비가 내리고, 관원이 주척으로 깊이를 재요.';
    const wd = waterDepth(s.water), shown = ['read', 'record', 'empty'].includes(s.key) && started;
    $('rD').textContent = s.water.toFixed(0) + 'mm'; $('rV').textContent = Math.round(wd.ml) + 'mL';
    $('rK').textContent = shown ? s.reading.ko : '—'; $('rH').textContent = shown ? s.reading.hj : '—';
    $('rec').textContent = (s.key === 'record' || s.key === 'empty') && started ? `雨水 深 ${s.reading.hj}` : '';
    if (rainMm > GAUGE.h) $('cap').textContent = '320mm가 넘으면 넘칩니다 — 큰비에는 하루에 여러 번 재고 비웠습니다';
  }
  // 이름표: 도전 중(답하기 전)에는 답이 보이므로 숨긴다
  const hideAns = mission && !mis?.answered;
  setTags(W.cmp.visible ? [['좁은 통', [-.5, .43, .25]], ['측우기', [0, W.gaugeTop + .06, 0]], ['넓은 통', [.62, .43, .25]], [`셋 다 깊이 ${Math.round(s.water)}mm`, [.1, W.base + s.water / 1000 + .16, .5], '#2f6ea8']]
    : s.wet !== null && !hideAns ? [[`젖은 자국 ${s.reading.ko} (${s.reading.mm}mm)`, [.12, W.gaugeBottom + .006 + (s.ruler || 0) / 1000 + s.wet / 1000 + .02, .05], '#2f6ea8']] : []);
}
function sceneEnd() {
  if (mMode === 'mission') { if (mis && !mis.watched) { mis.watched = true; drawMission_(); } return; }
  playLabel(); prog.award('firstRain'); if (cmpPlayed && $('cmp').checked) prog.award('sameDepth');
}

// ================= ③ 강수량 자료 =================
let ctx = null, card = 0, more = null, year = 1832, chartApi = null;
const CHART = { month: CH.chartMonth, annual: CH.chartAnnual, era: CH.chartEra, year: CH.chartYear, wettest: CH.chartWettest, heat: CH.chartHeat, stats: CH.statTable, table: CH.dataTable, src: host => { host.innerHTML = `<section class="chart"><h3>치수와 자료의 출처</h3>${SOURCES}</section>`; } };
$('dDots').innerHTML = CARDS.map((c, i) => `<button data-i="${i}" aria-label="질문 ${i + 1}: ${c.q}"></button>`).join('');
$('dDots').onclick = e => { const b = e.target.closest('button'); if (b) setCard(+b.dataset.i); };
$('moreList').innerHTML = MORE.map(m => `<button class="k-btn" data-m="${m.id}" aria-pressed="false">${m.name}</button>`).join('');
$('moreList').onclick = e => { const b = e.target.closest('button'); if (b) setMore(more === b.dataset.m ? null : b.dataset.m); };
function drawChart() {
  if (!ctx) ctx = CH.prepare(ROWS);
  const id = more || CARDS[card].chart, host = $('dv'), keep = host.scrollTop;
  chartApi = CHART[id](host, ctx, { year, onPick: y => { pickYear(y); setCard(3); } }) || null;
  host.scrollTop = more ? keep : 0;
}
function setCard(i, quiet) {
  const prev = card; card = clamp(i, 0, CARDS.length - 1); more = null;
  const c = CARDS[card], t = CH.cardText(ctx || (ctx = CH.prepare(ROWS)), c.id, year);
  $('dK').textContent = `질문 ${card + 1} / ${CARDS.length}`; $('dQ').textContent = c.q; $('dA').textContent = t.answer; $('dD').innerHTML = t.detail;
  $('dYear').hidden = c.id !== 'q4'; syncYear();
  $('dPrev').disabled = card === 0; $('dNext').textContent = card === CARDS.length - 1 ? '④ 퀴즈로 ▶' : '다음 ▶';
  const n = prog.see('data', c.id);
  [...$('dDots').children].forEach((b, k) => { b.className = k === card ? 'on' : prog.seen('data', CARDS[k].id) ? 'seen' : ''; });
  [...$('moreList').children].forEach(b => { b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); });
  if (prev !== card) $('dD').parentElement.open = detailOpen();
  drawChart();
  if (!quiet && prev !== card) sfx.play('step');
  if (n >= CARDS.length) finish('data');
}
function setMore(id) {
  if (!id) { setCard(card, true); return; }
  more = id; [...$('moreList').children].forEach(b => { b.classList.toggle('on', b.dataset.m === id); b.setAttribute('aria-pressed', b.dataset.m === id); });
  drawChart(); $('dv').scrollTop = 0;
  if (matchMedia('(max-width:900px)').matches) $('dv').scrollIntoView({ block: 'nearest', behavior: stage.isReduced() ? 'auto' : 'smooth' });
}
function syncYear() { $('yS').value = year; $('yV').textContent = year + '년'; }
function pickYear(y) {
  year = clamp(Math.round(y), 1778, 2026); syncYear();
  if (prog.see('era', eraKeyOf(year)) >= 3) prog.award('timeTravel');
  if (CARDS[card].id === 'q4' && !more) { const t = CH.cardText(ctx, 'q4', year); $('dA').textContent = t.answer; $('dD').innerHTML = t.detail; drawChart(); }
  else chartApi?.pick?.(year);
}
$('yS').oninput = e => pickYear(+e.target.value);
$('yPrev').onclick = () => pickYear(year - 1); $('yNext').onclick = () => pickYear(year + 1);
$('dPrev').onclick = () => setCard(card - 1);
$('dNext').onclick = () => { if (card === CARDS.length - 1) setTab('quiz'); else setCard(card + 1); };
let rsT = 0, lastW = 0;
new ResizeObserver(() => { if (tab !== 'data') return; const w = $('dv').clientWidth; if (Math.abs(w - lastW) < 2) return; lastW = w; clearTimeout(rsT); rsT = setTimeout(drawChart, 80); }).observe($('dv'));

// ================= ④ 퀴즈 =================
let qOrder = [], qPos = 0, qScore = 0, qWrong = [], qFirstRound = true, qAnswered = false;
function startQuiz(list) { qOrder = list || QUIZ.map((_, i) => i); qFirstRound = !list; qPos = 0; qScore = 0; qWrong = []; showQ(); }
function showQ() {
  const [q, o] = QUIZ[qOrder[qPos]]; qAnswered = false;
  $('qn').textContent = `퀴즈 ${qPos + 1} / ${qOrder.length} · 맞힌 수 ${qScore}`; $('qq').textContent = q; $('qe').hidden = true; $('qe').classList.remove('good');
  const idx = o.map((_, i) => i).sort(() => Math.random() - .5);   // 보기 순서는 보여 줄 때마다 섞는다
  $('qopts').innerHTML = idx.map((i, k) => `<button class="k-btn" data-i="${i}"><b>${k + 1}</b>&nbsp; ${o[i]}</button>`).join('');
  $('qnext').hidden = true; $('qnext').textContent = qPos === qOrder.length - 1 ? '결과 보기 ▶' : '다음 문제 ▶';
}
function answerQ(b) {
  if (!b || qAnswered || !('i' in b.dataset)) return; qAnswered = true;
  const [, , a, ex] = QUIZ[qOrder[qPos]], i = +b.dataset.i, ok = i === a;
  if (ok) qScore++; else qWrong.push(qOrder[qPos]);
  [...$('qopts').children].forEach(x => { if (+x.dataset.i === a) { x.classList.add('ok'); x.insertAdjacentText('afterbegin', '✓ '); } else if (x === b) { x.classList.add('no'); x.insertAdjacentText('afterbegin', '✕ '); } x.disabled = +x.dataset.i !== a && x !== b; });
  $('qe').hidden = false; $('qe').classList.toggle('good', ok); $('qe').innerHTML = `<b>${ok ? '정답!' : '아쉬워요.'}</b> ${ex}`;
  $('qn').textContent = `퀴즈 ${qPos + 1} / ${qOrder.length} · 맞힌 수 ${qScore}`; $('qnext').hidden = false; sfx.play(ok ? 'ok' : 'no');
}
$('qopts').onclick = e => answerQ(e.target.closest('button'));
$('qnext').onclick = () => {
  if ('again' in $('qnext').dataset) { delete $('qnext').dataset.again; startQuiz(); return; }
  if (qPos < qOrder.length - 1) { qPos++; showQ(); return; }
  const n = quizStars(qScore, QUIZ.length), first = qFirstRound;   // 별·기록은 처음 8문항 결과로만
  if (first) { prog.setStar('quiz', n); finish('quiz', n === 3 ? 'quizMaster' : null); }
  $('qn').textContent = first ? '퀴즈 결과' : '다시 풀기 결과'; $('qq').innerHTML = `${qOrder.length}문제 중 ${qScore}문제 정답 ${first ? stars(n) : ''}`;
  $('qe').hidden = false; $('qe').classList.remove('good');
  $('qe').innerHTML = qWrong.length ? '틀린 문제만 다시 풀어 볼 수 있어요. 헷갈리면 메뉴로 돌아가 다시 살펴보세요.<br>' + qWrong.map(k => `<span class="k-note">· ${QUIZ[k][0]} → ${QUIZ[k][1][QUIZ[k][2]]}</span>`).join('<br>') : '모두 맞혔어요! 측우 박사네요.';
  $('qopts').innerHTML = (qWrong.length ? '<button class="k-btn" id="qRetry">틀린 문제 다시 풀기</button>' : '') + '<button class="k-btn" id="qRec">🏅 내 기록 보기</button>';
  if (qWrong.length) { const wrong = [...qWrong]; $('qRetry').onclick = ev => { ev.stopPropagation(); startQuiz(wrong); }; }
  $('qRec').onclick = ev => { ev.stopPropagation(); prog.open(); };
  $('qnext').hidden = false; $('qnext').textContent = '처음부터 다시'; $('qnext').dataset.again = 1; qAnswered = true;
};

// ================= 메뉴 =================
let looping = true;
function setTab(t) {
  tab = t; drawNav(); stopPlay(); mPlaying = false;
  for (const m of MENUS) $('p-' + m.id).hidden = m.id !== t;
  $('p-why').hidden = t !== 'measure' || mMode !== 'view'; $('p-more').hidden = t !== 'data';
  const data = t === 'data';
  $('cv').hidden = data; $('dv').hidden = !data;
  // 강수량 자료에서는 3D를 숨기고 그리기를 멈춘다(배터리 절약)
  if (data && looping) { renderer.setAnimationLoop(null); looping = false; } else if (!data && !looping) { stage.start(); looping = true; }
  $('hud').hidden = true; $('cap').textContent = ''; setTags([]); stage.smoke.clear();
  ctl.autoRotate = t === 'quiz' && !stage.isReduced(); ctl.autoRotateSpeed = .8;
  setCut(t === 'measure' && $('cut').checked);
  if (t === 'install') setStep(step, true);
  if (t === 'measure') { mt = 0; lastPhase = ''; setMode(mMode); }
  if (data) { lastW = $('dv').clientWidth; setCard(card, true); }
  if (t === 'quiz') { showGaugeAt(true); W.water.set(0); W.rain.obj.visible = false; W.cmp.visible = false; W.marks.group.visible = false; stage.setHome(...VIEWS.quiz); $('cap').textContent = '측우기와 측우대'; if (!qOrder.length) startQuiz(); }
  $('panel').scrollTop = 0; settings.apply();
}
$('nav').onclick = e => { const b = e.target.closest('button'); if (b) setTab(b.dataset.tab); };
addEventListener('keydown', e => {
  if (e.target.closest('input,select,textarea,dialog') || e.altKey || e.ctrlKey || e.metaKey) return;
  if (/^[1-4]$/.test(e.key) && tab === 'quiz' && !qAnswered && !e.target.closest('#nav')) { answerQ($('qopts').children[+e.key - 1]); return; }
  if (/^[1-4]$/.test(e.key)) { setTab(MENUS[+e.key - 1].id); return; }
  if (e.key === ' ' && tab === 'measure' && mMode === 'view' && !e.target.closest('button,summary')) { e.preventDefault(); $('mPlay').click(); return; }
  if (e.key === '+' || e.key === '=') { stage.zoom(.8); return; } if (e.key === '-') { stage.zoom(1.25); return; } if (e.key === '0') { stage.home(); return; }
  const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d || e.target.closest('canvas')) return;
  if (tab === 'install') setStep(step + d); else if (tab === 'data' && !more) setCard(card + d);
});

// ================= 출처 (v1 출처 상자 그대로) =================
const SOURCES = `<div class="tw"><table class="k-table">
 <tr><th>항목</th><th>값</th></tr>
 <tr><td>측우기 높이·지름</td><td>32cm · 바깥 15 / 안 14cm, 3단</td></tr>
 <tr><td>세종 규격(1442)</td><td>높이 1척 5촌 · 지름 7촌</td></tr>
 <tr><td>측우대(창덕궁, 1782)</td><td>높이 30.3cm · 가로 45.3 · 세로 45.5cm, 대리석</td></tr>
 <tr><td>측우대 홈</td><td>지름 16cm · 깊이 4.3cm(대구 측우대 값<span class="k-as">가정</span>)</td></tr>
 <tr><td>측우기 명문</td><td>錦營 測雨器 高一尺五寸 徑七寸 道光丁酉製 重十一斤</td></tr>
 <tr><td>마디 띠 두께·폭</td><td>사진 비율<span class="k-as">가정</span></td></tr>
 <tr><td>주척</td><td>1척 = 200mm, 1푼 = 2mm</td></tr>
</table></div>
<p class="k-note">모형: 측우대는 창덕궁 측우대(정조 6년 1782, 국립고궁박물관), 측우기는 공주 충청감영 측우기(1837, 국보) 모양과 명문을 따랐습니다. 측우대 겉면 명문은 확인한 자료가 없어 새기지 않았습니다.<br>
강수량 자료: Lee, Shin &amp; Hong (2024) 「Precipitation data in Seoul, Korea during 1778–1907」, <i>Scientific Data</i> 11:566, 자료 <a href="https://zenodo.org/records/11076768" target="_blank" rel="noopener">Zenodo doi:10.5281/zenodo.11076768</a> (승정원일기·일성록 복원) · <a href="https://data.kma.go.kr/cmmn/main.do" target="_blank" rel="noopener">기상청 기상자료개방포털</a> 서울(108) 일 강수량 1907.10–2026.11.7 · <a href="https://encykorea.aks.ac.kr/Article/E0007902" target="_blank" rel="noopener">한국민족문화대백과 「공주 충청감영 측우기」</a> · <a href="https://encykorea.aks.ac.kr/Article/E0014106" target="_blank" rel="noopener">「대구 경상감영 측우대」</a><br>
이음: 1907년 9월까지 조선 자료, 10월부터 기상청 자료. 1950년 9월~1952년 8월 일부 달은 전쟁으로 빠져 그 해 연 강수량은 비워 두었습니다.<br>
마당·전각·나무·담, 측우대 모서리 둥글림, 비·하늘·물 표현은 보기 위한 연출입니다(기록 아님).</p>`;
$('srcIn').innerHTML = SOURCES;

// ================= 시작 =================
setTab('install');
stage.onFrame(dt => { if (tab === 'install') installFrame(dt); else if (tab === 'measure') measureFrame(dt); else if (tab === 'quiz') { W.rippleStep(dt, 0); weatherStep(dt, 0); } });
stage.start();
// 검증·디버그용 (창이 숨겨져 rAF가 느릴 때 상태를 직접 바꿔 확인)
const tick = (n = 1, dt = .05) => { for (let i = 0; i < n; i++) { if (tab === 'install') installFrame(dt); else if (tab === 'measure') measureFrame(dt); } ctl.update(); stage.smoke.update(dt, 600); renderer.render(scene, cam); };
window.__set = { tab: setTab, step: setStep, card: setCard, more: setMore, year: pickYear, mode: setMode,
  mt: v => { mt = v; mPlaying = false; tick(1, .001); }, rain: v => { rainMm = v; $('rainS').value = v; $('rainV').textContent = v + 'mm'; }, play: () => $('mPlay').click(),
  cmp: v => { $('cmp').checked = v; $('cmp').onchange({ target: $('cmp') }); }, cut: v => { $('cut').checked = v; setCut(v); },
  tick, settle: () => { stepT = 1; for (let i = 0; i < 3; i++) tick(1, .05); jumpHome(); tick(1, .001); },
  rainNow: v => { dbgRain = v; tick(10, .03); },
  weather: v => { wx = v; stage.setWeather(v); }, wet: v => { wetG = v; W.setWetGround(v); },
  mission: { start: () => setMode('mission'), watch: () => { mt = MIS_END; mis.watched = true; lastPhase = ''; tick(1, .001); drawMission_(); }, answer: (c, ch, p) => { mis.ans = [c, ch, p]; drawMission_(); $('misOk').click(); }, next: () => $('misNext').click(), state: () => mis } };
window.__state = () => ({ tab, step, mt, year, card, more, mMode, quality: stage.quality(), weather: stage.weather(), looping });
window.__W = W; window.__stage = stage;
