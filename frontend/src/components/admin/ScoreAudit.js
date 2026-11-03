import React, { useEffect, useMemo, useState } from 'react';
import { toast } from '../../services/toast';

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

const MONTHS = ['', 'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];

const SEVERITY = {
  error: { title: 'שגיאות', icon: '❌', fg: 'var(--bad-fg, #b3261e)', bg: 'var(--bad-bg, #fdecec)' },
  warn: { title: 'אזהרות', icon: '⚠️', fg: 'var(--warn-fg, #7c5306)', bg: 'var(--warn-bg, #fff4d6)' },
  info: { title: 'לידיעה', icon: 'ℹ️', fg: 'var(--text-3, #666)', bg: 'var(--surface-2, #f6f7f9)' }
};

const cardStyle = {
  background: 'var(--surface, #fff)', borderRadius: '14px', padding: '0.85rem',
  marginBottom: '0.75rem', border: '1px solid var(--border, rgba(0,0,0,0.06))'
};

const isLocked = (w) => w.locked || (w.lockTime && new Date() >= new Date(w.lockTime));

// בדיקת הניקוד של חודש: השרת מחשב מחדש כל הימור ומשווה למה שנשמר.
// הבדיקה עצמה קריאה בלבד. שבוע שנמצאו בו פערים אפשר לחשב מחדש מכאן -
// אותו חישוב שרץ כששומרים תוצאה, אבל בלי לסמן משחקים, ולכן בלי התראות
function ScoreAudit() {
  const [weeks, setWeeks] = useState([]);
  const [period, setPeriod] = useState('');
  const [report, setReport] = useState(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch(`${API_URL}/weeks`).then((r) => r.json()).then((data) => {
      setWeeks(Array.isArray(data) ? data : []);
    }).catch(() => setWeeks([]));
  }, []);

  // החודשים שיש בהם שבועות, מהחדש לישן
  const periods = useMemo(() => {
    const seen = new Map();
    for (const w of weeks) {
      const key = `${w.season}|${w.month}`;
      const at = new Date(w.createdAt || 0).getTime();
      const cur = seen.get(key);
      if (!cur || at > cur.at) seen.set(key, { key, season: w.season, month: w.month, at, locked: (cur?.locked || false) || isLocked(w) });
      else if (isLocked(w)) cur.locked = true;
    }
    return [...seen.values()].sort((a, b) => b.at - a.at);
  }, [weeks]);

  // ברירת המחדל: החודש האחרון שיש בו שבוע נעול - בתחילת חודש זה החודש שנגמר
  useEffect(() => {
    if (period || periods.length === 0) return;
    setPeriod((periods.find((p) => p.locked) || periods[0]).key);
  }, [periods, period]);

  const run = async () => {
    const p = periods.find((x) => x.key === period);
    if (!p) return;
    setRunning(true);
    try {
      const res = await fetch(`${API_URL}/scores/audit?month=${p.month}&season=${encodeURIComponent(p.season)}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `שגיאה ${res.status}`);
      setReport(body);
    } catch (err) {
      toast.error('הבדיקה נכשלה: ' + err.message);
    } finally {
      setRunning(false);
    }
  };

  const [recalcing, setRecalcing] = useState(null);

  const recalc = async (w) => {
    if (!window.confirm(`לחשב מחדש את הניקוד של "${w.name}"?\nהחישוב מעדכן את הנקודות לפי התוצאות השמורות, ולא שולח התראות.`)) return;
    setRecalcing(w.weekId);
    try {
      const res = await fetch(`${API_URL}/scores/calculate/${w.weekId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // בלי matchIds: אף משחק לא נחשב "תוצאה חדשה", ולכן אין התראות בול/סוף משחק
        body: JSON.stringify({})
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.message || `שגיאה ${res.status}`);
      toast.success(`הניקוד של "${w.name}" חושב מחדש`);
      await run();
    } catch (err) {
      toast.error('החישוב נכשל: ' + err.message);
    } finally {
      setRecalcing(null);
    }
  };

  const grouped = useMemo(() => {
    const g = { error: [], warn: [], info: [] };
    for (const i of report?.issues || []) (g[i.severity] || g.info).push(i);
    return g;
  }, [report]);

  return (
    <div style={cardStyle}>
      <h3 style={{ marginTop: 0 }}>🧮 בדיקת ניקוד</h3>
      <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #777)', margin: '0 0 0.6rem' }}>
        כל הימור בחודש מחושב מחדש ומושווה לניקוד השמור, יחד עם ניקוד השבוע שהטבלה מציגה. לא משנה כלום.
      </p>

      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select className="input" value={period} onChange={(e) => { setPeriod(e.target.value); setReport(null); }} style={{ flex: 1, minWidth: '150px', margin: 0 }}>
          {periods.map((p) => (
            <option key={p.key} value={p.key}>{MONTHS[p.month]} {p.season}</option>
          ))}
        </select>
        <button type="button" className="btn btn-primary" onClick={run} disabled={running || !period} style={{ margin: 0 }}>
          {running ? 'בודק…' : 'בדוק'}
        </button>
      </div>

      {report && (
        <div style={{ marginTop: '0.75rem' }}>
          {/* שורת סיכום */}
          <div style={{
            padding: '8px 10px', borderRadius: '10px', fontSize: 'var(--fs-sm)', fontWeight: 700,
            background: report.summary.errors ? SEVERITY.error.bg : 'var(--good-bg, #e8f6ec)',
            color: report.summary.errors ? SEVERITY.error.fg : 'var(--good-fg, #1a6b35)'
          }}>
            {report.summary.errors === 0
              ? `✅ הניקוד תקין - ${report.summary.betsChecked} הימורים ב-${report.summary.weeks} שבועות נבדקו`
              : `❌ נמצאו ${report.summary.errors} שגיאות ב-${report.summary.betsChecked} הימורים`}
            <div style={{ fontSize: 'var(--fs-xs)', fontWeight: 500, marginTop: '2px' }}>
              {report.summary.matchesWithResult}/{report.summary.matches} משחקים עם תוצאה
              {report.summary.warnings ? ` · ${report.summary.warnings} אזהרות` : ''}
              {report.summary.notes ? ` · ${report.summary.notes} לידיעה` : ''}
            </div>
          </div>

          {/* שבועות */}
          <div style={{ marginTop: '0.6rem' }}>
            {report.weeks.map((w) => (
              <div key={w.weekId} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 2px', borderBottom: '1px solid var(--border, #f0f0f0)', fontSize: 'var(--fs-xs)' }}>
                <span>{w.needsRecalc ? '⚠️' : '✅'}</span>
                <span style={{ flex: 1, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{w.name}</span>
                <span style={{ color: 'var(--text-4, #999)' }}>{w.withResult}/{w.matches} תוצאות · {w.bets} הימורים</span>
                {w.needsRecalc && (
                  <button type="button" className="btn btn-secondary" onClick={() => recalc(w)} disabled={!!recalcing}
                    style={{ margin: 0, padding: '3px 8px', fontSize: 'var(--fs-xs)' }}>
                    {recalcing === w.weekId ? 'מחשב…' : 'חשב מחדש'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ממצאים */}
          {['error', 'warn', 'info'].map((sev) => grouped[sev].length > 0 && (
            <div key={sev} style={{ marginTop: '0.7rem' }}>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, color: SEVERITY[sev].fg, marginBottom: '4px' }}>
                {SEVERITY[sev].icon} {SEVERITY[sev].title} ({grouped[sev].length})
              </div>
              {grouped[sev].map((i, n) => (
                <div key={n} style={{ padding: '6px 8px', borderRadius: '8px', background: SEVERITY[sev].bg, marginBottom: '4px', fontSize: 'var(--fs-xs)' }}>
                  <div style={{ color: 'var(--text-3, #777)', fontSize: 'var(--fs-xs)' }}>
                    {[i.weekName, i.match, i.user].filter(Boolean).join(' · ')}
                  </div>
                  <div style={{ color: 'var(--text-2, #444)' }}>{i.message}</div>
                </div>
              ))}
            </div>
          ))}

          {/* שחקנים */}
          {report.players.length > 0 && (
            <div style={{ marginTop: '0.8rem' }}>
              <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 700, marginBottom: '4px' }}>ניקוד החודש לפי שחקן</div>
              <div style={{ display: 'flex', fontSize: 'var(--fs-xs)', color: 'var(--text-4, #999)', padding: '0 2px 3px', gap: '6px' }}>
                <span style={{ flex: 1 }}>שחקן</span>
                <span style={{ width: '64px', textAlign: 'center' }}>בול / כיוון</span>
                <span style={{ width: '58px', textAlign: 'left' }}>נקודות</span>
              </div>
              {report.players.map((p) => {
                const off = Math.abs(p.expectedPoints - p.storedPoints) > 0.05;
                return (
                  <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 2px', borderTop: '1px solid var(--border, #f0f0f0)', fontSize: 'var(--fs-xs)', opacity: p.admin ? 0.6 : 1 }}>
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.name}
                      {p.admin && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4, #999)' }}> · אדמין</span>}
                      {p.excluded && <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-4, #999)' }}> · מוחרג</span>}
                    </span>
                    <span style={{ width: '64px', textAlign: 'center', color: 'var(--text-3, #777)' }}>{p.exact} / {p.direction}</span>
                    <span style={{ width: '58px', textAlign: 'left', fontWeight: 700, color: off ? SEVERITY.error.fg : 'var(--text, #333)' }}
                      title={off ? `בטבלה: ${p.storedPoints}` : undefined}>
                      {p.expectedPoints}
                      {off && <span style={{ display: 'block', fontSize: 'var(--fs-xs)', fontWeight: 500, textDecoration: 'line-through' }}>{p.storedPoints}</span>}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ScoreAudit;
