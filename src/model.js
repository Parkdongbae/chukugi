// 3D 모형: 마당 박석 · 다진 바닥 · 측우대(대리석) · 측우기(청동 3단) · 주척 · 물 · 비 · 둘레(전각·나무·담).
// 단위 m (sim.js의 mm ÷ 1000), y가 위. 치수는 sim.js의 GAUGE·STAND 그대로.
import * as THREE from 'three';
import { GAUGE, STAND, CHON, PUN } from './sim.js';
import { bronze as bronzeMat, stone, wood, rbox, cyl, lathe } from './kit/parts.js';
import { canvasTex } from './kit/stage.js';
const M = v => v / 1000;
const V2 = ([r, y]) => new THREE.Vector2(r, y);
const rnd = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
// 마당 박석 윗면 높이. 키트의 땅(깊이를 쓰지 않음) 위에 3cm 띄워 깜빡임을 막는다
export const PAVE = .03;

// ---------- 질감 ----------
// 박석 마당: 줄마다 길이가 다른 납작한 돌 + 줄눈. bump = 같은 그림의 높낮이
function paveTex(bump) {
  return canvasTex(1024, 1024, (g, w, h) => {
    const r = rnd(31), rows = 6;
    g.fillStyle = bump ? '#202020' : '#6f6a60'; g.fillRect(0, 0, w, h);
    for (let j = 0; j < rows; j++) {
      const y0 = j * h / rows; let x = -r() * 90;
      while (x < w) {
        const sw = 120 + r() * 120, v = 150 + r() * 45 | 0, warm = r() * 14 | 0;
        const x0 = x + 4 + r() * 3, y1 = y0 + 4 + r() * 3, ww = sw - 8 - r() * 4, hh = h / rows - 8 - r() * 4;
        g.fillStyle = bump ? `rgb(${170 + r() * 50 | 0},${170},${170})` : `rgb(${v + warm},${v + warm * .5 | 0},${v - 8})`;
        g.beginPath(); g.roundRect(x0, y1, ww, hh, 10 + r() * 10); g.fill();
        if (!bump) { for (let k = 0; k < 120; k++) { g.fillStyle = `rgba(${r() < .5 ? '60,56,50' : '235,230,220'},${.08 + r() * .12})`; g.fillRect(x0 + r() * ww, y1 + r() * hh, 2 + r() * 3, 2 + r() * 3); } }
        x += sw;
      }
    }
  }, [2, 2]);
}
// 대리석: 밝은 바탕 + 엷은 회색 결 + 잔 점. bump는 결을 살짝 파이게
function marbleTex(seed, bump) {
  return canvasTex(512, 512, (g, w, h) => {
    const r = rnd(seed);
    g.fillStyle = bump ? '#bdbdbd' : '#e7e3da'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 14; i++) {
      g.strokeStyle = bump ? '#8a8a8a' : `rgba(${120 + r() * 30 | 0},${118 + r() * 25 | 0},${110},${.08 + r() * .14})`; g.lineWidth = .5 + r() * 1.6;
      g.beginPath(); let x = r() * w, y = -10; g.moveTo(x, y);
      while (y < h + 10) { x += (r() - .5) * 46; y += 14 + r() * 26; g.lineTo(x, y); } g.stroke();
    }
    for (let i = 0; i < 2600; i++) { g.fillStyle = bump ? (r() < .5 ? '#a8a8a8' : '#d0d0d0') : (r() < .5 ? 'rgba(170,164,150,.35)' : 'rgba(255,255,250,.4)'); g.fillRect(r() * w, r() * h, 1.5, 1.5); }
  }, [2.2, 2.2]);
}
// 청동 거칠기: 손때 묻은 곳은 매끈, 녹청 얼룩은 거칠게 (밝을수록 거침)
const roughTex = () => { const t = canvasTex(256, 256, (g, w, h) => { const r = rnd(44); g.fillStyle = '#8c8c8c'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { g.fillStyle = r() < .55 ? 'rgba(200,200,200,.18)' : 'rgba(60,60,60,.16)'; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 30, 4 + r() * 18, r() * 3, 0, 7); g.fill(); } }, [3, 2]); t.colorSpace = THREE.NoColorSpace; return t; };
// 청동 색: 짙은 갈색 바탕 + 넓게 번진 녹청(초록) 얼룩 + 세로로 흐른 자국 (점 무늬 대신 부드러운 얼룩)
const patinaTex = () => canvasTex(512, 256, (g, w, h) => {
  const r = rnd(52); g.fillStyle = '#7a6444'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { const x = r() * w, y = r() * h, rr = 10 + r() * 46, gr = g.createRadialGradient(x, y, 0, x, y, rr), c = r() < .45 ? '86,104,84' : r() < .6 ? '150,120,78' : '58,46,30';
    gr.addColorStop(0, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`); g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(${r() < .5 ? '60,48,32' : '140,116,80'},.08)`; g.fillRect(r() * w, 0, 1 + r() * 3, h); }
}, [2, 1]);
function noBump(t) { t.colorSpace = THREE.NoColorSpace; return t; }

export function buildWorld(scene) {
  const W = {};
  const MAT = W.MAT = {
    pave: new THREE.MeshStandardMaterial({ map: paveTex(false), bumpMap: noBump(paveTex(true)), bumpScale: 3, roughness: .92, envMapIntensity: .5 }),
    pad: stone('#b9b2a4', { bumpScale: 1 }),
    marble: new THREE.MeshStandardMaterial({ map: marbleTex(5, false), bumpMap: noBump(marbleTex(5, true)), bumpScale: .8, roughness: .48, metalness: 0, envMapIntensity: .75 }),
    marbleIn: new THREE.MeshStandardMaterial({ map: marbleTex(9, false), color: 0xa8a294, roughness: .8, envMapIntensity: .4 }),
    // 청동: 어두운 녹청빛 구리 합금. 환경맵이 어두워도 까맣게 되지 않도록 금속도를 조금 낮춤
    bronze: bronzeMat({ map: patinaTex(), color: 0xffffff, metalness: .62, roughness: .38, roughnessMap: roughTex(), envMapIntensity: 1.45, side: THREE.DoubleSide }),
    bronzeCut: new THREE.MeshStandardMaterial({ color: 0xc39a5c, metalness: .85, roughness: .3, envMapIntensity: 1.2, side: THREE.DoubleSide }),
    wood: wood('#b9874d', '#6b4520', 6),
    woodD: wood('#7c5532', '#3e2712', 7),
    plaster: new THREE.MeshStandardMaterial({ color: 0xece4d0, roughness: .95, envMapIntensity: .4 }),
  };
  W.clipMats = [MAT.bronze, MAT.marble, MAT.marbleIn];

  // ---------- 마당 박석 (6.4 × 6.4m, 두께 3cm) ----------
  const pave = rbox(6.4, PAVE, 6.4, MAT.pave, 0, PAVE / 2, 0, .01); pave.castShadow = false; scene.add(pave); W.pave = pave;

  // ---------- 둘레: 전각 · 나무 · 담 (자리 고르기 단계의 「피할 곳」) ----------
  const env = new THREE.Group(); scene.add(env); W.env = env;
  env.add(buildHall(MAT), buildTree(), buildWall(MAT));
  // 「피할 곳」(붉은 고리)·「좋은 자리」(초록 고리) — 박석보다 1cm 위
  const ringG = (r0, r1, c) => { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 64), new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: .75, side: THREE.DoubleSide, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 2; return m; };
  const bad1 = ringG(2.2, 2.32, 0xc0392b); bad1.position.set(-3.6, PAVE + .012, -2.4);
  const bad2 = ringG(1.75, 1.87, 0xc0392b); bad2.position.set(4.0, PAVE + .012, -0.9);
  const good = ringG(.5, .62, 0x3d7a4a); good.position.y = PAVE + .012;
  const marks = new THREE.Group(); marks.add(bad1, bad2, good); scene.add(marks);
  W.marks = { group: marks, bad1, bad2, good };

  // ---------- 다진 바닥: 박석 한 판 (1.2 × 0.04 × 1.2m) ----------
  const padG = new THREE.Group(); padG.position.y = PAVE; scene.add(padG); W.pad = padG;
  padG.add(rbox(1.2, .04, 1.2, MAT.pad, 0, .02, 0, .008));
  const base = PAVE + .04; W.base = base;

  // ---------- 측우대 (창덕궁, 대리석 453 × 455 × 303mm) ----------
  // 윗면 가운데에 실제로 판 홈(지름 160mm · 깊이 43mm, 대구 측우대 값을 빌린 가정값).
  // 겉면 명문은 확인한 자료가 없어 새기지 않음.
  const sw = M(STAND.w), sd = M(STAND.d), sh = M(STAND.h), hr = M(STAND.holeR), hd = M(STAND.holeD), bv = .006;
  const standG = new THREE.Group(); scene.add(standG); W.stand = standG;
  {
    const s = new THREE.Shape(), x0 = -sw / 2 + bv, y0 = -sd / 2 + bv, x1 = sw / 2 - bv, y1 = sd / 2 - bv, cr = .012;
    s.moveTo(x0 + cr, y0); s.lineTo(x1 - cr, y0); s.quadraticCurveTo(x1, y0, x1, y0 + cr); s.lineTo(x1, y1 - cr); s.quadraticCurveTo(x1, y1, x1 - cr, y1);
    s.lineTo(x0 + cr, y1); s.quadraticCurveTo(x0, y1, x0, y1 - cr); s.lineTo(x0, y0 + cr); s.quadraticCurveTo(x0, y0, x0 + cr, y0);
    const hole = new THREE.Path(); hole.absarc(0, 0, hr + bv, 0, Math.PI * 2, true); s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: sh - 2 * bv, bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: 3, curveSegments: 56 });
    geo.rotateX(-Math.PI / 2); geo.translate(0, base + bv, 0);
    const body = new THREE.Mesh(geo, MAT.marble); body.castShadow = body.receiveShadow = true; standG.add(body);
    // 홈 바닥
    const floor = new THREE.Mesh(new THREE.CircleGeometry(hr + .001, 56), MAT.marbleIn); floor.rotation.x = -Math.PI / 2; floor.position.y = base + sh - hd; floor.receiveShadow = true; standG.add(floor);
  }
  W.standTop = base + sh;
  // 반 자른 단면(측정): 돌 단면 + 홈 자리 비움
  const capT = canvasTex(512, 640, (g, w, h) => {
    g.fillStyle = '#d9d4c8'; g.fillRect(0, 0, w, h); const r = rnd(21);
    for (let i = 0; i < 3000; i++) { g.fillStyle = r() < .5 ? 'rgba(160,154,140,.35)' : 'rgba(250,248,240,.4)'; g.fillRect(r() * w, r() * h, 2, 2); }
    g.strokeStyle = 'rgba(120,116,106,.25)'; g.lineWidth = 1.5; for (let i = 0; i < 6; i++) { g.beginPath(); let x = r() * w, y = 0; g.moveTo(x, y); while (y < h) { x += (r() - .5) * 40; y += 25; g.lineTo(x, y); } g.stroke(); }
    const hw = w * 2 * STAND.holeR / STAND.w, hh = h * STAND.holeD / STAND.h; g.clearRect(w / 2 - hw / 2, 0, hw, hh);
  });
  const cap = new THREE.Mesh(new THREE.PlaneGeometry(sw - .002, sh - .002), new THREE.MeshStandardMaterial({ map: capT, transparent: true, alphaTest: .5, roughness: .9, side: THREE.DoubleSide, envMapIntensity: .5 }));
  cap.position.set(0, base + sh / 2, 0); cap.visible = false; standG.add(cap); W.cap = cap;

  // ---------- 측우기: 청동 3단 (높이 320, 바깥 반지름 75, 안 반지름 70mm) ----------
  const ro = M(GAUGE.rOut), ri = M(GAUGE.rIn), gh = M(GAUGE.h), seg = gh / 3, band = M(9), bt = M(GAUGE.ring), floorT = M(6);
  const gaugeBottom = W.standTop - hd + .002;
  W.gaugeBottom = gaugeBottom; W.parts = []; W.cuts = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group(), b0 = i === 0;
    // 옆모습: (아래 띠) → 바깥 벽 → 위 띠(모따기) → 입구 윗면(두께가 보임) → 안쪽 벽 → (하단은 바닥)
    const P = [];
    if (b0) P.push([0, 0], [ro + bt * .6 - .001, 0], [ro + bt * .6, .001], [ro + bt * .6, band - .002], [ro, band]);
    else P.push([ri, 0], [ro, 0]);
    P.push([ro, seg - band], [ro + bt, seg - band + .002], [ro + bt, seg - .0018], [ro + bt - .0012, seg - .0003], [ro + bt - .003, seg], [ri + .0008, seg], [ri, seg - .0008], [ri, b0 ? floorT : 0]);
    if (b0) P.push([0, floorT]);
    const body = lathe(P, MAT.bronze, 96); g.add(body);
    // 단면(반 자르기 때만 보임): 옆모습을 그대로 좌우에 그린 판
    const cut = new THREE.Group(); cut.visible = false; g.add(cut); W.cuts.push(cut);
    const shapeOf = sx => { const s = new THREE.Shape(); P.forEach(([r, y], k) => (k ? s.lineTo(r * sx, y) : s.moveTo(r * sx, y))); return s; };
    if (b0) { const s = new THREE.Shape(); const pts = P.map(([r, y]) => [r, y]).concat(P.slice().reverse().map(([r, y]) => [-r, y])); pts.forEach(([x, y], k) => (k ? s.lineTo(x, y) : s.moveTo(x, y))); cut.add(new THREE.Mesh(new THREE.ShapeGeometry(s), MAT.bronzeCut)); }
    else for (const sx of [1, -1]) cut.add(new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(sx)), MAT.bronzeCut));
    if (i === 1) {   // 명문: 錦營 測雨器 高一尺五寸 徑七寸 道光丁酉製 重十一斤 (공주 충청감영 측우기, 세로쓰기 오른쪽→왼쪽)
      const cols = ['錦營', '測雨器', '高一尺五寸', '徑七寸', '道光丁酉製', '重十一斤'];
      const draw = mode => (c, w, h) => {
        if (mode === 'bump') { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); }
        c.textAlign = 'center'; c.textBaseline = 'top'; c.font = '700 60px "Noto Serif KR","Batang","Malgun Gothic",serif';
        cols.forEach((t, k) => { const x = w - 80 - k * 160, y0 = k === 0 ? 28 : k % 2 ? 92 : 60;
          [...t].forEach((ch, n) => { const y = y0 + n * 72;
            if (mode === 'bump') { c.fillStyle = '#000'; c.fillText(ch, x, y); return; }
            c.fillStyle = 'rgba(255,236,190,.22)'; c.fillText(ch, x + 2.5, y + 2.5);      // 홈 아래 가장자리에 비친 빛
            c.fillStyle = 'rgba(22,16,8,.92)'; c.fillText(ch, x, y); }); });           // 파인 홈의 그늘
      };
      const arc = 1.9, mid = -.55, yA = M(4), yB = seg - band - M(10);
      const geo = new THREE.LatheGeometry([V2([ro + M(.35), yA]), V2([ro + M(.35), yB])], 48, mid - arc / 2, arc);
      const bump = canvasTex(1024, 512, draw('bump')); bump.colorSpace = THREE.NoColorSpace;
      const ins = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: canvasTex(1024, 512, draw('map')), bumpMap: bump, bumpScale: 2, transparent: true, metalness: .5, roughness: .6, envMapIntensity: .9, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      g.add(ins); W.inscription = ins; W.clipMats.push(ins.material);
    }
    g.userData.home = gaugeBottom + i * seg;
    g.position.y = g.userData.home; scene.add(g); W.parts.push(g);
  }
  W.gaugeTop = gaugeBottom + gh; W.ri = ri;

  // ---------- 물: 몸통(반투명) + 수면(반사) + 가장자리 살짝 올라온 띠 + 파문 ----------
  const waterBody = new THREE.MeshStandardMaterial({ color: 0x3d7ea6, transparent: true, opacity: .55, roughness: .1, envMapIntensity: 1.1, depthWrite: false });
  const waterTop = new THREE.MeshStandardMaterial({ color: 0x6aa6c8, transparent: true, opacity: .82, roughness: .04, metalness: .25, envMapIntensity: 1.7 });
  W.waterMats = [waterBody, waterTop];
  function waterColumn(r, y0) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 1, 48, 1, true), waterBody); body.geometry.translate(0, .5, 0); body.renderOrder = 3; g.add(body);
    const top = new THREE.Mesh(new THREE.CircleGeometry(r, 48), waterTop); top.rotation.x = -Math.PI / 2; top.renderOrder = 4; g.add(top);
    const men = new THREE.Mesh(new THREE.TorusGeometry(r - .0012, .0012, 6, 64), waterTop); men.rotation.x = Math.PI / 2; g.add(men);
    g.position.y = y0;
    return { g, set(mm) { const h = Math.max(1e-4, mm / 1000); body.scale.y = h; top.position.y = h; men.position.y = h - .0004; top.visible = men.visible = body.visible = mm > .2; }, top };
  }
  const water = waterColumn(ri - .0008, gaugeBottom + floorT); scene.add(water.g); W.water = water;
  // 파문: 고리 12개를 돌려 씀
  const ripples = new THREE.Group(); scene.add(ripples); W.ripples = ripples;
  for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(.86, 1, 40), new THREE.MeshBasicMaterial({ color: 0xe8f3fa, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.userData.t = 9; m.visible = false; ripples.add(m); }
  W.ripple = (x, z) => { const m = ripples.children.find(o => o.userData.t > .9) || ripples.children[0]; m.userData.t = 0; m.position.set(x, 0, z); m.visible = true; };
  W.rippleStep = (dt, y) => { for (const m of ripples.children) { const u = m.userData.t = Math.min(9, m.userData.t + dt); if (u > .9) { m.visible = false; continue; } const s = .004 + u * .03; m.scale.set(s, s, s); m.position.y = y + .0006; m.material.opacity = .55 * (1 - u / .9); } };

  // ---------- 주척: 나무 자. 1푼(2mm)·5푼·1촌·5촌·1척 눈금 ----------
  const RL = GAUGE.h + 160, rl = M(RL), rw = M(18), rt = M(4);
  const rulerTex = canvasTex(128, 2048, (g, w, h) => {
    const r = rnd(17); g.fillStyle = '#d9b57c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.strokeStyle = `rgba(120,80,40,${.06 + r() * .12})`; g.lineWidth = .6 + r() * 2; g.beginPath(); let x = r() * w; g.moveTo(x, 0); for (let y = 0; y <= h; y += 64) { x += (r() - .5) * 3; g.lineTo(x, y); } g.stroke(); }
    const px = h / RL; g.strokeStyle = '#2f2011'; g.fillStyle = '#2f2011';
    for (let mm = 0; mm <= RL; mm += PUN) {
      const y = h - mm * px, n = Math.round(mm / PUN), cheok = n % 100 === 0, gochon = n % 50 === 0, chon = n % 10 === 0, half = n % 5 === 0;
      g.lineWidth = cheok ? 4 : gochon || chon ? 3 : half ? 2.2 : 1.4;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w * (cheok || gochon ? .8 : chon ? .58 : half ? .4 : .2), y); g.stroke();
    }
    g.font = '700 34px "Noto Serif KR","Batang",serif'; g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let c = 5; c * CHON <= RL; c += 5) g.fillText(c === 10 ? '尺' : c % 10 === 0 ? c / 10 + '尺' : '五', w - 4, h - c * CHON * px + 22);
  });
  const ruler = new THREE.Group();
  const rSide = wood('#c9a26a', '#7a5428', 9); rSide.map.rotation = rSide.bumpMap.rotation = Math.PI / 2;
  const rFace = new THREE.MeshStandardMaterial({ map: rulerTex, roughness: .72, envMapIntensity: .5 });
  const rb = new THREE.Mesh(new THREE.BoxGeometry(rw, rl, rt), [rSide, rSide, rSide, rSide, rFace, rFace]); rb.geometry.translate(0, rl / 2, 0); rb.castShadow = rb.receiveShadow = true; ruler.add(rb);
  // 젖은 자국: 어둡게 번진 부분 + 맨 위 물 선
  const wet = new THREE.Group(); wet.visible = false; ruler.add(wet);
  const wetBody = new THREE.Mesh(new THREE.BoxGeometry(rw + .0006, 1, rt + .0006), new THREE.MeshStandardMaterial({ color: 0x3e270f, transparent: true, opacity: .55, roughness: .25, depthWrite: false })); wetBody.geometry.translate(0, .5, 0); wet.add(wetBody);
  const wetLine = new THREE.Mesh(new THREE.BoxGeometry(rw + .0008, .0009, rt + .0008), new THREE.MeshStandardMaterial({ color: 0x2c1b08, transparent: true, opacity: .8, roughness: .2 })); wet.add(wetLine);
  W.setWet = mm => { wet.visible = mm !== null; if (mm === null) return; const h = Math.max(1e-4, mm / 1000); wetBody.scale.y = h; wetLine.position.y = h; };
  scene.add(ruler); W.ruler = ruler;
  // 측우대 옆면에 비스듬히 기대 둠 (v1과 같은 기울기 0.12rad, 윗모서리에 닿게)
  W.rulerHome = new THREE.Vector3(sw / 2 + rt / 2 + Math.tan(.12) * sh, base, .15); W.rulerLean = .12;
  ruler.position.copy(W.rulerHome); ruler.rotation.z = W.rulerLean;

  // ---------- 넓이 비교 그릇: 좁은 통(반지름 35mm)·넓은 통(160mm), 유리 ----------
  W.cmp = new THREE.Group(); scene.add(W.cmp); W.cmp.visible = false; W.cmpWater = [];
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xf4fbff, transparent: true, opacity: .22, roughness: .04, metalness: 0, envMapIntensity: 1.6, clearcoat: 1, side: THREE.DoubleSide, depthWrite: false });
  for (const [x, r] of [[-.5, .035], [.62, .16]]) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(r, r, gh, 48, 1, true), glass); v.position.set(x, base + gh / 2, .25); v.renderOrder = 5; W.cmp.add(v);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r, .0018, 6, 64), glass); rim.rotation.x = Math.PI / 2; rim.position.set(x, base + gh, .25); W.cmp.add(rim);
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .004, 48), glass); bot.position.set(x, base + .002, .25); W.cmp.add(bot);
    const wc = waterColumn(r - .002, base + .004); wc.g.position.x = x; wc.g.position.z = .25; W.cmp.add(wc.g); W.cmpWater.push(wc);
  }
  // 그릇 받침: 낮은 나무 판(맥락 물체)
  W.cmp.add(rbox(.2, .025, .2, MAT.woodD, -.5, PAVE + .0125, .25), rbox(.46, .025, .46, MAT.woodD, .62, PAVE + .0125, .25));
  for (const o of W.cmp.children) if (o.isMesh && o.material === glass) o.castShadow = false;

  // ---------- 비: 기울어진 빗줄기(선분). 개수는 품질별로 app.js가 정함 ----------
  const NMAX = 2800, pos = new Float32Array(NMAX * 6), spd = new Float32Array(NMAX);
  const rain = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xeef6fc, transparent: true, opacity: .85, depthWrite: false, fog: false }));
  rain.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3)); rain.frustumCulled = false;
  const R0 = rnd(3), slant = .09, len = .17;   // slant = 바람에 기운 정도(아래로 1m에 옆으로 9cm)
  const spawn = (i, y) => { const x = (R0() - .5) * 4.2, z = (R0() - .5) * 4.2; spd[i] = 5.5 + R0() * 2; pos.set([x, y, z, x - slant * len, y + len, z], i * 6); };
  for (let i = 0; i < NMAX; i++) spawn(i, base + R0() * 3);
  rain.visible = false; scene.add(rain);
  W.rain = { obj: rain, count: 1400 };
  // 비 한 걸음: 땅·측우대에 닿으면 위에서 다시 내림. hit(x, y, z, 측우기 입구인가) 콜백
  W.rainStep = (dt, hit) => {
    const n = Math.min(NMAX, W.rain.count), top = W.gaugeTop, rr = ri * ri;
    rain.geometry.setDrawRange(0, n * 2);
    for (let i = 0; i < n; i++) {
      const k = i * 6, d = spd[i] * dt; pos[k + 1] -= d; pos[k + 4] -= d; pos[k] += slant * d; pos[k + 3] += slant * d;
      const x = pos[k], z = pos[k + 2], y = pos[k + 1];
      const onStand = Math.abs(x) < sw / 2 && Math.abs(z) < sd / 2, inMouth = x * x + z * z < rr, floorY = inMouth ? top - .02 : onStand ? W.standTop : PAVE;
      if (y < floorY) { hit?.(x, floorY, z, inMouth); spawn(i, base + 2.6 + R0() * .6); }
    }
    rain.geometry.attributes.position.needsUpdate = true;
  };

  // 비 올 때 젖은 마당: 어둡고 매끈하게 (0~1)
  const pc = MAT.pave.color.clone(), mc = MAT.marble.color.clone(), dc = MAT.pad.color.clone();
  W.setWetGround = k => {
    MAT.pave.color.copy(pc).multiplyScalar(1 - .38 * k); MAT.pave.roughness = .92 - .5 * k;
    MAT.pad.color.copy(dc).multiplyScalar(1 - .3 * k); MAT.pad.roughness = .92 - .45 * k;
    MAT.marble.color.copy(mc).multiplyScalar(1 - .12 * k); MAT.marble.roughness = .48 - .25 * k;
  };
  return W;
}

