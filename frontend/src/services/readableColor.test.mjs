// בדיקות להתאמת צבע מותג לקריאוּת.
// הרצה: node --test src/services/readableColor.test.mjs

import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// המודול נכתב כ-ESM לדפדפן; נטען אותו כטקסט ומריצים דרך import דינמי
const here = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(here, 'readableColor.js'), 'utf8');
const dataUrl = 'data:text/javascript;base64,' + Buffer.from(src).toString('base64');
const { readableOn, contrast } = await import(dataUrl);

const DARK = '#1b1f26';
const LIGHT = '#ffffff';

// צבעי מותג אמיתיים מתוך ערכות הקבוצות
const BRANDS = {
  'ברצלונה': '#A50044',
  'אתלטיקו מדריד': '#CE3524',
  'ברירת מחדל': '#007bff'
};

test('צבע שכבר קריא חוזר כמו שהוא', () => {
  const bright = '#ffd700';
  assert.strictEqual(readableOn(bright, DARK), bright);
});

test('כל צבע מותג הופך קריא על רקע כהה', () => {
  for (const [name, color] of Object.entries(BRANDS)) {
    const before = contrast(color, DARK);
    const after = contrast(readableOn(color, DARK), DARK);
    assert.ok(after >= 4.5, `${name}: ${after.toFixed(2)} אחרי התאמה, נדרש 4.5`);
    assert.ok(after > before, `${name}: ההתאמה לא שיפרה כלום`);
  }
});

test('כל צבע מותג הופך קריא גם על רקע בהיר', () => {
  for (const [name, color] of Object.entries(BRANDS)) {
    const after = contrast(readableOn(color, LIGHT), LIGHT);
    assert.ok(after >= 4.5, `${name}: ${after.toFixed(2)} על לבן`);
  }
});

test('ברצלונה נשארת ארגמן - הגוון נשמר', () => {
  // זו הנקודה: לא מחליפים את צבע המותג, רק מבהירים אותו
  const adjusted = readableOn('#A50044', DARK);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(adjusted.slice(i, i + 2), 16));
  assert.ok(r > g && r > b, `הגוון האדום נשמר: ${adjusted}`);
  assert.ok(r > 150, `הצבע הובהר מספיק: ${adjusted}`);
});

test('על רקע כהה מבהירים, על רקע בהיר מכהים', () => {
  const lum = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const mid = '#808080';
  assert.ok(lum(readableOn(mid, DARK)) > lum(mid), 'על כהה - הצבע חייב להתבהר');
  assert.ok(lum(readableOn(mid, LIGHT)) < lum(mid), 'על בהיר - הצבע חייב להתכהות');
});

test('שחור ולבן מטופלים בלי לולאה אינסופית', () => {
  assert.ok(contrast(readableOn('#000000', DARK), DARK) >= 4.5);
  assert.ok(contrast(readableOn('#ffffff', LIGHT), LIGHT) >= 4.5);
});

test('קלט פגום מוחזר כמו שהוא ולא מפיל', () => {
  assert.strictEqual(readableOn('', DARK), '');
  assert.strictEqual(readableOn('לא צבע', DARK), 'לא צבע');
  assert.strictEqual(readableOn(null, DARK), null);
  assert.strictEqual(readableOn('#A50044', 'זבל'), '#A50044');
});

test('צורת שלוש ספרות נתמכת', () => {
  const out = readableOn('#036', DARK);
  assert.ok(contrast(out, DARK) >= 4.5, `#036 על כהה = ${contrast(out, DARK).toFixed(2)}`);
});

test('התוצאה תמיד הקסה תקינה', () => {
  for (const color of Object.values(BRANDS)) {
    for (const bg of [DARK, LIGHT]) {
      assert.match(readableOn(color, bg), /^#[0-9a-f]{6}$/i);
    }
  }
});
