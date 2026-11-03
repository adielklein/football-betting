import React from 'react';

// כרטיסי התובנות הנוספות בסטטיסטיקה. הנתונים מחושבים בשרת
// (backend/services/playerInsights.js); כאן רק התצוגה.
//
// כל כרטיס מחזיר null כשאין מספיק נתונים, כדי שלא יופיעו כרטיסים ריקים
// אצל שחקן חדש. המבנה אחיד: כותרת עם סמל, משפט אחד שאומר את המסקנה,
// הנתונים, ושורת הסבר קטנה.

// צבע לאחוז פגיעה. הפס יכול להיות בגוון חי, אבל טקסט צריך את הגרסה הכהה
// (בבהיר) או הבהירה (בכהה) - הכתום החי נתן ניגודיות 2:1 על הרקע
export const accuracyBar = (a) => (a >= 60 ? '#10b981' : a >= 40 ? '#f59e0b' : '#ef4444');
export const accuracyText = (a) => (a >= 60 ? 'var(--good-fg, #1a6b35)' : a >= 40 ? 'var(--warn-fg, #7c5306)' : 'var(--bad-fg, #a81f17)');

const Card = ({ title, icon, children }) => (
  <div style={{
    background: 'var(--surface, #fff)', borderRadius: '16px',
    padding: '0.85rem', marginBottom: '0.6rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.04)',
    border: '1px solid rgba(0,0,0,0.05)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.5rem' }}>
      <span style={{ fontSize: 'var(--fs-md)' }}>{icon}</span>
      <span style={{ fontWeight: '700', fontSize: 'var(--fs-sm)', color: 'var(--text, #333)' }}>{title}</span>
    </div>
    {children}
  </div>
);

// המסקנה במשפט אחד
const Headline = ({ children }) => (
  <div style={{ fontSize: 'var(--fs-md)', fontWeight: '700', color: 'var(--text, #333)', marginBottom: '0.6rem', lineHeight: 1.35 }}>
    {children}
  </div>
);

const Note = ({ children }) => (
  <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #5f6670)', marginTop: '0.55rem', lineHeight: 1.5 }}>
    {children}
  </div>
);

