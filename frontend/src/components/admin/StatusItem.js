import React, { useState } from 'react';

// שורת משימה אחת - במסך "היום" ובפס השלבים של השבוע. במקום אחד, כדי
// שאותה משימה תיראה ותתנהג אותו דבר בשני המקומות.

const LEVEL = {
  todo: { icon: '📌', fg: 'var(--text, #222)', bg: 'var(--surface, #fff)', border: 'var(--theme-primary, #007bff)' },
  warn: { icon: '⚠️', fg: 'var(--warn-fg, #7c5306)', bg: 'var(--warn-bg, #fff8e6)', border: 'transparent' },
  info: { icon: 'ℹ️', fg: 'var(--text-2, #555)', bg: 'var(--surface-2, #f7f8fa)', border: 'transparent' },
  ok: { icon: '✅', fg: 'var(--good-fg, #1a6b35)', bg: 'var(--good-bg, #eef9f1)', border: 'transparent' }
};

const span = (ms) => {
  const min = Math.round(Math.abs(ms) / 60000);
  if (min < 60) return `${min} דק׳`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}:${String(min % 60).padStart(2, '0')} שע׳`;
  return `${Math.round(h / 24)} ימים`;
};
export const whenText = (at, now) => {
  const d = new Date(at);
  const day = d.toLocaleDateString('he-IL', { weekday: 'short', timeZone: 'Asia/Jerusalem' });
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jerusalem' });
  const diff = d.getTime() - now;
  return `${day} ${time} (${diff >= 0 ? 'בעוד' : 'לפני'} ${span(diff)})`;
};

const ACTION_LABEL = {
  matches: '➕ הוסף משחקים',
  activate: '▶️ להפעלה',
  results: '🏁 לתוצאות',
  close: '🧮 לסגירה',
  nudge: (a) => `📣 שלח תזכורת${a.count ? ` (${a.count})` : ''}`,
  sync: '🔄 משוך תוצאות',
  recalc: '🧮 חשב מחדש',
  create: '➕ צור שבוע',
  logs: '📜 ללוגים'
};
export const actionLabel = (a) => {
  const l = a.type === 'goto' ? ACTION_LABEL[a.step] : ACTION_LABEL[a.type];
  return typeof l === 'function' ? l(a) : l;
};

export function StatusItem({ item, now, onAction, busy }) {
  const [showNames, setShowNames] = useState(false);
  const st = LEVEL[item.level] || LEVEL.info;
  const a = item.action;
  return (
    <div style={{
      display: 'flex', gap: '8px', alignItems: 'flex-start', padding: '8px 10px', borderRadius: '10px',
      background: st.bg, borderInlineStart: `3px solid ${st.border}`, marginBottom: '6px'
    }}>
      <span style={{ fontSize: 'var(--fs-sm)', lineHeight: '20px' }}>{st.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: item.level === 'todo' ? 700 : 600, color: st.fg }}>
          {item.text}
          {item.at && <span style={{ fontWeight: 500, color: 'var(--text-3, #777)' }}> · {item.atLabel || 'ננעל'} {whenText(item.at, now)}</span>}
        </div>
        {item.detail && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #777)', marginTop: '2px' }}>{item.detail}</div>}
        {item.names?.length > 0 && (
          <>
            {/* מקום לחיצה של 28px לפחות - קודם זה היה 17×12, קטן מהמינימום (24) */}
            <button type="button" onClick={() => setShowNames((v) => !v)} style={{
              background: 'none', border: 'none', padding: '6px 10px', margin: '0 -10px -6px', minHeight: '28px', cursor: 'pointer',
              fontSize: 'var(--fs-xs)', fontWeight: 600, color: 'var(--theme-primary-text, #007bff)'
            }}>
              {showNames ? 'הסתר' : 'מי?'}
            </button>
            {showNames && <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-2, #555)', marginTop: '2px' }}>{item.names.join(' · ')}</div>}
          </>
        )}
      </div>
      {a && (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => onAction(a)}
          style={{ margin: 0, padding: '5px 10px', fontSize: 'var(--fs-xs)', whiteSpace: 'nowrap', flexShrink: 0 }}>
          {busy ? '⏳' : actionLabel(a)}
        </button>
      )}
    </div>
  );
}
