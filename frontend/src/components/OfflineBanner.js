import React, { Suspense, lazy, useEffect, useState } from 'react';
import { isOffline, onConnectivityChange } from '../services/connectivity';

// המשחק נטען רק כשפותחים אותו - ומרגע שנטען פעם אחת הוא בקאש, כך שגם בלי
// קליטה הוא נפתח. בגלל זה הוא נטען מראש ברקע ברגע שיש חיבור (ראו למטה)
const loadGame = () => import('./PenaltyGame');
// אם הקובץ לא נטען (לא הספיק להישמר לפני שהקליטה נעלמה) - הודעה קצרה
// במקום רענון: רענון בלי קליטה היה תוקע את המשתמש
const Unavailable = ({ onClose }) => (
  <div role="dialog" aria-modal="true" onClick={onClose} style={{
    position: 'fixed', inset: 0, zIndex: 12000, background: 'rgba(3,5,12,.92)', color: '#fff',
    display: 'grid', placeItems: 'center', padding: '24px', textAlign: 'center', fontSize: 'var(--fs-md)'
  }}>
    המשחק יהיה זמין אחרי שהאפליקציה תיפתח פעם אחת עם קליטה.
  </div>
);
const PenaltyGame = lazy(() => loadGame().catch(() => ({ default: Unavailable })));

// פס קטן כשאין חיבור: מסביר שמה שעל המסך הם הנתונים האחרונים שנטענו, ולא
// "אין משחקים" או "אין נתונים", ומציע משחק בעיטות בינתיים.
function OfflineBanner() {
  const [offline, setOffline] = useState(isOffline());
  const [playing, setPlaying] = useState(false);

  useEffect(() => onConnectivityChange(setOffline), []);

  // טוענים את קובץ המשחק לקאש כשיש רשת, כדי שיהיה זמין כשהיא נעלמת
  useEffect(() => {
    if (offline) return undefined;
    const t = setTimeout(() => { loadGame().catch(() => {}); }, 4000);
    return () => clearTimeout(t);
  }, [offline]);

  return (
    <>
      {offline && !playing && (
        <div role="status" style={{
          position: 'fixed', zIndex: 10000, left: '12px', right: '12px', margin: '0 auto', maxWidth: '520px',
          bottom: 'calc(12px + var(--bottom-nav-h, 0px) + env(safe-area-inset-bottom, 0px))',
          display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '14px',
          background: '#1f2937', color: '#fff', boxShadow: '0 6px 24px rgba(0,0,0,.3)', direction: 'rtl',
          animation: 'updateBannerIn 0.25s ease-out'
        }}>
          <span aria-hidden="true" style={{ fontSize: 'var(--fs-lg)' }}>📴</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 'var(--fs-sm)' }}>אין חיבור</div>
            <div style={{ fontSize: 'var(--fs-xs)', opacity: 0.85 }}>מוצגים הנתונים האחרונים שנטענו</div>
          </div>
          <button type="button" onClick={() => setPlaying(true)} style={{
            flexShrink: 0, minHeight: '40px', padding: '0 14px', borderRadius: '10px', border: 'none',
            background: '#facc15', color: '#1f2937', fontWeight: 800, fontSize: 'var(--fs-sm)', cursor: 'pointer'
          }}>
            ⚽ בעיטות לשער
          </button>
        </div>
      )}
      {playing && (
        <Suspense fallback={null}>
          <PenaltyGame online={!offline} onClose={() => setPlaying(false)} />
        </Suspense>
      )}
    </>
  );
}

export default OfflineBanner;
