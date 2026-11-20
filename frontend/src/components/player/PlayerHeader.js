import React, { useEffect } from 'react';
import { applyTheme } from '../../themes';
import ColorSchemeToggle from '../ColorSchemeToggle';

// שכבות המטבע, לפי סדר הציור. כל צד הוא דפנות ואז פנים, וכל צד נראה רק
// כשהוא פונה אלינו. הגב קודם, כך שפני החזית מצוירים אחרונים. עומק בפיקסלים
const CREST_LAYERS = [
  ...[-3, -1.5, 0, 1.5, 3].map((z) => ({ z, cls: 'is-edge is-backside' })),
  { z: -4.5, cls: 'is-backside' },
  ...[-3, -1.5, 0, 1.5, 3].map((z) => ({ z, cls: 'is-edge' })),
  { z: 4.5, cls: '' },
];

function PlayerHeader({ user, selectedWeek, onLogout, onOpenSettings, settingsOpen }) {

  useEffect(() => {
    if (user) {
      setTimeout(() => {
        applyTheme(user);
      }, 100);
    }
  }, [user, user?.theme]);

  return (
    <div className="header header--crest" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top, 0px))' }}>
      {/* סמל הקבוצה של ערכת הנושא כמטבע תלת-ממדי שמסתובב. כמה שכבות של
          אותה תמונה זו מאחורי זו נותנות לו עובי. ראה index.css למה כל
          שכבה מסתובבת לבד ולא בתוך הקשר תלת-ממדי משותף */}
      <div className="header-crest" aria-hidden="true">
        {CREST_LAYERS.map(({ z, cls }, i) => (
          <span key={i} className={`header-crest__layer ${cls}`} style={{ '--z': `${z}px` }} />
        ))}
      </div>
      <div className="container">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <div style={{ minWidth: 0, flex: '1 1 auto' }}>
            <h1 style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.3px'
            }}>
              שלום {user.name}!
            </h1>
            <p style={{
              color: '#fff',
              opacity: 0.85,
              fontSize: 'var(--fs-sm)',
              marginTop: '2px',
              letterSpacing: '0.2px'
            }}>
              {selectedWeek?.name || 'אין שבוע פעיל'}
              {selectedWeek?.locked && ' (נעול)'}
            </p>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexShrink: 0
          }}>
            {/* בלי תיבת ניקוד: הניקוד נמצא בטבלה, והתיבה ישבה בדיוק על
                סמל הקבוצה שבמרכז הכותרת והסתירה אותו */}
            <ColorSchemeToggle />
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="btn"
                aria-label={settingsOpen ? 'סגור הגדרות' : 'הגדרות'}
                title={settingsOpen ? 'סגור הגדרות' : 'הגדרות'}
                aria-pressed={settingsOpen}
                style={{
                  // כשההגדרות פתוחות הכפתור נראה לחוץ: הוא גם הדרך לצאת,
                  // ובלי הסימון לא ברור שלחיצה נוספת תסגור
                  background: settingsOpen
                    ? 'rgba(255,255,255,0.85)'
                    : 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
                  color: settingsOpen ? 'var(--theme-primary-text, #007bff)' : 'white',
                  padding: '0 0.6rem',
                  minHeight: '44px',
                  minWidth: '44px',
                  fontSize: 'var(--fs-md)',
                  margin: 0,
                  lineHeight: 1,
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.15)',
                  transition: 'background 0.2s ease'
                }}
              >
                ⚙️
              </button>
            )}
            <button onClick={onLogout} className="btn" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 100%)',
              color: 'white',
              padding: '0 0.7rem',
              minHeight: '44px',
              fontSize: 'var(--fs-sm)',
              margin: 0,
              borderRadius: '10px',
              border: '1px solid rgba(255,255,255,0.15)',
              fontWeight: '500'
            }}>
              יציאה
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerHeader;
