import React from 'react';

// אנימציות "חתימה" בסגנון הסמל המסתובב. ההסברים והתזמונים ב-index.css,
// בפרק "אנימציות חתימה". כל התנועה כבויה אצל מי שביקש פחות תנועה.
//
// כלל שחוזר כאן: תנועה בתוך SVG נעשית באנימציה של SVG עצמו (animate),
// ותנועה תלת-ממדית - שכבה-שכבה בלי הקשר תלת-ממדי משותף (כמו הסמל בכותרת).
// שתי הטעויות האלה כבר עלו לנו: ברק שלא רץ בטלפון, וחלון שנחסם באייפון.

// ---------- כדור מתגלגל, לטעינה ----------
const pentagon = (cx, cy, r) => Array.from({ length: 5 }, (_, i) => {
  const a = (-90 + i * 72) * Math.PI / 180;
  return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
}).join(' ');
// אריח של טלאים ברוחב 40, פעמיים - כך שגלילה ב-40 חוזרת חלק להתחלה
const PANELS = [[8, 8, 5.5], [28, 15, 6.5], [10, 28, 6.5], [30, 36, 5.5], [18, 44, 5]]
  .flatMap(([x, y, r]) => [[x, y, r], [x + 40, y, r]]);

export function BallLoader({ size = 44, label }) {
  return (
    <span className="ball-loader" role={label ? 'img' : undefined} aria-label={label} style={{ '--ball': `${size}px` }}>
      <span className="ball-loader__ball">
        <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
          <defs>
            <clipPath id="ball-clip"><circle cx="20" cy="20" r="18" /></clipPath>
            <radialGradient id="ball-shade" cx="0.35" cy="0.3" r="0.75">
              <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#000" stopOpacity="0.38" />
            </radialGradient>
          </defs>
          <circle cx="20" cy="20" r="18" fill="#fafafa" />
          <g clipPath="url(#ball-clip)">
            <g>
              {PANELS.map(([x, y, r], i) => <polygon key={i} points={pentagon(x, y - 4, r)} fill="#1d1f24" />)}
              <animateTransform attributeName="transform" type="translate" from="0 0" to="-40 0" dur="0.9s" repeatCount="indefinite" />
            </g>
          </g>
          <circle cx="20" cy="20" r="18" fill="url(#ball-shade)" />
          <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth="1" />
        </svg>
      </span>
      <span className="ball-loader__shadow" aria-hidden="true" />
    </span>
  );
}

// ---------- מדליה מסתובבת (מקום 1-3 בטבלאות) ----------
const MEDAL = {
  1: { name: 'gold', delay: '0s' },
  2: { name: 'silver', delay: '0.35s' },
  3: { name: 'bronze', delay: '0.7s' },
};
// כמו הסמל בכותרת: סט של דפנות ופנים לכל צד, כל שכבה מסתובבת לבד
const COIN_LAYERS = [
  ...[-1.5, -0.5, 0.5, 1.5].map((z) => ({ z, cls: 'is-edge is-backside' })),
  { z: -2.2, cls: 'is-face is-backside' },
  ...[-1.5, -0.5, 0.5, 1.5].map((z) => ({ z, cls: 'is-edge' })),
  { z: 2.2, cls: 'is-face' },
];

export function Medal({ place }) {
  const m = MEDAL[place];
  if (!m) return null;
  return (
    <span className={`medal medal--${m.name}`} style={{ '--medal-delay': m.delay }} role="img" aria-label={`מקום ${place}`}>
      <span className="medal__ribbon" aria-hidden="true" />
      <span className="medal__coin" aria-hidden="true">
        {COIN_LAYERS.map(({ z, cls }, i) => (
          <span key={i} className={`medal__layer ${cls}`} style={{ '--z': `${z}px` }}>
            {cls.includes('is-face') ? place : null}
          </span>
        ))}
      </span>
    </span>
  );
}

