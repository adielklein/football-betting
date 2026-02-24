import React, { useState, useEffect } from 'react';

function HistoryViewer({ weeks, user }) {
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState(null);
  const [historyData, setHistoryData] = useState({ matches: [], bets: [], allBets: [] });
  const [loading, setLoading] = useState(false);
  
  // 🆕 סינונים חדשים
  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [availableSeasons, setAvailableSeasons] = useState([]);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [filteredWeeks, setFilteredWeeks] = useState([]);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  // 🆕 חישוב עונות וחודשים זמינים
  useEffect(() => {
    if (!weeks || weeks.length === 0) return;
    
    // מצא עונות ייחודיות
    const seasons = [...new Set(weeks.map(w => w.season || '2025-26'))].sort().reverse();
    setAvailableSeasons(seasons);
    
    // קבע עונה ראשונה אם אין
    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
  }, [weeks]);

  // 🆕 עדכון חודשים זמינים כשמשנים עונה
  useEffect(() => {
    if (!weeks || !selectedSeason) return;
    
    // סנן שבועות לפי עונה
    const weeksInSeason = weeks.filter(w => (w.season || '2025-26') === selectedSeason);
    
    // מצא חודשים ייחודיים
    const months = [...new Set(weeksInSeason.map(w => w.month))].sort((a, b) => b - a);
    setAvailableMonths(months);
    
    // קבע חודש ראשון אם אין
    if (!selectedMonth && months.length > 0) {
      setSelectedMonth(months[0]);
    }
  }, [weeks, selectedSeason]);

  // 🆕 עדכון שבועות מסוננים
  useEffect(() => {
    if (!weeks) return;
    
    let filtered = weeks;
    
    // סינון לפי עונה
    if (selectedSeason) {
      filtered = filtered.filter(w => (w.season || '2025-26') === selectedSeason);
    }
    
    // סינון לפי חודש
    if (selectedMonth) {
      filtered = filtered.filter(w => w.month === selectedMonth);
    }
    
    // מיון לפי תאריך יצירה (חדשים ראשון)
    filtered = filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    setFilteredWeeks(filtered);
    
    // 🆕 קבע שבוע ראשון אוטומטית אם יש
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

      console.log('היסטוריה - נתונים נטענו:', { matches, userBetsArray, allBets });

      const userBetsObj = {};
      if (Array.isArray(userBetsArray)) {
        userBetsArray.forEach(bet => {
          if (bet && bet.matchId) {
            const matchId = typeof bet.matchId === 'object' ? bet.matchId._id : bet.matchId;
            userBetsObj[matchId] = bet.prediction;
          }
        });
      }

      console.log('היסטוריה - הימורים של המשתמש:', userBetsObj);

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

  return (
    <div className="card">
      <h2>📚 היסטוריית שבועות</h2>
      
      {/* 🆕 סינונים מדורגים */}
      <div style={{ 
        marginBottom: '1.5rem', 
        padding: '1rem', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* בחירת עונה */}
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#666', 
              marginBottom: '4px' 
            }}>
              1️⃣ בחר עונה:
            </label>
            <select 
              value={selectedSeason} 
              onChange={(e) => {
                setSelectedSeason(e.target.value);
                setSelectedMonth('');
                setSelectedHistoryWeek(null);
              }}
              className="input"
              style={{ width: '100%' }}
            >
              <option value="">כל העונות</option>
              {availableSeasons.map(season => (
                <option key={season} value={season}>
                  עונת {season}
                </option>
              ))}
            </select>
          </div>

          {/* בחירת חודש */}
          <div style={{ flex: '1', minWidth: '150px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#666', 
              marginBottom: '4px' 
            }}>
              2️⃣ בחר חודש:
            </label>
            <select 
              value={selectedMonth} 
              onChange={(e) => {
                setSelectedMonth(parseInt(e.target.value) || '');
                setSelectedHistoryWeek(null);
              }}
              className="input"
              style={{ width: '100%' }}
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

          {/* בחירת שבוע */}
          <div style={{ flex: '1', minWidth: '200px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              fontWeight: '600', 
              color: '#666', 
              marginBottom: '4px' 
            }}>
              3️⃣ בחר שבוע:
            </label>
            <select 
              value={selectedHistoryWeek?._id || ''} 
              onChange={(e) => {
                const week = filteredWeeks.find(w => w._id === e.target.value);
                setSelectedHistoryWeek(week);
                if (week) loadHistoryData(week._id);
              }}
              className="input"
              style={{ width: '100%' }}
              disabled={filteredWeeks.length === 0}
            >
              <option value="">בחר שבוע</option>
              {filteredWeeks.map(week => (
                <option key={week._id} value={week._id}>
                  {week.name} - {months.find(m => m.value === week.month)?.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* סיכום סינון */}
        <div style={{ 
          display: 'flex', 
          gap: '0.5rem', 
          fontSize: '13px', 
          color: '#666',
          flexWrap: 'wrap'
        }}>
          <span>📊 סינון:</span>
          {selectedSeason && (
            <span style={{ 
              padding: '2px 8px', 
              backgroundColor: '#e3f2fd', 
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              {selectedSeason}
            </span>
          )}
          {selectedMonth && (
            <span style={{ 
              padding: '2px 8px', 
              backgroundColor: '#fff3cd', 
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              {months.find(m => m.value === selectedMonth)?.label}
            </span>
          )}
          <span style={{ color: '#999' }}>•</span>
          <span style={{ fontWeight: '600' }}>
            {filteredWeeks.length} שבועות נמצאו
          </span>
        </div>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          טוען היסטוריה...
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      {!selectedHistoryWeek && !loading && filteredWeeks.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</div>
          <h3>אין שבועות מסוננים</h3>
          <p>נסה לשנות את הסינון למעלה</p>
        </div>
      )}

      {selectedHistoryWeek && !loading && (
        <>
          <div style={{ 
            marginBottom: '1rem', 
            padding: '1rem', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0 }}>שבוע: {selectedHistoryWeek.name}</h3>
              <p style={{ margin: 0, color: '#666', fontSize: '14px' }}>
                {months.find(m => m.value === selectedHistoryWeek.month)?.label} {selectedHistoryWeek.season}
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>הניקוד שלך בשבוע</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                {calculateUserWeekScore()}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <h3>ההימורים שלך</h3>
            {historyData.matches.length === 0 ? (
              <p style={{ color: '#666' }}>אין משחקים בשבוע זה</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {historyData.matches.map(match => {
                  const bet = historyData.bets[match._id];
                  const hasResult = match.result?.team1Goals !== undefined;
                  
                  let points = 0;
                  if (bet && hasResult) {
                    // 🆕 נסה למצוא את הנקודות מהשרת דרך allBets
                    const fullBet = historyData.allBets.find(b => 
                      b.userId && b.userId._id === user.id && 
                      b.matchId && (b.matchId._id === match._id || b.matchId === match._id)
                    );
                    
                    if (fullBet && fullBet.points !== undefined && fullBet.points !== null) {
                      points = fullBet.points;
                    } else {
                      // fallback - חישוב מקומי עם תמיכה ביחסים
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
                      padding: '1rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <div>
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: getLeagueColor(match),
                            color: 'white',
                            borderRadius: '3px',
                            fontSize: '10px',
                            marginRight: '8px'
                          }}>
                            {getLeagueName(match)}
                          </span>
                          <strong>{match.team1} נגד {match.team2}</strong>
                        </div>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {match.date} • {match.time}
                        </span>
                      </div>

                      {/* 🆕 הצגת יחסים */}
                      {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                        <div style={{ 
                          display: 'flex', 
                          gap: '0.5rem', 
                          marginBottom: '0.5rem',
                          justifyContent: 'center'
                        }}>
                          <span style={{ padding: '2px 8px', backgroundColor: '#e3f2fd', borderRadius: '10px', fontSize: '11px', color: '#1565c0', fontWeight: 'bold' }}>
                            1: {match.odds.homeWin || '-'}
                          </span>
                          <span style={{ padding: '2px 8px', backgroundColor: '#fff3e0', borderRadius: '10px', fontSize: '11px', color: '#e65100', fontWeight: 'bold' }}>
                            X: {match.odds.draw || '-'}
                          </span>
                          <span style={{ padding: '2px 8px', backgroundColor: '#e8f5e9', borderRadius: '10px', fontSize: '11px', color: '#2e7d32', fontWeight: 'bold' }}>
                            2: {match.odds.awayWin || '-'}
                          </span>
                        </div>
                      )}

                      <div style={{ 
                        textAlign: 'center',
                        marginBottom: '1rem',
                        padding: '1rem',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '8px',
                        border: '2px solid #2196f3'
                      }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '0.5rem' }}>
                          ההימור שלך
                        </div>
                        <div style={{ 
                          fontSize: '24px', 
                          fontWeight: 'bold', 
                          color: '#1976d2',
                          fontFamily: 'monospace'
                        }}>
                          {bet ? `${bet.team1Goals} - ${bet.team2Goals}` : 'לא הימרת'}
                        </div>
                        {hasResult && (
                          <div style={{ 
                            fontSize: '18px', 
                            fontWeight: 'bold', 
                            color: '#333',
                            fontFamily: 'monospace',
                            marginTop: '0.5rem'
                          }}>
                            {`${match.team1} ${match.result.team1Goals} - ${match.result.team2Goals} ${match.team2}`}
                          </div>
                        )}
                        {!hasResult && bet && (
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '0.2rem' }}>
                            {`${match.team1} ${bet.team1Goals} - ${bet.team2Goals} ${match.team2}`}
                          </div>
                        )}
                      </div>

                      <div style={{ textAlign: 'center' }}>
                        {hasResult && bet && (
                          <span style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '16px',
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
                              if (points === 0) return '❌ שגוי +0';
                              const isExact = bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals;
                              return isExact ? `🎯 מדויק +${points}` : `✅ כיוון +${points}`;
                            })()}
                          </span>
                        )}
                        {!hasResult && (
                          <span style={{ color: '#666', fontStyle: 'italic' }}>
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

          {historyData.allBets.length > 0 && (
            <div>
              <h3>לוח תוצאות השבוע</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', border: '1px solid #ddd' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '8px', textAlign: 'right' }}>מקום</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>שחקן</th>
                      <th style={{ padding: '8px', textAlign: 'right' }}>ניקוד השבוע</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getScoreboardData().map((player, index) => (
                      <tr key={player.name} style={{ 
                        backgroundColor: player.name === user.name ? '#e3f2fd' : 'transparent' 
                      }}>
                        <td style={{ padding: '8px' }}>
                          {index === 0 && '🥇 '}
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {index + 1}
                        </td>
                        <td style={{ padding: '8px', fontWeight: '500' }}>
                          {player.name}
                          {player.name === user.name && <span style={{ color: '#1976d2', fontSize: '12px' }}> (אתה)</span>}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 'bold' }}>
                          {player.score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!selectedHistoryWeek && !loading && filteredWeeks.length > 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          <p>בחר שבוע מהרשימה למעלה כדי לראות את ההיסטוריה</p>
        </div>
      )}
    </div>
  );
}

export default HistoryViewer;