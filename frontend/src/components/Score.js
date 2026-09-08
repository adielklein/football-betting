import React from 'react';

// תוצאה או ניחוש, בסדר החזותי הנכון למסך עברי.
//
// הכלל: הקבוצה הראשונה נכתבת מימין - "ברצלונה נגד פיינורד" מציב את ברצלונה
// מימין - ולכן גם השערים שלה חייבים להיות מימין. אחרת הקורא רואה 4-0 ליד
// שם שנמצא בצד השני, וקורא את התוצאה הפוכה.
//
// הקוד המקורי כתב את הצמד הפוך ({team2}-{team1}) כדי לפצות על זה. "תיקנתי"
// את הסדר הלוגי ובכך שברתי את החזותי, ומשתמשים דיווחו מיד שהניחושים
// התהפכו. הפתרון הנכון הוא לשמור על הסדר הלוגי ולכפות את הכיוון:
// direction: rtl מציב את הילד הראשון מימין.
//
// הכפייה מפורשת בכוונה. אלגוריתם הדו-כיווניות מסדר "2-1" ו-"2 - 1" הפוך
// זה מזה - מקף בין ספרות מתמזג למספר אחד, ומקף מוקף רווחים נשאר ניטרלי
// ומקבל את כיוון הפסקה - כך שהסדר היה תלוי ברווח.

function Score({ home, away, pair, style, homeColor, awayColor, dashColor }) {
  // מקבל גם מחרוזת מוכנה בסדר team1-team2, כפי שהשרת מחזיר
  let h = home;
  let a = away;
  if (pair != null) {
    const parts = String(pair).split('-');
    h = parts[0];
    a = parts[1];
  }

  const show = (v) => (v === undefined || v === null || v === '' ? '?' : v);

  return (
    <span
      style={{
        direction: 'rtl',
        unicodeBidi: 'isolate',
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        fontVariantNumeric: 'tabular-nums',
        ...style
      }}
    >
      <span style={homeColor ? { color: homeColor } : undefined}>{show(h)}</span>
      <span style={{ color: dashColor || 'inherit', opacity: dashColor ? 1 : 0.55 }}>-</span>
      <span style={awayColor ? { color: awayColor } : undefined}>{show(a)}</span>
    </span>
  );
}

export default Score;
