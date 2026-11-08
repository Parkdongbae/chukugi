import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { INSTALL, MEASURE_TOTAL, measureAt, waterDepth, toChukPun, GAUGE } from './sim.js';
import { buildWorld, rainStep, label } from './model.js';
import { buildCharts, yearCard, statCard } from './charts.js';
import { ROWS } from './data.js';

const $ = id => document.getElementById(id);
const cv = $('cv');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.shadowMap.enabled = true; renderer.localClippingEnabled = true;
cv.prepend(renderer.domElement);
const scene = new THREE.Scene();
const cam = new THREE.PerspectiveCamera(35, 1, .01, 100);
const ctl = new OrbitControls(cam, renderer.domElement); ctl.enableDamping = true; ctl.maxPolarAngle = Math.PI * .49; ctl.minDistance = .25; ctl.maxDistance = 16;
scene.add(new THREE.HemisphereLight(0xf4efe4, 0x8a8170, 1.4));
const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(-3, 6, 4); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 }); scene.add(sun);
const W = buildWorld(scene);
window.__cam = cam; window.__ctl = ctl; window.__W = W;

function resize() { const r = cv.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height); cam.aspect = r.width / r.height; cam.updateProjectionMatrix(); }
new ResizeObserver(resize).observe(cv);

// 시점 옮기기(부드럽게)
let camAnim = null;
function view(pos, target, dur = 1) {
  resize();
  // 좁은(세로) 화면에서는 멀리서 보아 전체가 들어오게
  const t1 = new THREE.Vector3(...target), k = cam.aspect < 1 ? Math.pow(1 / cam.aspect, .8) : 1;
  const p1 = new THREE.Vector3(...pos).sub(t1).multiplyScalar(k).add(t1);
  camAnim = { p0: cam.position.clone(), t0: ctl.target.clone(), p1, t1, u: 0, dur };
}
const VIEWS = {
  site: [[-1.5, 6.5, 9], [0, .6, -1.5]],
  near: [[-1.2, .85, 1.55], [0, .3, 0]],
  gauge: [[-.6, .8, .85], [0, .48, 0]],
  measure: [[-.62, .78, 1.05], [.05, .44, 0]],
  cmp: [[-.35, 1.2, 2.9], [.08, .28, .1]],
};
let homeView = VIEWS.near;
$('zi').onclick = () => { const d = cam.position.clone().sub(ctl.target).multiplyScalar(.8); cam.position.copy(ctl.target).add(d); };
$('zo').onclick = () => { const d = cam.position.clone().sub(ctl.target).multiplyScalar(1.25); cam.position.copy(ctl.target).add(d); };
$('zr').onclick = () => view(...homeView);

// 이름표
const tags = new THREE.Group(); scene.add(tags);
function setTags(list) { tags.clear(); for (const [t, p, c] of list) { const s = label(t, c); s.position.set(...p); tags.add(s); } }

// 반 잘라 보기
const clip = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
function setCut(on) { for (const m of [W.bronze, W.inscription.material, ...W.standMats]) { m.clippingPlanes = on ? [clip] : []; m.needsUpdate = true; } W.cap.visible = on; }

