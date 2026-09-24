import React from 'react';

// הערה על תוצאה שהוכרעה מעבר ל-90 דקות.
//
// הניקוד במשחק הזה נקבע לפי 90 דקות בלבד - כך זה תמיד היה, וכך זה נכון:
// מי שניחש תיקו לא צריך להפסיד בגלל שער בהארכה. אבל בלי לומר את זה,
// השחקן רואה 1-1 באפליקציה ו-2-1 בטלוויזיה, ומסיק שיש כאן באג.
//
// מוצג רק כשבאמת הייתה הארכה או פנדלים, ולכן ברוב המשחקים אינו קיים.

function ResultNote({ result, style }) {
  const final = result?.finalScore;
  if (!final || final.team1Goals == null || final.team2Goals == null) return null;

  const pens = final.penalties;
  const text = pens && pens.team1 != null
    ? `הוכרע בפנדלים ${pens.team1}-${pens.team2} (${final.team1Goals}-${final.team2Goals} בהארכה)`
    : `הסתיים ${final.team1Goals}-${final.team2Goals} אחרי הארכה`;

  return (
    <div style={{ fontSize: '10.5px', color: 'var(--text-4, #aaa)', lineHeight: 1.5, ...style }}>
      ⏱️ {text} · הניקוד לפי 90 דקות
    </div>
  );
}

export default ResultNote;
