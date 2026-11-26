import React, { useEffect, useState } from 'react';
import { speechSeq } from '../services/goliSpeech';
import idleImg from '../assets/goli/idle.webp';
import sleepImg from '../assets/goli/sleep.webp';
import sadImg from '../assets/goli/sad.webp';
import celebrateImg from '../assets/goli/celebrate.webp';
import crownImg from '../assets/goli/crown.webp';
import idleScarfImg from '../assets/goli/idle_scarf.webp';
import mouthClosedImg from '../assets/goli/mouth_closed.webp';
import mouthMidImg from '../assets/goli/mouth_mid.webp';
import mouthOImg from '../assets/goli/mouth_o.webp';

// גולי - הדמות שנבחרה (גיליון הדמות מ-Gemini), כתמונה לכל הבעה, עם תנועה ב-CSS:
//   idle      - קפיצה רכה עם כיווץ בנחיתה
//   דיבור     - בכל שלב חדש (stepKey) "אומר משפט": צורות פה בקצב של הברות
//   wave      - קפיצות שלום עם הטיה לצדדים
//   celebrate - צחוק, קפיצה גבוהה וסיבוב
//   sleep     - עיניים עצומות ו-Zzz, נשימה איטית
//   sad       - פרצוף עצוב, קפיצה כבדה
//   loading   - מתגלגל מצד לצד במקום (טעינה)
// lookX/lookY (‎-1..1) - מטה את הראש לכיוון האלמנט המואר. say - הטקסט שהוא "אומר".
// crown - כתר (הזוכה השבועי). scarf=[ראשי, משני] - צעיף בצבעי הקבוצה (במצב רגיל).
// מי שביקש פחות תנועה (still) מקבל אותו בלי קפיצות.

// מיקום הכדור בכל תמונה (מרכז ורדיוס, בפיקסלים) - כדי שהכדור יישב בדיוק
// באותו מקום בכל הבעה ולא "יקפוץ" במעבר.
// idle_scarf = הפרצוף הרגיל עם הצעיף מהגיליון מולבש עליו (כך שגם עם צעיף
// הוא מדבר).
const SPRITES = {
  idle: { src: idleImg, w: 290, h: 290, cx: 144, cy: 144, r: 146 },
  sleep: { src: sleepImg, w: 306, h: 292, cx: 142, cy: 148, r: 144 },
  sad: { src: sadImg, w: 288, h: 286, cx: 143, cy: 142, r: 145 },
  celebrate: { src: celebrateImg, w: 286, h: 286, cx: 142, cy: 142, r: 144 },
  crown: { src: crownImg, w: 302, h: 354, cx: 148, cy: 204, r: 150 },
  idle_scarf: { src: idleScarfImg, w: 300, h: 311, cx: 146, cy: 144, r: 146 }
};

// דיבור: מדבקות פה שמונחות על הפה של הפרצוף הרגיל (עם או בלי צעיף) - סגור
// בחיוך, חצי פתוח, "או" עגול, ופתוח לגמרי (הפה של הפרצוף עצמו, בלי מדבקה).
// המיקום ביחידות של התמונה, יחסית למרכז הכדור (רדיוס 146)
const MOUTHS = { closed: mouthClosedImg, mid: mouthMidImg, o: mouthOImg };
const MOUTH_BOX = { x: -46, y: 0, w: 88, h: 58, r: 146 };
// הברות בקצב משתנה: פתיחה (פתוח/חצי/או) וסגירה לסירוגין, כמו דיבור אמיתי,
// ובסוף סגור לרגע ואז חוזר לחיוך. אותו שלב = אותו "משפט"
const talkSeq = (seed) => {
  let x = (Math.abs(Number(seed) || 0) * 9301 + 49297) % 233280;
  const rnd = () => { x = (x * 9301 + 49297) % 233280; return x / 233280; };
  const seq = [];
  let t = 0;
  while (t < 1500) {
    const r = rnd();
    const open = r < 0.4 ? 'wide' : r < 0.78 ? 'mid' : 'o';
    const d1 = 90 + Math.round(rnd() * 70);
    seq.push([open, d1]); t += d1;
    // לפעמים שתי פתיחות ברצף (הברה ארוכה), לרוב סגירה קצרה ביניהן
    if (rnd() < 0.75) { const d2 = 55 + Math.round(rnd() * 45); seq.push(['closed', d2]); t += d2; }
    // הפסקה קטנה בין מילים
    if (rnd() < 0.18) { seq.push(['closed', 160]); t += 160; }
  }
  seq.push(['closed', 140]);
  return seq;
};