// ---------------- 설치 방법 ----------------
let step = 0, stepT = 1, iPlaying = false, iTimer = 0;
const order = INSTALL.map(s => s.key);
$('steps').innerHTML = INSTALL.map((s, i) => `<button data-i="${i}">${s.t}</button>`).join('');
$('steps').onclick = e => { const b = e.target.closest('button'); if (b) setStep(+b.dataset.i); };
function setStep(i) {
  step = Math.max(0, Math.min(INSTALL.length - 1, i)); stepT = 0;
  const s = INSTALL[step]; $('iT').textContent = s.t; $('iD').textContent = s.d; $('cap').textContent = s.t.replace(/^\d+\. /, '');
  [...$('steps').children].forEach((b, k) => b.classList.toggle('on', k === step));
  const v = s.key === 'site' ? VIEWS.site : step >= 4 ? VIEWS.gauge : VIEWS.near; homeView = v; view(...v);
  const top = W.standTop;
  setTags(s.key === 'site' ? [['처마 물이 떨어짐 ✕', [-3.6, 3.4, -1.6], '#9e2f1e'], ['나뭇가지 물·바람 ✕', [3.4, 3.8, -2], '#9e2f1e'], ['트인 마당 ○', [0, 1.1, 0], '#3d7a4a']]
    : s.key === 'base' ? [['박석을 깔고 다짐', [0, .2, .55]]]
    : s.key === 'stand' ? [['측우대 30.3cm (대리석)', [.36, .22, .2]], ['수평', [0, top + .08, 0]]]
    : s.key === 'hole' ? [['홈 (지름 16cm · 깊이 4.3cm, 가정)', [0, top + .12, 0]]]
    : s.key === 'g1' ? [['하단(바닥 막힘)', [.2, top + .08, 0]]]
    : s.key === 'g2' ? [['중단 · 명문 錦營 測雨器…', [.24, top + .17, 0]]]
    : s.key === 'g3' ? [['상단 · 높이 32cm', [.22, top + .26, 0]], ['안지름 14cm', [0, W.gaugeTop + .06, 0]]]
    : [["주척 1척 ≈ 20cm", [.2, .52, .2]]]);
}
function installFrame(dt) {
  stepT = Math.min(1, stepT + dt / 1.1);
  const e = 1 - (1 - stepT) ** 3, k = order[step];
  const vis = key => order.indexOf(key) <= step;
  W.env.visible = k === 'site';
  W.marks.good.visible = k === 'site';
  W.pad.visible = vis('base'); W.pad.scale.y = k === 'base' ? Math.max(.01, e) : 1;
  W.stand.visible = vis('stand'); W.stand.position.y = k === 'stand' ? (1 - e) * .6 : 0;
  W.parts.forEach((p, i) => { const key = 'g' + (i + 1); p.visible = vis(key); p.position.y = p.userData.home + (k === key ? (1 - e) * .35 : 0); });
  W.ruler.visible = vis('ruler'); W.ruler.position.copy(W.rulerHome); W.ruler.rotation.z = .12; if (k === 'ruler') W.ruler.position.y += (1 - e) * .3;
  W.water.scale.y = 1e-4; W.rain.visible = false; W.cmp.visible = false;
  if (iPlaying && stepT >= 1) { iTimer += dt; if (iTimer > 3.2) { iTimer = 0; if (step < INSTALL.length - 1) setStep(step + 1); else { iPlaying = false; $('iPlay').textContent = '▶ 차례로 보기'; } } }
}
$('iPrev').onclick = () => setStep(step - 1); $('iNext').onclick = () => setStep(step + 1);
$('iPlay').onclick = () => { iPlaying = !iPlaying; iTimer = 0; $('iPlay').textContent = iPlaying ? '⏸ 멈춤' : '▶ 차례로 보기'; if (iPlaying && step === INSTALL.length - 1) setStep(0); };

