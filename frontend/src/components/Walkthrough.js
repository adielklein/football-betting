import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { reducedMotion } from '../services/motion';

// סיור מודרך באפליקציה: מאיר את האלמנט האמיתי שעל המסך, מסביר אותו, ועובר
// בין הלשוניות לבד. כל שלב:
//   { id, title, body, target?, tab?, placement? }
//   target - ערך data-tour של האלמנט. אם הוא לא על המסך (אין שבוע פעיל,
//            למשל) - השלב מוצג ככרטיס במרכז, עם אותו הסבר
//   tab    - לאיזו לשונית לעבור לפני השלב (onTab)
// השכבה חוסמת לחיצות על האפליקציה מתחת, כדי שלחיצה מקרית לא תשנה הימור
// באמצע הסיור.

const PAD = 6;          // מרווח סביב האלמנט המואר
const GAP = 12;         // בין האלמנט לכרטיס
const CARD_W = 340;
const WAIT_MS = 900;    // כמה לחכות שאלמנט יופיע אחרי מעבר לשונית

const findTarget = (id) => (id ? document.querySelector(`[data-tour="${id}"]`) : null);

// האלמנט גלוי באמת (לשונית מוסתרת נשארת ב-DOM עם display:none)
const visible = (el) => {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0;
};

