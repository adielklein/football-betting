import React, { useEffect, useState } from 'react';
import { reducedMotion } from '../../services/motion';

// סרגל הלשוניות הראשי, בתחתית המסך.
//
// כשהלשוניות היו בראש המסך הן נעלמו בגלילה, והמעבר בין מסכים דרש לגלול
// חזרה למעלה או למתוח את האגודל לקצה העליון. בתחתית הן תמיד בהישג יד.
//
// גובה הסרגל נחשף כמשתנה ‎--bottom-nav-h‎, כדי שרכיבים צפים אחרים
// (באנר העדכון) יישבו מעליו ולא מתחתיו.

const NAV_HEIGHT = 60;

// שדה קלט בפוקוס = המקלדת פתוחה. באנדרואיד הסרגל היה נדחף מעל המקלדת
// ומסתיר את המשחק שמקלידים בו, ובאייפון הוא קופץ באמצע המסך. מסתירים.
// רק שדות שפותחים מקלדת. רשימה נפתחת (בחירת חודש/שבוע) נשארת בפוקוס
// באייפון אחרי הבחירה, וכשהיא נספרה כאן הסרגל נעלם וחזר בלחיצה הבאה -
// וזה נראה כמו סרגל שקופץ
const TYPING_INPUTS = new Set(['text', 'search', 'email', 'password', 'tel', 'url', 'number']);
const isTypingTarget = (el) =>
  !!el && (
    (el.tagName === 'INPUT' && TYPING_INPUTS.has((el.type || 'text').toLowerCase())) ||
    el.tagName === 'TEXTAREA' || el.isContentEditable
  );

function BottomNav({ tabs, activeTab, onSelect }) {
  const [typing, setTyping] = useState(false);
  const activeIndex = tabs.findIndex((t) => t.key === activeTab);
  const still = reducedMotion();

  useEffect(() => {
    const onIn = (e) => setTyping(isTypingTarget(e.target));
    // focusout מגיע לפני שהפוקוס עובר לשדה הבא; בודקים אחרי שהתייצב
    const onOut = () => setTimeout(() => setTyping(isTypingTarget(document.activeElement)), 0);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => {
      document.removeEventListener('focusin', onIn);
      document.removeEventListener('focusout', onOut);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bottom-nav-h', typing ? '0px' : `${NAV_HEIGHT}px`);
    return () => root.style.removeProperty('--bottom-nav-h');
  }, [typing]);

  return (
    <>
      {/* שומר מקום בסוף הדף, כדי שהתוכן האחרון לא יוסתר מתחת לסרגל */}
      <div aria-hidden="true" style={{ height: `calc(${NAV_HEIGHT + 12}px + env(safe-area-inset-bottom, 0px))` }} />

      <nav
        aria-label="ניווט ראשי"
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 900,
          display: typing ? 'none' : 'grid',
          // minmax(0, 1fr): רוחב שווה לכל לשונית. עם 1fr רגיל לשונית עם שם
          // ארוך ("כל ההימורים") התרחבה כשהפכה פעילה, כי הטקסט המודגש רחב יותר
          gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))`,
          padding: '0 4px env(safe-area-inset-bottom, 0px)',
          background: 'var(--surface, #fff)',
          borderTop: '1px solid var(--border, #e5e7eb)',
          boxShadow: '0 -4px 16px rgba(0,0,0,0.08)',
          // iOS: שכבה משלו, כדי שלא ירצד בגלילה עם מומנטום
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)'
        }}
      >
        {/* פס אחד מעל הלשונית הפעילה, שמחליק אליה במעבר. הוא סימון שנקרא גם
            בלי צבע. ממוקם מתחילת השורה, ולכן עובד בכיוון ימין-לשמאל */}
        {activeIndex >= 0 && (
          <span aria-hidden="true" style={{
            position: 'absolute', top: 0, height: '3px', borderRadius: '0 0 3px 3px',
            width: `${50 / tabs.length}%`,
            insetInlineStart: `${(activeIndex + 0.25) * (100 / tabs.length)}%`,
            background: 'var(--theme-primary-text, #007bff)',
            transition: still ? 'none' : 'inset-inline-start .32s cubic-bezier(.4,0,.2,1)'
          }} />
        )}
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onSelect(tab.key)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                position: 'relative',
                minHeight: `${NAV_HEIGHT}px`,
                padding: '6px 0 4px',
                margin: 0,
                border: 'none',
                background: 'transparent',
                color: isActive ? 'var(--theme-primary-text, #007bff)' : 'var(--text-3, #5f6670)',
                fontWeight: isActive ? '700' : '500',
                fontSize: 'var(--fs-xs)',
                lineHeight: 1.2,
                whiteSpace: 'nowrap',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                cursor: 'pointer',
                WebkitAppearance: 'none',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation'
              }}
            >
              {/* key משתנה כשהלשונית נבחרת, וזה מפעיל את קפיצת האייקון מחדש */}
              <span key={isActive ? 'on' : 'off'} aria-hidden="true" style={{
                animation: isActive && !still ? 'navBounce .4s cubic-bezier(.2,1.5,.4,1)' : undefined,
                fontSize: 'var(--fs-lg)',
                lineHeight: 1,
                transform: isActive ? 'scale(1.08)' : 'none',
                transition: 'transform 0.2s ease'
              }}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

export default BottomNav;
