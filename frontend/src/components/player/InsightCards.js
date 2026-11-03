import React from 'react';

// כרטיסי התובנות הנוספות בסטטיסטיקה. הנתונים מחושבים בשרת
// (backend/services/playerInsights.js); כאן רק התצוגה.
//
// כל כרטיס מחזיר null כשאין מספיק נתונים, כדי שלא יופיעו כרטיסים ריקים
// אצל שחקן חדש.

const Card = ({ title, icon, children }) => (
  <div style={{
    background: 'var(--surface, #fff)', borderRadius: '16px',
    padding: '0.85rem', marginBottom: '0.6rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.6rem' }}>
      <span style={{ fontSize: 'var(--fs-md)' }}>{icon}</span>
      <span style={{ fontWeight: '700', fontSize: 'var(--fs-sm)', color: 'var(--text, #333)' }}>{title}</span>
    </div>
    {children}
  </div>
);

const Headline = ({ children }) => (
  <div style={{ fontSize: 'var(--fs-md)', fontWeight: '800', color: 'var(--text, #333)', marginBottom: '0.5rem' }}>
    {children}
  </div>
);

const Note = ({ children }) => (
  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #5f6670)', marginTop: '0.5rem', lineHeight: 1.5 }}>
    {children}
  </div>
);

// שני מספרים זה מול זה: "אתה" מול "בפועל"
const Versus = ({ left, right }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
    {[left, right].map((x) => (
      <div key={x.label} style={{
        textAlign: 'center', padding: '0.55rem 0.3rem', borderRadius: '12px',
        background: x.bg || 'var(--surface-2, #f8f9fc)'
      }}>
        <div style={{ fontSize: 'var(--fs-xl)', fontWeight: '800', color: x.color || 'var(--text, #333)', lineHeight: 1.2 }}>
          {x.value}
        </div>
        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #5f6670)', fontWeight: '600' }}>{x.label}</div>
      </div>
    ))}
  </div>
);

// === אופטימי או פסימי ===
export function GoalsCard({ goals }) {
  if (!goals) return null;
  const headline = goals.label === 'optimist'
    ? '😄 אופטימי: אתה מנחש יותר שערים ממה שיש'
    : goals.label === 'pessimist'
      ? '🧱 פסימי: אתה מנחש פחות שערים ממה שיש'
      : '⚖️ מאוזן: אתה מנחש בערך כמה שערים שיש';
  return (
    <Card title="אופטימי או פסימי" icon="⚽">
      <Headline>{headline}</Headline>
      <Versus
        left={{ label: 'שערים שאתה מנחש למשחק', value: goals.avgPredicted, color: 'var(--info-fg, #1560ad)', bg: 'var(--info-bg, #eff6ff)' }}
        right={{ label: 'שערים בפועל למשחק', value: goals.avgActual }}
      />
      <Note>
        ב-{goals.overRate}% מהמשחקים ניחשת יותר שערים ממה שהיה, וב-{goals.underRate}% פחות
        (מתוך {goals.matches} משחקים).
      </Note>
    </Card>
  );
}

// === נגד הקהל ===
export function CrowdCard({ crowd }) {
  if (!crowd || crowd.matches < 5) return null;
  const pays = crowd.againstCount > 0 && crowd.againstHitRate >= crowd.withHitRate;
  return (
    <Card title="נגד הקהל" icon="🐺">
      <Headline>
        {crowd.againstCount === 0
          ? 'תמיד הולך עם הרוב'
          : `הלכת נגד רוב השחקנים ב-${crowd.againstRate}% מהמשחקים`}
      </Headline>
      {crowd.againstCount > 0 && (
        <Versus
          left={{
            label: 'פגיעה כשהלכת נגד הרוב',
            value: `${crowd.againstHitRate}%`,
            color: pays ? 'var(--good-fg, #1a6b35)' : 'var(--bad-fg, #a81f17)',
            bg: pays ? 'var(--good-bg, #e8f5e9)' : 'var(--bad-bg, #fdecea)'
          }}
          right={{ label: 'פגיעה כשהלכת עם הרוב', value: `${crowd.withHitRate}%` }}
        />
      )}
      <Note>
        {crowd.againstHits > 0 && <>ההליכה נגד הקהל הכניסה לך {crowd.againstPoints} נקודות. </>}
        {crowd.best && (
          <>הכי שווה: {crowd.best.label}, כש-{crowd.best.crowdShare}% הימרו אחרת (+{crowd.best.points}).</>
        )}
        {' '}"הרוב" הוא הכיוון (1/X/2) שרוב השחקנים האחרים בחרו.
      </Note>
    </Card>
  );
}