// שני מספרים זה מול זה. הראשון (מימין) הוא תמיד "אתה"
const Versus = ({ mine, other }) => (
  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
    {[mine, other].map((x, i) => (
      <div key={i} style={{
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

const MINE = { color: 'var(--info-fg, #1560ad)', bg: 'var(--info-bg, #eff6ff)' };

// === אופטימי או פסימי ===
export function GoalsCard({ goals }) {
  if (!goals) return null;
  const headline = goals.label === 'optimist'
    ? 'אופטימי: מנחש יותר שערים ממה שיש'
    : goals.label === 'pessimist'
      ? 'פסימי: מנחש פחות שערים ממה שיש'
      : 'מאוזן: מנחש בערך כמה שערים שיש';
  return (
    <Card title="אופטימי או פסימי" icon="⚽">
      <Headline>{headline}</Headline>
      <Versus
        mine={{ ...MINE, label: 'שערים שאתה מנחש', value: goals.avgPredicted }}
        other={{ label: 'שערים בפועל', value: goals.avgActual }}
      />
      <Note>ממוצע למשחק, מתוך {goals.matches} משחקים.</Note>
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
          ? 'תמיד הולך עם רוב השחקנים'
          : pays
            ? `הולך נגד הרוב ב-${crowd.againstRate}% מהמשחקים, וזה משתלם`
            : `הולך נגד הרוב ב-${crowd.againstRate}% מהמשחקים, אבל עם הרוב אתה פוגע יותר`}
      </Headline>
      {crowd.againstCount > 0 && (
        <Versus
          mine={{
            label: 'פגיעה נגד הרוב',
            value: `${crowd.againstHitRate}%`,
            color: pays ? 'var(--good-fg, #1a6b35)' : 'var(--bad-fg, #a81f17)',
            bg: pays ? 'var(--good-bg, #e8f5e9)' : 'var(--bad-bg, #fdecea)'
          }}
          other={{ label: 'פגיעה עם הרוב', value: `${crowd.withHitRate}%` }}
        />
      )}
      <Note>
        {crowd.againstHits > 0 && <>הימורים נגד הרוב הכניסו לך {crowd.againstPoints} נקודות. </>}
        {crowd.best && <>הכי שווה: {crowd.best.label} (+{crowd.best.points}).</>}
      </Note>
    </Card>
  );
}

// === המקום שלך לאורך העונה ===
// אותה שפה כמו "ניקוד מצטבר" שמתחתיו: הזמן זורם מימין לשמאל, מספרי
// השבועות על הציר, והמספרים של הציר מימין. מעל כל נקודה - המקום עצמו.
export function SeasonRankCard({ history }) {
  if (!history || history.length < 2) return null;
  const n = history.length;
  const players = Math.max(...history.map((h) => h.players), 2);
  const axisPad = 22; // מספרי המקומות בציר
  // רוחב לפי המסך, כמו בגרף המצטבר: עד ~11 שבועות נכנסים בטלפון בלי גלילה
  const step = Math.max(22, Math.min(48, (window.innerWidth - 110) / Math.max(n - 1, 1)));
  const width = step * (n - 1) + axisPad + 16;
  const top = 22; // מקום למספר מעל הנקודה הגבוהה
  const plot = 96;
  const height = top + plot + 26;
  const x = (i) => width - axisPad - i * step;
  const y = (rank) => top + ((rank - 1) / (players - 1)) * plot;
  const path = history.map((h, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(h.rank)}`).join(' ');
  const last = history[n - 1];
  const best = Math.min(...history.map((h) => h.rank));

  return (
    <Card title="המקום שלך בטבלה העונתית" icon="📍">
      <Headline>
        עכשיו במקום {last.rank} מתוך {last.players}
        {best < last.rank && (
          <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: 'var(--text-3, #5f6670)' }}> · הכי גבוה העונה: {best}</span>
        )}
      </Headline>
      <div style={{ overflowX: 'auto' }}>
        {/* direction: ltr - בתוך דף RTL עוגני הטקסט של SVG מתהפכים.
            הקואורדינטות כבר מסודרות מימין לשמאל ידנית */}
        <svg width={width} height={height} style={{ display: 'block', direction: 'ltr' }} role="img"
          aria-label={`המקום בטבלה אחרי כל שבוע: ${history.map((h) => h.rank).join(', ')}`}>
          {[1, players].map((r) => (
            <g key={r}>
              <line x1="8" x2={width - axisPad + 6} y1={y(r)} y2={y(r)} stroke="var(--border, #e5e7eb)" strokeWidth="1" />
              <text x={width - axisPad + 10} y={y(r) + 4} fontSize="12" fill="var(--text-3, #5f6670)" textAnchor="start">
                {r}
              </text>
            </g>
          ))}
          <path d={path} fill="none" stroke="var(--theme-primary-text, #007bff)" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />
          {history.map((h, i) => {
            const isLast = i === n - 1;
            return (
              <g key={h.weekId}>
                <circle cx={x(i)} cy={y(h.rank)} r={isLast ? 5 : 3.5}
                  fill={isLast ? 'var(--theme-primary-text, #007bff)' : 'var(--surface, #fff)'}
                  stroke="var(--theme-primary-text, #007bff)" strokeWidth="2" />
                <text x={x(i)} y={y(h.rank) - 9} fontSize="12" textAnchor="middle"
                  fontWeight={isLast ? '800' : '600'}
                  fill={isLast ? 'var(--theme-primary-text, #007bff)' : 'var(--text-2, #444)'}>
                  {h.rank}
                </text>
                <text x={x(i)} y={height - 6} fontSize="12" textAnchor="middle"
                  fontWeight={isLast ? '800' : '500'}
                  fill={isLast ? 'var(--theme-primary-text, #007bff)' : 'var(--text-3, #5f6670)'}>
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <Note>מעל כל נקודה: המקום שלך אחרי אותו שבוע. בציר: מספר השבוע בעונה, ומימין מקום 1 למעלה ו-{players} למטה.</Note>
    </Card>
  );
}

// === לפי ליגה ===
// אותו מבנה שורה כמו "כל הקבוצות" שמתחתיו, כדי שהשניים ייקראו אותו דבר
export function LeaguesCard({ leagues }) {
  if (!leagues || leagues.length < 2) return null;
  const top = leagues[0];
  const bottom = leagues[leagues.length - 1];
  return (
    <Card title="לפי ליגה" icon="🏟️">
      <Headline>הכי טוב ב{top.name}, הכי חלש ב{bottom.name}</Headline>
      {leagues.map((l, i) => (
        <div key={l.leagueId} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 8px', borderRadius: '8px',
          background: i % 2 === 0 ? 'var(--surface-2, #fafbfc)' : 'transparent'
        }}>
          <span aria-hidden="true" style={{
            width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
            background: l.color || 'var(--text-4, #aaa)',
            // טבעת דקה: צבע ליגה כהה (פרמייר ליג) נעלם על הרקע הכהה
            boxShadow: '0 0 0 1.5px var(--border-2, #d0d5dc)'
          }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 'var(--fs-sm)', fontWeight: '600', color: 'var(--text, #333)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {l.name}
            </div>
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #5f6670)' }}>
              {l.bets} משחקים · {l.avgPoints} נק׳ למשחק
            </div>
          </div>
          <div style={{ width: '50px', height: '6px', borderRadius: '3px', background: 'var(--surface-3, #f0f2f5)', overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ width: `${l.accuracy}%`, height: '100%', borderRadius: '3px', background: accuracyBar(l.accuracy) }} />
          </div>
          <span style={{ fontSize: 'var(--fs-sm)', fontWeight: '800', minWidth: '38px', textAlign: 'left', color: accuracyText(l.accuracy) }}>
            {l.accuracy}%
          </span>
        </div>
      ))}
      <Note>פגיעה = תוצאה מדויקת או כיוון נכון.</Note>
    </Card>
  );
}

// === הקבוצה שלך ===
export function ThemeTeamCard({ data }) {
  if (!data) return null;
  const gap = data.predictedWinRate - data.actualWinRate;
  const headline = gap >= 15
    ? `מאמין ב${data.team} יותר ממה שהיא מצדיקה`
    : gap <= -15
      ? `${data.team} מפתיעה אותך לטובה`
      : `קורא את ${data.team} נכון`;
  return (
    <Card title={`אתה ו${data.team}`} icon="⭐">
      <Headline>{headline}</Headline>
      <Versus
        mine={{ ...MINE, label: 'ניחשת ניצחון', value: `${data.predictedWinRate}%` }}
        other={{ label: 'ניצחה בפועל', value: `${data.actualWinRate}%` }}
      />
      <Note>
        {data.games} משחקים · {data.accuracy}% פגיעה · {data.avgPoints} נק׳ למשחק. הקבוצה לפי ערכת הנושא שלך.
      </Note>
    </Card>
  );
}
