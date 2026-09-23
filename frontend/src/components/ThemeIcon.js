import React, { useState } from 'react';
import { getTheme, themeIconSources } from '../themes';

// הסמל של ערכת נושא - סמל הקבוצה עצמו ולא עיגול צבע.
//
// עיגול בצבעי הערכה אמר פחות ממה שנראה: שתי קבוצות בצבע דומה נראות
// זהות, והצבע לבדו אינו מה שמזהים. הסמל הוא מה שהעין מחפשת.
//
// סמל שלא נטען נופל לאמוג'י של הערכה, ואם גם אין כזה - לכדור.

function ThemeIcon({ themeKey, size = 22 }) {
  // מקור שנכשל מפנה את מקומו לבא אחריו, ורק אחרי שכולם נכשלו מגיע
  // האמוג'י. סמל ידני מת - וכזה כבר קרה - נופל לסמל לפי שם הקבוצה
  const [attempt, setAttempt] = useState(0);

  const theme = getTheme(themeKey);
  const sources = themeIconSources(theme);
  const url = sources[attempt] || null;

  if (url) {
    return (
      <img
        key={url}
        src={url}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        onError={() => setAttempt((n) => n + 1)}
        style={{ objectFit: 'contain', flexShrink: 0, display: 'block' }}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={{
        width: `${size}px`, height: `${size}px`, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: `${Math.round(size * 0.8)}px`, lineHeight: 1
      }}
    >
      {theme.logoType === 'emoji' ? theme.logo : '⚽'}
    </span>
  );
}

export default ThemeIcon;
