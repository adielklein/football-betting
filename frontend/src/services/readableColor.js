// התאמת צבע מותג לקריאוּת על רקע נתון.
//
// ערכות הקבוצות קובעות צבע מותג, וצבעי מותג לא נבחרו כדי להיות קריאים על
// רקע כהה. ברצלונה, למשל, היא #A50044 - ארגמן כהה שנותן ניגודיות 1.75 על
// המשטח הכהה, כלומר כותרות שכמעט נעלמות.
//
// הפתרון אינו להחליף את הצבע אלא להבהיר או להכהות אותו עד שהוא קריא,
// תוך שמירה על הגוון והרוויה. ברצלונה נשארת ארגמן - רק בהיר מספיק.

const toRgb = (hex) => {
  let x = String(hex || '').replace('#', '').trim();
  if (x.length === 3) x = x.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(x)) return null;
  return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
};

const toHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');

const luminance = ([r, g, b]) => {
  const f = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
};

export const contrast = (a, b) => {
  const [ra, rb] = [toRgb(a), toRgb(b)];
  if (!ra || !rb) return 21;
  const [hi, lo] = [luminance(ra), luminance(rb)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const rgbToHsl = ([r, g, b]) => {
  const [rn, gn, bn] = [r / 255, g / 255, b / 255];
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
  else if (max === gn) h = ((bn - rn) / d + 2) / 6;
  else h = ((rn - gn) / d + 4) / 6;
  return [h, s, l];
};

const hslToRgb = ([h, s, l]) => {
  if (s === 0) { const v = l * 255; return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hue = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [hue(h + 1 / 3) * 255, hue(h) * 255, hue(h - 1 / 3) * 255];
};

/**
 * מחזיר את הצבע עצמו אם הוא כבר קריא, ואחרת גרסה מוארת או מוכהה שלו.
 *
 * @param color      צבע המותג
 * @param background הרקע שעליו הוא יושב
 * @param target     יחס הניגודיות הנדרש (4.5 = תקן AA לטקסט רגיל)
 */
export const readableOn = (color, background, target = 4.5) => {
  const rgb = toRgb(color);
  const bg = toRgb(background);
  if (!rgb || !bg) return color;
  if (contrast(color, background) >= target) return color;

  const [h, s, l0] = rgbToHsl(rgb);
  // רקע כהה - מבהירים; רקע בהיר - מכהים
  const towardLight = luminance(bg) < 0.5;

  let best = color;
  let bestContrast = contrast(color, background);

  for (let step = 1; step <= 100; step++) {
    const l = towardLight
      ? Math.min(1, l0 + (step / 100) * (1 - l0))
      : Math.max(0, l0 - (step / 100) * l0);
    const candidate = toHex(hslToRgb([h, s, l]));
    const c = contrast(candidate, background);
    if (c > bestContrast) { best = candidate; bestContrast = c; }
    if (c >= target) return candidate;
  }

  // גוון שלא מגיע ליעד גם בקצה - מחזירים את הטוב ביותר שנמצא
  return best;
};

export default readableOn;