// === המקום שלך לאורך העונה ===
// הזמן זורם מימין לשמאל, כמו בשאר הגרפים במסך. מקום 1 למעלה.
export function SeasonRankCard({ history }) {
  if (!history || history.length < 2) return null;
  const width = 300;
  const height = 130;
  const padLeft = 28; // מקום למספרי המקומות
  const padRight = 14;
  const padTop = 14;
  const padBottom = 22;
  const players = Math.max(...history.map((h) => h.players), 2);
  const n = history.length;
  const x = (i) => width - padRight - (i * (width - padLeft - padRight)) / (n - 1);
  const y = (rank) => padTop + ((rank - 1) * (height - padTop - padBottom)) / (players - 1);
  const points = history.map((h, i) => `${x(i)},${y(h.rank)}`).join(' ');
  const last = history[n - 1];
  const best = Math.min(...history.map((h) => h.rank));

  return (
    <Card title="המקום שלך בטבלה העונתית" icon="📍">
      <Headline>
        עכשיו במקום {last.rank} מתוך {last.players}
        {best < last.rank && <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text-3, #5f6670)' }}> · הכי גבוה: {best}</span>}
      </Headline>
      {/* direction: ltr - בתוך דף RTL עוגני הטקסט של SVG מתהפכים, והתוויות
          נחתכו בקצוות. הקואורדינטות כאן כבר מסודרות מימין לשמאל ידנית */}
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" style={{ direction: 'ltr' }}
        aria-label={`המקום בטבלה אחרי כל שבוע: ${history.map((h) => h.rank).join(', ')}`}>
        {[1, players].map((r) => (
          <g key={r}>
            <line x1={padLeft} x2={width - padRight} y1={y(r)} y2={y(r)} stroke="var(--border, #e5e7eb)" strokeDasharray="3 4" />
            <text x={padLeft - 6} y={y(r) + 4} fontSize="12" fill="var(--text-3, #5f6670)" textAnchor="end">{r}</text>
          </g>
        ))}
        <polyline points={points} fill="none" stroke="var(--theme-primary-text, #007bff)" strokeWidth="2.5" strokeLinejoin="round" />
        {history.map((h, i) => (
          <circle key={h.weekId} cx={x(i)} cy={y(h.rank)} r={i === n - 1 ? 5 : 3}
            fill={i === n - 1 ? 'var(--theme-primary-text, #007bff)' : 'var(--surface, #fff)'}
            stroke="var(--theme-primary-text, #007bff)" strokeWidth="2" />
        ))}
        <text x={width - padRight} y={height - 4} fontSize="12" fill="var(--text-3, #5f6670)" textAnchor="end">שבוע 1</text>
        <text x={padLeft} y={height - 4} fontSize="12" fill="var(--text-3, #5f6670)" textAnchor="start">עכשיו</text>
      </svg>
    </Card>
  );
}

// === לפי ליגה ===
export function LeaguesCard({ leagues }) {
  if (!leagues || leagues.length < 2) return null;
  const top = leagues[0];
  const bottom = leagues[leagues.length - 1];
  return (
    <Card title="לפי ליגה" icon="🏟️">
      <Headline>הכי טוב ב{top.name}, הכי חלש ב{bottom.name}</Headline>
      {leagues.map((l) => (
        <div key={l.leagueId} style={{ marginBottom: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-xs)', marginBottom: '3px' }}>
            <span style={{ fontWeight: 700, color: 'var(--text, #333)' }}>{l.name}</span>
            <span style={{ color: 'var(--text-3, #5f6670)' }}>
              {l.accuracy}% פגיעה · {l.avgPoints} נק׳ למשחק · {l.bets} משחקים
            </span>
          </div>
          <div style={{ height: '8px', borderRadius: '4px', background: 'var(--surface-3, #eef1f5)', overflow: 'hidden' }}>
            <div style={{
              width: `${l.accuracy}%`, height: '100%', borderRadius: '4px',
              background: l.color || 'var(--theme-primary, #007bff)'
            }} />
          </div>
        </div>
      ))}
    </Card>
  );
}

// === הקבוצה שלך ===
export function ThemeTeamCard({ data }) {
  if (!data) return null;
  const gap = data.predictedWinRate - data.actualWinRate;
  const headline = gap >= 15
    ? `❤️ אתה מאמין ב${data.team} יותר ממה שהיא מצדיקה`
    : gap <= -15
      ? `🤐 אתה לא סומך על ${data.team} - והיא מפתיעה אותך`
      : `🎯 אתה קורא את ${data.team} נכון`;
  return (
    <Card title={`אתה ו${data.team}`} icon="💙">
      <Headline>{headline}</Headline>
      <Versus
        left={{ label: 'ניחשת ניצחון', value: `${data.predictedWinRate}%`, color: 'var(--info-fg, #1560ad)', bg: 'var(--info-bg, #eff6ff)' }}
        right={{ label: 'ניצחה בפועל', value: `${data.actualWinRate}%` }}
      />
      <Note>
        {data.games} משחקים של {data.team} · {data.accuracy}% פגיעה · {data.avgPoints} נק׳ למשחק.
        הקבוצה נלקחת מערכת הנושא שבחרת.
      </Note>
    </Card>
  );
}
