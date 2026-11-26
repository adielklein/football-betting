import React, { useEffect, useState } from 'react';
import idleImg from '../assets/goli/idle.webp';
import talkImg from '../assets/goli/talk.webp';
import sleepImg from '../assets/goli/sleep.webp';
import sadImg from '../assets/goli/sad.webp';
import celebrateImg from '../assets/goli/celebrate.webp';
import wowImg from '../assets/goli/wow.webp';
import crownImg from '../assets/goli/crown.webp';
import scarfImg from '../assets/goli/scarf.webp';

// גולי - הדמות שנבחרה (גיליון הדמות מ-Gemini), כתמונה לכל הבעה, עם תנועה ב-CSS:
//   idle      - קפיצה רכה עם כיווץ בנחיתה
//   דיבור     - בכל שלב חדש (stepKey) מתחלף בין פה סגור לפתוח, בקצב של הברות
//   wave      - קפיצות שלום עם הטיה לצדדים
//   celebrate - צחוק, קפיצה גבוהה וסיבוב
//   sleep     - עיניים עצומות ו-Zzz, נשימה איטית
//   sad       - פרצוף עצוב, קפיצה כבדה
//   loading   - פרצוף "וואו", כדרור מהיר
// lookX/lookY (‎-1..1) - מטה את הראש לכיוון האלמנט המואר.
// crown - כתר (הזוכה השבועי). scarf=[ראשי, משני] - צעיף בצבעי הקבוצה (במצב רגיל).
// מי שביקש פחות תנועה (still) מקבל אותו בלי קפיצות.

// מיקום הכדור בכל תמונה (מרכז ורדיוס, בפיקסלים) - כדי שהכדור יישב בדיוק
// באותו מקום בכל הבעה ולא "יקפוץ" במעבר. ground = איפה הכדור נגמר למטה
// (ביחס לרדיוס): עם הצעיף הוא "מתיישב" ונגמר מעט מעל, אז הצל עולה איתו
const SPRITES = {
  idle: { src: idleImg, w: 290, h: 290, cx: 144, cy: 144, r: 146 },
  talk: { src: talkImg, w: 292, h: 290, cx: 145, cy: 144, r: 147 },
  sleep: { src: sleepImg, w: 306, h: 292, cx: 142, cy: 148, r: 144 },
  sad: { src: sadImg, w: 288, h: 286, cx: 143, cy: 142, r: 145 },
  celebrate: { src: celebrateImg, w: 286, h: 286, cx: 142, cy: 142, r: 144 },
  wow: { src: wowImg, w: 288, h: 286, cx: 143, cy: 142, r: 145 },
  crown: { src: crownImg, w: 302, h: 354, cx: 148, cy: 204, r: 150 },
  scarf: { src: scarfImg, w: 318, h: 306, cx: 155, cy: 152, r: 155, ground: 0.74 }
};

const TALK_MS = 1600;

