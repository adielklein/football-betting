import React, { useEffect, useRef, useState } from 'react';
import { getStage, getEnvironment } from '../three/stage';
import { buildMedal } from '../three/medal';

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

// הגרסה המלאה: מטבע מתכת תלת-ממדי (three/medal.js) על הבמה המשותפת, עם
// השתקפויות אמיתיות. מסתובב בגל פעם ב-7 שניות, ובין הסיבובים לא מצויר בכלל
// (התצוגה "ישנה"). עד שהוא מוכן, ובלי WebGL או אצל מי שביקש פחות תנועה -
// המטבע בשכבות CSS.
const CYCLE = 7000;
const SPIN = 1400;
const medalEase = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

export function Medal({ place }) {
  const m = MEDAL[place];
  const canvasRef = useRef(null);
  const [is3d, setIs3d] = useState(false);

  useEffect(() => {
    if (!m) return undefined;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let gone = false, stage = null, view = null, built = null, timer = 0;
    (async () => {
      const st = await getStage();
      if (gone || !st || !canvasRef.current) return;
      const env = await getEnvironment(st);
      if (gone) return;
      stage = st;
      const { THREE } = st;
      const scene = new THREE.Scene();
      scene.add(new THREE.AmbientLight(0xffffff, 0.6));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(10, 20, 30);
      scene.add(key);
      built = buildMedal(THREE, place, env);
      built.coin.rotation.x = 0.12;
      scene.add(built.coin);
      const camera = new THREE.PerspectiveCamera(30, 1, 1, 200);
      camera.position.set(0, 0, 24 / 2 / Math.tan((15 * Math.PI) / 180));
      const delay = parseFloat(m.delay) * 1000;
      const t0 = performance.now();
      const nextSpinAt = (now) => {
        const since = now - t0 - delay;
        return t0 + delay + Math.ceil(Math.max(0, since) / CYCLE) * CYCLE;
      };
      let spinStart = nextSpinAt(t0);
      view = {
        canvas: canvasRef.current, width: 26, height: 26, scene, camera,
        frame(now) {
          const p = (now - spinStart) / SPIN;
          if (p < 0) { built.coin.rotation.y = 0; return false; }
          if (p >= 1) {
            built.coin.rotation.y = 0;
            spinStart += CYCLE;
            clearTimeout(timer);
            timer = setTimeout(() => stage && stage.wake(view), Math.max(0, spinStart - performance.now()));
            return false;
          }
          built.coin.rotation.y = medalEase(p) * Math.PI * 2;
          return true;
        }
      };
      stage.add(view);
      timer = setTimeout(() => stage.wake(view), Math.max(0, spinStart - performance.now()));
      requestAnimationFrame(() => requestAnimationFrame(() => !gone && setIs3d(true)));
    })();
    return () => {
      gone = true;
      clearTimeout(timer);
      if (stage && view) stage.remove(view);
      if (built) built.dispose();
    };
  }, [place]);

  if (!m) return null;
  return (
    <span className={`medal medal--${m.name}${is3d ? ' is-3d' : ''}`} style={{ '--medal-delay': m.delay }} role="img" aria-label={`מקום ${place}`}>
      <span className="medal__ribbon" aria-hidden="true" />
      <span className="medal__coin" aria-hidden="true">
        {COIN_LAYERS.map(({ z, cls }, i) => (
          <span key={i} className={`medal__layer ${cls}`} style={{ '--z': `${z}px` }}>
            {cls.includes('is-face') ? place : null}
          </span>
        ))}
        <canvas ref={canvasRef} className="medal__gl" />
      </span>
    </span>
  );
}

// ---------- כדור נכנס לרשת ("כל ההימורים הוזנו") ----------
// שער בפרספקטיבה על דשא. הכדור בא מקרוב (גדול, מימין-למטה), מסתובב
// ומתרחק אל הרשת, הרשת נמתחת אחורה סביב נקודת הפגיעה, והכדור נופל ומקפץ
// בתוך השער. הצל שלו זז על הדשא. הכל באנימציה של SVG, פעם אחת (freeze).
const NET = { x0: 19, x1: 61, y0: 12, y1: 35 }; // הרשת האחורית
const HIT = { x: 46, y: 21 };
const meshPath = (pull) => {
  // רשת של קווים; בגרסה "נמתחת" נקודות ליד הפגיעה נמשכות אליה (מתרחקות לעומק)
  const pt = (x, y) => {
    const d = Math.hypot(x - HIT.x, y - HIT.y);
    const k = pull * Math.max(0, 1 - d / 22) * 0.45;
    return `${(x + (HIT.x - x) * k).toFixed(1)} ${(y + (HIT.y - y) * k).toFixed(1)}`;
  };
  const cols = [], rows = [];
  for (let x = NET.x0; x <= NET.x1 + 0.1; x += 6) {
    const seg = [];
    for (let y = NET.y0; y <= NET.y1 + 0.1; y += 23 / 4) seg.push(pt(x, y));
    cols.push(`M${seg.join(' L')}`);
  }
  for (let y = NET.y0; y <= NET.y1 + 0.1; y += 23 / 4) {
    const seg = [];
    for (let x = NET.x0; x <= NET.x1 + 0.1; x += 6) seg.push(pt(x, y));
    rows.push(`M${seg.join(' L')}`);
  }
  return [...cols, ...rows].join(' ');
};
const MESH_FLAT = meshPath(0);
const MESH_PULLED = meshPath(1);

