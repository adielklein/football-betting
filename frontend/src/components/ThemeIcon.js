import React, { useState } from 'react';
import { getTheme, themeLogoUrl } from '../themes';

// הסמל של ערכת נושא - סמל הקבוצה עצמו ולא עיגול צבע.
//
// עיגול בצבעי הערכה אמר פחות ממה שנראה: שתי קבוצות בצבע דומה נראות
// זהות, והצבע לבדו אינו מה שמזהים. הסמל הוא מה שהעין מחפשת.
//
// סמל שלא נטען נופל לאמוג'י של הערכה, ואם גם אין כזה - לכדור.

function ThemeIcon({ themeKey, size = 22 }) {
  const [failed, setFailed] = useState(false);

  const theme = getTheme(themeKey);
  const url = failed ? null : themeLogoUrl(theme);

  if (url) {
    return (
      <img
        src={url}
        alt=""
        aria-hidden="true"
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
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