// ---------- 둘레 ----------
// 기와지붕: 네 귀가 들린 우진각 지붕. 처마 쪽은 완만하고 용마루 쪽은 가파른 오목한 곡면
function roofGeo(w, d, h, lift = .12, cornerLift = .45) {
  const nu = 44, nv = 30, pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu * 2 - 1, v = j / nv * 2 - 1, x = u * w / 2, z = v * d / 2;
    const e = Math.min((w / 2 - Math.abs(x)) / (d / 2), (d / 2 - Math.abs(z)) / (d / 2));   // 처마 0 → 용마루 1
    const corner = Math.pow(Math.abs(u), 8) * Math.pow(Math.abs(v), 8);
    pos.push(x, h * Math.pow(Math.max(0, e), 1.45) + lift * Math.pow(1 - e, 3) + cornerLift * corner, z);
    uv.push(i / nu * w / 1.2, j / nv * d / 1.2);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1; idx.push(a, c, b, b, c, e); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
const tileMat = () => new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: .75, envMapIntensity: .5,
  map: canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#4b4d52'; g.fillRect(0, 0, w, h); for (let x = 0; x < w; x += 16) { const gr = g.createLinearGradient(x, 0, x + 16, 0); gr.addColorStop(0, '#3a3c40'); gr.addColorStop(.5, '#6a6d73'); gr.addColorStop(1, '#3a3c40'); g.fillStyle = gr; g.fillRect(x, 0, 16, h); }
    g.fillStyle = 'rgba(0,0,0,.25)'; for (let y = 0; y < h; y += 32) g.fillRect(0, y, w, 3); }, [1, 1]) });
