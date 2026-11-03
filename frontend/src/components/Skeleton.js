import React from 'react';

// שלד טעינה: צורות אפורות מהבהבות במקום שבו התוכן יופיע. במקום ספינר
// במסך ריק - זה מרגיש מהיר יותר, והמסך לא קופץ כשהתוכן מגיע.

const bar = (height, width = '100%', radius = 8) => ({
  height, width, borderRadius: radius,
  background: 'linear-gradient(90deg, var(--surface-2, #f3f5f8) 25%, var(--surface-3, #e6e9ee) 50%, var(--surface-2, #f3f5f8) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.2s linear infinite'
});

export const SkeletonBar = ({ height = 14, width, radius }) => (
  <div aria-hidden="true" className="skeleton" style={bar(height, width, radius)} />
);

/** רשימת שורות (טבלה, היסטוריה) */
export function SkeletonRows({ rows = 6, label = 'טוען...' }) {
  return (
    <div className="card" role="status" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <SkeletonBar height={18} width="45%" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <SkeletonBar height={22} width="22px" radius={11} />
          <div style={{ flex: 1 }}><SkeletonBar height={14} width={`${70 - (i % 3) * 12}%`} /></div>
          <SkeletonBar height={22} width="44px" radius={10} />
        </div>
      ))}
    </div>
  );
}

/** כרטיסי משחק (כל ההימורים) */
export function SkeletonCards({ cards = 4, label = 'טוען...' }) {
  return (
    <div role="status" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <SkeletonBar height={16} width="30%" />
            <SkeletonBar height={14} width="22%" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ flex: 1 }}><SkeletonBar height={16} /></div>
            <SkeletonBar height={16} width="24px" />
            <div style={{ flex: 1 }}><SkeletonBar height={16} /></div>
          </div>
        </div>
      ))}
    </div>
  );
}

/** מסך הסטטיסטיקה */
export function SkeletonStats({ label = 'טוען סטטיסטיקות...' }) {
  return (
    <div role="status" aria-label={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <SkeletonBar height={120} width="120px" radius={60} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <SkeletonBar height={12} /><SkeletonBar height={12} width="80%" /><SkeletonBar height={12} width="60%" />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <SkeletonBar height={64} radius={12} /><SkeletonBar height={64} radius={12} /><SkeletonBar height={64} radius={12} />
      </div>
      <div className="card"><SkeletonBar height={18} width="40%" /><div style={{ height: 10 }} /><SkeletonBar height={70} radius={12} /></div>
    </div>
  );
}
