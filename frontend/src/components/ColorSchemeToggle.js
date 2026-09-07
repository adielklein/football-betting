import React, { useEffect, useRef, useState } from 'react';
import { getMode, setMode, onSchemeChange, MODES } from '../services/colorScheme';

// בורר מצב תצוגה.
//
// הגרסה הראשונה הייתה כפתור אחד שמסתובב בין שלושה מצבים. זה לא עבד: אייקון
// בודד לא מגלה שיש שלוש אפשרויות, לא אומר איזו פעילה, ולא רומז מה תהיה
// הבאה. כאן לחיצה פותחת רשימה עם שם לכל מצב וסימון על הנבחר.
//
// הכפתור יושב על רקע הכותרת הצבעונית ולכן הוא לבן-שקוף; התפריט עצמו נפתח
// על רקע האפליקציה ולכן הוא לוקח את צבעיו מהטוקנים.

const OPTIONS = {
  system: { icon: '🌗', label: 'לפי המכשיר', hint: 'עוקב אחרי הגדרות הטלפון' },
  light:  { icon: '☀️', label: 'בהיר', hint: 'תמיד בהיר' },
  dark:   { icon: '🌙', label: 'כהה', hint: 'תמיד כהה' }
};

function ColorSchemeToggle() {
  const [mode, setLocalMode] = useState(getMode());
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => onSchemeChange(() => setLocalMode(getMode())), []);

  // סגירה בלחיצה בחוץ או ב-Escape
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (m) => {
    setMode(m);
    setLocalMode(m);
    setOpen(false);
  };

  return (
    <div ref={boxRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`תצוגה: ${OPTIONS[mode].label}`}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
          color: 'white',
          padding: '0.4rem 0.6rem',
          fontSize: '14px',
          lineHeight: 1,
          margin: 0,
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.15)',
          cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent',
          touchAction: 'manipulation'
        }}
      >
        {OPTIONS[mode].icon}
      </button>

      {open && (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            insetInlineEnd: 0,
            minWidth: '184px',
            zIndex: 10002,
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #eee)',
            borderRadius: '12px',
            boxShadow: '0 8px 28px rgba(0,0,0,0.22)',
            overflow: 'hidden',
            animation: 'toastHostIn 0.16s ease-out'
          }}
        >
          <div style={{
            padding: '0.45rem 0.7rem 0.3rem',
            fontSize: '10px', fontWeight: 700,
            color: 'var(--text-4, #999)',
            borderBottom: '1px solid var(--border, #eee)'
          }}>
            מצב תצוגה
          </div>

          {MODES.map((m) => {
            const opt = OPTIONS[m];
            const active = m === mode;
            return (
              <button
                key={m}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => choose(m)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  width: '100%', textAlign: 'start',
                  padding: '0.55rem 0.7rem',
                  border: 'none',
                  background: active ? 'var(--surface-3, #f0f2f5)' : 'transparent',
                  cursor: 'pointer', font: 'inherit',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                <span style={{ fontSize: '15px', flexShrink: 0 }} aria-hidden="true">{opt.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: '13px',
                    fontWeight: active ? 800 : 600,
                    color: 'var(--text, #333)'
                  }}>{opt.label}</span>
                  <span style={{
                    display: 'block', fontSize: '10px',
                    color: 'var(--text-4, #999)'
                  }}>{opt.hint}</span>
                </span>
                {active && (
                  <span style={{ color: 'var(--theme-primary, #007bff)', fontSize: '13px', flexShrink: 0 }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ColorSchemeToggle;
