// כלים קטנים לתנועה באפליקציה.
//
// כלל אחד לכולם: מי שהגדיר בטלפון "הפחתת תנועה" מקבל את המצב הסופי מיד,
// בלי קונפטי, בלי ספירה ובלי קפיצות. האנימציות כאן הן קישוט ולא מידע.

import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** אנימציה קצרה על אלמנט, אם מותר. מחזירה את האנימציה או null */
export const play = (el, frames, options) => {
  if (!el || !el.animate || reducedMotion()) return null;
  return el.animate(frames, options);
};

/** ספרה שהוקלדה "קופצת" */
export const pop = (el) => play(el, [
  { transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }
], { duration: 240, easing: 'ease-out' });

const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#a855f7', '#facc15'];

/**
 * התפרצות קונפטי מנקודה במסך (x, y ביחס לחלון, 0-1). קנבס זמני מעל הכל,
 * שלא חוסם לחיצות ונמחק בסוף.
 */
export function confetti({ x = 0.5, y = 0.35, count = 80 } = {}) {
  if (reducedMotion() || typeof document === 'undefined') return;
  const canvas = document.createElement('canvas');
  const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr; canvas.height = h * dpr;
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: `${w}px`, height: `${h}px`,
    pointerEvents: 'none', zIndex: 12000
  });
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const parts = Array.from({ length: count }, () => ({
    x: w * x, y: h * y,
    vx: (Math.random() - 0.5) * 9, vy: -Math.random() * 9 - 3,
    s: 5 + Math.random() * 5, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
    c: COLORS[(Math.random() * COLORS.length) | 0]
  }));
  let frame = 0;
  const tick = () => {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.25; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
      ctx.restore();
    }
    if (++frame < 110) requestAnimationFrame(tick);
    else canvas.remove();
  };
  requestAnimationFrame(tick);
}

/** קונפטי שיוצא מהמרכז של אלמנט */
export const confettiFrom = (el, opts) => {
  if (!el) return confetti(opts);
  const r = el.getBoundingClientRect();
  confetti({ ...opts, x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight });
};

/** פעם אחת לכל מפתח, לכל מכשיר. לחגיגות שאסור שיחזרו בכל כניסה */
export const once = (key) => {
  try {
    if (localStorage.getItem(`motion:${key}`)) return false;
    localStorage.setItem(`motion:${key}`, '1');
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * מספר שנספר מ-0 עד הערך בפעם הראשונה שהוא מוצג. אחר כך, שינוי בערך
 * מוצג מיד - הספירה היא כניסה, לא כל עדכון.
 */
export function useCountUp(value, { duration = 900, decimals = 0 } = {}) {
  const target = Number(value) || 0;
  const [shown, setShown] = useState(() => (reducedMotion() ? target : 0));
  const started = useRef(false);

  useEffect(() => {
    if (started.current || reducedMotion()) { setShown(target); return undefined; }
    started.current = true;
    let raf;
    const t0 = performance.now();
    const step = (t) => {
      const k = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(target * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  const f = 10 ** decimals;
  return Math.round(shown * f) / f;
}

/**
 * FLIP: שורות שמחליפות מקום זזות אליו במקום לקפוץ. כל שורה מסומנת
 * ב-data-flip-key. המיקומים נשמרים יחסית לקונטיינר, כך שזה עובד גם כשהרשימה
 * נבנית מחדש.
 */
export function useFlip(containerRef, deps) {
  const prev = useRef(new Map());
  useLayoutEffect(() => {
    const c = containerRef.current;
    if (!c) return;
    const base = c.getBoundingClientRect().top;
    const now = new Map();
    c.querySelectorAll('[data-flip-key]').forEach((el) => {
      now.set(el.dataset.flipKey, { el, top: el.getBoundingClientRect().top - base });
    });
    if (!reducedMotion()) {
      now.forEach(({ el, top }, key) => {
        const old = prev.current.get(key);
        if (old == null || Math.abs(old - top) < 1) return;
        el.animate([{ transform: `translateY(${old - top}px)` }, { transform: 'translateY(0)' }],
          { duration: 520, easing: 'cubic-bezier(.4,0,.2,1)' });
      });
    }
    prev.current = new Map([...now].map(([k, v]) => [k, v.top]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
