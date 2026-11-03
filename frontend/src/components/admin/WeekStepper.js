import React from 'react';
import { StatusItem, whenText } from './StatusItem';

// פס השלבים של שבוע: משחקים ← הפעלה ← תוצאות ← סגירה.
//
// במקום לגלול במסך ארוך ולנחש מה חסר, רואים באיזה שלב השבוע נמצא, מה
// נשאר בכל שלב, ולחיצה על שלב מביאה אליו. המצב מגיע מהשרת - אותו חישוב
// שמזין את מסך "היום" (services/adminToday).

const STEPS = [
  { key: 'matches', label: 'משחקים', icon: '⚽' },
  { key: 'activate', label: 'הפעלה', icon: '▶️' },
  { key: 'results', label: 'תוצאות', icon: '🏁' },
  { key: 'close', label: 'סגירה', icon: '🧮' }
];

// לכל שלב: האם הושלם, האם דורש תשומת לב, ושורת מצב קצרה
const describe = (status, now) => {
  const c = status.counts;
  const settled = c.withResult + c.postponed;
  return {
    matches: { done: c.matches > 0, sub: c.matches ? `${c.matches} משחקים` : 'אין עדיין' },
    activate: {
      done: status.active || status.locked,
      attention: status.items.some((i) => i.key === 'no_lock_time' || i.key === 'lock_after_kickoff'),
      sub: status.locked ? 'ננעל' : status.active ? (status.lockTime ? `ננעל ${whenText(status.lockTime, now).split(' (')[0]}` : 'פעיל, בלי נעילה') : 'לא הופעל'
    },
    results: {
      done: status.locked && c.matches > 0 && settled >= c.matches,
      attention: status.items.some((i) => i.key === 'missing_results'),
      sub: status.locked ? `${c.withResult}/${c.matches}${c.liveNow ? ` · ${c.liveNow} חי` : ''}` : 'אחרי הנעילה'
    },
    close: {
      done: status.stage === 'done',
      attention: c.scoreErrors > 0,
      sub: status.stage === 'done' ? 'ניקוד תקין' : c.scoreErrors ? `${c.scoreErrors} פערים` : 'בסוף השבוע'
    }
  };
};

function WeekStepper({ status, onStep, onAction, busyKey, now = Date.now() }) {
  if (!status) return null;
  const d = describe(status, now);
  const current = STEPS.find((s) => !d[s.key].done)?.key || null;
  // מה שדורש פעולה מוצג מתחת לפס; פריטי מידע וירוקים - לא, הם כבר בשלבים
  const actionable = status.items.filter((i) => i.level === 'todo' || i.level === 'warn');

  return (
    <div id="week-stepper" className="card" style={{ scrollMarginTop: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <strong style={{ flex: 1, fontSize: 'var(--fs-sm)' }}>{status.name}</strong>
        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #777)' }}>{status.stageLabel}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px' }}>
        {STEPS.map((s, i) => {
          const st = d[s.key];
          const isCurrent = s.key === current;
          const color = st.attention ? 'var(--warn-fg, #a15c00)' : st.done ? 'var(--good-fg, #1a6b35)' : isCurrent ? 'var(--theme-primary-text, #007bff)' : 'var(--text-4, #aaa)';
          return (
            <button key={s.key} type="button" onClick={() => onStep(s.key)} style={{
              position: 'relative', padding: '8px 2px 6px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center',
              border: `1.5px solid ${isCurrent ? 'var(--theme-primary, #007bff)' : 'transparent'}`,
              background: st.attention ? 'var(--warn-bg, #fff6e0)' : st.done ? 'var(--good-bg, #eef9f1)' : 'var(--surface-2, #f6f7f9)'
            }}>
              <div style={{ fontSize: 'var(--fs-md)', lineHeight: 1 }}>{st.attention ? '⚠️' : st.done ? '✅' : s.icon}</div>
              <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 700, color, marginTop: '3px' }}>{i + 1}. {s.label}</div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #777)', marginTop: '1px', lineHeight: 1.25 }}>{st.sub}</div>
            </button>
          );
        })}
      </div>

      {actionable.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          {actionable.map((it) => (
            <StatusItem key={it.key} item={it} now={now} onAction={onAction}
              busy={!!it.action && busyKey === `${it.action.type}:${it.action.weekId || ''}`} />
          ))}
        </div>
      )}
    </div>
  );
}

export default WeekStepper;
