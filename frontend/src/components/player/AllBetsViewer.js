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
      if (w.lockTime) {
        const lockTime = new Date(w.lockTime);
        const now = new Date();
        return now >= lockTime;
      }
      return false;
    });

    const seasons = [...new Set(lockedWeeks.map(w => w.season || '2025-26'))].sort().reverse();
    setAvailableSeasons(seasons);

    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
  }, [weeks]);

  useEffect(() => {
    if (!weeks || !selectedSeason) return;

    const lockedWeeks = weeks.filter(w => {
      if (!w || !w.active) return false;
      if (w.locked) return true;
      if (w.lockTime) {
        const lockTime = new Date(w.lockTime);
        const now = new Date();
        return now >= lockTime;
      }
      return false;
    });

    const weeksInSeason = lockedWeeks.filter(w => (w.season || '2025-26') === selectedSeason);
    const months = [...new Set(weeksInSeason.map(w => w.month))].sort((a, b) => b - a);
    setAvailableMonths(months);

    if (!selectedMonth && months.length > 0) {
      setSelectedMonth(months[0]);
    }
  }, [weeks, selectedSeason]);

  useEffect(() => {
    if (!weeks) return;

    let filtered = weeks.filter(w => {
      if (!w || !w.active) return false;
      if (w.locked) return true;
      if (w.lockTime) {
        const lockTime = new Date(w.lockTime);
        const now = new Date();
        return now >= lockTime;
      }
      return false;
    });

    if (selectedSeason) {
      filtered = filtered.filter(w => (w.season || '2025-26') === selectedSeason);
    }

    if (selectedMonth) {
      filtered = filtered.filter(w => w.month === selectedMonth);
    }

    filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredWeeks(filtered);

    if (filtered.length > 0 && !selectedWeek) {
      setSelectedWeek(filtered[0]);
      loadWeekData(filtered[0]._id);
    } else if (filtered.length === 0) {
      setSelectedWeek(null);
      setMatches([]);
      setAllBets([]);
      setUsers([]);
    }
  }, [weeks, selectedSeason, selectedMonth]);

  const loadWeekData = async (weekId) => {
    if (!weekId) {
      setMatches([]);
      setAllBets([]);
      setUsers([]);
      return;
    }

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

      const playersOnly = usersData.filter(u => u.role !== 'admin');

      setMatches(Array.isArray(matchesData) ? matchesData : []);
      setAllBets(Array.isArray(betsData) ? betsData : []);
      setUsers(playersOnly);
    } catch (error) {
      console.error('Error loading week data:', error);
      setMatches([]);
      setAllBets([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const getLeagueColor = (match) => {
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.color) {
      return match.leagueId.color;
    }
    const colors = {
      'english': '#dc3545',
      'spanish': '#007bff',
      'world': '#6f42c1'
    };
    return colors[match.league] || '#6c757d';
  };

  const getLeagueName = (match) => {
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.name) {
      return match.leagueId.name;
    }
    const names = {
      'english': 'פרמיירליג',
      'spanish': 'לה ליגה',
      'world': 'ליגת העל'
    };
    return names[match.league] || 'ליגה';
  };

  const getBetForUserAndMatch = (userId, matchId) => {
    return allBets.find(bet =>
      bet.userId && bet.userId._id === userId &&
      bet.matchId && bet.matchId._id === matchId
    );
  };

  const calculateMatchPoints = (prediction, result, odds) => {
    if (!prediction || !result || result.team1Goals === undefined) return 0;

    const predTeam1 = prediction.team1Goals;
    const predTeam2 = prediction.team2Goals;
    const resultTeam1 = result.team1Goals;
    const resultTeam2 = result.team2Goals;

    const predOutcome = predTeam1 > predTeam2 ? 'home' : predTeam1 < predTeam2 ? 'away' : 'draw';
    const resultOutcome = resultTeam1 > resultTeam2 ? 'home' : resultTeam1 < resultTeam2 ? 'away' : 'draw';

    const hasOdds = odds && (odds.homeWin || odds.draw || odds.awayWin);

    if (hasOdds) {
      let relevantOdd = 1;
      if (resultOutcome === 'home' && odds.homeWin) relevantOdd = odds.homeWin;
      else if (resultOutcome === 'draw' && odds.draw) relevantOdd = odds.draw;
      else if (resultOutcome === 'away' && odds.awayWin) relevantOdd = odds.awayWin;

      if (predTeam1 === resultTeam1 && predTeam2 === resultTeam2) {
        return Math.round(relevantOdd * 2 / 3 * 10) / 10;
      }
      if (predOutcome === resultOutcome) {
        return Math.round(relevantOdd / 3 * 10) / 10;
      }
      return 0;
    } else {
      if (predTeam1 === resultTeam1 && predTeam2 === resultTeam2) return 3;
      if (predOutcome === resultOutcome) return 1;
      return 0;
    }
  };

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  return (
    <div>
      {/* סינונים */}
      <div className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>הימורים של כל השחקנים</h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.4rem',
          marginBottom: '0.4rem'
        }}>
          <select
            value={selectedSeason}
            onChange={(e) => {
              setSelectedSeason(e.target.value);
              setSelectedMonth('');
              setSelectedWeek(null);
            }}
            className="input"
            style={{ width: '100%', fontSize: '13px', padding: '0.4rem' }}
          >
            <option value="">כל העונות</option>
            {availableSeasons.map(season => (
              <option key={season} value={season}>
                עונת {season}
              </option>
            ))}
          </select>

          <select
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(parseInt(e.target.value) || '');
              setSelectedWeek(null);
            }}
            className="input"
            style={{ width: '100%', fontSize: '13px', padding: '0.4rem' }}
            disabled={!selectedSeason || availableMonths.length === 0}
          >
            <option value="">כל החודשים</option>
            {availableMonths.map(monthNum => (
              <option key={monthNum} value={monthNum}>
                {months.find(m => m.value === monthNum)?.label || `חודש ${monthNum}`}
              </option>
            ))}
          </select>
        </div>

        <select
          value={selectedWeek?._id || ''}
          onChange={(e) => {
            const week = filteredWeeks.find(w => w._id === e.target.value);
            setSelectedWeek(week || null);
            if (week) loadWeekData(week._id);
          }}
          className="input"
          style={{ width: '100%', fontSize: '13px', padding: '0.4rem' }}
          disabled={filteredWeeks.length === 0}
        >
          <option value="">בחר שבוע נעול ({filteredWeeks.length} זמינים)</option>
          {filteredWeeks.map(week => (
            <option key={week._id} value={week._id}>
              {week.name} - {months.find(m => m.value === week.month)?.label}
            </option>
          ))}
        </select>

        {filteredWeeks.length === 0 && selectedSeason && (
          <div style={{
            padding: '0.5rem',
            backgroundColor: '#fff3cd',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#856404',
            marginTop: '0.4rem'
          }}>
            אין שבועות נעולים עבור הסינון הנבחר
          </div>
        )}
      </div>

      {!selectedWeek && filteredWeeks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '36px', marginBottom: '0.5rem' }}>🔒</div>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>
            ההימורים יהיו זמינים לצפייה כשיהיו שבועות נעולים
          </p>
        </div>
      ) : !selectedWeek ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>בחר שבוע מהרשימה למעלה</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 0.75rem'
          }}></div>
          <span style={{ fontSize: '14px', color: '#666' }}>טוען הימורים...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <div>
          {/* כותרת שבוע */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
            padding: '0 0.25rem'
          }}>
            <span style={{ fontWeight: '600', fontSize: '14px' }}>{selectedWeek.name}</span>
            <span style={{
              fontSize: '11px',
              color: '#856404',
              backgroundColor: '#fff3cd',
              padding: '2px 8px',
              borderRadius: '10px',
              fontWeight: '600'
            }}>
              🔒 נעול
            </span>
          </div>

          {matches.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
              <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>אין משחקים בשבוע זה</p>
            </div>
          ) : (
            /* כל משחק כקארד עם הימורים של כל השחקנים */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {matches.map((match) => (
                <div key={match._id} className="card" style={{ padding: '0.6rem' }}>
                  {/* כותרת משחק */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '0.3rem'
                  }}>
                    <span style={{
                      padding: '2px 6px',
                      backgroundColor: getLeagueColor(match),
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: '600'
                    }}>
                      {getLeagueName(match)}
                    </span>
                    <span style={{ fontSize: '11px', color: '#888' }}>
                      {match.date} • {match.time}
                    </span>
                  </div>

                  {/* שמות קבוצות */}
                  <div style={{
                    textAlign: 'center',
                    fontWeight: '600',
                    fontSize: '14px',
                    marginBottom: '0.3rem'
                  }}>
                    {match.team1} נגד {match.team2}
                  </div>

                  {/* יחסים */}
                  {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '0.3rem',
                      marginBottom: '0.3rem'
                    }}>
                      <span style={{ padding: '1px 6px', backgroundColor: '#e3f2fd', borderRadius: '8px', fontSize: '10px', color: '#1565c0', fontWeight: 'bold' }}>
                        1: {match.odds.homeWin || '-'}
                      </span>
                      <span style={{ padding: '1px 6px', backgroundColor: '#fff3e0', borderRadius: '8px', fontSize: '10px', color: '#e65100', fontWeight: 'bold' }}>
                        X: {match.odds.draw || '-'}
                      </span>
                      <span style={{ padding: '1px 6px', backgroundColor: '#e8f5e9', borderRadius: '8px', fontSize: '10px', color: '#2e7d32', fontWeight: 'bold' }}>
                        2: {match.odds.awayWin || '-'}
                      </span>
                    </div>
                  )}

                  {/* תוצאה */}
                  {match.result && match.result.team1Goals !== undefined && (
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '0.4rem',
                      padding: '3px 8px',
                      backgroundColor: '#d4edda',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#155724'
                    }}>
                      תוצאה: {match.result.team2Goals}-{match.result.team1Goals}
                    </div>
                  )}

                  {/* הימורים של כל השחקנים */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem',
                    borderTop: '1px solid #eee',
                    paddingTop: '0.35rem'
                  }}>
                    {users.map(player => {
                      const bet = getBetForUserAndMatch(player._id, match._id);
                      let points = 0;

                      if (bet && match.result && match.result.team1Goals !== undefined) {
                        points = bet.points !== undefined && bet.points !== null
                          ? bet.points
                          : calculateMatchPoints(bet.prediction, match.result, match.odds);
                      }

                      const isMe = player._id === user.id;

                      return (
                        <div key={player._id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.3rem 0.4rem',
                          backgroundColor: isMe ? '#e3f2fd' : 'transparent',
                          borderRadius: '6px',
                          fontSize: '13px'
                        }}>
                          <span style={{
                            fontWeight: isMe ? '600' : '400',
                            flex: 1,
                            minWidth: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {player.name}
                            {isMe && <span style={{ color: '#1976d2', fontSize: '10px' }}> (אתה)</span>}
                          </span>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                            {bet && bet.prediction ? (
                              <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 'bold',
                                fontSize: '14px',
                                minWidth: '36px',
                                textAlign: 'center'
                              }}>
                                {bet.prediction.team2Goals}-{bet.prediction.team1Goals}
                              </span>
                            ) : (
                              <span style={{ color: '#999', fontSize: '11px' }}>לא הימר</span>
                            )}

                            {bet && match.result && match.result.team1Goals !== undefined && (
                              <span style={{
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                minWidth: '36px',
                                textAlign: 'center',
                                backgroundColor: (() => {
                                  if (points === 0) return '#f8d7da';
                                  const isExact = bet.prediction.team1Goals === match.result.team1Goals && bet.prediction.team2Goals === match.result.team2Goals;
                                  return isExact ? '#d4edda' : '#cce5ff';
                                })(),
                                color: (() => {
                                  if (points === 0) return '#721c24';
                                  const isExact = bet.prediction.team1Goals === match.result.team1Goals && bet.prediction.team2Goals === match.result.team2Goals;
                                  return isExact ? '#155724' : '#0066cc';
                                })()
                              }}>
                                {(() => {
                                  if (points === 0) return '❌ 0';
                                  const isExact = bet.prediction.team1Goals === match.result.team1Goals && bet.prediction.team2Goals === match.result.team2Goals;
                                  return isExact ? `🎯 +${points}` : `✅ +${points}`;
                                })()}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <div style={{ textAlign: 'center', fontSize: '11px', color: '#999', padding: '0.25rem' }}>
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
