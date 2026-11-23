import React from 'react';

// חולצה של קבוצה, והסמל שלה על החזה.
//   kit   - מבנה החולצה מ-data/kits.js (פסים, חצאים, שרוולים...)
//   color - בלי מבנה ידוע: חולצה אחידה בצבע מ-365
//
// קו מתאר: כהה במצב בהיר ובהיר במצב כהה (‎--shirt-outline‎ ב-index.css).
// חולצה לבנה על כרטיס לבן, או שחורה במצב כהה, הייתה נעלמת בלעדיו. ההצללה
// (gradient) מעל הכל נותנת לה מעט נפח.
const SHIRT = 'M15 3 L7 7 L1 15 L7.5 21.5 L11.5 18.5 L11.5 42 L36.5 42 L36.5 18.5 L40.5 21.5 L47 15 L41 7 L33 3 Q24 9 15 3 Z';
const SLEEVE_L = '1,15 7,7 15,3 13.2,4.2 11.5,10 11.5,18.5 7.5,21.5';
const SLEEVE_R = '47,15 41,7 33,3 34.8,4.2 36.5,10 36.5,18.5 40.5,21.5';
const COLLAR = 'M15 3 Q24 9 33 3';

// התבנית עצמה, בתוך גבולות החולצה (נחתכת לצורה ב-clipPath)
function Pattern({ kit }) {
  const { p, body, alt } = kit;
  const rects = [];
  if (p === 'stripes') {
    // פס ברוחב 5, כשהפס המרכזי בצבע הבסיס - כמו ברוב החולצות המפוספסות
    for (let x = -1.5, i = 0; x < 48; x += 5, i++) {
      if (i % 2 === 1) rects.push(<rect key={x} x={x} y="0" width="5" height="44" fill={alt} />);
    }
  } else if (p === 'hoops') {
    for (let y = 9, i = 0; y < 44; y += 5, i++) {
      if (i % 2 === 0) rects.push(<rect key={y} x="0" y={y} width="48" height="5" fill={alt} />);
    }
  } else if (p === 'halves') {
    rects.push(<rect key="h" x="24" y="0" width="24" height="44" fill={alt} />);
  } else if (p === 'sash') {
    rects.push(<polygon key="s" points="10,7 17,2.5 40,40 33,44.5" fill={alt} />);
  } else if (p === 'checks') {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 9; c++) {
        if ((r + c) % 2 === 1) rects.push(<rect key={`${r}-${c}`} x={c * 5.4 + 0.3} y={r * 5.4 + 1} width="5.4" height="5.4" fill={alt} />);
      }
    }
  } else if (p === 'band') {
    rects.push(<rect key="b" x="0" y="17" width="48" height="6" fill={alt} />);
  } else if (p === 'centerband') {
    rects.push(<rect key="w" x="18.5" y="0" width="11" height="44" fill="#FFFFFF" />);
    rects.push(<rect key="c" x="19.8" y="0" width="8.4" height="44" fill={alt} />);
  }
  return (
    <>
      <rect x="0" y="0" width="48" height="44" fill={body} />
      {rects}
      {kit.sleeves && (
        <>
          <polygon points={SLEEVE_L} fill={kit.sleeves} />
          <polygon points={SLEEVE_R} fill={kit.sleeves} />
        </>
      )}
    </>
  );
}

let uid = 0;

function TeamShirt({ color, kit, size = 44, children }) {
  // מזהה ייחודי לכל מופע: אותה קבוצה יכולה להופיע כמה פעמים במסך, ו-clipPath
  // עם מזהה כפול מצייר את כולן לפי הראשון
  const [id] = React.useState(() => `shirt-${++uid}`);
  const outline = { stroke: 'var(--shirt-outline, rgba(0,0,0,0.3))' };
  const shape = kit || { p: 'solid', body: color };
  const h = size * 0.92;
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: h, flexShrink: 0 }}>
      <svg viewBox="0 0 48 44" width={size} height={h} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <clipPath id={`${id}-c`}><path d={SHIRT} /></clipPath>
          {/* אור מלמעלה-שמאל */}
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.30" />
            <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.16" />
          </linearGradient>
          {/* גוף עגול: הצדדים כהים מהמרכז */}
          <linearGradient id={`${id}-s`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0.2" stopColor="#000" stopOpacity="0.20" />
            <stop offset="0.38" stopColor="#000" stopOpacity="0" />
            <stop offset="0.62" stopColor="#000" stopOpacity="0" />
            <stop offset="0.8" stopColor="#000" stopOpacity="0.20" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${id}-c)`}>
          <Pattern kit={shape} />
          <rect x="11.5" y="0" width="25" height="44" fill={`url(#${id}-s)`} />
          {/* שוליים כהים בקצה השרוולים ובתחתית */}
          <polygon points="1,15 7.5,21.5 9,20.3 2.6,13.6" fill="#000" opacity="0.22" />
          <polygon points="47,15 40.5,21.5 39,20.3 45.4,13.6" fill="#000" opacity="0.22" />
          <rect x="11.5" y="40.3" width="25" height="1.7" fill="#000" opacity="0.14" />
          <path d={SHIRT} fill={`url(#${id}-g)`} />
        </g>
        {/* תפרי השרוולים */}
        <path d="M11.5 10 L11.5 18.5 M36.5 10 L36.5 18.5" style={outline} strokeWidth="0.8" />
        {shape.collar && <path d={COLLAR} fill="none" stroke={shape.collar} strokeWidth="2.6" strokeLinecap="round" />}
        <path d={SHIRT} fill="none" style={outline} strokeWidth="1.1" strokeLinejoin="round" />
        <path d={COLLAR} fill="none" style={outline} strokeWidth="0.9" />
      </svg>
      {children && (
        // הסמל על החזה השמאלי של הלובש (מימין לצופה), קטן - כמו בחולצה
        // אמיתית - כדי שהתבנית תישאר גלויה. צל דק מפריד אותו מהבד
        <span style={{
          // גובה החזה, בערך מול קצה השרוול - שם יושב סמל בחולצה אמיתית
          position: 'absolute', left: '63%', top: '33%', transform: 'translate(-50%, -50%)',
          width: size * 0.22, height: size * 0.22,
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0,
          filter: 'drop-shadow(0 0 0.5px rgba(255,255,255,0.8)) drop-shadow(0 0.5px 0.8px rgba(0,0,0,0.35))'
        }}>
          {children}
        </span>
      )}
    </span>
  );
}

export default TeamShirt;