// ---------------- 측정 방법 ----------------
let mt = 0, mPlaying = false, rainMm = 60;
$('mT').max = MEASURE_TOTAL;
$('rainS').oninput = e => { rainMm = +e.target.value; $('rainV').textContent = rainMm + 'mm'; };
$('mPlay').onclick = () => { if (mt >= MEASURE_TOTAL) mt = 0; mPlaying = !mPlaying; $('mPlay').textContent = mPlaying ? '⏸ 멈춤' : '▶ 재생'; };
$('mReset').onclick = () => { mt = 0; mPlaying = false; $('mPlay').textContent = '▶ 재생'; };
$('mT').oninput = e => { mt = +e.target.value; mPlaying = false; $('mPlay').textContent = '▶ 재생'; };
$('cut').onchange = e => setCut(e.target.checked);
$('cmp').onchange = e => { homeView = e.target.checked ? VIEWS.cmp : VIEWS.measure; view(...homeView); };
function measureFrame(dt) {
  if (mPlaying) { mt = Math.min(MEASURE_TOTAL, mt + dt); if (mt >= MEASURE_TOTAL) { mPlaying = false; $('mPlay').textContent = '▶ 재생'; } }
  $('mT').value = mt;
  const s = measureAt(mt, rainMm);
  W.env.visible = false; W.pad.visible = W.stand.visible = true; W.pad.scale.y = 1; W.stand.position.y = 0;
  W.parts.forEach(p => { p.visible = true; p.position.y = p.userData.home; });
  W.water.scale.y = Math.max(1e-4, s.water / 1000);
  W.rain.visible = s.raining; if (s.raining) rainStep(W, dt);
  // 자: 측우기 한가운데 위에서 내려가 바닥에 닿음
  if (s.ruler !== null) { W.ruler.position.set(-.004, W.gaugeBottom + .006 + s.ruler / 1000, 0); W.ruler.rotation.z = 0; }
  else { W.ruler.position.copy(W.rulerHome); W.ruler.rotation.z = .12; }
  W.wet.visible = s.wet !== null; if (s.wet) W.wet.scale.y = s.wet / 1000;
  W.cmp.visible = $('cmp').checked; W.cmpWater.forEach(w => (w.scale.y = Math.max(1e-4, s.water / 1000)));
  $('cap').textContent = s.cap;
  const wd = waterDepth(s.water);
  $('rD').textContent = s.water.toFixed(0) + 'mm'; $('rV').textContent = Math.round(wd.ml) + 'mL';
  const shown = ['read', 'record', 'empty'].includes(s.key);
  $('rK').textContent = shown ? s.reading.ko : '—'; $('rH').textContent = shown ? s.reading.hj : '—';
  $('rec').textContent = s.key === 'record' || s.key === 'empty' ? `雨水 深 ${s.reading.hj}` : '';
  setTags(W.cmp.visible ? [['좁은 통', [-.5, .4, .25]], ['측우기', [0, W.gaugeTop + .06, 0]], ['넓은 통', [.62, .4, .25]], [`셋 다 깊이 ${Math.round(s.water)}mm`, [.1, .02 + s.water / 1000 + .18, .5], '#2f6ea8']]
    : s.wet ? [[`젖은 자국 ${s.reading.ko} (${s.reading.mm}mm)`, [.12, W.gaugeBottom + s.wet / 1000 + .02, .05], '#2f6ea8']] : []);
  if (rainMm > GAUGE.h) $('cap').textContent = '320mm가 넘으면 넘칩니다 — 큰비에는 하루에 여러 번 재고 비웠습니다';
}

// ---------------- 강수량 자료 ----------------
let charts = null, year = 1832;
function pickYear(y) { year = y; yearCard($('yearbox'), ROWS, y, charts, pickYear); charts.pick(y); }

