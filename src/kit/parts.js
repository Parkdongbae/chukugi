// 공통 키트 — 부재 만들기 도구: 재질(나무·쇠·청동·돌·종이·밧줄)과 모서리를 둥글린 상자, 원통
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { canvasTex } from './stage.js';

const rnd = seed => { let s = seed * 9301 + 49297; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// 나뭇결: 색 지도 + 요철 지도. 결은 가로(U) 방향
function woodTex(base, dark, seed) {
  const draw = bump => (g, w, h) => {
    const r = rnd(seed);
    g.fillStyle = bump ? '#808080' : base; g.fillRect(0, 0, w, h);
    if (!bump) for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? dark : '#fff'; g.globalAlpha = .03 + r() * .05; g.fillRect(0, r() * h, w, 10 + r() * 50); }
    const knots = [...Array(3)].map(() => [r() * w, r() * h, 6 + r() * 10]);
    for (let i = 0; i < 150; i++) {
      g.strokeStyle = bump ? (r() < .5 ? '#5a5a5a' : '#a6a6a6') : dark; g.globalAlpha = bump ? .35 : .06 + r() * .2; g.lineWidth = .6 + r() * 2.2;
      const y0 = r() * h, ph = r() * 6, amp = 1.5 + r() * 3; g.beginPath();
      for (let x = 0; x <= w; x += 8) { let y = y0 + Math.sin(x / 70 + ph) * amp;
        for (const [kx, ky, kr] of knots) { const dx = x - kx, dy = y - ky, d2 = dx * dx + dy * dy, s = kr * kr * 9; if (d2 < s) y += Math.sign(dy || 1) * kr * (1 - d2 / s) * 1.2; }
        x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke();
    }
    g.globalAlpha = bump ? .5 : .55; for (const [kx, ky, kr] of knots) { g.fillStyle = bump ? '#4a4a4a' : dark; g.beginPath(); g.ellipse(kx, ky, kr * 1.3, kr * .7, 0, 0, 7); g.fill(); }
    g.globalAlpha = 1;
  };
  const map = canvasTex(512, 512, draw(false)), bumpMap = canvasTex(512, 512, draw(true)); bumpMap.colorSpace = THREE.NoColorSpace;
  for (const t of [map, bumpMap]) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return { map, bumpMap };
}
export const wood = (base, dark, seed = 1, o = {}) => new THREE.MeshStandardMaterial({ ...woodTex(base, dark, seed), bumpScale: 1.2, roughness: .78, metalness: 0, envMapIntensity: .55, ...o });

function speckle(base, spots, seed, n = 2500) {
  return canvasTex(256, 256, (g, w, h) => { const r = rnd(seed); g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) { g.fillStyle = spots[i % spots.length]; g.globalAlpha = .08 + r() * .25; const s = 1 + r() * 3; g.fillRect(r() * w, r() * h, s, s); } g.globalAlpha = 1; }, [2, 2]);
}
export const iron = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, map: speckle('#6f6a64', ['#3b3836', '#8f887f', '#7a5840'], 5), metalness: .6, roughness: .5, envMapIntensity: 1.3, ...o });
export const bronze = (o = {}) => new THREE.MeshStandardMaterial({ color: 0xffffff, map: speckle('#8a6a3c', ['#5d7a66', '#a8834a', '#4f3b22'], 8), metalness: .8, roughness: .45, envMapIntensity: 1.1, ...o });
export const stone = (base = '#b9b5ab', o = {}) => new THREE.MeshStandardMaterial({ map: speckle(base, ['#8d8a82', '#d8d5cc', '#6f6c66'], 12, 5000), roughness: .92, metalness: 0, envMapIntensity: .4, ...o });
export const paper = (color = 0xeee4cb, o = {}) => new THREE.MeshStandardMaterial({ color, map: speckle('#ffffff', ['#d9cfb6', '#f6f0e0', '#c9bb98'], 21, 1800), roughness: .95, metalness: 0, envMapIntensity: .35, side: THREE.DoubleSide, ...o });
// 밧줄: 꼬임 무늬
export const rope = (color = '#b99b62', o = {}) => new THREE.MeshStandardMaterial({ roughness: .95, envMapIntensity: .3,
  map: canvasTex(64, 64, (g, w, h) => { g.fillStyle = color; g.fillRect(0, 0, w, h); g.strokeStyle = '#0005'; g.lineWidth = 5; for (let i = -64; i < 128; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 64); g.stroke(); } }, [1, 8]), ...o });

// 모서리를 둥글린 상자. 같은 치수는 형상을 함께 쓴다
const cache = new Map();
export function rboxGeo(w, h, d, r) {
  const rad = r ?? Math.min(.007, Math.min(w, h, d) * .22), key = [w, h, d, rad].map(v => v.toFixed(4)).join();
  if (!cache.has(key)) cache.set(key, new RoundedBoxGeometry(w, h, d, 2, rad));
  return cache.get(key);
}
export function rbox(w, h, d, mat, x = 0, y = 0, z = 0, r) {
  const m = new THREE.Mesh(rboxGeo(w, h, d, r), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m;
}
export function cyl(r1, r2, h, mat, seg = 24, open = false) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, seg, 1, open), mat); m.castShadow = m.receiveShadow = true; return m;
}
// 회전체: 옆모습 점 [[반지름, 높이], …]
export function lathe(profile, mat, seg = 32) {
  const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg), mat); m.castShadow = m.receiveShadow = true; return m;
}
export const shade = root => (root.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; }), root);
