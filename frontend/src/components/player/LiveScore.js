import React, { useEffect, useRef, useState } from 'react';
import Score from '../Score';
import { liveBetStatus, showsLiveBadge, STATUS_LABEL } from '../../services/liveBetStatus';

// התוצאה החיה של משחק בודד. מוצגת בסדר team1-team2 כמו בכל שאר המסכים.
//
// שני מצבים שמציירים: מתנהל (נקודה פועמת + דקה), והסתיים-אך-טרם-סונכרן.
// בכל שאר המקרים הרכיב לא מצייר דבר ומפנה את מקומו לתאריך או לתוצאה.
//
// הצבע נושא מידע: כשמועבר prediction, הוא אומר איפה המשתמש עומד מול
// התוצאה הנוכחית - ירוק בול, צהוב כיוון נכון, אדום החמצה. בלי ניחוש שמור
// הוא חוזר למראה הנייטרלי, כי אז לאדום אין משמעות מלבד "חי".
const TONE = {
  exact: { bg: 'var(--good-bg, #e8f6ec)', fg: 'var(--good-fg, #1a6b35)', border: 'var(--good-border, #b9e0c6)' },
  direction: { bg: 'var(--warn-bg, #fff4d6)', fg: 'var(--warn-fg, #7c5306)', border: 'var(--warn-border, #f0dca4)' },
  miss: { bg: 'var(--bad-bg, #fdecec)', fg: 'var(--bad-fg, #a81f17)', border: 'var(--bad-border, #f3c2bf)' }
};

const NEUTRAL_LIVE = { bg: 'var(--bad-bg, #fff0f1)', fg: '#dc3545', border: 'var(--bad-border, #f5c2c7)' };
const NEUTRAL_DONE = { bg: 'var(--surface-3, #f1f3f5)', fg: 'var(--text-3, #6c757d)', border: 'var(--border-2, #e3e6ea)' };

function LiveScore({ live, prediction, result, compact = false }) {
  // קפיצה קצרה כשהמספר משתנה. המפתח הוא חותמת זמן, כי אנימציה חוזרת
  // דורשת אלמנט חדש - אותו אלמנט עם אותה אנימציה פשוט לא מתחיל שוב.
  const pair = live ? `${live.team1Goals}-${live.team2Goals}` : null;
  const lastPair = useRef(pair);
  const [bumpAt, setBumpAt] = useState(0);

  useEffect(() => {
    if (lastPair.current !== null && pair !== null && lastPair.current !== pair) {
      setBumpAt(Date.now());
    }
    lastPair.current = pair;
  }, [pair]);

  if (!showsLiveBadge(live, result)) return null;

  const isLive = live.status === 'live';
  const status = liveBetStatus(prediction, live);
  const tone = status ? TONE[status] : (isLive ? NEUTRAL_LIVE : NEUTRAL_DONE);

  const stateText = isLive ? live.minute || live.statusText || 'חי' : 'הסתיים';
  // הצבע לבדו לא נגיש - מי שלא מבחין בגוונים צריך את המילה עצמה.
  const label = status
    ? `${live.team1Goals}-${live.team2Goals}, ${stateText}, ${STATUS_LABEL[status]}`
    : `${live.team1Goals}-${live.team2Goals}, ${stateText}`;

  return (
    <span
      title={status ? STATUS_LABEL[status] : undefined}
      aria-label={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: compact ? '1px 7px' : '2px 9px',
        borderRadius: '999px',
        backgroundColor: tone.bg,
        border: `1px solid ${tone.border}`,
        color: tone.fg,
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
            backgroundColor: 'currentColor',
            animation: 'livePulse 1.4s ease-in-out infinite',
            flexShrink: 0
          }}
        />
      )}

      {/* הקבוצה הראשונה מימין, כמו בכותרת המשחק */}
      <span key={bumpAt} style={{ display: 'inline-flex', animation: bumpAt ? 'scoreBump 0.55s ease' : undefined }}>
        <Score home={live.team1Goals} away={live.team2Goals} />
      </span>

      <span aria-hidden="true" style={{ fontWeight: 600, opacity: 0.85 }}>
        {stateText}
      </span>
    </span>
  );
}

export default LiveScore;
