const test = require('node:test');
const assert = require('node:assert');
const lim = require('./loginLimiter');

test('נחסם אחרי מספר הכישלונות המותר, ומשתחרר אחרי החלון', () => {
  lim.reset();
  const t0 = 1_000_000;
  for (let i = 0; i < lim.MAX_FAILURES - 1; i++) lim.fail('1.1.1.1', 'dana', t0);
  assert.equal(lim.blockedFor('1.1.1.1', 'dana', t0), 0, 'עוד מותר');
  lim.fail('1.1.1.1', 'dana', t0);
  assert.ok(lim.blockedFor('1.1.1.1', 'dana', t0 + 1000) > 0, 'נחסם');
  assert.equal(lim.blockedFor('1.1.1.1', 'dana', t0 + lim.WINDOW_MS + 1), 0, 'השתחרר');
});

test('כניסה מוצלחת מאפסת', () => {
  lim.reset();
  for (let i = 0; i < lim.MAX_FAILURES; i++) lim.fail('ip', 'dana');
  lim.succeed('ip', 'dana');
  assert.equal(lim.blockedFor('ip', 'dana'), 0);
});

test('חסימה של שם אחד לא חוסמת שם אחר או כתובת אחרת', () => {
  lim.reset();
  for (let i = 0; i < lim.MAX_FAILURES; i++) lim.fail('ip', 'dana');
  assert.ok(lim.blockedFor('ip', 'dana') > 0);
  assert.equal(lim.blockedFor('ip', 'yossi'), 0);
  assert.equal(lim.blockedFor('other-ip', 'dana'), 0);
});
