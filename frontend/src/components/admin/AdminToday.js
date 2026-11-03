import React, { useCallback, useEffect, useState } from 'react';
import { StatusItem as Item } from './StatusItem';
import { useNavigate } from 'react-router-dom';
import { toast } from '../../services/toast';
import { fetchToday, syncResults, recalcSilently, nudgePending } from '../../services/weekActions';

// "היום": מה צריך לעשות עכשיו. כל פריט עם הכפתור שפותר אותו.
//
// הנתונים מחושבים בשרת (services/adminToday) - כאן רק הצגה ופעולות.

const STAGE_STYLE = {
  draft: { bg: 'var(--surface-3, #eef1f5)', fg: 'var(--text-3, #666)' },
  open: { bg: 'var(--info-bg, #e8f0fe)', fg: 'var(--info-fg, #1e40af)' },
  running: { bg: 'var(--warn-bg, #fff4d6)', fg: 'var(--warn-fg, #7c5306)' },
  done: { bg: 'var(--good-bg, #e8f6ec)', fg: 'var(--good-fg, #1a6b35)' }
};

function AdminToday() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);
  const [now, setNow] = useState(Date.now());

  const load = useCallback(async () => {
    try {
      setData(await fetchToday());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setNow(Date.now());
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const run = async (key, fn, done) => {
    setBusy(key);
    try {
      const result = await fn();
      if (done) toast.success(done(result));
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  const onAction = (a) => {
    const key = `${a.type}:${a.weekId || ''}`;
    if (a.type === 'goto') return navigate(`/admin/week?week=${a.weekId}&step=${a.step}`);
    if (a.type === 'create') return navigate('/admin/week?create=1');
    if (a.type === 'logs') return navigate('/admin/system/logs');
    if (a.type === 'nudge') {
      if (!window.confirm(`לשלוח תזכורת ל-${a.count} שחקנים שעוד לא סיימו להמר?`)) return undefined;
      return run(key, () => nudgePending(a.weekId), (r) => `נשלח ל-${r.users ?? r.sent ?? 0} שחקנים`);
    }
    if (a.type === 'sync') {
      return run(key, () => syncResults(a.weekId), (r) => (r.updated > 0 ? `עודכנו ${r.updated} תוצאות והניקוד חושב${r.flipped?.length ? ` · ${r.flipped.length} בסדר הפוך תוקנו` : ''}` : `אין תוצאות חדשות (${r.notFinished || 0} עוד לא הסתיימו)`));
    }
    if (a.type === 'recalc') {
      if (!window.confirm('לחשב מחדש את הניקוד של השבוע לפי התוצאות השמורות? לא נשלחות התראות.')) return undefined;
      return run(key, () => recalcSilently(a.weekId), () => 'הניקוד חושב מחדש');
    }
    return undefined;
  };

  const busyKey = (a) => a && busy === `${a.type}:${a.weekId || ''}`;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
        <h2 style={{ margin: 0, flex: 1 }}>היום</h2>
        {data && <span style={{ fontSize: '11px', color: 'var(--text-4, #999)' }}>עודכן {new Date(data.generatedAt).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}</span>}
        <button type="button" className="btn btn-secondary" onClick={load} title="רענן" style={{ margin: 0, padding: '4px 10px' }}>🔄</button>
      </div>

      {error && (
        <div className="card" style={{ color: 'var(--bad-fg, #b3261e)', fontSize: '13px' }}>לא הצלחתי לטעון: {error}</div>
      )}

      {!data && !error && <div className="card" style={{ fontSize: '13px', color: 'var(--text-3, #777)' }}>טוען…</div>}

      {data && (
        <>
          <div style={{
            padding: '10px 12px', borderRadius: '12px', marginBottom: '0.75rem', fontWeight: 700, fontSize: '14px',
            background: data.todo ? 'var(--info-bg, #e8f0fe)' : 'var(--good-bg, #e8f6ec)',
            color: data.todo ? 'var(--info-fg, #1e40af)' : 'var(--good-fg, #1a6b35)'
          }}>
            {data.todo ? `📋 ${data.todo} ${data.todo === 1 ? 'משימה פתוחה' : 'משימות פתוחות'}` : '✅ אין משימות פתוחות'}
          </div>

          {data.global.length > 0 && (
            <div className="card" style={{ marginBottom: '0.75rem' }}>
              {data.global.map((it) => <Item key={it.key} item={it} now={now} onAction={onAction} busy={busyKey(it.action)} />)}
            </div>
          )}

          {data.weeks.map((w) => {
            const st = STAGE_STYLE[w.stage];
            return (
              <div key={w.weekId} className="card" style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <button type="button" onClick={() => navigate(`/admin/week?week=${w.weekId}`)} style={{
                    flex: 1, minWidth: 0, background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'start',
                    fontSize: '15px', fontWeight: 800, color: 'var(--text, #222)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                  }}>
                    {w.name}
                  </button>
                  <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '999px', background: st.bg, color: st.fg, whiteSpace: 'nowrap' }}>
                    {w.stageLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--text-3, #777)', marginBottom: '8px' }}>
                  <span>⚽ {w.counts.matches} משחקים</span>
                  {w.stage !== 'draft' && w.counts.players > 0 && <span>✍️ {w.counts.betComplete}/{w.counts.players} הימרו</span>}
                  {(w.stage === 'running' || w.stage === 'done') && <span>🏁 {w.counts.withResult}/{w.counts.matches} תוצאות</span>}
                </div>
                {w.items.map((it) => <Item key={it.key} item={it} now={now} onAction={onAction} busy={busyKey(it.action)} />)}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

export default AdminToday;