export function GoalNetShot() {
  const T = '1.7s';
  return (
    <svg className="goal-net" viewBox="0 0 80 46" width="84" height="48" aria-hidden="true">
      <defs>
        <linearGradient id="gn-grass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6fb54c" />
          <stop offset="1" stopColor="#4c8f30" />
        </linearGradient>
        <radialGradient id="gn-ball" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.6" stopColor="#f1f1f1" />
          <stop offset="1" stopColor="#bdbdbd" />
        </radialGradient>
      </defs>
      {/* דשא עם פסי כיסוח */}
      <rect x="0" y="35" width="80" height="11" rx="2" fill="url(#gn-grass)" />
      <path d="M8 35 L4 46 M24 35 L22 46 M40 35 V46 M56 35 L58 46 M72 35 L76 46" stroke="rgba(255,255,255,0.12)" strokeWidth="5" />
      {/* רשתות הצד והגג */}
      <path d="M14 8 L19 12 M66 8 L61 12 M14 37 L19 35 M66 37 L61 35" stroke="rgba(0,0,0,0.25)" strokeWidth="0.7" />
      <path d="M14 8 H66 L61 12 H19 Z" fill="rgba(255,255,255,0.35)" stroke="rgba(0,0,0,0.18)" strokeWidth="0.5" />
      {/* הרשת האחורית, שנמתחת בפגיעה */}
      <rect x={NET.x0} y={NET.y0} width={NET.x1 - NET.x0} height={NET.y1 - NET.y0} fill="rgba(255,255,255,0.4)" />
      <path d={MESH_FLAT} fill="none" stroke="rgba(40,48,58,0.45)" strokeWidth="0.6">
        <animate attributeName="d" values={`${MESH_FLAT};${MESH_FLAT};${MESH_PULLED};${MESH_FLAT}`} keyTimes="0;0.42;0.52;1" dur={T} fill="freeze" calcMode="spline" keySplines="0 0 1 1;0.2 0.8 0.3 1;0.3 0 0.4 1" />
      </path>
      {/* צל הכדור על הדשא */}
      <ellipse cx="0" cy="0" rx="4" ry="1.2" fill="rgba(0,0,0,0.3)">
        <animateTransform attributeName="transform" type="translate" values="72 45;46 36;46 36;46 36" keyTimes="0;0.45;0.8;1" dur={T} fill="freeze" />
      </ellipse>
      {/* הכדור: מקרוב ורחוק, מסתובב, פוגע ברשת, נופל ומקפץ */}
      <g>
        <g>
          <circle r="3" fill="url(#gn-ball)" stroke="#333" strokeWidth="0.45" />
          <g>
            <polygon points={pentagon(0, 0, 1.25)} fill="#222" />
            <polygon points={pentagon(0, -2.6, 0.9)} fill="#222" />
            <polygon points={pentagon(2.4, 0.9, 0.9)} fill="#222" />
            <polygon points={pentagon(-2.4, 0.9, 0.9)} fill="#222" />
            <animateTransform attributeName="transform" type="rotate" values="0;-540;-600;-640" keyTimes="0;0.45;0.8;1" dur={T} fill="freeze" />
          </g>
          <animateTransform attributeName="transform" type="scale" values="1.9;1;1;1" keyTimes="0;0.45;0.8;1" dur={T} fill="freeze" />
        </g>
        <animateTransform attributeName="transform" type="translate"
          values="74 41;60 13;46 21;46 32.5;46 29.5;46 32.5" keyTimes="0;0.25;0.45;0.68;0.82;1" dur={T} fill="freeze"
          calcMode="spline" keySplines="0.2 0.6 0.5 1;0.4 0 0.8 0.6;0.5 0 1 1;0 0 0.5 1;0.5 0 1 1" />
      </g>
      {/* הקורות - מעל הכל, קו כהה ולבן כדי שייראו על כל רקע */}
      <path d="M14 37 V8 H66 V37" fill="none" stroke="#4b5563" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      <path d="M14 37 V8 H66 V37" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
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