const CSS = `
@keyframes gs-bob { 0%,100% { transform: translateY(0) scale(1,1) } 45% { transform: translateY(-7%) scale(.98,1.03) } 88% { transform: translateY(0) scale(1.05,.94) } }
@keyframes gs-shadow { 0%,100% { transform: scaleX(1); opacity: .22 } 45% { transform: scaleX(.78); opacity: .13 } }
@keyframes gs-wave { 0% { transform: translateY(0) rotate(0) } 25% { transform: translateY(-12%) rotate(-12deg) } 50% { transform: translateY(0) rotate(9deg) } 70% { transform: translateY(-5%) rotate(-5deg) } 100% { transform: translateY(0) rotate(0) } }
@keyframes gs-party { 0% { transform: translateY(0) rotate(0) scale(1) } 35% { transform: translateY(-22%) rotate(-10deg) scale(1.04) } 60% { transform: translateY(0) rotate(8deg) scale(1.08,.9) } 78% { transform: translateY(-7%) rotate(0) scale(1) } 100% { transform: translateY(0) rotate(0) } }
@keyframes gs-breathe { 0%,100% { transform: scale(1,1) } 50% { transform: scale(1.03,.97) } }
@keyframes gs-hop { 0% { transform: translateY(0) } 40% { transform: translateY(-10%) } 100% { transform: translateY(0) } }
@keyframes gs-nod { 0%,100% { transform: rotate(0) } 30% { transform: rotate(-3deg) translateY(1%) } 65% { transform: rotate(2deg) } }
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
const tintScarf = (primary, secondary) => {
  let col = hex(primary);
  const sec = hex(secondary);
  // צבע ראשי כמעט לבן (הפסים הלבנים כבר לבנים) - משתמשים במשני
  if (col && col[0] + col[1] + col[2] > 690 && sec) col = sec;
  if (!col) return Promise.resolve(null);
  const key = col.join(',');
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
        const y0 = Math.round(c.height * 0.56);
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
    img.src = scarfImg;
  });
  scarfCache.set(key, p);
  return p;
};

export default function GoliSprite({ mood = 'idle', stepKey, lookX = 0, lookY = 0, size = 66, still = false, talk = true, crown = false, scarf = null }) {
  const calm = mood === 'idle' || mood === 'wave';
  const useScarf = !!scarf && calm && !crown;
  const canTalk = talk && calm && !useScarf && !crown && !still;

  // דיבור: פה נפתח ונסגר לרגע בכל שלב חדש
  const [mouthOpen, setMouthOpen] = useState(false);
  useEffect(() => {
    if (!canTalk) { setMouthOpen(false); return undefined; }
    let open = true;
    setMouthOpen(true);
    const iv = setInterval(() => { open = !open; setMouthOpen(open); }, 170);
    const t = setTimeout(() => { clearInterval(iv); setMouthOpen(false); }, TALK_MS);
    return () => { clearInterval(iv); clearTimeout(t); };
  }, [stepKey, canTalk]);

  const scarfKey = scarf ? scarf.join(',') : '';
  const [scarfSrc, setScarfSrc] = useState(null);
  useEffect(() => {
    let alive = true;
    if (!useScarf) return undefined;
    tintScarf(scarf[0], scarf[1]).then((u) => { if (alive) setScarfSrc(u); });
    return () => { alive = false; };
  }, [scarfKey, useScarf]); // eslint-disable-line react-hooks/exhaustive-deps

  const key = crown ? 'crown'
    : useScarf ? 'scarf'
    : mood === 'sleep' ? 'sleep'
    : mood === 'sad' ? 'sad'
    : mood === 'celebrate' ? 'celebrate'
    : mood === 'loading' ? 'wow'
    : mouthOpen ? 'talk' : 'idle';
  const sp = SPRITES[key];
  const src = key === 'scarf' ? (scarfSrc || sp.src) : sp.src;

  // הכדור: קוטר ומרכז קבועים בתוך המסגרת (רוחב size, גובה size×1.15)
  const H = size * 1.15;
  const D = size * 0.8;
  const k = D / 2 / sp.r;
  const bx = size / 2, by = H * 0.46;

  const body = mood === 'celebrate' ? 'gs-party 1.1s cubic-bezier(.3,.7,.3,1) 3'
    : mood === 'wave' ? 'gs-wave 1.1s ease-in-out 2'
    : mood === 'loading' ? 'gs-bob .55s ease-in-out infinite'
    : mood === 'sleep' ? 'gs-breathe 3.2s ease-in-out infinite'
    : mood === 'sad' ? 'gs-bob 3.4s ease-in-out infinite'
    : 'gs-bob 2.2s ease-in-out infinite';
  const lx = Math.max(-1, Math.min(1, lookX)), ly = Math.max(-1, Math.min(1, lookY));

  return (
    <span className={still ? 'gs-still' : undefined} aria-hidden="true" style={{ position: 'relative', display: 'inline-block', width: size, height: H }}>
      <style>{CSS}</style>
      {/* צל על הקרקע */}
      <span style={{
        position: 'absolute', left: size * 0.22, width: size * 0.56, top: by + (D / 2) * (sp.ground || 1) + H * 0.03, height: size * 0.09, borderRadius: '50%',
        background: '#000', opacity: 0.2, animation: mood === 'idle' || mood === 'loading' ? `gs-shadow ${mood === 'loading' ? '.55s' : '2.2s'} ease-in-out infinite` : 'none'
      }} />
      {/* קפיצה קטנה בכל שלב חדש */}
      <span key={stepKey} style={{ position: 'absolute', inset: 0, animation: still ? 'none' : 'gs-hop .45s ease-out' }}>
        <span style={{ position: 'absolute', inset: 0, transformOrigin: `${bx}px ${by + D / 2}px`, animation: body }}>
          <span style={{
            position: 'absolute', inset: 0, transformOrigin: `${bx}px ${by}px`,
            transform: `translate(${lx * size * 0.04}px, ${ly * size * 0.025}px) rotate(${lx * 7}deg)`,
            transition: 'transform .35s ease', animation: mouthOpen ? 'gs-nod .5s ease-in-out infinite' : 'none'
          }}>
            <img
              src={src} alt="" draggable={false}
              style={{ position: 'absolute', left: bx - sp.cx * k, top: by - sp.cy * k, width: sp.w * k, height: sp.h * k, maxWidth: 'none', pointerEvents: 'none', userSelect: 'none' }}
            />
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
  Object.values(SPRITES).forEach((s) => { const i = new Image(); i.src = s.src; });
}
