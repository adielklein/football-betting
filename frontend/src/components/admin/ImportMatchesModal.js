import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { getHebrewNameByEnglish } from '../../utils/teamLogos';
import TeamLogo from '../TeamLogo';

const DAYS_OPTIONS = [3, 7, 14, 30];

function ImportMatchesModal({ week, leagues, adminId, onClose, onImported }) {
  const importableLeagues = useMemo(
    () => (leagues || []).filter((l) => l.footballDataCode || l.scores365CompetitionId || l.sportsDbLeagueId || l.sofaScoreTournamentId || l.espnLeagueCode),
    [leagues]
  );

  const [leagueId, setLeagueId] = useState(importableLeagues[0]?._id || '');
  const [days, setDays] = useState(7);
  const [includeOdds, setIncludeOdds] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fixtures, setFixtures] = useState([]);
  const [providerName, setProviderName] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!leagueId && importableLeagues.length > 0) {
      setLeagueId(importableLeagues[0]._id);
    }
  }, [importableLeagues, leagueId]);

  const loadFixtures = async ({ refresh = false } = {}) => {
    if (!leagueId) return;
    setLoading(true);
    setError('');
    setFixtures([]);
    try {
      const data = await api.getUpcomingFixtures({ leagueId, days, includeOdds, refresh });
      setProviderName(data.provider || null);
      const mapped = (data.fixtures || []).map((f) => ({
        ...f,
        selected: false,
        // אם הספק החזיר שם בעברית (365scores) - נשתמש בו ישירות, אחרת נתרגם
        team1: f.team1He || getHebrewNameByEnglish(f.team1En),
        team2: f.team2He || getHebrewNameByEnglish(f.team2En),
        oddsEdited: f.odds
          ? {
              homeWin: f.odds.homeWin ?? '',
              draw: f.odds.draw ?? '',
              awayWin: f.odds.awayWin ?? ''
            }
          : { homeWin: '', draw: '', awayWin: '' }
      }));
      setFixtures(mapped);
    } catch (err) {
      setError(err.message || 'שגיאה בטעינת משחקים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leagueId) loadFixtures();
  }, [leagueId, days, includeOdds]);

  const toggleSelected = (idx) => {
    setFixtures((prev) => prev.map((f, i) => (i === idx ? { ...f, selected: !f.selected } : f)));
  };

  const updateField = (idx, field, value) => {
    setFixtures((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  };

  const updateOdds = (idx, key, value) => {
    setFixtures((prev) =>
      prev.map((f, i) =>
        i === idx ? { ...f, oddsEdited: { ...f.oddsEdited, [key]: value } } : f
      )
    );
  };

  const selectedCount = fixtures.filter((f) => f.selected).length;

  const handleSelectAll = () => {
    const allSelected = fixtures.length > 0 && fixtures.every((f) => f.selected);
    setFixtures((prev) => prev.map((f) => ({ ...f, selected: !allSelected })));
  };

  const handleImport = async () => {
    const chosen = fixtures.filter((f) => f.selected);
    if (chosen.length === 0) {
      setError('בחר לפחות משחק אחד');
      return;
    }
    const invalid = chosen.find((f) => !f.team1?.trim() || !f.team2?.trim());
    if (invalid) {
      setError('יש למלא שמות קבוצות לכל המשחקים שנבחרו');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        weekId: week._id,
        leagueId,
        adminId,
        matches: chosen.map((f) => {
          const obj = {
            team1: f.team1.trim(),
            team2: f.team2.trim(),
            date: f.date,
            time: f.time,
            externalId: f.apiId,
            externalProvider: providerName
          };
          if (includeOdds) {
            const odds = {};
            const h = parseFloat(f.oddsEdited.homeWin);
            const d = parseFloat(f.oddsEdited.draw);
            const a = parseFloat(f.oddsEdited.awayWin);
            if (Number.isFinite(h) && h >= 1) odds.homeWin = h;
            if (Number.isFinite(d) && d >= 1) odds.draw = d;
            if (Number.isFinite(a) && a >= 1) odds.awayWin = a;
            if (Object.keys(odds).length > 0) obj.odds = odds;
          }
          return obj;
        })
      };
      const result = await api.bulkCreateMatches(payload);
      if (onImported) onImported(result);
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה בייבוא המשחקים');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
          <h3 style={{ margin: 0 }}>📥 ייבוא משחקים ל-{week?.name}</h3>
          <button onClick={onClose} className="btn" style={{ background: 'transparent', fontSize: '20px' }}>✖</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem', flexShrink: 0 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label>ליגה:</label>
            <select
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="input"
              disabled={loading || submitting}
            >
              {importableLeagues.length === 0 && <option value="">אין ליגות עם מזהה חיצוני</option>}
              {importableLeagues.map((l) => (
                <option key={l._id} value={l._id}>{l.name}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label>טווח ימים:</label>
            <select
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value, 10))}
              className="input"
              disabled={loading || submitting}
            >
              {DAYS_OPTIONS.map((d) => (
                <option key={d} value={d}>{d} ימים</option>
              ))}
            </select>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={includeOdds}
              onChange={(e) => setIncludeOdds(e.target.checked)}
              disabled={loading || submitting}
            />
            טען יחסי ווינר
          </label>
          <button
            onClick={() => loadFixtures({ refresh: true })}
            className="btn"
            disabled={loading || submitting || !leagueId}
          >
            🔄 רענן
          </button>
        </div>

        {includeOdds && (
          <div style={{
            background: '#fffaf0', border: '1px solid #f5e3c0', color: '#9a7b3f',
            padding: '0.45rem 0.7rem', borderRadius: '8px', fontSize: '12px',
            marginBottom: '0.75rem', flexShrink: 0
          }}>
            ℹ️ ווינר מפרסמים יחסים רק למחזור הקרוב. משחקים רחוקים יותר ייובאו בלי יחסים —
            אפשר להשלים אותם אחר כך בכפתור <strong>"💰 עדכן יחסי ווינר"</strong> במסך השבוע.
          </div>
        )}

        {error && (
          <div style={{ background: '#fee', color: '#900', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', flexShrink: 0 }}>
            {error}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
          {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>⏳ טוען משחקים...</div>}
          {!loading && fixtures.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
              אין משחקים זמינים בטווח הנבחר
            </div>
          )}

          {!loading && fixtures.length > 0 && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <button onClick={handleSelectAll} className="btn" style={{ fontSize: '13px' }}>
                  {fixtures.every((f) => f.selected) ? 'נקה הכל' : 'בחר הכל'}
                </button>
                <span style={{ fontSize: '13px', color: '#666' }}>
                  {selectedCount} מתוך {fixtures.length} נבחרו
                </span>
              </div>

              {fixtures.map((f, idx) => (
                <div
                  key={f.apiId}
                  style={{
                    border: f.selected ? '2px solid #0a7' : '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    marginBottom: '0.5rem',
                    background: f.selected ? '#f0fff7' : '#fff'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <input
                      type="checkbox"
                      checked={f.selected}
                      onChange={() => toggleSelected(idx)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: '1 1 200px', minWidth: '180px' }}>
                      <TeamLogo name={f.team1} size={20} />
                      <input
                        type="text"
                        value={f.team1}
                        onChange={(e) => updateField(idx, 'team1', e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <span style={{ color: '#888', fontWeight: 'bold' }}>vs</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: '1 1 200px', minWidth: '180px' }}>
                      <TeamLogo name={f.team2} size={20} />
                      <input
                        type="text"
                        value={f.team2}
                        onChange={(e) => updateField(idx, 'team2', e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <div style={{ fontSize: '14px', color: '#444', whiteSpace: 'nowrap' }}>
                      📅 {f.date} | 🕒 {f.time}
                    </div>
                  </div>
                  {includeOdds && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', paddingRight: '30px' }}>
                      <span style={{ fontSize: '12px', color: '#888' }}>יחסים:</span>
                      <label style={{ fontSize: '12px' }}>1:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={f.oddsEdited.homeWin}
                        onChange={(e) => updateOdds(idx, 'homeWin', e.target.value)}
                        className="input"
                        style={{ width: '70px', textAlign: 'center' }}
                        placeholder="בית"
                      />
                      <label style={{ fontSize: '12px' }}>X:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={f.oddsEdited.draw}
                        onChange={(e) => updateOdds(idx, 'draw', e.target.value)}
                        className="input"
                        style={{ width: '70px', textAlign: 'center' }}
                        placeholder="תיקו"
                      />
                      <label style={{ fontSize: '12px' }}>2:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={f.oddsEdited.awayWin}
                        onChange={(e) => updateOdds(idx, 'awayWin', e.target.value)}
                        className="input"
                        style={{ width: '70px', textAlign: 'center' }}
                        placeholder="חוץ"
                      />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexShrink: 0, gap: '0.5rem' }}>
          <button onClick={onClose} className="btn" disabled={submitting}>
            ביטול
          </button>
          <button
            onClick={handleImport}
            className="btn btn-primary"
            disabled={submitting || selectedCount === 0}
          >
            {submitting ? 'מייבא...' : `➕ הוסף ${selectedCount} משחקים נבחרים`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportMatchesModal;