const CSS = `
@keyframes gs-bob { 0%,100% { transform: translateY(0) scale(1,1) } 45% { transform: translateY(-7%) scale(.98,1.03) } 88% { transform: translateY(0) scale(1.05,.94) } }
@keyframes gs-roll { 0%,100% { transform: translateX(-14%) rotate(-20deg) } 50% { transform: translateX(14%) rotate(20deg) } }
@keyframes gs-roll-shadow { 0%,100% { transform: translateX(-14%) } 50% { transform: translateX(14%) } }
@keyframes gs-shadow { 0%,100% { transform: scaleX(1); opacity: .22 } 45% { transform: scaleX(.78); opacity: .13 } }
@keyframes gs-wave { 0% { transform: translateY(0) rotate(0) } 25% { transform: translateY(-12%) rotate(-12deg) } 50% { transform: translateY(0) rotate(9deg) } 70% { transform: translateY(-5%) rotate(-5deg) } 100% { transform: translateY(0) rotate(0) } }
@keyframes gs-party { 0% { transform: translateY(0) rotate(0) scale(1) } 35% { transform: translateY(-22%) rotate(-10deg) scale(1.04) } 60% { transform: translateY(0) rotate(8deg) scale(1.08,.9) } 78% { transform: translateY(-7%) rotate(0) scale(1) } 100% { transform: translateY(0) rotate(0) } }
@keyframes gs-breathe { 0%,100% { transform: scale(1,1) } 50% { transform: scale(1.03,.97) } }
@keyframes gs-hop { 0% { transform: translateY(0) } 40% { transform: translateY(-10%) } 100% { transform: translateY(0) } }
@keyframes gs-star { 0% { transform: translate(0,0) scale(.2); opacity: 0 } 20% { opacity: 1 } 100% { transform: translate(var(--dx), var(--dy)) scale(1); opacity: 0 } }
.gs-still, .gs-still * { animation: none !important }
`;

// צעיף בצבעי הקבוצה: הפסים האדומים בתמונה נצבעים בצבע הראשי (שומרים על
// הצללה של הסריגה). נשמר לפי צבע - נבנה פעם אחת
const scarfCache = new Map();
const hex = (c) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(c || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const tintScarf = (src, primary, secondary) => {
  let col = hex(primary);
  const sec = hex(secondary);
  // צבע ראשי כמעט לבן (הפסים הלבנים כבר לבנים) - משתמשים במשני
  if (col && col[0] + col[1] + col[2] > 690 && sec) col = sec;
  if (!col) return Promise.resolve(null);
  const key = `${src}|${col.join(',')}`;
  if (scarfCache.has(key)) return scarfCache.get(key);
  const p = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        const x = c.getContext('2d');
        x.drawImage(img, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height);
        const a = d.data;
        // רק באזור הצעיף (מתחת לפה) - לא נוגעים בעיניים החומות
        const y0 = Math.round(c.height * 0.62);
        for (let i = y0 * c.width * 4; i < a.length; i += 4) {
          const r = a[i], g = a[i + 1], b = a[i + 2];
          if (r > g + 45 && r > b + 45) {
            const f = Math.min(1.25, r / 205);
            a[i] = Math.min(255, col[0] * f); a[i + 1] = Math.min(255, col[1] * f); a[i + 2] = Math.min(255, col[2] * f);
          }
        }
        x.putImageData(d, 0, 0);
        resolve(c.toDataURL('image/png'));
      } catch (e) { resolve(null); }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  scarfCache.set(key, p);
  return p;
};

