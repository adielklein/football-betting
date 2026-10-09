const test = require('node:test');
const assert = require('node:assert');
const logBuffer = require('./logBuffer');

// console מדומה, כדי לא לעטוף את ה-console של מריץ הבדיקות
const fakeConsole = () => {
  const printed = [];
  const c = {};
  for (const m of ['log', 'info', 'warn', 'error']) c[m] = (...a) => printed.push([m, a.join(' ')]);
  return { c, printed };
};

test('שורות נשמרות וגם ממשיכות ללוג הרגיל', () => {
  logBuffer.reset();
  const { c, printed } = fakeConsole();
  logBuffer.install(c);
  c.log('שלום', 1);
  c.warn('אזהרה');
  c.error(new Error('בום'));
  assert.equal(printed.length, 3, 'עדיין מודפס ל-Render');

  const { entries } = logBuffer.read();
  assert.deepStrictEqual(entries.map((e) => e.level), ['error', 'warn', 'info'], 'מהחדש לישן');
  assert.equal(entries[2].message, 'שלום 1');
  assert.match(entries[0].message, /בום/);
});

test('סינון לפי רמה מינימלית ולפי טקסט', () => {
  logBuffer.reset();
  logBuffer.push('info', ['📡 [365] status=200']);
  logBuffer.push('warn', ['🔴 [LIVE] פנייה ל-365 נכשלה']);
  logBuffer.push('error', ['❌ משהו אחר']);

  assert.equal(logBuffer.read({ level: 'warn' }).entries.length, 2);
  assert.equal(logBuffer.read({ level: 'error' }).entries.length, 1);
  assert.equal(logBuffer.read({ q: '365' }).entries.length, 2);
  assert.equal(logBuffer.read({ q: 'live' }).entries.length, 1, 'לא רגיש לאותיות');
});

test('המאגר מוגבל ושומר את האחרונות', () => {
  logBuffer.reset();
  for (let i = 0; i < logBuffer.MAX_ENTRIES + 50; i++) logBuffer.push('info', [`שורה ${i}`]);
  const { entries, total } = logBuffer.read({ limit: 5000 });
  assert.equal(total, logBuffer.MAX_ENTRIES);
  assert.equal(entries[0].message, `שורה ${logBuffer.MAX_ENTRIES + 49}`);
});

test('אובייקטים ומעגליים לא מפילים', () => {
  logBuffer.reset();
  const a = { x: 1 }; a.self = a;
  logBuffer.push('info', [{ y: 2 }, a]);
  assert.match(logBuffer.read().entries[0].message, /"y":2/);
});

test('אזהרת Node איננה שגיאה של האפליקציה', () => {
  logBuffer.reset();
  logBuffer.push('error', ['(node:833) [DEP0040] DeprecationWarning: The `punycode` module is deprecated.']);
  logBuffer.push('error', ['❌ [external/live] error: boom']);
  assert.deepStrictEqual(logBuffer.read().entries.map((e) => e.level), ['error', 'warn']);
});
