import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from '../../services/toast';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

// "3 דק׳" - מה שחשוב כאן הוא כמה זמן עבר (או נשאר), לא השעה המדויקת
const span = (ms) => {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 60) return `${sec} שנ׳`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} דק׳`;
  const hr = Math.round(min / 60);
  if (hr < 48) return `${hr} שע׳`;
  return `${Math.round(hr / 24)} ימים`;
};
const ago = (at, now = Date.now()) => (at ? `לפני ${span(now - new Date(at).getTime())}` : null);
const until = (at, now = Date.now()) => `בעוד ${span(new Date(at).getTime() - now)}`;

const clock = (at) => new Date(at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

const LEVELS = [
  { key: 'info', label: 'הכל' },
  { key: 'warn', label: 'אזהרות ושגיאות' },
  { key: 'error', label: 'שגיאות' }
];

const LEVEL_STYLE = {
  error: { fg: 'var(--bad-fg, #b3261e)', bg: 'var(--bad-bg, #fdecec)', label: 'שגיאה' },
  warn: { fg: 'var(--warn-fg, #7c5306)', bg: 'var(--warn-bg, #fff4d6)', label: 'אזהרה' },
  info: { fg: 'var(--text-3, #888)', bg: 'transparent', label: '' }
};

const cardStyle = {
  background: 'var(--surface, #fff)', borderRadius: '14px', padding: '0.85rem',
  marginBottom: '0.75rem', border: '1px solid var(--border, rgba(0,0,0,0.06))'
};

const chip = (active) => ({
  padding: '5px 10px', borderRadius: '999px', fontSize: '12px', cursor: 'pointer',
  border: `1px solid ${active ? 'var(--theme-primary, #007bff)' : 'var(--border-2, #e3e6ea)'}`,
  background: active ? 'var(--theme-primary, #007bff)' : 'var(--surface, #fff)',
  color: active ? '#fff' : 'var(--text-2, #555)', fontWeight: active ? 700 : 500
});

// טקסט טכני (שגיאות, נתיבים) נשאר משמאל לימין כדי שלא יתבלגן בתוך RTL
const mono = {
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  fontSize: '11px', direction: 'ltr', textAlign: 'left',
  whiteSpace: 'pre-wrap', wordBreak: 'break-word'
};

function ProviderCard({ p, now }) {
  const [showRecent, setShowRecent] = useState(false);
  const failing = p.consecutiveFailures > 0;
  const status = failing
    ? { text: `❌ נכשל ${p.consecutiveFailures} פעמים ברצף`, fg: 'var(--bad-fg, #b3261e)', bg: 'var(--bad-bg, #fdecec)' }
    : { text: '✅ תקין', fg: 'var(--good-fg, #1a6b35)', bg: 'var(--good-bg, #e8f6ec)' };

  return (
    <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'var(--surface-2, #f8f9fc)', marginBottom: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
        <strong style={{ fontSize: '13px', flex: 1 }}>{p.source}</strong>
        <span style={{ fontSize: '12px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', color: status.fg, background: status.bg }}>
          {status.text}
        </span>
      </div>

      <div style={{ fontSize: '12px', color: 'var(--text-3, #777)', marginTop: '4px' }}>
        הצלחה אחרונה: {p.lastOkAt ? ago(p.lastOkAt, now) : 'עוד לא הייתה מאז הפעלת השרת'}
        {' · '}{p.okCount} הצליחו, {p.failCount} נכשלו
      </div>

      {p.lastError && (
        <div style={{ marginTop: '6px', padding: '6px 8px', borderRadius: '8px', background: 'var(--bad-bg, #fdecec)' }}>
          <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bad-fg, #b3261e)' }}>
            שגיאה אחרונה ({ago(p.lastError.at, now)}){p.lastError.status ? ` · סטטוס ${p.lastError.status}` : ''}
          </div>
          <div style={{ ...mono, color: 'var(--text-2, #555)', marginTop: '2px' }}>{p.lastError.message}</div>
          {p.lastError.path && <div style={{ ...mono, color: 'var(--text-4, #999)', marginTop: '2px' }}>{p.lastError.path}</div>}
        </div>
      )}

      {p.recent.length > 0 && (
        <button type="button" onClick={() => setShowRecent((v) => !v)} style={{
          marginTop: '6px', background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          fontSize: '12px', color: 'var(--theme-primary, #007bff)'
        }}>
          {showRecent ? '▲ הסתר קריאות אחרונות' : `▼ ${p.recent.length} קריאות אחרונות`}
        </button>
      )}
      {showRecent && (
        <div style={{ marginTop: '4px' }}>
          {p.recent.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'baseline', padding: '2px 0', borderTop: i ? '1px solid var(--border, #eee)' : 'none' }}>
              <span style={{ fontSize: '11px' }}>{r.ok ? '✅' : '❌'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-4, #999)', whiteSpace: 'nowrap' }}>{clock(r.at)}</span>
              <span style={{ ...mono, flex: 1, color: 'var(--text-2, #555)' }}>
                {r.status ?? '—'} · {r.ms != null ? `${r.ms}ms` : ''} · {r.path}{r.message ? `\n${r.message}` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ServerLogs() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [level, setLevel] = useState('info');
  const [query, setQuery] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState(null);
  const [now, setNow] = useState(Date.now());
  const queryRef = useRef(query);
  queryRef.current = query;

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams({ level, q: queryRef.current, limit: '400' });
      const res = await fetch(`${API_URL}/logs?${params}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `שגיאה ${res.status}`);
      setData(body);
      setError(null);
      setNow(Date.now());
    } catch (err) {
      setError(err.message);
    }
  }, [level]);

  useEffect(() => { load(); }, [load]);

  // החיפוש נשלח אחרי הפסקה קצרה בהקלדה, לא בכל אות
  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [query, load]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [autoRefresh, load]);

  const runProbe = async () => {
    setProbing(true);
    try {
      const res = await fetch(`${API_URL}/logs/probe-365`, { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `שגיאה ${res.status}`);
      setProbe({ ...body, at: Date.now() });
      await load();
    } catch (err) {
      toast.error('הבדיקה נכשלה: ' + err.message);
    } finally {
      setProbing(false);
    }
  };

  const backoff = data?.liveBackoff;
  const providers = data?.providers || [];

  return (
    <div>
      <h2>לוגים</h2>

      {/* === חיבור ל-365 === */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, flex: 1 }}>חיבור ל-365</h3>
          <button type="button" className="btn btn-primary" onClick={runProbe} disabled={probing} style={{ fontSize: '13px' }}>
            {probing ? 'בודק…' : '🩺 בדוק עכשיו'}
          </button>
        </div>

        {probe && (
          <div style={{
            padding: '6px 8px', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '12px',
            background: probe.ok ? 'var(--good-bg, #e8f6ec)' : 'var(--bad-bg, #fdecec)',
            color: probe.ok ? 'var(--good-fg, #1a6b35)' : 'var(--bad-fg, #b3261e)'
          }}>
            <strong>{probe.ok ? `✅ 365 עונה (${probe.games} משחקים היום, ${probe.ms}ms)` : `❌ 365 לא עונה (${probe.ms}ms)`}</strong>
            {!probe.ok && <div style={{ ...mono, marginTop: '2px' }}>{probe.message}</div>}
          </div>
        )}

        {backoff?.until && (
          <div style={{ padding: '6px 8px', borderRadius: '8px', marginBottom: '0.5rem', fontSize: '12px', background: 'var(--warn-bg, #fff4d6)', color: 'var(--warn-fg, #7c5306)' }}>
            ⏸️ התוצאות החיות בהפסקה אחרי {backoff.consecutiveFailures} כישלונות ברצף - הניסיון הבא {until(backoff.until, now)}
          </div>
        )}

        {providers.length === 0 ? (
          <p style={{ fontSize: '12px', color: 'var(--text-4, #999)', margin: 0 }}>
            עוד לא הייתה פנייה ל-365 מאז הפעלת השרת. "בדוק עכשיו" שולח אחת.
          </p>
        ) : (
          providers.map((p) => <ProviderCard key={p.source} p={p} now={now} />)
        )}
      </div>

      {/* === השורות עצמן === */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          {LEVELS.map((l) => (
            <button key={l.key} type="button" style={chip(level === l.key)} onClick={() => setLevel(l.key)}>{l.label}</button>
          ))}
          <button type="button" style={chip(query === '365')} onClick={() => setQuery(query === '365' ? '' : '365')}>365</button>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '0.5rem' }}>
          <input
            className="input"
            placeholder="חיפוש בלוג…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, margin: 0 }}
          />
          <button type="button" className="btn btn-secondary" onClick={load} title="רענן" style={{ margin: 0 }}>🔄</button>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-3, #777)', marginBottom: '0.5rem' }}>
          <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
          רענון אוטומטי כל 10 שניות
        </label>

        {error && (
          <div style={{ padding: '6px 8px', borderRadius: '8px', background: 'var(--bad-bg, #fdecec)', color: 'var(--bad-fg, #b3261e)', fontSize: '12px', marginBottom: '0.5rem' }}>
            לא הצלחתי לטעון את הלוגים: {error}
          </div>
        )}

        {data && (
          <div style={{ fontSize: '11px', color: 'var(--text-4, #999)', marginBottom: '0.4rem' }}>
            השרת עלה {ago(data.startedAt, now)} · הלוג מתאפס בכל עלייה מחדש (דיפלוי, קריסה)
            {' · '}מוצגות {data.entries.length} שורות
          </div>
        )}

        <div style={{ maxHeight: '60vh', overflowY: 'auto', borderRadius: '8px', border: '1px solid var(--border, #eee)' }}>
          {data && data.entries.length === 0 && (
            <div style={{ padding: '0.8rem', textAlign: 'center', fontSize: '12px', color: 'var(--text-4, #999)' }}>אין שורות שמתאימות לסינון</div>
          )}
          {data && data.entries.map((e) => {
            const st = LEVEL_STYLE[e.level] || LEVEL_STYLE.info;
            return (
              <div key={e.id} style={{ padding: '5px 8px', borderBottom: '1px solid var(--border, #f0f0f0)', background: st.bg }}>
                <div style={{ display: 'flex', gap: '6px', fontSize: '11px', color: 'var(--text-4, #999)' }}>
                  <span>{clock(e.at)}</span>
                  {st.label && <span style={{ color: st.fg, fontWeight: 700 }}>{st.label}</span>}
                </div>
                {/* שורות לוג מערבבות עברית ואנגלית - כל שורה בוחרת כיוון לפי התו הראשון */}
                <div dir="auto" style={{ ...mono, direction: undefined, textAlign: 'start', unicodeBidi: 'plaintext', color: e.level === 'info' ? 'var(--text-2, #444)' : st.fg }}>
                  {e.message}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ServerLogs;
