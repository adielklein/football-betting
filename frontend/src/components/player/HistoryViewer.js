import React, { useState, useEffect } from 'react';

function HistoryViewer({ weeks, user }) {
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState(null);
  const [historyData, setHistoryData] = useState({ matches: [], bets: [], allBets: [] });
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

    const seasons = [...new Set(weeks.map(w => w.season || '2025-26'))].sort().reverse();
    setAvailableSeasons(seasons);

    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
  }, [weeks]);

  useEffect(() => {
    if (!weeks || !selectedSeason) return;

    const weeksInSeason = weeks.filter(w => (w.season || '2025-26') === selectedSeason);
    const months = [...new Set(weeksInSeason.map(w => w.month))].sort((a, b) => b - a);
    setAvailableMonths(months);

    if (!selectedMonth && months.length > 0) {
      setSelectedMonth(months[0]);
    }
  }, [weeks, selectedSeason]);

  useEffect(() => {
    if (!weeks) return;

    let filtered = weeks;

    if (selectedSeason) {
      filtered = filtered.filter(w => (w.season || '2025-26') === selectedSeason);
    }

    if (selectedMonth) {
      filtered = filtered.filter(w => w.month === selectedMonth);
    }

    filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setFilteredWeeks(filtered);

    if (filtered.length > 0 && !selectedHistoryWeek) {
      setSelectedHistoryWeek(filtered[0]);
      loadHistoryData(filtered[0]._id);
    } else if (filtered.length === 0) {
      setSelectedHistoryWeek(null);
      setHistoryData({ matches: [], bets: [], allBets: [] });
    }
  }, [weeks, selectedSeason, selectedMonth]);

  const loadHistoryData = async (weekId) => {
    if (!weekId) return;

    setLoading(true);
    try {
      const [matchesResponse, userBetsResponse, allBetsResponse] = await Promise.all([
        fetch(`${API_URL}/matches/week/${weekId}`),
        fetch(`${API_URL}/bets/user/${user.id}/week/${weekId}`),
        fetch(`${API_URL}/bets/week/${weekId}`)
      ]);

      const matches = await matchesResponse.json();
      const userBetsArray = await userBetsResponse.json();
      const allBets = await allBetsResponse.json();

      const userBetsObj = {};
      if (Array.isArray(userBetsArray)) {
        userBetsArray.forEach(bet => {
          if (bet && bet.matchId) {
            const matchId = typeof bet.matchId === 'object' ? bet.matchId._id : bet.matchId;
            userBetsObj[matchId] = bet.prediction;
          }
        });
      }

      setHistoryData({ matches, bets: userBetsObj, allBets });
    } catch (error) {
      console.error('Error loading history:', error);
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

  const calculateUserWeekScore = () => {
    if (!selectedHistoryWeek || !historyData.allBets.length) return 0;

    const userBets = historyData.allBets.filter(bet =>
      bet.userId && bet.userId._id === user.id
    );

    return userBets.reduce((total, bet) => total + (bet.points || 0), 0);
  };

  const getScoreboardData = () => {
    if (!historyData.allBets.length) return [];

    const playerScores = {};

    historyData.allBets.forEach(bet => {
      if (bet.userId && bet.userId._id && bet.userId.role !== 'admin') {
        if (!playerScores[bet.userId._id]) {
          playerScores[bet.userId._id] = {
            name: bet.userId.name,
            score: 0
          };
        }
        playerScores[bet.userId._id].score += bet.points || 0;
      }
    });

    return Object.values(playerScores).sort((a, b) => b.score - a.score);
  };

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  const getMedalOrRank = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return index + 1;
  };

  return (
    <div>
      {/* סינונים */}
      <div className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem' }}>
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.5rem 0' }}>היסטוריית שבועות</h2>

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
              setSelectedHistoryWeek(null);
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
              setSelectedHistoryWeek(null);
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
          value={selectedHistoryWeek?._id || ''}
          onChange={(e) => {
            const week = filteredWeeks.find(w => w._id === e.target.value);
            setSelectedHistoryWeek(week);
            if (week) loadHistoryData(week._id);
          }}
          className="input"
          style={{ width: '100%', fontSize: '13px', padding: '0.4rem' }}
          disabled={filteredWeeks.length === 0}
        >
          <option value="">בחר שבוע ({filteredWeeks.length} זמינים)</option>
          {filteredWeeks.map(week => (
            <option key={week._id} value={week._id}>
              {week.name} - {months.find(m => m.value === week.month)?.label}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: '#666' }}>
          <div style={{
            width: '36px',
            height: '36px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 0.75rem'
          }}></div>
          <span style={{ fontSize: '14px' }}>טוען היסטוריה...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {!selectedHistoryWeek && !loading && filteredWeeks.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <div style={{ fontSize: '36px', marginBottom: '0.5rem' }}>📭</div>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>אין שבועות מסוננים. נסה לשנות את הסינון.</p>
        </div>
      )}

      {selectedHistoryWeek && !loading && (
        <>
          {/* כותרת שבוע + ניקוד */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#f0f7ff',
            borderRadius: '10px',
            border: '1px solid #d0e3ff'
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>{selectedHistoryWeek.name}</div>
              <div style={{ color: '#666', fontSize: '12px' }}>
                {months.find(m => m.value === selectedHistoryWeek.month)?.label} {selectedHistoryWeek.season}
              </div>
            </div>
            <div style={{
              textAlign: 'center',
              backgroundColor: '#007bff',
              color: 'white',
              padding: '0.3rem 0.75rem',
              borderRadius: '10px',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '10px', opacity: 0.85, lineHeight: 1 }}>הניקוד שלך</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', lineHeight: 1.2 }}>
                {calculateUserWeekScore()}
              </div>
            </div>
          </div>

          {/* ההימורים שלך */}
          <div style={{ marginBottom: '0.75rem' }}>
            <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0' }}>ההימורים שלך</h3>
            {historyData.matches.length === 0 ? (
              <p style={{ color: '#666', fontSize: '14px' }}>אין משחקים בשבוע זה</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {historyData.matches.map(match => {
                  const bet = historyData.bets[match._id];
                  const hasResult = match.result?.team1Goals !== undefined;

                  let points = 0;
                  if (bet && hasResult) {
                    const fullBet = historyData.allBets.find(b =>
                      b.userId && b.userId._id === user.id &&
                      b.matchId && (b.matchId._id === match._id || b.matchId === match._id)
                    );

                    if (fullBet && fullBet.points !== undefined && fullBet.points !== null) {
                      points = fullBet.points;
                    } else {
                      const predOutcome = bet.team1Goals > bet.team2Goals ? 'home' : bet.team1Goals < bet.team2Goals ? 'away' : 'draw';
                      const resultOutcome = match.result.team1Goals > match.result.team2Goals ? 'home' : match.result.team1Goals < match.result.team2Goals ? 'away' : 'draw';
                      const hasOdds = match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin);

                      if (hasOdds) {
                        let relevantOdd = 1;
                        if (resultOutcome === 'home' && match.odds.homeWin) relevantOdd = match.odds.homeWin;
                        else if (resultOutcome === 'draw' && match.odds.draw) relevantOdd = match.odds.draw;
                        else if (resultOutcome === 'away' && match.odds.awayWin) relevantOdd = match.odds.awayWin;

                        if (bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals) {
                          points = Math.round(relevantOdd * 2 / 3 * 10) / 10;
                        } else if (predOutcome === resultOutcome) {
                          points = Math.round(relevantOdd / 3 * 10) / 10;
                        }
                      } else {
                        if (bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals) {
                          points = 3;
                        } else if (predOutcome === resultOutcome) {
                          points = 1;
                        }
                      }
                    }
                  }

                  return (
                    <div key={match._id} style={{
                      padding: '0.6rem',
                      border: '1px solid #e0e0e0',
                      borderRadius: '10px',
                      backgroundColor: '#fafafa'
                    }}>
                      {/* שורה עליונה: ליגה + תאריך */}
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '0.35rem'
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

                      {/* יחסים */}
                      {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                        <div style={{
                          display: 'flex',
                          gap: '0.3rem',
                          marginBottom: '0.35rem',
                          justifyContent: 'center'
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

                      {/* קבוצות + ניחוש + תוצאה */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem',
                        marginBottom: '0.35rem'
                      }}>
                        <span style={{ flex: '1 1 0', textAlign: 'center', fontWeight: '600', fontSize: '13px', lineHeight: 1.2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {match.team1}
                        </span>

                        <div style={{ textAlign: 'center', flexShrink: 0 }}>
                          <div style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#1976d2',
                            fontFamily: 'monospace',
                            lineHeight: 1
                          }}>
                            {bet ? `${bet.team1Goals} - ${bet.team2Goals}` : '-'}
                          </div>
                          {hasResult && (
                            <div style={{
                              fontSize: '12px',
                              color: '#666',
                              marginTop: '2px'
                            }}>
                              {match.result.team1Goals} - {match.result.team2Goals}
                            </div>
                          )}
                        </div>

                        <span style={{ flex: '1 1 0', textAlign: 'center', fontWeight: '600', fontSize: '13px', lineHeight: 1.2, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {match.team2}
                        </span>
                      </div>

                      {/* תוצאת נקודות */}
                      <div style={{ textAlign: 'center' }}>
                        {hasResult && bet && (
                          <span style={{
                            padding: '3px 12px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            backgroundColor: (() => {
                              if (points === 0) return '#f8d7da';
                              const isExact = bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals;
                              return isExact ? '#d4edda' : '#cce5ff';
                            })(),
                            color: (() => {
                              if (points === 0) return '#721c24';
                              const isExact = bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals;
                              return isExact ? '#155724' : '#0066cc';
                            })()
                          }}>
                            {(() => {
                              if (points === 0) return '❌ +0';
                              const isExact = bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals;
                              return isExact ? `🎯 מדויק +${points}` : `✅ כיוון +${points}`;
                            })()}
                          </span>
                        )}
                        {hasResult && !bet && (
                          <span style={{ color: '#999', fontSize: '12px' }}>לא הימרת</span>
                        )}
                        {!hasResult && (
                          <span style={{ color: '#666', fontSize: '12px', fontStyle: 'italic' }}>
                            ממתין לתוצאה
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* לוח תוצאות השבוע */}
          {historyData.allBets.length > 0 && (
            <div className="card">
              <h3 style={{ fontSize: '0.95rem', margin: '0 0 0.5rem 0' }}>לוח תוצאות השבוע</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {getScoreboardData().map((player, index) => (
                  <div key={player.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.4rem 0.5rem',
                    backgroundColor: player.name === user.name ? '#e3f2fd' : (index % 2 === 0 ? '#fafafa' : '#fff'),
                    borderRadius: '6px',
                    border: player.name === user.name ? '1px solid #90caf9' : 'none'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', minWidth: 0, flex: 1 }}>
                      <span style={{
                        fontSize: index < 3 ? '16px' : '12px',
                        fontWeight: 'bold',
                        minWidth: '24px',
                        textAlign: 'center',
                        color: index >= 3 ? '#999' : undefined
                      }}>
                        {getMedalOrRank(index)}
                      </span>
                      <span style={{
                        fontWeight: '500',
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {player.name}
                        {player.name === user.name && (
                          <span style={{ color: '#1976d2', fontSize: '10px' }}> (אתה)</span>
                        )}
                      </span>
                    </div>
                    <span style={{
                      fontWeight: 'bold',
                      fontSize: '14px',
                      flexShrink: 0,
                      padding: '1px 8px',
                      backgroundColor: '#f5f5f5',
                      borderRadius: '10px'
                    }}>
                      {player.score}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!selectedHistoryWeek && !loading && filteredWeeks.length > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: '1.5rem' }}>
          <p style={{ color: '#666', fontSize: '14px', margin: 0 }}>בחר שבוע מהרשימה למעלה</p>
        </div>
      )}
    </div>
  );
}

export default HistoryViewer;
