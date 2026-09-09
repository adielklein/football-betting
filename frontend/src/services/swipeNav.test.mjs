import test from 'node:test';
import assert from 'node:assert/strict';
import { swipeIntent, stepTab } from './swipeNav.js';

const swipe = (dx, dy = 0, dt = 200) => swipeIntent({ dx, dy, dt });

test('בפריסה עברית גרירה ימינה מביאה את הלשונית הבאה', () => {
  // הלשוניות מסודרות מימין לשמאל, ולכן הבאה נמצאת משמאל
  assert.equal(swipe(120), 'next');
  assert.equal(swipe(-120), 'prev');
});

test('גלילה אנכית אינה החלקה', () => {
  assert.equal(swipe(20, 200), null);
  // גם תנועה אלכסונית שנוטה לאנכי
  assert.equal(swipe(80, 90), null);
});

test('אלכסון שנוטה לאופקי כן נחשב', () => {
  assert.equal(swipe(140, 40), 'next');
});

test('לחיצה שזזה קצת אינה החלקה', () => {
  assert.equal(swipe(12), null);
  assert.equal(swipe(59), null);
  assert.equal(swipe(61), 'next');
});

test('גרירה איטית אינה החלקה - זה בדרך כלל סימון טקסט', () => {
  assert.equal(swipe(200, 0, 1500), null);
  assert.equal(swipe(200, 0, 650), 'next');
});

test('קלט פגום לא מזיז מסך', () => {
  assert.equal(swipeIntent({ dx: NaN, dy: 0, dt: 100 }), null);
  assert.equal(swipeIntent({ dx: 100, dy: 0, dt: undefined }), null);
  assert.equal(swipeIntent({}), null);
});

const KEYS = ['betting', 'allbets', 'leaderboard', 'history', 'stats'];

test('מעבר ללשונית הסמוכה', () => {
  assert.equal(stepTab(KEYS, 'betting', 'next'), 'allbets');
  assert.equal(stepTab(KEYS, 'leaderboard', 'prev'), 'allbets');
});

test('אין מעבר מעגלי בקצוות', () => {
  assert.equal(stepTab(KEYS, 'betting', 'prev'), null);
  assert.equal(stepTab(KEYS, 'stats', 'next'), null);
});

test('לשונית לא מוכרת או בלי כיוון לא מזיזה כלום', () => {
  assert.equal(stepTab(KEYS, 'nope', 'next'), null);
  assert.equal(stepTab(KEYS, 'betting', null), null);
});
