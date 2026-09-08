// בדיקת ניגודיות לפלטת הטוקנים, בשני המצבים.
//
// הרצה: node --test src/services/colorScheme.test.mjs
//
// הטוקנים מוגדרים ב-index.css ונקראים משם, כדי שהבדיקה תיכשל אם מישהו
// ישנה שם ערך בלי לבדוק ניגודיות. WCAG AA דורש 4.5 לטקסט רגיל ו-3 לטקסט
// גדול או משני.

import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const css = fs.readFileSync(path.join(here, '..', 'index.css'), 'utf8');

// חילוץ הטוקנים מתוך גיליון הסגנונות עצמו
// הבלוק שמכיל את הסימן, ולא הבלוק שאחריו: מחפשים את הסוגר הפותח שלפניו
// ואת הסוגר הסוגר שאחריו.
const blockAround = (marker) => {
  const i = css.indexOf(marker);
  assert.ok(i !== -1, `לא נמצא הסימן: ${marker}`);
  const open = css.lastIndexOf('{', i);
  const close = css.indexOf('}', i);
  assert.ok(open !== -1 && close !== -1, `בלוק פגום סביב: ${marker}`);
  return css.slice(open, close);
};

const parseTokens = (block) => {
  const out = {};
  for (const m of block.matchAll(/(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,6})/g)) out[m[1]] = m[2];
  return out;
};

// המצב הבהיר מפוזר בין שני בלוקי :root - משתני הערכה באחד, הטוקנים
// הניטרליים בשני. מאחדים אותם כדי להשוות לכהה, שמגדיר את שניהם יחד.
const light = {
  ...parseTokens(blockAround('--theme-primary')),
  ...parseTokens(blockAround('--surface: #ffffff'))
};
const dark = parseTokens(blockAround(':root[data-theme="dark"]'));

const luminance = (hex) => {
  let x = hex.replace('#', '');
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  const [r, g, b] = [0, 2, 4]
    .map((i) => parseInt(x.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const SURFACES = ['--surface', '--surface-2', '--surface-3', '--app-bg'];

test('כל טוקן שהמצב הכהה משנה מוגדר גם במצב הבהיר', () => {
  // ההפך מותר: יש טוקנים שלא צריכים להתהפך. מה שאסור הוא טוקן שקיים רק
  // בכהה - אז במצב בהיר הוא פשוט לא מוגדר, והצבע נופל למה שבמקרה יורש.
  const missing = Object.keys(dark).filter((k) => !(k in light));
  assert.deepStrictEqual(missing, [], `טוקנים שקיימים רק במצב כהה: ${missing.join(', ')}`);
});

test('טקסט ראשי עומד ב-AA על כל משטח, בשני המצבים', () => {
  for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
    for (const surface of SURFACES) {
      const c = contrast(t[surface], t['--text']);
      assert.ok(c >= 4.5, `${mode}: --text על ${surface} = ${c.toFixed(1)}, נדרש 4.5`);
    }
  }
});

test('טקסט משני עומד ב-AA על כל משטח', () => {
  for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
    for (const surface of SURFACES) {
      const c = contrast(t[surface], t['--text-2']);
      assert.ok(c >= 4.5, `${mode}: --text-2 על ${surface} = ${c.toFixed(1)}, נדרש 4.5`);
    }
  }
});

test('טקסט עמום עדיין קריא (3.0 לפחות) על כל משטח', () => {
  for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
    for (const level of ['--text-3', '--text-4']) {
      for (const surface of SURFACES) {
        const c = contrast(t[surface], t[level]);
        assert.ok(c >= 3, `${mode}: ${level} על ${surface} = ${c.toFixed(1)}, נדרש 3`);
      }
    }
  }
});

test('המצב הכהה באמת כהה והבהיר באמת בהיר', () => {
  for (const s of SURFACES) {
    assert.ok(luminance(dark[s]) < 0.1, `${s} במצב כהה בהיר מדי`);
    assert.ok(luminance(light[s]) > 0.85, `${s} במצב בהיר כהה מדי`);
  }
  assert.ok(luminance(dark['--text']) > 0.7, 'הטקסט הראשי במצב כהה כהה מדי');
  assert.ok(luminance(light['--text']) < 0.2, 'הטקסט הראשי במצב בהיר בהיר מדי');
});

test('הגבולות נראים מול המשטח שהם יושבים עליו', () => {
  for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
    for (const border of ['--border', '--border-2']) {
      const c = contrast(t['--surface'], t[border]);
      assert.ok(c > 1.05, `${mode}: ${border} לא נבדל מ---surface`);
    }
  }
});

test('היררכיית הטקסט נשמרת: ראשי הכי חזק, עמום הכי חלש', () => {
  for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
    const c = (k) => contrast(t['--surface'], t[k]);
    assert.ok(c('--text') > c('--text-2'), `${mode}: --text חייב להיות חזק מ---text-2`);
    assert.ok(c('--text-2') > c('--text-3'), `${mode}: --text-2 חייב להיות חזק מ---text-3`);
    assert.ok(c('--text-3') > c('--text-4'), `${mode}: --text-3 חייב להיות חזק מ---text-4`);
  }
});

// === צבעים סמנטיים ===
//
// ירוק כהה קריא מצוין על כרטיס לבן ונעלם על כרטיס כהה. אין ירוק אחד
// שעובד בשניהם, ולכן הרקע והחזית מתהפכים יחד. הבדיקות כאן מוודאות שכל
// זוג עומד בתקן בשני המצבים - גם על התגית הצבעונית וגם על המשטח הרגיל.

const KINDS = ['good', 'warn', 'bad', 'info'];

test('כל צבע סמנטי מוגדר בשני המצבים', () => {
  for (const k of KINDS) {
    for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
      assert.ok(t[`--${k}-bg`], `${mode}: חסר --${k}-bg`);
      assert.ok(t[`--${k}-fg`], `${mode}: חסר --${k}-fg`);
    }
  }
});

test('טקסט סמנטי קריא על התגית הצבעונית שלו', () => {
  for (const k of KINDS) {
    for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
      const c = contrast(t[`--${k}-bg`], t[`--${k}-fg`]);
      assert.ok(c >= 4.5, `${mode}: ${k} על התגית = ${c.toFixed(1)}, נדרש 4.5`);
    }
  }
});

test('טקסט סמנטי קריא גם כשהוא יושב ישירות על המשטח', () => {
  // זה המקרה שנשבר בפועל: ירוק על הכרטיס, בלי תגית מסביבו
  for (const k of KINDS) {
    for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
      for (const surface of SURFACES) {
        const c = contrast(t[surface], t[`--${k}-fg`]);
        assert.ok(c >= 4.5, `${mode}: ${k} על ${surface} = ${c.toFixed(1)}, נדרש 4.5`);
      }
    }
  }
});

test('התגית הצבעונית נבדלת מהמשטח שמאחוריה', () => {
  for (const k of KINDS) {
    for (const [mode, t] of [['בהיר', light], ['כהה', dark]]) {
      const c = contrast(t['--surface'], t[`--${k}-bg`]);
      assert.ok(c > 1.05, `${mode}: ${k}-bg לא נבדל מהמשטח`);
    }
  }
});

test('הרקע הסמנטי מתהפך יחד עם המצב', () => {
  for (const k of KINDS) {
    assert.ok(luminance(light[`--${k}-bg`]) > 0.7, `${k}-bg במצב בהיר כהה מדי`);
    assert.ok(luminance(dark[`--${k}-bg`]) < 0.15, `${k}-bg במצב כהה בהיר מדי`);
  }
});
