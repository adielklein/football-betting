import React, { useState, useEffect } from 'react';
import { toast } from '../../services/toast';
import LeagueLogo from '../LeagueLogo';
import { api } from '../../services/api';

// הספק שבו הליגה תשתמש בפועל, באותו סדר עדיפויות של pickProvider בשרת.
// 365 הוא היחיד שמזין יחסים, תובנות וטבלה חיה, ולכן ההבדל בין "365" לבין
// כל השאר הוא הבדל בתכונות ולא רק במקור הנתונים
const activeProvider = (league) => {
  if (league.scores365CompetitionId) return { label: '365scores', good: true };
  if (league.footballDataCode) return { label: 'football-data', good: false };
  if (league.espnLeagueCode) return { label: 'ESPN', good: false };
  if (league.sportsDbLeagueId) return { label: 'TheSportsDB', good: false };
  if (league.sofaScoreTournamentId) return { label: 'SofaScore', good: false };
  return { label: 'ללא ספק', good: false };
};

const searchLabelStyle = {
  fontSize: '11px', color: 'var(--text-3, #888)', display: 'block', marginBottom: '3px', fontWeight: '600'
};

const searchInputStyle = {
  borderRadius: '10px', fontSize: '13px', padding: '0.45rem 0.6rem'
};

// חיפוש תחרות ב-365 לפי שם. 365 הוא הספק המועדף כאן - הוא מחזיר עברית, ורק
// הוא מזין יחסי ווינר, תובנות וטבלה חיה - ולכן שווה למצוא את המזהה הנכון
// במקום לנחש מספר, שלא נכשל אלא מצביע בשקט על תחרות אחרת.
function Competition365Search({ onPick }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    if (!query.trim()) {
      toast.warning('הקלד שם תחרות או מדינה');
      return;
    }
    setSearching(true);
    try {
      const data = await api.search365Competitions(query.trim());
      setResults(data);
      if (data.competitions.length === 0) {
        toast.warning(data.source ? 'לא נמצאו תחרויות תואמות' : 'לא התקבלה רשימת תחרויות מ-365');
      }
    } catch (error) {
      toast.error('שגיאה בחיפוש: ' + error.message);
      setResults(null);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div style={{
      background: 'var(--surface-2, #fafafa)', border: '1px solid var(--border, #f0f0f0)',
      borderRadius: '10px', padding: '0.6rem', marginBottom: '0.5rem'
    }}>
      <label style={searchLabelStyle}>🔎 חיפוש תחרות ב-365scores (לפי שם או מדינה)</label>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <input
          type="text"
          placeholder="גביע הליגה / אנגליה"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') search(); }}
          className="input" style={{ ...searchInputStyle, flex: 1 }}
        />
        <button
          onClick={search}
          disabled={searching}
          style={{
            padding: '0.45rem 0.8rem',
            background: searching ? '#9e9e9e' : 'linear-gradient(135deg, #007bff, #00a2ff)',
            color: 'white', border: 'none', borderRadius: '10px',
            fontSize: '13px', fontWeight: '700', cursor: searching ? 'default' : 'pointer',
            whiteSpace: 'nowrap'
          }}
        >
          {searching ? '⏳' : 'חפש'}
        </button>
      </div>

      {results && results.competitions.length > 0 && (
        <div style={{ marginTop: '0.5rem', maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {results.competitions.map((c) => (
            <div key={c.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              gap: '0.5rem', padding: '0.35rem 0.5rem',
              background: 'var(--surface, #fff)', border: '1px solid var(--border, #f0f0f0)',
              borderRadius: '8px', fontSize: '12px'
            }}>
              <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.name}
                {c.country && <span style={{ color: 'var(--text-4, #999)' }}> · {c.country}</span>}
                <span style={{ fontFamily: 'monospace', color: 'var(--text-4, #aaa)' }}> · {c.id}</span>
              </span>
              <button
                onClick={() => onPick(c)}
                style={{
                  padding: '0.2rem 0.55rem', background: 'var(--surface-3, #eef3f8)',
                  border: 'none', borderRadius: '6px', fontSize: '11px',
                  fontWeight: '700', cursor: 'pointer', flexShrink: 0
                }}
              >
                השתמש
              </button>
            </div>
          ))}
        </div>
      )}

      {results && !results.source && (
        <div style={{
          marginTop: '0.5rem', fontSize: '11px', color: 'var(--warn-fg, #9a7b3f)',
          background: 'var(--warn-bg, #fffaf0)', border: '1px solid #f5e3c0',
          borderRadius: '8px', padding: '0.4rem 0.55rem'
        }}>
          ⚠️ 365 לא החזירו רשימת תחרויות. פירוט הניסיונות:
          <pre style={{ margin: '0.3rem 0 0', whiteSpace: 'pre-wrap', fontSize: '10px' }}>
            {JSON.stringify(results.diagnostics, null, 1)}
          </pre>
        </div>
      )}
    </div>
  );
}

