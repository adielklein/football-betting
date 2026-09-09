import React from 'react';

// טבעת שנדלקת על גבול הכרטיס כשנכנס שער במשחק הזה.
//
// שכבה נפרדת ולא אנימציה על הכרטיס עצמו: כדי להריץ אנימציה מחדש צריך
// שהאלמנט שנושא אותה ייטען מחדש, וטעינה מחדש של הכרטיס תאפס את שדות
// הקלט ואת מצב הפתיחה שבתוכו. לשכבה הזו אין מה לאבד.
//
// המפתח הוא חותמת הזמן של השער, ולכן שער שני מחליף את השכבה בחדשה
// ומתחיל את ההבהוב מהתחלה.

function GoalFlash({ at, radius = '16px' }) {
  if (!at) return null;

  return (
    <span
      key={at}
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: '-1px',
        borderRadius: radius,
        pointerEvents: 'none',
        boxShadow: '0 0 0 2px var(--bad-fg, #dc3545), 0 0 18px 2px var(--bad-bg, #fdecec)',
        animation: 'goalFlash 1.5s ease forwards'
      }}
    />
  );
}

export default GoalFlash;
