import React from 'react';

// באיזה ערוץ ישראלי המשחק משודר (מ-365, דרך השרת). מוצג גם אחרי המשחק -
// למשל למי שרוצה לחפש את התקציר. ערוץ עם אתר הוא קישור
export default function TvChannels({ match, style }) {
  const list = match && match.tvChannels;
  if (!list || list.length === 0) return null;
  return (
    <span
      aria-label={`משודר ב${list.map((c) => c.name).join(' וב')}`}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px', whiteSpace: 'nowrap',
        fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--text-3, #5f6670)', ...style
      }}
    >
      <span aria-hidden="true">📺</span>
      {list.map((c, i) => (
        <React.Fragment key={c.name}>
          {i > 0 && <span aria-hidden="true"> / </span>}
          {c.website ? (
            <a
              href={c.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              {c.name}
            </a>
          ) : c.name}
        </React.Fragment>
      ))}
    </span>
  );
}
