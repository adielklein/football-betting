import React from 'react';

// עיטורי האצטדיון, משותפים למסך השחקן ולמסך המנהל. ההסברים המלאים
// והצבעים - ב-index.css (header-crest, stadium-lights, pitch-stripes).

// שכבות המטבע של הסמל המסתובב, לפי סדר הציור. כל צד הוא דפנות ואז פנים,
// וכל צד נראה רק כשהוא פונה אלינו. הגב קודם, כך שפני החזית מצוירים
// אחרונים. עומק בפיקסלים. כל שכבה מסתובבת לבד ולא בהקשר תלת-ממדי משותף -
// ספארי באייפון צייר הקשר כזה מעל חלונות קופצים וחסם בהם לחיצות
const CREST_LAYERS = [
  ...[-3, -1.5, 0, 1.5, 3].map((z) => ({ z, cls: 'is-edge is-backside' })),
  { z: -4.5, cls: 'is-backside' },
  ...[-3, -1.5, 0, 1.5, 3].map((z) => ({ z, cls: 'is-edge' })),
  { z: 4.5, cls: '' },
];

// סמל ערכת הנושא כמטבע מסתובב. בתוך כותרת עם המחלקה header--crest
export function HeaderCrest() {
  return (
    <div className="header-crest" aria-hidden="true">
      {CREST_LAYERS.map(({ z, cls }, i) => (
        <span key={i} className={`header-crest__layer ${cls}`} style={{ '--z': `${z}px` }} />
      ))}
    </div>
  );
}

// דשא ברקע (מצב יום) וזרקורים על כל המסך. בראש העטיפה של המסך
export function StadiumBackdrop() {
  return (
    <>
      <div className="pitch-stripes" aria-hidden="true" />
      {/* פילטר "בד ברוח" אחד משותף לכל החולצות (TeamShirt cloth). פילטר
          לכל חולצה בנפרד היה מכפיל את העבודה בכל מסגרת */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id="shirt-wave" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.07" numOctaves="2" seed="4">
            <animate attributeName="baseFrequency" dur="5s" values="0.02 0.07;0.026 0.09;0.02 0.07" repeatCount="indefinite" />
          </feTurbulence>
          <feDisplacementMap in="SourceGraphic" scale="2.6" />
        </filter>
      </svg>
      <div className="stadium-lights" aria-hidden="true">
        <span className="stadium-beam stadium-beam--a" />
        <span className="stadium-beam stadium-beam--b" />
      </div>
    </>
  );
}
