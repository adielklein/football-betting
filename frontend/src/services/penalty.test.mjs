import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  playShot, isGoal, keeperAt, keeperPlan, keeperSkill, ballPath, timeAtZ, executeShot, resolveShot,
  shotFromGesture, KEEPER_Z, HALF, GOAL_H
} from './penalty.js';

// מחולל אקראי קבוע, כדי שהסימולציות ייתנו תמיד אותה תוצאה
const seeded = (seed) => {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let x = Math.imul(a ^ (a >>> 15), 1 | a);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
};

const goalRate = (gen, streak, n = 12000, seed = 1) => {
  const rand = seeded(seed);
  let g = 0;
  for (let i = 0; i < n; i++) if (isGoal(playShot(gen(rand), streak, rand).outcome)) g++;
  return g / n;
};

const smart = (power) => (r) => {
  const side = r() < 0.5 ? -1 : 1;
  return { aim: { x: side * (2.3 + r() * 0.8), y: 0.4 + r() * 1.5 }, power };
};

test('בעיטות טובות ומגוונות: בערך כמו פנדלים אמיתיים (כ-75%)', () => {
  const r = goalRate(smart(0.65), 0);
  assert.ok(r > 0.66 && r < 0.84, `goal rate ${r}`);
});

test('אין נקודה אחת שמנצחת תמיד: פינה עליונה או אמצע לא עוברים 62%', () => {
  const spots = {
    'top-right p.6': () => ({ aim: { x: 3.35, y: 2.2 }, power: 0.6 }),
    'top-right p.3': () => ({ aim: { x: 3.35, y: 2.2 }, power: 0.3 }),
    'top-left p.45 (tap)': () => ({ aim: { x: -3.35, y: 2.2 }, power: 0.45 }),
    'center low p.8': () => ({ aim: { x: 0, y: 0.4 }, power: 0.8 })
  };
  for (const [name, gen] of Object.entries(spots)) {
    const r = goalRate(gen, 0);
    assert.ok(r < 0.62, `${name}: ${r}`);
  }
});

test('השוער משתפר עם הרצף', () => {
  const at0 = goalRate(smart(0.65), 0);
  const at10 = goalRate(smart(0.65), 10);
  assert.ok(at0 - at10 > 0.12, `${at0} -> ${at10}`);
});

test('כוח מול דיוק: בעיטה חזקה מפוזרת יותר', () => {
  const spread = (power) => {
    const rand = seeded(5);
    let s = 0;
    for (let i = 0; i < 4000; i++) { const sh = executeShot({ aim: { x: 0, y: 1.2 }, power }, rand); s += Math.abs(sh.x); }
    return s / 4000;
  };
  assert.ok(spread(0.9) > spread(0.2) * 2);
  assert.ok(executeShot({ aim: { x: 0, y: 1 }, power: 1 }).flight < executeShot({ aim: { x: 0, y: 1 }, power: 0 }).flight);
});

test('השוער אף פעם לא מתהפך - לכל היותר שוכב לרוחב', () => {
  const rand = seeded(9);
  for (let i = 0; i < 3000; i++) {
    const target = { x: (rand() - 0.5) * 8, y: rand() * 2.6 };
    const skill = keeperSkill((rand() * 12) | 0);
    const plan = keeperPlan(target, skill, rand);
    for (const t of [0, 0.2, 0.4, 0.7, 1]) {
      const k = keeperAt(t, plan, target, skill);
      assert.ok(Math.abs(k.rot) <= 1.56, `rot ${k.rot}`);
      assert.ok(k.y >= 0.2 && k.y < 2.6, `y ${k.y}`);
    }
  }
});

test('מסלול הכדור מגיע לשוער ולקו השער בזמנים הנכונים', () => {
  const shot = { x: 2, y: 1.5, power: 0.5, curl: 0.6, flight: 0.7 };
  const path = ballPath(shot);
  assert.ok(Math.abs(path(timeAtZ(shot, KEEPER_Z)).z - KEEPER_Z) < 1e-6);
  const end = path(shot.flight);
  assert.ok(Math.abs(end.z) < 1e-9 && Math.abs(end.x - 2) < 1e-6 && Math.abs(end.y - 1.5) < 1e-6);
});

test('קורות ומשקוף: נכנס או יוצא לפי הצד', () => {
  const far = { side: -1, gx: -3, gy: 0.5, start: 0, launch: [-0.3, 0.95] };
  const sk = keeperSkill(0);
  const r = (x, y) => resolveShot({ x, y, power: 0.5, curl: 0, flight: 0.7 }, far, sk).outcome;
  assert.equal(r(HALF - 0.04, 1), 'post-in');
  assert.equal(r(HALF - 0.12, 1), 'goal'); // נגיעה קלה מבפנים - סתם גול
  assert.equal(r(HALF + 0.1, 1), 'post-out');
  assert.equal(r(1.5, GOAL_H + 0.1), 'bar-out');
  assert.equal(r(HALF + 0.5, 1), 'wide');
  assert.equal(r(1.5, GOAL_H + 0.6), 'over');
  assert.equal(r(2, 1), 'goal');
});

test('מחווה: הקשה, החלקה למעלה, וגרירה למטה שאינה בעיטה', () => {
  const env = { goalPt: (x, y) => ({ x: (x - 196) / 47, y: (306 - y) / 47 + 0.95 }), groundY: 350, ball: { x: 196, y: 512 } };
  const tap = shotFromGesture([{ x: 290, y: 260, t: 0 }], env);
  assert.equal(tap.power, 0.45);
  assert.ok(tap.aim.x > 1.9 && tap.aim.y > 1.8);
  const flick = shotFromGesture([{ x: 196, y: 520, t: 0 }, { x: 200, y: 400, t: 40 }, { x: 196, y: 270, t: 90 }], env);
  assert.ok(flick.power > 0.9);
  const slow = shotFromGesture([{ x: 196, y: 520, t: 0 }, { x: 196, y: 270, t: 700 }], env);
  assert.ok(slow.power < 0.1);
  // קשת ימינה -> סיבוב ימינה
  const bow = shotFromGesture([{ x: 196, y: 520, t: 0 }, { x: 250, y: 400, t: 60 }, { x: 200, y: 270, t: 120 }], env);
  assert.ok(bow.curl > 0);
  assert.equal(shotFromGesture([{ x: 196, y: 300, t: 0 }, { x: 196, y: 500, t: 200 }], env), null);
});
