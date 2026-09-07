import React from 'react';

// התוצאה החיה של משחק בודד. מוצגת בסדר team1-team2 כמו בכל שאר המסכים.
//
// שלושה מצבים: מתנהל (נקודה פועמת + דקה), הסתיים זה עתה, וכלום - שבו
// הרכיב לא מצייר דבר ומפנה את מקומו לתאריך הרגיל.
function LiveScore({ live, compact = false }) {
  if (!live || live.status === 'scheduled') return null;
  if (live.team1Goals == null || live.team2Goals == null) return null;

  const isLive = live.status === 'live';
  // מצב "חי" שומר על אדום משלו; מצב "הסתיים" עובר לטוקנים, אחרת הוא
  // אפור בהיר על אפור בהיר - קשה לקריאה על כרטיס כהה.
  const color = isLive ? '#dc3545' : 'var(--text-3, #6c757d)';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: compact ? '1px 7px' : '2px 9px',
        borderRadius: '999px',
        backgroundColor: isLive ? '#fff0f1' : 'var(--surface-3, #f1f3f5)',
        border: `1px solid ${isLive ? '#f5c2c7' : 'var(--border-2, #e3e6ea)'}`,
        color,
        fontSize: compact ? '10px' : '11px',
        fontWeight: 700,
        whiteSpace: 'nowrap'
      }}
    >
      {isLive && (
        <span
          aria-hidden="true"
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#dc3545',
            animation: 'livePulse 1.4s ease-in-out infinite',
            flexShrink: 0
          }}
        />
      )}

      {/* המספרים בכיוון שמאל-לימין כדי שלא יתהפכו בתוך טקסט עברי */}
      <span style={{ direction: 'ltr', unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums' }}>
        {live.team1Goals}-{live.team2Goals}
      </span>

      <span style={{ fontWeight: 600, opacity: 0.85 }}>
        {isLive ? live.minute || live.statusText || 'חי' : 'הסתיים'}
      </span>
    </span>
  );
}

export default LiveScore;