// ---------- כדור נכנס לרשת ("כל ההימורים הוזנו") ----------
export function GoalNetShot() {
  return (
    <svg className="goal-net" viewBox="0 0 54 30" width="62" height="34" aria-hidden="true">
      <g>
        {/* הרשת מתנפחת כשהכדור פוגע בה */}
        <rect x="5" y="5" width="44" height="23" fill="rgba(255,255,255,0.55)" />
        <g stroke="rgba(0,0,0,0.32)" strokeWidth="0.7" fill="none">
          {[8, 14, 20, 26, 32, 38, 44].map((x) => <line key={x} x1={x} y1="5" x2={x + 1} y2="28" />)}
          {[9, 14, 19, 24].map((y) => <line key={y} x1="5" y1={y} x2="49" y2={y + 1} />)}
          <animateTransform attributeName="transform" type="scale" values="1 1;1 1;1.06 1.1;0.98 0.97;1 1" keyTimes="0;0.5;0.62;0.78;1" dur="1.4s" fill="freeze" additive="sum" />
        </g>
        {/* קורות: קו כהה מתחת ולבן מעליו, כדי שייראו על כל רקע */}
        <path d="M5 28 V5 H49 V28" fill="none" stroke="#4b5563" strokeWidth="3.4" strokeLinejoin="round" strokeLinecap="round" />
        <path d="M5 28 V5 H49 V28" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      </g>
      {/* הכדור: קשת מימין-למטה אל תוך השער, ומתכווץ בעומק */}
      <g>
        <circle r="4" fill="#fff" stroke="#222" strokeWidth="0.8" />
        <polygon points={pentagon(0, 0, 1.8)} fill="#222" />
        <animateMotion path="M60 30 Q40 -6 27 17" dur="0.75s" fill="freeze" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.3 0 0.6 1" />
        <animateTransform attributeName="transform" type="scale" values="1.3;0.85" dur="0.75s" fill="freeze" additive="sum" />
      </g>
    </svg>
  );
}

// ---------- טבעת ספירה לאחור (השעה האחרונה) ----------
// fraction: כמה נשאר מהשעה (1 = שעה שלמה, 0 = נגמר). הצבע זז מכתום לאדום
const mix = (a, b, t) => Math.round(a + (b - a) * t);
export function CountdownRing({ fraction, size = 24 }) {
  const f = Math.max(0, Math.min(1, fraction));
  const t = 1 - f;
  const color = `rgb(${mix(245, 220, t)},${mix(158, 38, t)},${mix(11, 38, t)})`;
  const C = 2 * Math.PI * 9;
  return (
    <svg className={f < 5 / 60 ? 'countdown-ring is-final' : 'countdown-ring'} viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="3" />
      <circle cx="12" cy="12" r="9" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
        strokeDasharray={`${(C * f).toFixed(2)} ${C.toFixed(2)}`} transform="rotate(-90 12 12)"
        style={{ transition: 'stroke-dasharray 1s linear, stroke 1s linear' }} />
      <circle cx="12" cy="12" r="2" fill={color} />
    </svg>
  );
}

// ---------- מנעול שנסגר ("ההימורים נסגרו") ----------
export function LockSnap({ size = 44 }) {
  return (
    <span className="lock-snap" aria-hidden="true">
      <svg viewBox="0 0 40 44" width={size} height={size * 1.1}>
        <defs>
          <linearGradient id="lock-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffd25e" />
            <stop offset="1" stopColor="#d99a12" />
          </linearGradient>
        </defs>
        {/* הקשת: מתחילה מורמת ונופלת למקום */}
        <path d="M11 22 V14 a9 9 0 0 1 18 0 V22" fill="none" stroke="#9aa3ad" strokeWidth="4.5" strokeLinecap="round">
          <animateTransform attributeName="transform" type="translate" values="0 -7;0 -7;0 1;0 0" keyTimes="0;0.35;0.7;1" dur="0.7s" fill="freeze" />
        </path>
        <rect x="6" y="20" width="28" height="22" rx="5" fill="url(#lock-body)" stroke="rgba(0,0,0,0.25)" strokeWidth="1" />
        <circle cx="20" cy="29" r="3" fill="rgba(0,0,0,0.45)" />
        <rect x="18.8" y="30" width="2.4" height="6" rx="1.2" fill="rgba(0,0,0,0.45)" />
      </svg>
    </span>
  );
}
