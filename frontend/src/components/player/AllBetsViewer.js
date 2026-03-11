import React, { useState, useEffect } from 'react';

function AllBetsViewer({ weeks, user }) {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [filteredWeeks, setFilteredWeeks] = useState([]);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    if (!weeks || weeks.length === 0) return;
    const lockedWeeks = weeks.filter(w => {
      if (!w || !w.active) return false;
      if (w.locked) return true;
      if (w.lockTime) return new Date() >= new Date(w.lockTime);
      return false;
    });
    const seasons = [...new Set(lockedWeeks.map(w => w.season || '2025-26'))].sort().reverse();
    setAvailableSeasons(seasons);
    if (!selectedSeason && seasons.length > 0) setSelectedSeason(seasons[0]);
  }, [weeks]);

  useEffect(() => {
    if (!weeks || !selectedSeason) return;
    const lockedWeeks = weeks.filter(w => {
      if (!w || !w.active) return false;
      if (w.locked) return true;
      if (w.lockTime) return new Date() >= new Date(w.lockTime);
      return false;
    });
    const weeksInSeason = lockedWeeks.filter(w => (w.season || '2025-26') === selectedSeason);
    const months = [...new Set(weeksInSeason.map(w => w.month))].sort((a, b) => b - a);
    setAvailableMonths(months);
    if (!selectedMonth && months.length > 0) setSelectedMonth(months[0]);
  }, [weeks, selectedSeason]);

  useEffect(() => {
    if (!weeks) return;
    let filtered = weeks.filter(w => {
      if (!w || !w.active) return false;
      if (w.locked) return true;
      if (w.lockTime) return new Date() >= new Date(w.lockTime);
      return false;
    });
    if (selectedSeason) filtered = filtered.filter(w => (w.season || '2025-26') === selectedSeason);
    if (selectedMonth) filtered = filtered.filter(w => w.month === selectedMonth);
    filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    setFilteredWeeks(filtered);
    if (filtered.length > 0 && !selectedWeek) {
      setSelectedWeek(filtered[0]);
      loadWeekData(filtered[0]._id);
    } else if (filtered.length === 0) {
      setSelectedWeek(null); setMatches([]); setAllBets([]); setUsers([]);
    }
  }, [weeks, selectedSeason, selectedMonth]);

  const loadWeekData = async (weekId) => {
    if (!weekId) { setMatches([]); setAllBets([]); setUsers([]); return; }
    try {
      setLoading(true);
      const [matchesResponse, betsResponse, usersResponse] = await Promise.all([
        fetch(`${API_URL}/matches/week/${weekId}`),
        fetch(`${API_URL}/bets/week/${weekId}`),
        fetch(`${API_URL}/auth/users`)
      ]);
      const matchesData = await matchesResponse.json();
      const betsData = await betsResponse.json();
      const usersData = await usersResponse.json();
      setMatches(Array.isArray(matchesData) ? matchesData : []);
      setAllBets(Array.isArray(betsData) ? betsData : []);
      setUsers(usersData.filter(u => u.role !== 'admin'));
    } catch (error) {
      console.error('Error loading week data:', error);
      setMatches([]); setAllBets([]); setUsers([]);
    } finally { setLoading(false); }
  };

  const getLeagueColor = (match) => {
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.color) return match.leagueId.color;
    return { 'english': '#dc3545', 'spanish': '#007bff', 'world': '#6f42c1' }[match.league] || '#6c757d';
  };

  const getLeagueName = (match) => {
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.name) return match.leagueId.name;
    return { 'english': 'פרמיירליג', 'spanish': 'לה ליגה', 'world': 'ליגת העל' }[match.league] || 'ליגה';
  };

  const getBetForUserAndMatch = (userId, matchId) => {
    return allBets.find(bet => bet.userId && bet.userId._id === userId && bet.matchId && bet.matchId._id === matchId);
  };

  const calculateMatchPoints = (prediction, result, odds) => {
    if (!prediction || !result || result.team1Goals === undefined) return 0;
    const predOutcome = prediction.team1Goals > prediction.team2Goals ? 'home' : prediction.team1Goals < prediction.team2Goals ? 'away' : 'draw';
    const resultOutcome = result.team1Goals > result.team2Goals ? 'home' : result.team1Goals < result.team2Goals ? 'away' : 'draw';
    const hasOdds = odds && (odds.homeWin || odds.draw || odds.awayWin);
    if (hasOdds) {
      let relevantOdd = 1;
      if (resultOutcome === 'home' && odds.homeWin) relevantOdd = odds.homeWin;
      else if (resultOutcome === 'draw' && odds.draw) relevantOdd = odds.draw;
      else if (resultOutcome === 'away' && odds.awayWin) relevantOdd = odds.awayWin;
      if (prediction.team1Goals === result.team1Goals && prediction.team2Goals === result.team2Goals) return Math.round(relevantOdd * 2 / 3 * 10) / 10;
      if (predOutcome === resultOutcome) return Math.round(relevantOdd / 3 * 10) / 10;
      return 0;
    }
    if (prediction.team1Goals === result.team1Goals && prediction.team2Goals === result.team2Goals) return 3;
    if (predOutcome === resultOutcome) return 1;
    return 0;
  };

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  const getPointsBadge = (points, isExact) => {
    if (points === 0) return { bg: '#fce4ec', color: '#c62828', text: `❌ 0` };
    if (isExact) return { bg: '#e8f5e9', color: '#2e7d32', text: `🎯 +${points}` };
    return { bg: '#e3f2fd', color: '#1565c0', text: `✅ +${points}` };
  };

  return (
    <div>
      {/* סינונים */}
      <div className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
        <h2 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>👥 הימורים של כל השחקנים</h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.4rem' }}>
          <select value={selectedSeason} onChange={(e) => { setSelectedSeason(e.target.value); setSelectedMonth(''); setSelectedWeek(null); }}
            className="input" style={{ width: '100%', fontSize: '13px', padding: '0.4rem', borderRadius: '10px' }}>
            <option value="">כל העונות</option>
            {availableSeasons.map(s => <option key={s} value={s}>עונת {s}</option>)}
          </select>
          <select value={selectedMonth} onChange={(e) => { setSelectedMonth(parseInt(e.target.value) || ''); setSelectedWeek(null); }}
            className="input" style={{ width: '100%', fontSize: '13px', padding: '0.4rem', borderRadius: '10px' }}
            disabled={!selectedSeason || availableMonths.length === 0}>
            <option value="">כל החודשים</option>
            {availableMonths.map(m => <option key={m} value={m}>{months.find(x => x.value === m)?.label}</option>)}
          </select>
        </div>

        <select value={selectedWeek?._id || ''} onChange={(e) => {
          const week = filteredWeeks.find(w => w._id === e.target.value);
          setSelectedWeek(week || null);
          if (week) loadWeekData(week._id);
        }} className="input" style={{ width: '100%', fontSize: '13px', padding: '0.4rem', borderRadius: '10px' }}
          disabled={filteredWeeks.length === 0}>
          <option value="">בחר שבוע נעול ({filteredWeeks.length} זמינים)</option>
          {filteredWeeks.map(w => <option key={w._id} value={w._id}>{w.name} - {months.find(m => m.value === w.month)?.label}</option>)}
        </select>

        {filteredWeeks.length === 0 && selectedSeason && (
          <div style={{ padding: '0.5rem', backgroundColor: '#fff8e1', borderRadius: '8px', fontSize: '13px', color: '#f57f17', marginTop: '0.4rem', border: '1px solid #ffe082' }}>
            אין שבועות נעולים עבור הסינון הנבחר
          </div>
        )}
      </div>

      {!selectedWeek && filteredWeeks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', background: 'linear-gradient(135deg, #f8f9ff, #f0f4ff)' }}>
          <div style={{ fontSize: '40px', marginBottom: '0.5rem' }}>🔒</div>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>ההימורים יהיו זמינים לצפייה כשיהיו שבועות נעולים</p>
        </div>
      ) : !selectedWeek ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>בחר שבוע מהרשימה למעלה</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ width: '36px', height: '36px', border: '3px solid #f0f0f0', borderTop: '3px solid var(--theme-primary, #007bff)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem' }}></div>
          <span style={{ fontSize: '14px', color: '#999' }}>טוען הימורים...</span>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', padding: '0 0.15rem' }}>
            <span style={{ fontWeight: '700', fontSize: '14px', color: '#333' }}>{selectedWeek.name}</span>
            <span style={{ fontSize: '11px', color: '#f57f17', backgroundColor: '#fff8e1', padding: '3px 10px', borderRadius: '10px', fontWeight: '700', border: '1px solid #ffe082' }}>
              🔒 נעול
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ color: '#888', fontSize: '14px', margin: 0 }}>אין משחקים בשבוע זה</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {matches.map((match, matchIndex) => (
                <div key={match._id} className="card" style={{
                  padding: '0.65rem',
                  animation: `slideUp 0.25s ease ${matchIndex * 0.04}s both`
                }}>
                  {/* כותרת משחק */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{
                      padding: '2px 8px', backgroundColor: getLeagueColor(match), color: 'white',
                      borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                      boxShadow: `0 2px 4px ${getLeagueColor(match)}33`
                    }}>{getLeagueName(match)}</span>
                    <span style={{ fontSize: '11px', color: '#aaa', fontWeight: '500' }}>{match.date} • {match.time}</span>
                  </div>

                  <div style={{ textAlign: 'center', fontWeight: '700', fontSize: '14px', marginBottom: '0.3rem', color: '#333' }}>
                    {match.team1} נגד {match.team2}
                  </div>

                  {/* יחסים */}
                  {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.25rem', marginBottom: '0.3rem' }}>
                      {[
                        { label: '1', value: match.odds.homeWin, bg: '#eef4ff', color: '#3b6fd4' },
                        { label: 'X', value: match.odds.draw, bg: '#fef6e6', color: '#c67e00' },
                        { label: '2', value: match.odds.awayWin, bg: '#edf7ee', color: '#2d8a3e' }
                      ].map(odd => (
                        <span key={odd.label} style={{ padding: '2px 8px', backgroundColor: odd.bg, borderRadius: '8px', fontSize: '10px', color: odd.color, fontWeight: '700' }}>
                          {odd.label}: {odd.value || '-'}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* תוצאה */}
                  {match.result && match.result.team1Goals !== undefined && (
                    <div style={{
                      textAlign: 'center', marginBottom: '0.4rem', padding: '4px 8px',
                      background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)', borderRadius: '8px',
                      fontSize: '13px', fontWeight: '700', color: '#2e7d32'
                    }}>
                      תוצאה: {match.result.team2Goals}-{match.result.team1Goals}
                    </div>
                  )}

                  {/* הימורים של כל השחקנים */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', borderTop: '1px solid #f0f0f0', paddingTop: '0.35rem' }}>
                    {users.map(player => {
                      const bet = getBetForUserAndMatch(player._id, match._id);
                      let points = 0;
                      let isExact = false;
                      if (bet && match.result && match.result.team1Goals !== undefined) {
                        points = bet.points !== undefined && bet.points !== null ? bet.points : calculateMatchPoints(bet.prediction, match.result, match.odds);
                        isExact = bet.prediction && bet.prediction.team1Goals === match.result.team1Goals && bet.prediction.team2Goals === match.result.team2Goals;
                      }
                      const isMe = player._id === user.id;
                      const badge = getPointsBadge(points, isExact);

                      return (
                        <div key={player._id} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '0.3rem 0.4rem',
                          backgroundColor: isMe ? '#e8f0fe' : 'transparent',
                          borderRadius: '6px', fontSize: '13px'
                        }}>
                          <span style={{
                            fontWeight: isMe ? '700' : '400', flex: 1, minWidth: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#444'
                          }}>
                            {player.name}
                            {isMe && <span style={{ color: '#1976d2', fontSize: '10px' }}> (אתה)</span>}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            {bet && bet.prediction ? (
                              <span style={{ fontFamily: 'monospace', fontWeight: '800', fontSize: '14px', minWidth: '36px', textAlign: 'center', color: '#333' }}>
                                {bet.prediction.team2Goals}-{bet.prediction.team1Goals}
                              </span>
                            ) : (
                              <span style={{ color: '#ccc', fontSize: '11px' }}>לא הימר</span>
                            )}
                            {bet && match.result && match.result.team1Goals !== undefined && (
                              <span style={{
                                padding: '1px 6px', borderRadius: '6px', fontSize: '10px', fontWeight: '700',
                                minWidth: '38px', textAlign: 'center',
                                backgroundColor: badge.bg, color: badge.color
                              }}>
                                {badge.text}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div style={{ textAlign: 'center', fontSize: '11px', color: '#bbb', padding: '0.25rem' }}>
                🎯 מדויק | ✅ כיוון נכון | ❌ שגוי
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default AllBetsViewer;