function buildHall(MAT) {
  const hall = new THREE.Group(); hall.position.set(-3.6, 0, -3.2);
  hall.add(rbox(4.6, .4, 3, stone('#a8a090'), 0, .2, 0, .03));                         // 기단
  for (const x of [-1.4, -.47, .47, 1.4]) hall.add(rbox(.26, .1, .26, stone('#bdb5a5'), x, .45, 1.1, .02));   // 주춧돌
  const colG = new THREE.CylinderGeometry(.095, .11, 2.3, 16);
  for (const x of [-1.4, -.47, .47, 1.4]) for (const z of [1.1, -1.1]) { const c = new THREE.Mesh(colG, MAT.woodD); c.position.set(x, .5 + 1.15, z); c.castShadow = c.receiveShadow = true; hall.add(c); }
  hall.add(rbox(3.0, 2.1, 2.0, MAT.plaster, 0, .4 + 1.05, -.1, .01));                    // 벽(회벽)
  for (const x of [-.94, 0, .94]) hall.add(rbox(.07, 2.0, .04, MAT.woodD, x, .4 + 1.05, .91, .01));   // 문살 틀
  hall.add(rbox(3.2, .16, .2, MAT.woodD, 0, 2.62, 1.1, .02), rbox(3.2, .16, .2, MAT.woodD, 0, 2.62, -1.1, .02));   // 창방
  const roof = new THREE.Mesh(roofGeo(5.4, 3.9, 1.25), tileMat()); roof.position.y = 2.72; roof.castShadow = roof.receiveShadow = true; hall.add(roof);
  hall.add(rbox(1.7, .16, .2, new THREE.MeshStandardMaterial({ color: 0x3b3d41, roughness: .7 }), 0, 2.72 + 1.25 + .05, 0, .04));   // 용마루
  hall.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return hall;
}
function buildTree() {
  const tree = new THREE.Group(); tree.position.set(4.0, 0, -0.9);
  const bark = wood('#6e5236', '#3a2a1a', 11); bark.map.rotation = bark.bumpMap.rotation = Math.PI / 2;
  const trunk = lathe([[0, 0], [.22, 0], [.17, .3], [.13, 1.4], [.1, 2.3], [0, 2.4]], bark, 14); tree.add(trunk);
  for (const [a, l, y] of [[.7, 1.1, 1.6], [-2.2, .9, 1.9], [2.6, .8, 2.1]]) { const b = cyl(.035, .06, l, bark, 8); b.position.set(Math.cos(a) * l * .4, y + l * .3, Math.sin(a) * l * .4); b.rotation.set(Math.sin(a) * .9, 0, -Math.cos(a) * .9); tree.add(b); }
  const leafMat = new THREE.MeshStandardMaterial({ roughness: .9, envMapIntensity: .4,
    map: canvasTex(128, 128, (g, w, h) => { const r = rnd(5); g.fillStyle = '#4c7a38'; g.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { g.fillStyle = r() < .5 ? 'rgba(30,60,25,.5)' : 'rgba(140,180,90,.45)'; g.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3); } }, [2, 2]) });
  const r = rnd(9);
  for (const [x, y, z, s] of [[0, 2.7, 0, 1.0], [.65, 2.35, .3, .75], [-.55, 2.45, -.2, .8], [.1, 3.25, -.1, .7], [-.2, 2.2, .55, .6], [.4, 2.9, -.5, .6]]) {
    const geo = new THREE.IcosahedronGeometry(s, 3), p = geo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = 1 + .16 * Math.sin(v.x * 7 + x * 3) * Math.cos(v.y * 6) + .1 * Math.sin(v.z * 9 + y); v.multiplyScalar(n); v.y *= .82; p.setXYZ(i, v.x, v.y, v.z); }
    geo.computeVertexNormals();
    const l = new THREE.Mesh(geo, leafMat); l.position.set(x, y, z); l.rotation.y = r() * 6; l.castShadow = l.receiveShadow = true; tree.add(l);
  }
  trunk.castShadow = true;
  return tree;
}
function buildWall(MAT) {
  const g = new THREE.Group(); g.position.set(.5, 0, -5.4);
  g.add(rbox(13, .5, .42, stone('#9c9486'), 0, .25, 0, .02));      // 아랫돌
  g.add(rbox(13, 1.15, .36, MAT.plaster, 0, .5 + .575, 0, .01));    // 회벽
  const cap = new THREE.Mesh(roofGeo(13.4, .9, .22, .03, .02), tileMat()); cap.position.y = 1.65; g.add(cap);
  g.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  return g;
}
