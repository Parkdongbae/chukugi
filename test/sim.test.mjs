import test from 'node:test'; import assert from 'node:assert/strict';
import * as S from '../src/sim.js'; import { ROWS } from '../src/data.js';
test('척·촌·푼 환산 (1푼=2mm)', () => {
  assert.equal(S.toChukPun(30).ko, '1촌 5푼'); assert.equal(S.toChukPun(30).hj, '一寸五分');
  assert.equal(S.toChukPun(204).ko, '1척 2푼'); assert.equal(S.toChukPun(0).hj, '無');
});
test('빗물 깊이는 그릇 넓이와 무관', () => {
  for (const r of [50, 70, 200]) assert.ok(Math.abs(S.waterDepth(42, r).depth - 42) < 1e-9);
  assert.ok(S.waterDepth(330).overflow);
});
test('측우기 치수: 세종 규격(1척5촌×7촌, 주척 20.7cm 안팎)과 비슷', () => {
  assert.ok(Math.abs(S.GAUGE.h - 1.5 * 207) < 15); assert.ok(Math.abs(2 * S.GAUGE.rIn - 0.7 * 207) < 10);
  assert.ok(S.STAND.holeR > S.GAUGE.rOut);
});
test('자료: 논문 값 재현 (연평균 ≈1200mm, 1832년 7월 1296mm)', () => {
  const A = S.annual(ROWS).filter(p => p.y >= 1778 && p.y <= 1906);
  assert.ok(Math.abs(S.stats(A).mean - 1200) < 15);
  assert.ok(Math.abs(S.yearRow(ROWS, 1832)[7] - 1296) < 2);
});
test('평년(1991~2020) 1418mm, 결측 해는 null', () => {
  const A = S.annual(ROWS).filter(p => p.y >= 1991 && p.y <= 2020);
  assert.ok(Math.abs(S.stats(A).mean - 1418) < 3);
  assert.equal(S.annual(ROWS).find(p => p.y === 1951).v, null);
  assert.equal(S.annual(ROWS).find(p => p.y === 2026).v, null);
});
test('가장 비가 많은 달은 세 시대 모두 7월', () => {
  for (const [a, b] of Object.values(S.ERAS)) { const c = S.climatology(ROWS, a, b); assert.equal(c.indexOf(Math.max(...c)), 6); }
});
test('측정 장면: 물이 차고, 자가 들어갔다 나옴', () => {
  assert.equal(S.measureAt(0, 40).water, 0); assert.equal(S.measureAt(9, 40).water, 40);
  const r = S.measureAt(8 + 2 + 4 - 0.001, 40); assert.ok(r.ruler < 1);
  assert.equal(S.measureAt(S.MEASURE_TOTAL, 40).water, 0);
});
