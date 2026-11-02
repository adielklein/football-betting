const test = require('node:test');
const assert = require('node:assert');
const { normalizeUsername } = require('./username');

test('שם עברי רגיל לא משתנה', () => {
  assert.equal(normalizeUsername('פז'), 'פז');
  assert.equal(normalizeUsername('דנה לוי'), 'דנה לוי');
});

test('תווי כיווניות בלתי נראים יורדים', () => {
  assert.equal(normalizeUsername('‏פז‏'), 'פז');
  assert.equal(normalizeUsername('פז‎'), 'פז');
  assert.equal(normalizeUsername('‫דנה‬'), 'דנה');
});

test('כל צורות הגרש הופכות לאותו גרש', () => {
  const forms = ["ג'ורג'", 'ג׳ורג׳', 'ג’ורג’', 'ג`ורג`'];
  assert.deepStrictEqual([...new Set(forms.map(normalizeUsername))], ["ג'ורג'"]);
});

test('רווחים כפולים ורווחים בקצוות', () => {
  assert.equal(normalizeUsername('  דנה   לוי  '), 'דנה לוי');
});

test('שמות באנגלית נשארים כמו שהם, כולל אותיות גדולות', () => {
  assert.equal(normalizeUsername('adielklein'), 'adielklein');
  assert.equal(normalizeUsername('Dana'), 'Dana');
});

test('ערך חסר לא מפיל', () => {
  assert.equal(normalizeUsername(undefined), '');
  assert.equal(normalizeUsername(null), '');
});