// ---------------- 탭 ----------------
let tab = 'install';
function setTab(t) {
  tab = t;
  document.querySelectorAll('#tabs button[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
  $('installbox').hidden = t !== 'install'; $('measurebox').hidden = $('sciencebox').hidden = t !== 'measure';
  $('yearbox').hidden = $('statbox').hidden = t !== 'data';
  $('cv').hidden = t === 'data'; $('dv').hidden = t !== 'data';
  setCut(t === 'measure' && $('cut').checked);
  if (t === 'install') setStep(step);
  if (t === 'measure') { homeView = $('cmp').checked ? VIEWS.cmp : VIEWS.measure; view(...homeView); setTags([]); }
  if (t === 'data') { if (!charts) { charts = buildCharts($('dv'), ROWS, pickYear); statCard($('statbox'), charts); } pickYear(year); }
  else resize();
}
document.querySelectorAll('#tabs button[data-tab]').forEach(b => (b.onclick = () => setTab(b.dataset.tab)));

// ---------------- 퀴즈 ----------------
const Q = [
  ['측우기로 잰 값은 무엇인가?', ['빗물의 무게', '고인 빗물의 깊이', '빗방울의 수', '비가 내린 시간'], 1, '주척을 넣어 고인 물의 깊이를 척·촌·푼으로 읽었습니다.'],
  ['측우기 지름을 두 배로 키우면 같은 비에 물 깊이는?', ['두 배', '네 배', '같다', '절반'], 2, '받는 물의 부피도 넓이에 비례해 늘어나므로 깊이는 같습니다.'],
  ['측우대를 땅보다 높게 둔 까닭으로 가장 알맞은 것은?', ['보기 좋게 하려고', '땅에서 튀는 물이 들어가지 않게', '물을 빨리 증발시키려고', '도둑을 막으려고'], 1, '튀어 오르는 빗물과 흙탕물을 막고, 늘 같은 높이에서 재기 위해서입니다.'],
  ['기록 「雨水 深 二寸三分」은 몇 mm인가? (1푼 = 2mm)', ['23mm', '46mm', '230mm', '4.6mm'], 1, '2촌 3푼 = 23푼 = 46mm.'],
  ['서울에서 평균적으로 비가 가장 많은 달은?', ['6월', '7월', '8월', '9월'], 1, '조선 시대와 지금 모두 7월이 가장 많습니다(장마).'],
  ['1778–1906년 서울 연평균 강수량에 가장 가까운 값은?', ['약 800mm', '약 1,200mm', '약 1,800mm', '약 2,400mm'], 1, 'Lee 외(2024) 복원값 평균 약 1,200mm, 현재 평년(1991–2020)은 약 1,418mm.'],
  ['조선 측우기 기록이 겨울 강수량을 작게 보이게 만든 까닭은?', ['겨울에는 관상감이 쉬어서', '눈을 녹여 재지 않아서', '측우기가 얼어 깨져서', '겨울에는 비가 오지 않아서'], 1, '눈은 날씨 기록만 남기고 양은 재지 않았습니다.'],
  ['측우기 기록이 강수량 연구에서 특별한 까닭은?', ['세계에서 가장 큰 측우기여서', '같은 곳에서 오랫동안 매일 잰 정량 기록이어서', '눈까지 정확히 재서', '자동으로 기록돼서'], 1, '1778년부터 130년 동안 서울에서 매일 잰 값이 승정원일기·일성록에 남아 있습니다.'],
];
let qi = 0, qs = 0;
function showQ() {
  const [q, o, a, ex] = Q[qi]; $('qn').textContent = `${qi + 1} / ${Q.length} · 맞힌 수 ${qs}`; $('qq').textContent = q; $('qe').textContent = '';
  $('qopts').innerHTML = o.map((t, i) => `<button data-i="${i}">${t}</button>`).join(''); $('qnext').disabled = true;
  $('qopts').onclick = e => { const b = e.target.closest('button'); if (!b || !$('qnext').disabled) return; const i = +b.dataset.i;
    if (i === a) qs++; b.classList.add(i === a ? 'ok' : 'no'); $('qopts').children[a].classList.add('ok'); $('qe').textContent = (i === a ? '정답! ' : '아쉬워요. ') + ex; $('qnext').disabled = false;
    $('qn').textContent = `${qi + 1} / ${Q.length} · 맞힌 수 ${qs}`; if (qi === Q.length - 1) $('qnext').textContent = '처음부터'; };
}
$('quizb').onclick = () => { qi = 0; qs = 0; $('qnext').textContent = '다음'; $('quiz').hidden = false; showQ(); };
$('qnext').onclick = () => { if (qi === Q.length - 1) { qi = 0; qs = 0; $('qnext').textContent = '다음'; } else qi++; showQ(); };
$('qclose').onclick = () => ($('quiz').hidden = true);
$('quiz').onclick = e => { if (e.target === $('quiz')) $('quiz').hidden = true; };
addEventListener('keydown', e => { if (e.key === 'Escape') $('quiz').hidden = true; });

// ---------------- 그리기 ----------------
cam.position.set(...VIEWS.near[0]); ctl.target.set(...VIEWS.near[1]);
setStep(0); resize();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(.05, clock.getDelta());
  if (tab === 'data') return;
  if (camAnim) { camAnim.u = Math.min(1, camAnim.u + dt / camAnim.dur); const e = camAnim.u * camAnim.u * (3 - 2 * camAnim.u);
    cam.position.lerpVectors(camAnim.p0, camAnim.p1, e); ctl.target.lerpVectors(camAnim.t0, camAnim.t1, e); if (camAnim.u >= 1) camAnim = null; }
  if (tab === 'install') installFrame(dt); else measureFrame(dt);
  ctl.update(); renderer.render(scene, cam);
});
window.__state = () => ({ tab, step, mt, year });
window.__set = { tab: setTab, step: setStep, mt: v => { mt = v; mPlaying = false; }, rain: v => { rainMm = v; }, year: y => pickYear(y) };