function LeaguesManagement() {
  const [leagues, setLeagues] = useState([]);
  const [editingLeague, setEditingLeague] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [newLeague, setNewLeague] = useState({
    name: '', key: '', color: '#6c757d', type: 'club', region: '', active: true, order: 0, apiFootballId: '',
    footballDataCode: '', espnLeagueCode: '', sofaScoreTournamentId: '', scores365CompetitionId: '', scores365Name: ''
  });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  // בדיקה מול 365: לא מה ששמרנו, אלא מה שהמשחקים עצמם אומרים
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState(null);
  const [health, setHealth] = useState(null);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => { loadLeagues(); }, []);

  const loadLeagues = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/leagues`);
      const data = await response.json();
      setLeagues(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading leagues:', error);
      setLeagues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLeague = async () => {
    if (!newLeague.name || !newLeague.key) {
      toast.warning('שם ומפתח ליגה נדרשים');
      return;
    }
    try {
      const payload = {
        ...newLeague,
        apiFootballId: newLeague.apiFootballId ? parseInt(newLeague.apiFootballId, 10) : null
      };
      const response = await fetch(`${API_URL}/leagues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setNewLeague({
          name: '', key: '', color: '#6c757d', type: 'club', region: '', active: true, order: 0, apiFootballId: '',
          footballDataCode: '', espnLeagueCode: '', sofaScoreTournamentId: '', scores365CompetitionId: '', scores365Name: ''
        });
        await loadLeagues();
        toast.success('ליגה נוצרה בהצלחה!');
      } else {
        const error = await response.json();
        toast.error('שגיאה: ' + error.message);
      }
    } catch (error) {
      toast.error('שגיאה ביצירת הליגה');
    }
  };

  const handleUpdateLeague = async () => {
    if (!editingLeague) return;
    try {
      const payload = {
        ...editForm,
        apiFootballId:
          editForm.apiFootballId === '' || editForm.apiFootballId == null
            ? null
            : parseInt(editForm.apiFootballId, 10)
      };
      const response = await fetch(`${API_URL}/leagues/${editingLeague._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setEditingLeague(null);
        setEditForm({});
        await loadLeagues();
        toast.success('ליגה עודכנה בהצלחה!');
      } else {
        const error = await response.json();
        toast.error('שגיאה: ' + error.message);
      }
    } catch (error) {
      toast.error('שגיאה בעדכון הליגה');
    }
  };

  const handleDeleteLeague = async (leagueId, leagueName) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${leagueName}"?\n\nאם יש משחקים המשתמשים בליגה זו, המחיקה תיכשל.`)) {
      try {
        const response = await fetch(`${API_URL}/leagues/${leagueId}`, { method: 'DELETE' });
        if (response.ok) {
          await loadLeagues();
          toast.success('ליגה נמחקה בהצלחה!');
        } else {
          const error = await response.json();
          toast.error('שגיאה: ' + error.message);
        }
      } catch (error) {
        toast.error('שגיאה במחיקת הליגה');
      }
    }
  };

  const handleInitializeDefaultLeagues = async () => {
    if (window.confirm('האם אתה בטוח? פעולה זו תוסיף 3 ליגות ברירת מחדל.')) {
      try {
        const response = await fetch(`${API_URL}/leagues/initialize`, { method: 'POST' });
        if (response.ok) {
          await loadLeagues();
          toast.success('ליגות ברירת מחדל נוצרו בהצלחה!');
        } else {
          const error = await response.json();
          toast.error('שגיאה: ' + error.message);
        }
      } catch (error) {
        toast.error('שגיאה באתחול ליגות');
      }
    }
  };

  // מוסיף ליגות/גביעים חסרים מהרשימה המובנית בקוד (backend/routes/leagues.js)
  // ומעדכן מזהי ספק לקיימות. בלי הכפתור הזה, כל שינוי ברשימה המובנית
  // (למשל הוספת גביע חדש) נשאר רק בקוד ולא נכנס בפועל למסד הנתונים
  const handleSeedEuropean = async () => {
    setSeeding(true);
    try {
      const response = await fetch(`${API_URL}/leagues/seed-european`, { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        await loadLeagues();
        toast.success(data.message || 'הליגות סונכרנו בהצלחה!');

        // מזהה שאותר אוטומטית - מראים למה הוא התחבר, כדי שיהיה אפשר לוודא
        (data.resolved365 || []).forEach((r) => {
          toast.success(`${r.league} → 365 #${r.id} (${r.matchedName}${r.country ? `, ${r.country}` : ''})`);
        });

        // מזהה שגוי שתוקן - זה השינוי שהכי חשוב לראות, כי הוא מחליף
        // נתונים שכבר היו במערכת
        (data.replaced365 || []).forEach((r) => {
          toast.success(`${r.league}: תוקן מ"${r.from}" ל"${r.matchedName}" (365 #${r.id})`);
        });

        // לא הוכרע לבד - נשאר לאדמין, עם המועמדים שנמצאו
        (data.unresolved365 || []).forEach((u) => {
          const tried = (u.tried || []).slice(0, 3).join(', ');
          const wrong = u.wrong ? `מחובר כרגע ל"${u.wrong}" - ` : '';
          const detail = u.error
            ? u.error
            : u.candidates && u.candidates.length > 0
              ? `${wrong}${u.candidates.length} מועמדים - בחר ידנית בעריכת הליגה`
              // בלי לומר מה חיפשנו, "לא נמצאה" הוא מבוי סתום. עם זה, אפשר
              // להמשיך משם בחיפוש הידני שבעריכת הליגה
              : `לא נמצאה ב-365 (חיפשתי: ${tried || '—'}) - חפש ידנית בעריכת הליגה`;
          toast.warning(`${u.league}: ${detail}`);
        });
      } else {
        toast.error('שגיאה: ' + data.message);
      }
    } catch (error) {
      toast.error('שגיאה בסנכרון הליגות');
    } finally {
      setSeeding(false);
    }
  };

  const handleVerify365 = async () => {
    setVerifying(true);
    try {
      const response = await fetch(`${API_URL}/leagues/verify365`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'failed');
      setVerification(data);
      const broken = (data.rows || []).filter((r) => r.error || r.count === 0).length;
      if (broken === 0) toast.success(`נבדקו ${data.checked} ליגות - לכולן יש משחקים ב-365`);
      else toast.warning(`נבדקו ${data.checked} ליגות, ${broken} בלי משחקים בטווח`);
    } catch (error) {
      toast.error('שגיאה בבדיקה מול 365');
    } finally {
      setVerifying(false);
    }
  };

  const handleHealth = async () => {
    setVerifying(true);
    try {
      // על התחרות שבאמת מעניינת: הליגה הראשונה ברשימה אינה בהכרח זו
      // שהבעיה בה
      const target = leagues.find((l) => l.scores365CompetitionId && l.type === 'national')
        || leagues.find((l) => l.scores365CompetitionId);
      const query = target ? `?leagueId=${target._id}` : '';
      const response = await fetch(`${API_URL}/external/365-health${query}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'failed');
      setHealth(data);
      const down = (data.probes || []).filter((p) => !p.ok);
      if (down.length === 0) toast.success('כל הנתיבים של 365 עונים');
      else toast.warning(`${down.length} נתיבים לא עונים: ${down.map((p) => p.name).join(', ')}`);
    } catch (error) {
      toast.error('שגיאה בבדיקת הנתיבים');
    } finally {
      setVerifying(false);
    }
  };

  const startEditing = (league) => {
    setEditingLeague(league);
    setEditForm({
      name: league.name,
      key: league.key,
      color: league.color,
      type: league.type,
      region: league.region || '',
      order: league.order || 0,
      apiFootballId: league.apiFootballId ?? '',
      footballDataCode: league.footballDataCode ?? '',
      espnLeagueCode: league.espnLeagueCode ?? '',
      sofaScoreTournamentId: league.sofaScoreTournamentId ?? '',
      scores365CompetitionId: league.scores365CompetitionId ?? '',
      scores365Name: league.scores365Name ?? ''
    });
  };

  const labelStyle = {
    fontSize: '11px', color: 'var(--text-3, #888)', display: 'block', marginBottom: '3px', fontWeight: '600'
  };

  const inputStyle = {
    borderRadius: '10px', fontSize: '13px', padding: '0.45rem 0.6rem'
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div style={{
          width: '44px', height: '44px',
          border: '3px solid var(--border, #f0f0f0)', borderTop: '3px solid var(--theme-primary, #007bff)',
          borderRadius: '50%', animation: 'spin 0.8s linear infinite',
          margin: '0 auto 0.5rem'
        }}></div>
        <span style={{ fontSize: '13px', color: 'var(--text-3, #888)' }}>טוען ליגות...</span>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '0.95rem', margin: 0, fontWeight: '700' }}>
            🏆 ניהול ליגות ({leagues.length})
          </h2>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={handleSeedEuropean}
              disabled={seeding}
              title="מוסיף ליגות/גביעים חסרים מהרשימה המובנית בקוד, ומעדכן מזהי ספק לקיימות"
              style={{
                padding: '0.4rem 0.8rem',
                background: seeding ? '#9e9e9e' : 'linear-gradient(135deg, #007bff, #00a2ff)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '12px', fontWeight: '700', cursor: seeding ? 'default' : 'pointer'
              }}
            >
              {seeding ? '⏳ מסנכרן...' : '🌍 סנכרן ליגות אירופאיות'}
            </button>
            <button
              onClick={handleVerify365}
              disabled={verifying}
              title="מושך משחקים אמיתיים מ-365 לכל ליגה ומראה את שם התחרות ואת הקבוצות, כדי לוודא שהחיבור נכון"
              style={{
                padding: '0.4rem 0.8rem',
                background: verifying ? '#9e9e9e' : 'linear-gradient(135deg, #6f42c1, #8e5ad6)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '12px', fontWeight: '700', cursor: verifying ? 'default' : 'pointer'
              }}
            >
              {verifying ? '⏳ בודק...' : '🔍 בדוק מול 365'}
            </button>
            <button
              onClick={handleHealth}
              disabled={verifying}
              title="בודק את כל הנתיבים של 365 שאנחנו תלויים בהם ומדווח מה עונה ומה לא"
              style={{
                padding: '0.4rem 0.8rem',
                background: verifying ? '#9e9e9e' : 'linear-gradient(135deg, #495057, #6c757d)',
                color: 'white', border: 'none', borderRadius: '8px',
                fontSize: '12px', fontWeight: '700', cursor: verifying ? 'default' : 'pointer'
              }}
            >
              🩺 נתיבי 365
            </button>
            {leagues.length === 0 && (
              <button
                onClick={handleInitializeDefaultLeagues}
                style={{
                  padding: '0.4rem 0.8rem',
                  background: 'linear-gradient(135deg, #28a745, #20c997)',
                  color: 'white', border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: '700', cursor: 'pointer'
                }}
              >
                🏆 אתחל ברירת מחדל
              </button>
            )}
          </div>
        </div>
      </div>

      {/* מצב הנתיבים עצמם. נתיב שמחזיר 404 הוא ההסבר לכל השאר */}
      {health && (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <h2 style={{ fontSize: '0.95rem', margin: 0, fontWeight: '700' }}>
              🩺 נתיבי 365 {health.league ? `· ${health.league} (#${health.competitionId})` : ''}
            </h2>
            <button onClick={() => setHealth(null)} className="btn" style={{ background: 'transparent', fontSize: '16px', padding: '0 0.3rem' }}>✖</button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3, #888)', marginBottom: '0.4rem', lineHeight: 1.5 }}>
            לכל נתיב: האם הוא עונה, כמה משחקים החזיר, כמה מהם בתחרות שביקשנו,
            ובאילו תאריכים. זה מה שאומר אם הספק מכבד את המסננים - ואם לא, מה
            בדיוק הוא מתעלם ממנו.
          </div>

          {health.probes.map((probe, i) => (
            <div key={`${probe.path}-${i}`} style={{
              padding: '0.4rem 0.2rem', fontSize: '12px',
              borderTop: '1px dashed var(--border, #eef1f4)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '13px' }}>{probe.ok ? '✅' : '❌'}</span>
                <span style={{ fontWeight: 600, flex: 1, minWidth: 0 }}>{probe.name}</span>
                <span style={{
                  fontWeight: 800,
                  color: probe.ok ? 'var(--good-fg, #1a6b35)' : 'var(--bad-fg, #b3261e)'
                }}>
                  {probe.status || '—'}
                </span>
              </div>

              {probe.ok && (
                <div style={{ fontSize: '11px', color: 'var(--text-3, #888)', marginTop: '2px' }}>
                  {probe.games != null && `${probe.games} משחקים`}
                  {probe.inCompetition != null && ` · ${probe.inCompetition} בתחרות`}
                  {probe.firstDate && ` · ${probe.firstDate} → ${probe.lastDate}`}
                  {probe.competitions != null && ` · ${probe.competitions} תחרויות`}
                </div>
              )}

              {/* מבנה אובייקט המשחק: זה מה שאומר אילו נתונים בכלל אפשר
                  להוציא מהספק - למשל אם יש שדה שמסביר ביטול שער */}
              {probe.gameKeys && (
                <details style={{ marginTop: '3px' }}>
                  <summary style={{ fontSize: '10.5px', color: 'var(--text-4, #aaa)', cursor: 'pointer' }}>
                    שדות באובייקט המשחק ({probe.gameKeys.length})
                  </summary>
                  <div style={{ fontSize: '10px', color: 'var(--text-3, #888)', fontFamily: 'monospace', marginTop: '2px', wordBreak: 'break-all' }}>
                    {probe.gameKeys.join(', ')}
                  </div>
                  {probe.eventKeys && (
                    <div style={{ fontSize: '10px', color: 'var(--text-3, #888)', fontFamily: 'monospace', marginTop: '4px', wordBreak: 'break-all' }}>
                      אירועים: {probe.eventKeys.join(', ')}
                      <div style={{ marginTop: '2px', opacity: 0.8 }}>{probe.eventSample}</div>
                    </div>
                  )}
                </details>
              )}

              {probe.samples && probe.samples.length > 0 && (
                <div style={{ fontSize: '10.5px', color: 'var(--text-4, #aaa)', marginTop: '1px' }}>
                  {probe.samples.join(' · ')}
                </div>
              )}

              {probe.error && (
                <div style={{ fontSize: '11px', color: 'var(--bad-fg, #b3261e)', marginTop: '2px' }}>{probe.error}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* תוצאות הבדיקה מול 365 - מה שהמשחקים עצמם אומרים */}
      {verification && (
        <div className="card" style={{ marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <h2 style={{ fontSize: '0.95rem', margin: 0, fontWeight: '700' }}>
              🔍 בדיקה מול 365 ({verification.checked})
            </h2>
            <button
              onClick={() => setVerification(null)}
              className="btn"
              style={{ background: 'transparent', fontSize: '16px', padding: '0 0.3rem' }}
            >
              ✖
            </button>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-3, #888)', marginBottom: '0.5rem', lineHeight: 1.5 }}>
            שם התחרות והקבוצות כפי ש-365 מחזירים אותם על המשחקים עצמם, בטווח
            {' '}{verification.fromDate} עד {verification.toDate}. זו הראיה היחידה
            שהחיבור נכון - שם ששמרנו אצלנו רק חוזר על מה שהנחנו.
          </div>

          {verification.rows.map((row) => {
            const bad = !!row.error || row.count === 0;
            return (
              <div key={row._id} style={{
                padding: '0.45rem 0.5rem',
                borderTop: '1px dashed var(--border, #eef1f4)',
                background: bad ? 'var(--warn-bg, #fffaf0)' : 'transparent'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{row.name}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-4, #aaa)', fontFamily: 'monospace' }}>
                    #{row.competitionId}
                  </span>
                  {row.liveName && (
                    <span style={{
                      padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                      background: 'var(--good-bg, #e8f6ec)', color: 'var(--good-fg, #1a6b35)'
                    }}>
                      365: {row.liveName}
                    </span>
                  )}
                  {bad && (
                    <span style={{
                      padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                      background: 'var(--warn-bg, #fff3cd)', color: 'var(--warn-fg, #9a7b3f)'
                    }}>
                      {row.error ? 'שגיאה' : 'אין משחקים בטווח'}
                    </span>
                  )}
                </div>

                {row.samples.length > 0 && (
                  <div style={{ fontSize: '11px', color: 'var(--text-3, #888)', marginTop: '2px' }}>
                    {row.samples.join(' · ')}
                  </div>
                )}
                {row.error && (
                  <div style={{ fontSize: '11px', color: 'var(--bad-fg, #b3261e)', marginTop: '2px' }}>
                    {row.error}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add league form */}
      <div className="card" style={{ marginBottom: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
          ➕ הוסף ליגה חדשה
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.5rem',
          marginBottom: '0.5rem'
        }}>
          <div>
            <label style={labelStyle}>שם (עברית)</label>
            <input type="text" placeholder="בונדסליגה" value={newLeague.name}
              onChange={(e) => setNewLeague(prev => ({ ...prev, name: e.target.value }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>מפתח (אנגלית)</label>
            <input type="text" placeholder="bundesliga" value={newLeague.key}
              onChange={(e) => setNewLeague(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '') }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>צבע</label>
            <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
              <input type="color" value={newLeague.color}
                onChange={(e) => setNewLeague(prev => ({ ...prev, color: e.target.value }))}
                style={{ width: '36px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
              <input type="text" value={newLeague.color}
                onChange={(e) => setNewLeague(prev => ({ ...prev, color: e.target.value }))}
                className="input" style={{ ...inputStyle, flex: 1 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>סוג</label>
            <select value={newLeague.type}
              onChange={(e) => setNewLeague(prev => ({ ...prev, type: e.target.value }))}
              className="input" style={inputStyle}>
              <option value="club">קבוצות מועדון</option>
              <option value="national">נבחרות</option>
              <option value="other">אחר</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>אזור</label>
            <input type="text" placeholder="גרמניה" value={newLeague.region}
              onChange={(e) => setNewLeague(prev => ({ ...prev, region: e.target.value }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>סדר תצוגה</label>
            <input type="number" value={newLeague.order}
              onChange={(e) => setNewLeague(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>מזהה API-Football</label>
            <input type="number" placeholder="39 / 140 / 383" value={newLeague.apiFootballId}
              onChange={(e) => setNewLeague(prev => ({ ...prev, apiFootballId: e.target.value }))}
              className="input" style={inputStyle}
              title="מזהה הליגה ב-API-Football. דוגמאות: פרמייר ליג=39, לה ליגה=140, ליגת העל=383" />
          </div>
          <div>
            <label style={labelStyle}>קוד football-data.org</label>
            <input type="text" placeholder="PL / PD / BL1" value={newLeague.footballDataCode}
              onChange={(e) => setNewLeague(prev => ({ ...prev, footballDataCode: e.target.value.toUpperCase() }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>קוד ESPN</label>
            <input type="text" placeholder="eng.fa / eng.league_cup" value={newLeague.espnLeagueCode}
              onChange={(e) => setNewLeague(prev => ({ ...prev, espnLeagueCode: e.target.value }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>מזהה SofaScore</label>
            <input type="number" placeholder="266" value={newLeague.sofaScoreTournamentId}
              onChange={(e) => setNewLeague(prev => ({ ...prev, sofaScoreTournamentId: e.target.value }))}
              className="input" style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>מזהה 365scores</label>
            <input type="number" placeholder="42" value={newLeague.scores365CompetitionId}
              onChange={(e) => setNewLeague(prev => ({ ...prev, scores365CompetitionId: e.target.value }))}
              className="input" style={inputStyle}
              title="אפשר למצוא אותו בחיפוש התחרויות שמתחת" />
          </div>
        </div>

        <Competition365Search
          onPick={(c) => setNewLeague(prev => ({
            ...prev,
            scores365CompetitionId: String(c.id),
            scores365Name: c.name || ''
          }))}
        />

        <button onClick={handleCreateLeague} style={{
          width: '100%', padding: '0.55rem',
          background: 'linear-gradient(135deg, #28a745, #20c997)',
          color: 'white', border: 'none', borderRadius: '10px',
          fontSize: '14px', fontWeight: '700', cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(40,167,69,0.3)',
          WebkitAppearance: 'none', touchAction: 'manipulation'
        }}>
          ➕ צור ליגה חדשה
        </button>
      </div>

      {/* Leagues list */}
      <div className="card">
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>
          📋 ליגות קיימות
        </h2>

        {leagues.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-4, #999)', padding: '2rem', fontSize: '14px' }}>
            <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>🏆</div>
            אין ליגות במערכת עדיין
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {leagues.map((league, index) => (
              <div key={league._id} style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.6rem',
                background: index % 2 === 0 ? 'var(--surface-2, #fafafa)' : 'var(--surface, #fff)',
                borderRadius: '10px',
                border: '1px solid var(--border, #f0f0f0)',
                animation: `slideUp 0.25s ease ${index * 0.03}s both`,
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0, flex: 1 }}>
                  <div style={{
                    width: '28px', height: '28px',
                    backgroundColor: league.color,
                    borderRadius: '8px',
                    flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: `0 2px 6px ${league.color}44`
                  }}>
                    <LeagueLogo league={league} size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text, #333)' }}>
                      {league.name}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'monospace', fontSize: '10px', color: 'var(--text-4, #aaa)' }}>
                        {league.key}
                      </span>
                      {/* השם אצל 365. התאמה שגויה - "ליגת האומות" של קונקקאף
                          במקום של אופ"א - נראית כאן מיד, במקום להתגלות רק
                          כשמייבאים משחקים של נבחרות אחרות לגמרי */}
                      {league.scores365Name && (
                        <span
                          title="שם התחרות אצל 365scores"
                          style={{
                            padding: '1px 6px', borderRadius: '10px', fontSize: '10px',
                            background: 'var(--surface-3, #f0f2f5)', color: 'var(--text-3, #888)'
                          }}
                        >
                          365: {league.scores365Name}
                        </span>
                      )}
                      <span style={{
                        padding: '1px 6px',
                        backgroundColor: league.type === 'club' ? 'var(--info-bg, #e3f2fd)' : league.type === 'national' ? 'var(--warn-bg, #fff3cd)' : 'var(--surface-2, #f8f9fa)',
                        borderRadius: '10px', fontSize: '10px', fontWeight: '600',
                        color: league.type === 'club' ? 'var(--info-fg, #1565c0)' : league.type === 'national' ? 'var(--warn-fg, #f57f17)' : 'var(--text-3, #666)'
                      }}>
                        {league.type === 'club' ? '🏢 מועדון' : league.type === 'national' ? '🌍 נבחרות' : '📌 אחר'}
                      </span>
                      {league.region && (
                        <span style={{ fontSize: '10px', color: 'var(--text-4, #999)' }}>{league.region}</span>
                      )}
                      <span style={{
                        fontSize: '10px', color: 'var(--text-4, #bbb)', fontWeight: '600'
                      }}>
                        #{league.order}
                      </span>
                      {(() => {
                        const p = activeProvider(league);
                        return (
                          <span
                            title={p.good
                              ? 'יחסי ווינר, תובנות וטבלה חיה זמינים'
                              : 'ללא יחסי ווינר, תובנות וטבלה חיה - הם קיימים רק ב-365scores'}
                            style={{
                              padding: '1px 6px', borderRadius: '10px', fontSize: '10px', fontWeight: '700',
                              backgroundColor: p.good ? 'var(--good-bg, #e6f4ea)' : 'var(--warn-bg, #fff3cd)',
                              color: p.good ? 'var(--good-fg, #1e7e34)' : 'var(--warn-fg, #9a7b3f)'
                            }}
                          >
                            {p.good ? '✓' : '⚠'} {p.label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                  <button onClick={() => startEditing(league)} style={{
                    padding: '0.3rem 0.6rem',
                    background: 'linear-gradient(135deg, #ffc107, #ffb300)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                  }}>
                    ✏️
                  </button>
                  <button onClick={() => handleDeleteLeague(league._id, league.name)} style={{
                    padding: '0.3rem 0.6rem',
                    background: 'linear-gradient(135deg, #dc3545, #c62828)',
                    color: 'white', border: 'none', borderRadius: '8px',
                    fontSize: '11px', fontWeight: '700', cursor: 'pointer'
                  }}>
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingLeague && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem'
        }}>
          <div style={{
            width: '100%', maxWidth: '500px',
            background: 'var(--surface, #fff)', borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '0.75rem 1rem',
              borderBottom: '1px solid var(--border, #f0f0f0)',
              background: 'var(--surface-2, #f8f9fa)'
            }}>
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700' }}>
                ✏️ עריכת ליגה: {editingLeague.name}
              </h3>
            </div>

            <div style={{ padding: '0.75rem 1rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div>
                  <label style={labelStyle}>שם הליגה</label>
                  <input type="text" value={editForm.name || ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>מפתח</label>
                  <input type="text" value={editForm.key || ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, key: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>צבע</label>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <input type="color" value={editForm.color || '#6c757d'}
                      onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))}
                      style={{ width: '36px', height: '32px', border: 'none', cursor: 'pointer', borderRadius: '6px' }} />
                    <input type="text" value={editForm.color || ''} className="input"
                      style={{ ...inputStyle, flex: 1 }}
                      onChange={(e) => setEditForm(prev => ({ ...prev, color: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>סוג</label>
                  <select value={editForm.type || 'club'} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, type: e.target.value }))}>
                    <option value="club">קבוצות מועדון</option>
                    <option value="national">נבחרות</option>
                    <option value="other">אחר</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>אזור</label>
                  <input type="text" value={editForm.region || ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, region: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>סדר תצוגה</label>
                  <input type="number" value={editForm.order || 0} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))} />
                </div>
                <div>
                  <label style={labelStyle}>מזהה API-Football (אופציונלי)</label>
                  <input type="number" placeholder="39 / 140 / 383"
                    value={editForm.apiFootballId ?? ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, apiFootballId: e.target.value }))}
                    title="פרמייר ליג=39, לה ליגה=140, ליגת העל=383" />
                </div>
                <div>
                  <label style={labelStyle}>קוד football-data.org (אופציונלי)</label>
                  <input type="text" placeholder="PL / PD / BL1"
                    value={editForm.footballDataCode ?? ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, footballDataCode: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label style={labelStyle}>קוד ESPN (אופציונלי)</label>
                  <input type="text" placeholder="eng.fa / eng.league_cup"
                    value={editForm.espnLeagueCode ?? ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, espnLeagueCode: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>מזהה SofaScore (אופציונלי)</label>
                  <input type="number" placeholder="266"
                    value={editForm.sofaScoreTournamentId ?? ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, sofaScoreTournamentId: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>מזהה 365scores (אופציונלי)</label>
                  <input type="number" placeholder="42"
                    value={editForm.scores365CompetitionId ?? ''} className="input" style={inputStyle}
                    onChange={(e) => setEditForm(prev => ({ ...prev, scores365CompetitionId: e.target.value }))}
                    title="אפשר למצוא אותו בחיפוש שמתחת" />
                </div>
                <Competition365Search
                  onPick={(c) => setEditForm(prev => ({
                    ...prev,
                    scores365CompetitionId: String(c.id),
                    scores365Name: c.name || ''
                  }))}
                />
              </div>
            </div>

            <div style={{
              padding: '0.75rem 1rem',
              borderTop: '1px solid var(--border, #f0f0f0)',
              display: 'flex', gap: '0.5rem',
              background: 'var(--surface-2, #fafafa)'
            }}>
              <button onClick={handleUpdateLeague} style={{
                flex: 1, padding: '0.55rem',
                background: 'linear-gradient(135deg, #28a745, #20c997)',
                color: 'white', border: 'none', borderRadius: '10px',
                fontSize: '14px', fontWeight: '700', cursor: 'pointer'
              }}>
                💾 שמור
              </button>
              <button onClick={() => { setEditingLeague(null); setEditForm({}); }} style={{
                flex: 1, padding: '0.55rem',
                backgroundColor: '#6c757d', color: 'white', border: 'none',
                borderRadius: '10px', fontSize: '14px', fontWeight: '600', cursor: 'pointer'
              }}>
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LeaguesManagement;
