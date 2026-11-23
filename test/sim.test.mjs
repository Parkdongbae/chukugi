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

// ---------- v2 ----------
test('주척 읽기 판정: ±1푼 성공, 0푼이면 정확', () => {
  assert.deepEqual(S.judgeReading(100, 100), { ok: true, exact: true, diff: 0 });
  assert.equal(S.judgeReading(100, 101).ok, true); assert.equal(S.judgeReading(100, 101).exact, false);
  assert.equal(S.judgeReading(100, 99).ok, true);
  assert.equal(S.judgeReading(100, 102).ok, false); assert.equal(S.judgeReading(100, 102).diff, 2);
  assert.equal(S.readingPun(1, 2, 3), 123);
});
test('출제: 3문제, 짝수 2~300, 구간마다 하나, 정답 = 비 ÷ 2', () => {
  let k = 0; const seq = [0, .5, .999999, .3, .7, .1];
  for (const rng of [Math.random, () => 0, () => .999999, () => seq[k++ % seq.length]]) for (let n = 0; n < 50; n++) {
    const m = S.drawMission(rng); assert.equal(m.length, 3);
    m.forEach((q, i) => { const [a, b] = S.MISSION_BANDS[i];
      assert.equal(q.rainMm % 2, 0); assert.ok(q.rainMm >= a && q.rainMm <= b, `${q.rainMm} in [${a},${b}]`); assert.equal(q.truePun, q.rainMm / 2); });
  }
  assert.deepEqual(S.drawMission(() => 0).map(q => q.rainMm), [2, 62, 200]);
  assert.deepEqual(S.drawMission(() => .999999).map(q => q.rainMm), [60, 198, 300]);
});
test('별: 퀴즈 4·6·8개, 미션 성공 2·3개·정확 3개', () => {
  assert.deepEqual([0, 3, 4, 5, 6, 7, 8].map(n => S.quizStars(n)), [0, 0, 1, 1, 2, 2, 3]);
  const r = (ok, exact) => ({ ok, exact });
  assert.equal(S.missionStars([r(1, 0), r(0, 0), r(0, 0)].map(x => ({ ok: !!x.ok, exact: !!x.exact }))), 0);
  assert.equal(S.missionStars([r(true, false), r(true, true), r(false, false)]), 1);
  assert.equal(S.missionStars([r(true, false), r(true, true), r(true, true)]), 2);
  assert.equal(S.missionStars([r(true, true), r(true, true), r(true, true)]), 3);
});
test('반올림: 3mm → 2푼, 300mm → 1척 5촌', () => {
  assert.equal(S.toChukPun(3).pun, 2); assert.equal(S.toChukPun(300).ko, '1척 5촌'); assert.equal(S.toChukPun(300).hj, '一尺五寸');
  assert.equal(S.toChukPun(60).hj, '三寸'); assert.equal(S.toChukPun(320).ko, '1척 6촌');
});
test('이음·결측: 1907년 합계 있음, 1950·1951·1952·2026 없음, 결측 달 17개', () => {
  const A = S.annual(ROWS);
  assert.ok(A.find(p => p.y === 1907).v > 0);
  for (const y of [1950, 1951, 1952, 2026]) assert.equal(A.find(p => p.y === y).v, null);
  assert.equal(ROWS.flatMap(r => r.slice(1)).filter(v => v === null).length, 17);
  assert.equal(ROWS.length, 249);
});
test('시대 통계: 1907·1950~52 빠짐 (조선 129해, 근대 80해, 평년 30해)', () => {
  const A = S.annual(ROWS), n = ([a, b]) => S.stats(A.filter(p => p.y >= a && p.y <= b)).n;
  assert.equal(n(S.ERAS.joseon), 129); assert.equal(n(S.ERAS.mid), 80); assert.equal(n(S.ERAS.modern), 30);
  assert.equal(S.eraKeyOf(1907), 'joseon'); assert.equal(S.eraKeyOf(1908), 'mid'); assert.equal(S.eraKeyOf(1991), 'modern'); assert.equal(S.eraKeyOf(2026), 'modern');
});
test('이동 평균: 결측 해를 건너뛰고, 유효 값이 6개 미만이면 null', () => {
  const s = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(y => ({ y, v: y <= 5 ? null : 10 }));
  const m = S.movingAvg(s, 11);
  assert.equal(m[0].v, null);            // 0~5번째 중 유효 값 1개
  assert.equal(m[10].v, 10);             // 5~10번째 유효 6개
  const all = S.movingAvg(S.annual(ROWS).filter(p => p.y <= 2025), 11);
  assert.equal(all.filter(p => p.v === null).length, 0);
});
test('콘텐츠: 설치 8단계 쉬운 설명 90자 이내, 퀴즈 8문항, 배지 7개, 질문 카드 4장', () => {
  assert.equal(S.INSTALL.length, 8);
  for (const s of S.INSTALL) { assert.ok(s.easy && s.easy.length <= 90, s.key); assert.ok(s.d.length > s.easy.length); }
  for (const m of S.MEASURE) assert.ok(m.easy);
  assert.equal(S.QUIZ.length, 8); for (const q of S.QUIZ) { assert.equal(q[1].length, 4); assert.ok(q[2] >= 0 && q[2] < 4); }
  assert.equal(S.BADGES.length, 7); assert.equal(new Set(S.BADGES.map(b => b.id)).size, 7);
  assert.equal(S.CARDS.length, 4);
});
