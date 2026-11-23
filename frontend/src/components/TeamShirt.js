import React from 'react';

// חולצה בצבע של הקבוצה, והסמל שלה על החזה. הצבע מגיע מ-365 (team1Color /
// team2Color על המשחק); בלעדיו מציגים רק את הסמל, כמו קודם.
//
// קו מתאר: כהה במצב בהיר ובהיר במצב כהה (‎--shirt-outline‎ ב-index.css).
// חולצה לבנה על כרטיס לבן, או שחורה במצב כהה, הייתה נעלמת בלעדיו. ההצללה (gradient) נותנת לה מעט נפח.
const SHIRT = 'M15 3 L7 7 L1 15 L7.5 21.5 L11.5 18.5 L11.5 42 L36.5 42 L36.5 18.5 L40.5 21.5 L47 15 L41 7 L33 3 Q24 9 15 3 Z';

function TeamShirt({ color, size = 44, children }) {
  const id = `shirt-${String(color).replace('#', '')}`;
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size * 0.92, flexShrink: 0 }}>
      <svg viewBox="0 0 48 44" width={size} height={size * 0.92} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <path d={SHIRT} fill={color} style={{ stroke: 'var(--shirt-outline, rgba(0,0,0,0.3))' }} strokeWidth="1.2" strokeLinejoin="round" />
        <path d={SHIRT} fill={`url(#${id})`} />
        <path d="M15 3 Q24 9 33 3" fill="none" style={{ stroke: 'var(--shirt-outline, rgba(0,0,0,0.3))' }} strokeWidth="1.4" />
      </svg>
      {children && (
        <span style={{
          position: 'absolute', left: '50%', top: '56%', transform: 'translate(-50%, -50%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          // הסמל על חולצה בגוון דומה לשלו מתמזג. עיגול לבן קטן מאחוריו שומר עליו
          background: 'rgba(255,255,255,0.92)', borderRadius: '50%', padding: 2,
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)', lineHeight: 0
        }}>
          {children}
        </span>
      )}
    </span>
  );
}

export default TeamShirt;
