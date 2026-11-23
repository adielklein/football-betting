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
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size * 0.92, flexShrink: 0 }}>
      <svg viewBox="0 0 48 44" width={size} height={size * 0.92} aria-hidden="true" style={{ display: 'block', overflow: 'visible' }}>
        <defs>
          <clipPath id={`${id}-c`}><path d={SHIRT} /></clipPath>
          <linearGradient id={`${id}-g`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" stopOpacity="0.28" />
            <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity="0.18" />
          </linearGradient>
        </defs>
        <g clipPath={`url(#${id}-c)`}>
          <Pattern kit={shape} />
          <path d={SHIRT} fill={`url(#${id}-g)`} />
        </g>
        {shape.collar && <path d={COLLAR} fill="none" stroke={shape.collar} strokeWidth="2.6" strokeLinecap="round" />}
        <path d={SHIRT} fill="none" style={outline} strokeWidth="1.2" strokeLinejoin="round" />
        <path d={COLLAR} fill="none" style={outline} strokeWidth="1" />
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
