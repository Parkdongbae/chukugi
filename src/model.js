// 3D 모형: 측우대 · 측우기(3단) · 주척 · 물 · 마당. 단위 m (sim.js의 mm ÷ 1000), y가 위.
import * as THREE from 'three';
import { GAUGE, STAND, CHON } from './sim.js';
const M = v => v / 1000;

function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
// 화강암 결: 밝은 바탕 + 검고 흰 점
function granite(g, w, h, seed = 1, marble = false) {
  let s = seed * 9301; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  g.fillStyle = marble ? '#e4e0d6' : '#cfc6b0'; g.fillRect(0, 0, w, h);
  if (marble) { g.globalAlpha = .18; g.strokeStyle = '#8f8a80'; for (let i = 0; i < 9; i++) { g.lineWidth = .6 + rnd() * 1.6; g.beginPath(); let x = rnd() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (rnd() - .5) * 40; y += 20 + rnd() * 30; g.lineTo(x, y); } g.stroke(); } g.globalAlpha = 1; for (let i = 0; i < w * h / 60; i++) { g.fillStyle = rnd() < .5 ? '#cbc6ba' : '#f3f0e8'; g.globalAlpha = .3; g.fillRect(rnd() * w, rnd() * h, 2, 2); } g.globalAlpha = 1; return; }
  for (let i = 0; i < w * h / 18; i++) {
    const r = rnd(); g.fillStyle = r < .25 ? '#6f6656' : r < .5 ? '#e9e2d0' : r < .6 ? '#b39a6a' : '#a8a08c';
    g.globalAlpha = .35 + rnd() * .5; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2.5, 1 + rnd() * 2.5);
  }
  g.globalAlpha = 1;
}
function carve(g, text, x, y, size, step) {   // 세로 글씨 새김(음각: 어두운 글씨 + 밝은 아랫선)
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${size}px "Noto Serif KR","Batang",serif`;
  [...text].forEach((ch, i) => {
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillText(ch, x + 2, y + i * step + 2);
    g.fillStyle = 'rgba(60,52,40,.85)'; g.fillText(ch, x, y + i * step);
  });
}

export function buildWorld(scene) {
  const W = {};
  // 마당 박석
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({
    map: canvasTex(1024, 1024, (g, w, h) => {
      g.fillStyle = '#b9b2a2'; g.fillRect(0, 0, w, h);
      let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let y = 0; y < h; y += 64) for (let x = -(y / 64 % 2) * 40; x < w; x += 80 + rnd() * 30) {
        const v = 160 + rnd() * 40 | 0; g.fillStyle = `rgb(${v},${v - 6},${v - 16})`; g.fillRect(x + 2, y + 2, 76 + rnd() * 20, 60);
      }
    }), roughness: .95,
  }));
  ground.material.map.wrapS = ground.material.map.wrapT = THREE.RepeatWrapping; ground.material.map.repeat.set(4, 4);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground); W.ground = ground;

  // 둘레(자리 고르기 단계에서만): 건물·나무·담
  const env = new THREE.Group(); scene.add(env); W.env = env;
  const wood = new THREE.MeshStandardMaterial({ color: 0x8a5a3a, roughness: .8 });
  const wall = new THREE.MeshStandardMaterial({ color: 0xe8e0cc, roughness: .9 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x4a4a4e, roughness: .7 });
  const hall = new THREE.Group(); hall.position.set(-3.6, 0, -3.2); env.add(hall);
  const body = new THREE.Mesh(new THREE.BoxGeometry(4, 2.6, 2.4), wall); body.position.y = 1.3 + .4; body.castShadow = true; hall.add(body);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(4.6, .4, 3), new THREE.MeshStandardMaterial({ color: 0xa79f8c })); plinth.position.y = .2; hall.add(plinth);
  const rg = new THREE.CylinderGeometry(.01, 2.4, 1.3, 4, 1); rg.rotateY(Math.PI / 4); rg.scale(1.35, 1, .85);
  const r = new THREE.Mesh(rg, roof); r.position.y = 3 + .65; r.castShadow = true; hall.add(r);
  for (const x of [-1.8, -.6, .6, 1.8]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, 2.6), wood); p.position.set(x, 1.7, 1.25); hall.add(p); }
  const tree = new THREE.Group(); tree.position.set(3.4, 0, -2.6); env.add(tree);
  const tr = new THREE.Mesh(new THREE.CylinderGeometry(.12, .18, 2.2), wood); tr.position.y = 1.1; tr.castShadow = true; tree.add(tr);
  const leaf = new THREE.MeshStandardMaterial({ color: 0x4f7a3e, roughness: .9 });
  for (const [x, y, z, s] of [[0, 2.6, 0, 1.1], [.6, 2.3, .3, .8], [-.5, 2.4, -.2, .85]]) { const l = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 1), leaf); l.position.set(x, y, z); l.castShadow = true; tree.add(l); }
  // 「피할 곳」 표시 고리 + 「좋은 자리」 고리
  const ringG = (r0, r1, c) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .55, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = .005; return m; };
  const bad1 = ringG(2.2, 2.3, 0xc0392b); bad1.position.set(-3.6, .005, -2.4); env.add(bad1);
  const bad2 = ringG(1.9, 2, 0xc0392b); bad2.position.set(3.4, .005, -2.6); env.add(bad2);
  const good = ringG(.5, .6, 0x3d7a4a); env.add(good);
  W.marks = { bad1, bad2, good };

  // 다진 바닥(박석 한 판)
  const pad = new THREE.Mesh(new THREE.BoxGeometry(1.2, .04, 1.2), new THREE.MeshStandardMaterial({ map: canvasTex(256, 256, (g, w, h) => granite(g, w, h, 5)), roughness: .9 }));
  pad.position.y = .02; pad.receiveShadow = true; pad.castShadow = true; scene.add(pad); W.pad = pad;
  const base = .04;

  // 측우대: 상자 + 윗면 홈(어두운 원 + 안쪽 벽)
  const sw = M(STAND.w), sh = M(STAND.h), hr = M(STAND.holeR), hd = M(STAND.holeD);
  // 창덕궁 측우대(대리석). 겉면 명문은 확인한 자료가 없어 새기지 않음
  const face = (txt) => new THREE.MeshStandardMaterial({ roughness: .55, map: canvasTex(512, 360, (g, w, h) => granite(g, w, h, txt.length + 2, true)) });
  const top = new THREE.MeshStandardMaterial({ roughness: .92, map: canvasTex(512, 512, (g, w, h) => {
    granite(g, w, h, 9, true); g.fillStyle = '#3b352c'; g.beginPath(); g.arc(w / 2, h / 2, w * STAND.holeR / STAND.w, 0, 7); g.fill();
  }) });
  const plain = face('plain');
  const stand = new THREE.Mesh(new THREE.BoxGeometry(sw, sh, M(STAND.d)), [face('a'), face('bb'), top, plain, face('ccc'), plain]);
  stand.position.y = base + sh / 2; stand.castShadow = stand.receiveShadow = true;
  const standG = new THREE.Group(); standG.add(stand); scene.add(standG); W.stand = standG;
  const holeWall = new THREE.Mesh(new THREE.CylinderGeometry(hr, hr, hd, 48, 1, true), new THREE.MeshStandardMaterial({ color: 0x5a5244, side: THREE.BackSide, roughness: 1 }));
  holeWall.position.y = base + sh - hd / 2 + .0005; standG.add(holeWall);
  W.standTop = base + sh;
  // 반 자른 단면(측정 탭): 돌 단면 + 홈 자리
  const capT = canvasTex(512, 640, (g, w, h) => { granite(g, w, h, 21, true); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, 0, w, h);
    const hw = w * 2 * STAND.holeR / STAND.w, hh = h * STAND.holeD / STAND.h; g.clearRect(w / 2 - hw / 2, 0, hw, hh); });
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: capT, transparent: true, alphaTest: .5, roughness: .95, side: THREE.DoubleSide }));
  cap.position.set(0, base + sh / 2, 0); cap.visible = false; standG.add(cap); W.cap = cap; W.standMats = stand.material.concat(holeWall.material);

  // 측우기: 마디 3개 (두께 5mm 원통, 띠). 하단만 바닥이 막힘
  const bronze = new THREE.MeshStandardMaterial({ color: 0x4a4740, metalness: .45, roughness: .5, side: THREE.DoubleSide });
  const ro = M(GAUGE.rOut), ri = M(GAUGE.rIn), gh = M(GAUGE.h), seg = gh / 3, band = M(9), bandT = M(GAUGE.ring);
  const gaugeBottom = W.standTop - hd + .002;
  W.gaugeBottom = gaugeBottom; W.parts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    // 단면 모양을 돌려 만든 통: 바깥 → 위 테 → 안 → (하단은 바닥)
    const pts = [];
    if (i === 0) { pts.push(new THREE.Vector2(0, 0), new THREE.Vector2(ro, 0)); } else pts.push(new THREE.Vector2(ri, 0), new THREE.Vector2(ro, 0));
    pts.push(new THREE.Vector2(ro, seg), new THREE.Vector2(ri, seg), new THREE.Vector2(ri, i === 0 ? M(6) : 0));
    if (i === 0) pts.push(new THREE.Vector2(0, M(6)));
    const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 64), bronze); body.castShadow = true; g.add(body);
    // 띠: 각 마디 위끝(맨 위는 입구 테)
    const bp = [new THREE.Vector2(ro, seg - band), new THREE.Vector2(ro + bandT, seg - band + M(2)), new THREE.Vector2(ro + bandT, seg - M(2)), new THREE.Vector2(ro, seg)];
    const b = new THREE.Mesh(new THREE.LatheGeometry(bp, 64), bronze); b.castShadow = true; g.add(b);
    if (i === 0) { const b0 = new THREE.Mesh(new THREE.LatheGeometry([new THREE.Vector2(ro, 0), new THREE.Vector2(ro + bandT * .6, M(2)), new THREE.Vector2(ro + bandT * .6, band), new THREE.Vector2(ro, band + M(2))], 64), bronze); g.add(b0); }
    if (i === 1) {   // 명문: 錦營 測雨器 高一尺五寸 徑七寸 道光丁酉製 重十一斤 (공주 충청감영 측우기, 세로쓰기 오른쪽→왼쪽)
      const cols = ['錦營', '測雨器', '高一尺五寸', '徑七寸', '道光丁酉製', '重十一斤'];
      const tex = canvasTex(512, 256, (c, w, h) => { c.textAlign = 'center'; c.textBaseline = 'top'; c.font = '700 30px "Noto Serif KR","Batang",serif';
        cols.forEach((t, k) => { const x = w - 40 - k * 80, y0 = k === 0 ? 14 : k % 2 ? 46 : 30; [...t].forEach((ch, n) => { c.fillStyle = 'rgba(0,0,0,.55)'; c.fillText(ch, x + 1, y0 + n * 36 + 1); c.fillStyle = 'rgba(214,200,160,.85)'; c.fillText(ch, x, y0 + n * 36); }); }); });
      // 카메라 쪽(−x, +z 사이)에 글씨가 오도록 둘레 일부에만 붙임
      const arc = 1.9, mid = -.55;
      const ins = new THREE.Mesh(new THREE.CylinderGeometry(ro + M(.4), ro + M(.4), seg - band - M(14), 48, 1, true, mid - arc / 2, arc), new THREE.MeshStandardMaterial({ map: tex, transparent: true, metalness: .3, roughness: .5, side: THREE.FrontSide }));
      ins.position.y = (seg - band) / 2 + M(2); g.add(ins); W.inscription = ins;
    }
    g.userData.home = gaugeBottom + i * seg;
    g.position.y = g.userData.home; scene.add(g); W.parts.push(g);
  }
  W.bronze = bronze; W.gaugeTop = gaugeBottom + gh; W.ri = ri;

  // 물
  const water = new THREE.Mesh(new THREE.CylinderGeometry(ri - .0008, ri - .0008, 1, 48), new THREE.MeshStandardMaterial({ color: 0x4f8fc0, transparent: true, opacity: .72, roughness: .15 }));
  water.geometry.translate(0, .5, 0); water.position.y = gaugeBottom + M(6); water.scale.y = 1e-4; scene.add(water); W.water = water;

  // 주척(자): 촌마다 눈금, 5촌마다 긴 눈금
  const rl = M(GAUGE.h + 160), rw = M(18), rt = M(4);
  const rulerTex = canvasTex(64, 1024, (g, w, h) => {
    g.fillStyle = '#d8b47a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#3b2a17'; g.fillStyle = '#3b2a17';
    const pxPerMm = h / (GAUGE.h + 160);
    for (let mm = 0; mm <= GAUGE.h + 160; mm += CHON / 2) {
      const y = h - mm * pxPerMm, chon = Math.round(mm / CHON * 2) / 2, long = chon % 5 === 0, mid = Number.isInteger(chon);
      g.lineWidth = long ? 3 : 2; g.beginPath(); g.moveTo(0, y); g.lineTo(long ? w * .75 : mid ? w * .5 : w * .25, y); g.stroke();
    }
    g.font = '700 22px serif'; g.textAlign = 'right';
    for (let c = 5; c * CHON <= GAUGE.h + 160; c += 5) g.fillText(c === 10 ? '尺' : c % 10 === 0 ? c / 10 + '尺' : '五', w - 4, h - c * CHON * pxPerMm + 8);
  });
  const ruler = new THREE.Group();
  const rmat = new THREE.MeshStandardMaterial({ map: rulerTex, roughness: .7 });
  const rb = new THREE.Mesh(new THREE.BoxGeometry(rw, rl, rt), [rmat, rmat, rmat, rmat, rmat, rmat]); rb.geometry.translate(0, rl / 2, 0); rb.castShadow = true; ruler.add(rb);
  const wet = new THREE.Mesh(new THREE.BoxGeometry(rw + .0006, 1, rt + .0006), new THREE.MeshStandardMaterial({ color: 0x5b3c1d, transparent: true, opacity: .55 }));
  wet.geometry.translate(0, .5, 0); wet.visible = false; ruler.add(wet);
  scene.add(ruler); W.ruler = ruler; W.wet = wet; W.rulerHome = new THREE.Vector3(sw / 2 + .12, base, .15);
  ruler.position.copy(W.rulerHome); ruler.rotation.z = .12;

  // 넓이 비교 그릇 (좁은 통·넓은 통, 바닥에 놓음)
  W.cmp = new THREE.Group(); scene.add(W.cmp); W.cmp.visible = false; W.cmpWater = [];
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: .25, roughness: .05, side: THREE.DoubleSide, depthWrite: false });
  for (const [x, r] of [[-.5, .035], [.62, .16]]) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(r, r, gh, 48, 1, true), glass); v.position.set(x, base + gh / 2, .25); W.cmp.add(v);
    const bot = new THREE.Mesh(new THREE.CircleGeometry(r, 48), glass); bot.rotation.x = -Math.PI / 2; bot.position.set(x, base + .001, .25); W.cmp.add(bot);
    const wt = new THREE.Mesh(new THREE.CylinderGeometry(r - .002, r - .002, 1, 48), water.material); wt.geometry.translate(0, .5, 0); wt.position.set(x, base + .002, .25); wt.scale.y = 1e-4; W.cmp.add(wt); W.cmpWater.push(wt);
  }
  W.base = base;

  // 비: 선분 입자
  const N = 1400, pos = new Float32Array(N * 6);
  const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0x9fb8cc, transparent: true, opacity: .6 }));
  rain.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  for (let i = 0; i < N; i++) { const x = (Math.random() - .5) * 4, y = Math.random() * 3, z = (Math.random() - .5) * 4; pos.set([x, y, z, x, y - .06, z], i * 6); }
  rain.visible = false; scene.add(rain); W.rain = rain;
  return W;
}

export function rainStep(W, dt) {
  const p = W.rain.geometry.attributes.position, a = p.array;
  for (let i = 0; i < a.length; i += 6) {
    a[i + 1] -= 6 * dt; a[i + 4] -= 6 * dt;
    if (a[i + 4] < 0) { const y = 2.6 + Math.random() * .6; a[i + 1] = y; a[i + 4] = y - .06; }
  }
  p.needsUpdate = true;
}

// 글자판(스프라이트)
export function label(text, color = '#2b2620') {
  const pad = 12, fs = 30, c = document.createElement('canvas'), g = c.getContext('2d');
  g.font = `700 ${fs}px "Noto Sans KR",sans-serif`; const w = Math.ceil(g.measureText(text).width) + pad * 2, h = fs + pad * 1.4;
  c.width = w; c.height = h; g.font = `700 ${fs}px "Noto Sans KR",sans-serif`;
  g.fillStyle = 'rgba(251,247,238,.92)'; g.strokeStyle = color; g.lineWidth = 3;
  g.beginPath(); g.roundRect(1.5, 1.5, w - 3, h - 3, 10); g.fill(); g.stroke();
  g.fillStyle = color; g.textBaseline = 'middle'; g.fillText(text, pad, h / 2 + 1);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true, sizeAttenuation: false }));
  s.scale.set(w / h * .03, .03, 1); s.renderOrder = 10; return s;
}