export default function Walkthrough({ steps, onTab, onClose }) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);     // מיקום האלמנט המואר, או null = מרכז
  const [ready, setReady] = useState(false);  // מוסתר עד שהמיקום ידוע, בלי קפיצה
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  const cardRef = useRef(null);
  const nextRef = useRef(null);
  const [cardH, setCardH] = useState(180);
  const still = reducedMotion();
  const step = steps[index];
  const last = index === steps.length - 1;

  const measure = useCallback(() => {
    const el = findTarget(step?.target);
    setVp({ w: window.innerWidth, h: window.innerHeight });
    setRect(visible(el) ? el.getBoundingClientRect() : null);
  }, [step]);

  // מעבר לשלב: לשונית, המתנה לאלמנט, גלילה אליו, מדידה
  useEffect(() => {
    if (!step) return undefined;
    let alive = true;
    setReady(false);
    if (step.tab && onTab) onTab(step.tab);
    const started = Date.now();
    const settle = () => {
      if (!alive) return;
      const el = findTarget(step.target);
      if (step.target && !visible(el) && Date.now() - started < WAIT_MS) {
        setTimeout(settle, 80);
        return;
      }
      if (visible(el)) {
        const r = el.getBoundingClientRect();
        const fixed = getComputedStyle(el).position === 'fixed' || el.closest('nav');
        const off = r.top < 70 || r.bottom > window.innerHeight - 90;
        if (!fixed && off) el.scrollIntoView({ block: 'center', behavior: still ? 'auto' : 'smooth' });
      }
      setTimeout(() => { if (alive) { measure(); setReady(true); } }, step.target ? (still ? 60 : 380) : 0);
    };
    // פריים אחד אחרי החלפת הלשונית, כדי שהיא תצויר
    const t = setTimeout(settle, step.tab ? 120 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [index]); // eslint-disable-line react-hooks/exhaustive-deps

  // מעקב אחרי שינוי גודל וגלילה
  useEffect(() => {
    if (!ready) return undefined;
    let raf = 0;
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure); };
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true); };
  }, [ready, measure]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
  }, [index, ready, rect, vp.w]);

  useEffect(() => { if (ready && nextRef.current) nextRef.current.focus({ preventScroll: true }); }, [ready, index]);

  const finish = useCallback((completed) => onClose && onClose(completed), [onClose]);
  const next = useCallback(() => (last ? finish(true) : setIndex((i) => i + 1)), [last, finish]);
  const prev = useCallback(() => setIndex((i) => Math.max(0, i - 1)), []);

  // מקלדת: Esc מדלג, חצים מעבירים (בעברית "הבא" הוא שמאלה)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') finish(false);
      else if (e.key === 'ArrowLeft' || e.key === 'Enter') { e.preventDefault(); next(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, finish]);

  if (!step) return null;

  // מיקום הכרטיס: מתחת לאלמנט אם יש מקום, אחרת מעליו; בלי אלמנט - במרכז
  const w = Math.min(CARD_W, vp.w - 32);
  let cardStyle;
  let arrow = null;
  if (rect) {
    const spaceBelow = vp.h - rect.bottom;
    const below = step.placement ? step.placement === 'below' : spaceBelow > cardH + GAP + 24 || rect.top < cardH + GAP + 24;
    const left = Math.min(Math.max(16, rect.left + rect.width / 2 - w / 2), vp.w - w - 16);
    const top = below
      ? Math.min(rect.bottom + PAD + GAP, vp.h - cardH - 12)
      : Math.max(12, rect.top - PAD - GAP - cardH);
    cardStyle = { left, top, width: w };
    const ax = Math.min(Math.max(rect.left + rect.width / 2 - left, 22), w - 22);
    arrow = { x: ax, below };
  } else {
    cardStyle = { left: (vp.w - w) / 2, top: Math.max(16, (vp.h - cardH) / 2), width: w };
  }

  const ease = still ? 'none' : 'all .32s cubic-bezier(.2,.8,.2,1)';
  const spot = rect && {
    left: rect.left - PAD, top: rect.top - PAD,
    width: rect.width + PAD * 2, height: rect.height + PAD * 2
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      aria-describedby="tour-body"
      data-no-swipe=""
      style={{ position: 'fixed', inset: 0, zIndex: 12000 }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* ההחשכה: עם חור סביב האלמנט, או מלאה כשאין אלמנט */}
      {/* בזמן מעבר בין שלבים ההחשכה (והחור של השלב הקודם) נשארים, ורק
          הכרטיס נעלם לרגע - החור מחליק למקום החדש, בלי הבהוב */}
      {spot ? (
        <div aria-hidden="true" style={{
          position: 'fixed', ...spot, borderRadius: '14px', transition: ease,
          boxShadow: '0 0 0 9999px rgba(8,12,20,0.66), 0 0 0 3px rgba(255,255,255,0.9), 0 0 24px 6px rgba(255,255,255,0.35)',
          pointerEvents: 'none'
        }} />
      ) : (
        <div aria-hidden="true" style={{ position: 'fixed', inset: 0, background: 'rgba(8,12,20,0.66)' }} />
      )}

      <div
        ref={cardRef}
        dir="rtl"
        style={{
          position: 'fixed', ...cardStyle, transition: ease,
          opacity: ready ? 1 : 0, pointerEvents: ready ? 'auto' : 'none',
          background: 'var(--surface, #fff)', color: 'var(--text, #23272f)',
          borderRadius: '16px', padding: '0.95rem 1rem 0.8rem',
          boxShadow: '0 12px 40px rgba(0,0,0,0.35)',
          maxHeight: `calc(100vh - 24px)`, overflowY: 'auto'
        }}
      >
        {arrow && (
          <span aria-hidden="true" style={{
            position: 'absolute', left: arrow.x - 8, [arrow.below ? 'top' : 'bottom']: -8,
            width: 16, height: 16, background: 'var(--surface, #fff)', transform: 'rotate(45deg)', borderRadius: '3px'
          }} />
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem', position: 'relative' }}>
          <span style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color: 'var(--text-4, #9aa2ae)' }}>
            <bdi dir="ltr">{index + 1}/{steps.length}</bdi>
          </span>
          <button
            type="button"
            onClick={() => finish(false)}
            style={{ border: 'none', background: 'none', color: 'var(--text-3, #6b7280)', fontSize: 'var(--fs-xs)', fontWeight: 700, cursor: 'pointer', padding: '4px 2px' }}
          >
            {last ? 'סגור' : 'דלג על הסיור'}
          </button>
        </div>
        <h3 id="tour-title" style={{ margin: '0 0 0.35rem', fontSize: 'var(--fs-md)', fontWeight: 800, lineHeight: 1.3, position: 'relative' }}>
          {step.title}
        </h3>
        <div id="tour-body" aria-live="polite" style={{ fontSize: 'var(--fs-sm)', lineHeight: 1.55, color: 'var(--text-2, #3d434c)', position: 'relative' }}>
          {step.body}
        </div>

        {/* התקדמות */}
        <div aria-hidden="true" style={{ display: 'flex', justifyContent: 'center', gap: '5px', margin: '0.75rem 0 0.6rem', flexWrap: 'wrap' }}>
          {steps.map((s, i) => (
            <span key={s.id} style={{
              width: i === index ? 16 : 6, height: 6, borderRadius: 3,
              background: i <= index ? 'var(--theme-primary, #2f6fd0)' : 'var(--border-2, #dde1e7)',
              transition: still ? 'none' : 'width .25s ease'
            }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', position: 'relative' }}>
          {index > 0 && (
            <button
              type="button"
              onClick={prev}
              style={{
                flex: '0 0 auto', minHeight: '44px', padding: '0 1rem', borderRadius: '12px',
                border: '1px solid var(--border-2, #dde1e7)', background: 'var(--surface-2, #f7f9fc)',
                color: 'var(--text-2, #3d434c)', fontWeight: 700, fontSize: 'var(--fs-sm)', cursor: 'pointer'
              }}
            >
              הקודם
            </button>
          )}
          <button
            ref={nextRef}
            type="button"
            onClick={next}
            style={{
              flex: 1, minHeight: '44px', borderRadius: '12px', border: 'none',
              background: 'var(--theme-tile, #2f6fd0)', color: 'var(--theme-tile-fg, #fff)',
              fontWeight: 800, fontSize: 'var(--fs-sm)', cursor: 'pointer',
              boxShadow: '0 3px 10px rgba(0,0,0,0.18)'
            }}
          >
            {last ? (step.cta || 'יאללה, מתחילים!') : index === 0 ? (step.cta || 'בואו נתחיל') : 'הבא'}
          </button>
        </div>
      </div>
    </div>
  );
}