export default function GoliSprite({ mood = 'idle', stepKey, lookX = 0, lookY = 0, size = 66, still = false, talk = true, crown = false, scarf = null, say = '' }) {
  const calm = mood === 'idle' || mood === 'wave';
  const useScarf = !!scarf && calm && !crown;
  const canTalk = talk && calm && !crown && !still;

  // דיבור: בכל שלב חדש הוא "אומר משפט" - רצף צורות פה. עם say (הטקסט
  // שעל המסך) הפה זז לפי המילים ולאורך זמן הקריאה; בלי - משפט קצר כללי
  const [viseme, setViseme] = useState(null); // null = לא מדבר
  useEffect(() => {
    if (!canTalk) { setViseme(null); return undefined; }
    const fromText = say ? speechSeq(say) : [];
    const seq = fromText.length ? fromText : talkSeq(stepKey);
    let i = 0, timer = null;
    const next = () => {
      if (i >= seq.length) { setViseme(null); return; }
      const [v, ms] = seq[i++];
      setViseme(v);
      timer = setTimeout(next, ms);
    };
    next();
    return () => clearTimeout(timer);
  }, [stepKey, canTalk, say]); // eslint-disable-line react-hooks/exhaustive-deps
  const talking = viseme !== null;

  // שתי תמונות הצעיף (פה סגור/פתוח) נצבעות מראש, כדי שהדיבור לא יהבהב
  const scarfKey = scarf ? scarf.join(',') : '';
  const [tinted, setTinted] = useState({});
  useEffect(() => {
    let alive = true;
    if (!useScarf) return undefined;
    ['idle_scarf'].forEach((n) => {
      tintScarf(SPRITES[n].src, scarf[0], scarf[1]).then((u) => { if (alive && u) setTinted((t) => ({ ...t, [n]: u })); });
    });
    return () => { alive = false; };
  }, [scarfKey, useScarf]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = crown ? 'crown'
    : useScarf ? 'idle_scarf'
    : mood === 'sleep' ? 'sleep'
    : mood === 'sad' ? 'sad'
    : mood === 'celebrate' ? 'celebrate'
    : 'idle';
  const sp = SPRITES[key];
  const src = tinted[key] || sp.src;

  // הכדור: קוטר ומרכז קבועים בתוך המסגרת (רוחב size, גובה size×1.15)
  const H = size * 1.15;
  const D = size * 0.8;
  const k = D / 2 / sp.r;
  const bx = size / 2, by = H * 0.46;

  const body = mood === 'celebrate' ? 'gs-party 1.1s cubic-bezier(.3,.7,.3,1) 3'
    : mood === 'wave' ? 'gs-wave 1.1s ease-in-out 2'
    : mood === 'loading' ? 'gs-roll 1.3s ease-in-out infinite'
    : mood === 'sleep' ? 'gs-breathe 3.2s ease-in-out infinite'
    : mood === 'sad' ? 'gs-bob 3.4s ease-in-out infinite'
    : 'gs-bob 2.2s ease-in-out infinite';
  const lx = Math.max(-1, Math.min(1, lookX)), ly = Math.max(-1, Math.min(1, lookY));

  return (
    <span className={still ? 'gs-still' : undefined} aria-hidden="true" style={{ position: 'relative', display: 'inline-block', width: size, height: H }}>
      <style>{CSS}</style>
      {/* צל על הקרקע */}
      <span style={{
        position: 'absolute', left: size * 0.22, width: size * 0.56, top: by + D / 2 + H * 0.03, height: size * 0.09, borderRadius: '50%',
        background: '#000', opacity: 0.2, animation: mood === 'loading' ? 'gs-roll-shadow 1.3s ease-in-out infinite' : mood === 'idle' ? 'gs-shadow 2.2s ease-in-out infinite' : 'none'
      }} />
      {/* קפיצה קטנה בכל שלב חדש */}
      <span key={stepKey} style={{ position: 'absolute', inset: 0, animation: still ? 'none' : 'gs-hop .45s ease-out' }}>
        <span style={{ position: 'absolute', inset: 0, transformOrigin: mood === 'loading' ? `${bx}px ${by}px` : `${bx}px ${by + D / 2}px`, animation: body }}>
          <span style={{
            position: 'absolute', inset: 0, transformOrigin: `${bx}px ${by}px`,
            transform: `translate(${lx * size * 0.04}px, ${ly * size * 0.025}px) rotate(${lx * 7}deg)`,
            transition: 'transform .35s ease'
          }}>
            {/* בכל הברה הראש עולה טיפה ומתמתח - הדיבור מורגש בכל הגוף */}
            <span style={{
              position: 'absolute', inset: 0, transformOrigin: `${bx}px ${by + D / 2}px`,
              transform: talking && viseme !== 'closed' ? `translateY(${-size * 0.012}px) scale(.99,1.02)` : 'none',
              transition: 'transform 70ms ease-out'
            }}>
              <img
                src={src} alt="" draggable={false}
                style={{ position: 'absolute', left: bx - sp.cx * k, top: by - sp.cy * k, width: sp.w * k, height: sp.h * k, maxWidth: 'none', pointerEvents: 'none', userSelect: 'none' }}
              />
              {talking && MOUTHS[viseme] && (key === 'idle' || key === 'idle_scarf') && (
                <img
                  src={MOUTHS[viseme]} alt="" draggable={false}
                  style={{
                    position: 'absolute', left: bx + MOUTH_BOX.x * k, top: by + MOUTH_BOX.y * k,
                    width: MOUTH_BOX.w * k, height: MOUTH_BOX.h * k, maxWidth: 'none', pointerEvents: 'none', userSelect: 'none'
                  }}
                />
              )}
            </span>
          </span>
        </span>
      </span>
      {/* כוכבים בחגיגה */}
      {mood === 'celebrate' && !still && ['-34px,-30px', '30px,-36px', '-40px,6px', '38px,2px', '0px,-46px'].map((d, i) => {
        const [dx, dy] = d.split(',');
        return (
          <span key={i} style={{
            position: 'absolute', left: size / 2 - 7, top: by - 7, fontSize: 14,
            '--dx': dx, '--dy': dy, animation: `gs-star .9s ease-out ${i * 0.12}s infinite`
          }}>{['⭐', '✨', '🎉', '⭐', '✨'][i]}</span>
        );
      })}
    </span>
  );
}

// כל התמונות נטענות מראש, כדי שהחלפת הבעה (דיבור, חגיגה) לא תהבהב
if (typeof window !== 'undefined' && typeof Image !== 'undefined') {
  [...Object.values(SPRITES).map((s) => s.src), ...Object.values(MOUTHS)].forEach((src) => { const i = new Image(); i.src = src; });
}
