import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speechSeq, speechMs } from './goliSpeech.js';

test('ריק - בלי דיבור', () => {
  assert.deepEqual(speechSeq(''), []);
  assert.deepEqual(speechSeq(null), []);
});

test('מסתיים בפה סגור, ואין שתי צורות זהות ברצף', () => {
  const seq = speechSeq('היי, אני גולי! אראה לך בדקה איך הכל עובד.');
  assert.equal(seq[seq.length - 1][0], 'closed');
  for (let i = 1; i < seq.length; i++) assert.notEqual(seq[i][0], seq[i - 1][0]);
});

test('אורך הדיבור בערך כמו זמן קריאה (כ-200-450 מ"ש למילה)', () => {
  const text = 'כאן רואים כמה משחקים כבר מילאת מתוך כולם.';
  const words = text.split(/\s+/).length;
  const ms = speechMs(speechSeq(text));
  assert.ok(ms > words * 200 && ms < words * 450, `${ms} ms ל-${words} מילים`);
});

test('ו נותן פה עגול, מ סוגר שפתיים, א פותח', () => {
  assert.ok(speechSeq('וו').some(([v]) => v === 'o'));
  assert.equal(speechSeq('מא')[0][0], 'closed');
  assert.ok(speechSeq('אה').some(([v]) => v === 'wide'));
});

test('פיסוק = עצירה ארוכה', () => {
  const a = speechMs(speechSeq('שלום שלום'));
  const b = speechMs(speechSeq('שלום. שלום'));
  assert.ok(b - a >= 200);
});

test('טקסט ארוך מאוד נקטע', () => {
  assert.ok(speechMs(speechSeq('מילה '.repeat(500))) < 16000);
});
