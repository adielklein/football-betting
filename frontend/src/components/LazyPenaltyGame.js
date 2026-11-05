import React, { lazy } from 'react';

// משחק הבעיטות נטען רק כשפותחים אותו (מסך הכניסה, או הפס "אין חיבור").
// מרגע שנטען פעם אחת הוא בקאש, כך שגם בלי קליטה הוא נפתח.
export const loadGame = () => import('./PenaltyGame');

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

export default lazy(() => loadGame().catch(() => ({ default: Unavailable })));
