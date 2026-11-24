import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalBoxStep, NET_TOP } from './goalBox.js';

const HALF = 3.66, R = 0.11;
// מריץ את הכדור אחרי קו השער שתי שניות, עם כובד וקפיצות כמו בסצנה
const run = (p, v) => {
  const st = {}; const hits = [];
  for (let i = 0; i < 120; i++) {
    const dt = 1 / 60;
    p.x += v.x * dt; p.y += v.y * dt; p.z += v.z * dt;
    v.y -= 9.8 * dt;
    goalBoxStep(p, v, st, { half: HALF, ballR: R, hitNet: (x, y, pw) => hits.push(pw) });
    if (p.y < R) { p.y = R; v.y = Math.abs(v.y) * 0.42; v.x *= 0.82; v.z *= 0.82; }
    assert.ok(Math.abs(p.x) <= HALF - R, `out through the side at step ${i}: x=${p.x}`);
    assert.ok(p.y <= NET_TOP, `through the roof: y=${p.y}`);
    assert.ok(p.z >= -2 && p.z <= 0, `left the goal: z=${p.z}`);
  }
  return { st, hits };
};

test('angled shot into a corner stays inside and moves the net', () => {
  const { st, hits } = run({ x: 3.4, y: 1.0, z: 0 }, { x: 6, y: 1, z: -18 });
  assert.ok(st.netHit || st.sideHit);
  assert.ok(hits.length >= 1);
});

test('sharp angle from the other side, low and fast', () => {
  run({ x: -3.3, y: 0.3, z: 0 }, { x: -9, y: 0.5, z: -25 });
});

test('high shot does not leave through the roof', () => {
  run({ x: 0.5, y: 2.3, z: 0 }, { x: 0, y: 5, z: -14 });
});

test('central shot hits the back net and does not roll out the front', () => {
  const { st } = run({ x: 0, y: 1, z: 0 }, { x: 0, y: 0, z: -22 });
  assert.equal(st.netHit, true);
});
