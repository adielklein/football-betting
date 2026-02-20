import React, { useState, useEffect } from 'react';

function AllBetsViewer({ weeks, user }) {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [users, setUsers] = useState([]);
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
    
    // רק שבועות נעולים או שעבר זמן הנעילה
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
    
    // מצא עונות ייחודיות
    const seasons = [...new Set(lockedWeeks.map(w => w.season || '2025-26'))].sort().reverse();
    setAvailableSeasons(seasons);
    
    // קבע עונה ראשונה אם אין
    if (!selectedSeason && seasons.length > 0) {
      setSelectedSeason(seasons[0]);
    }
  }, [weeks]);

  // 🆕 עדכון חודשים זמינים כשמשנים עונה
  useEffect(() => {
    if (!weeks || !selectedSeason) return;
    
    // רק שבועות נעולים
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
    
    // סנן שבועות לפי עונה
    const weeksInSeason = lockedWeeks.filter(w => (w.season || '2025-26') === selectedSeason);
    
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
    
    // רק שבועות נעולים
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
        return Math.round(relevantOdd * 2 * 10) / 10;
      }
      if (predOutcome === resultOutcome) {
        return Math.round(relevantOdd * 10) / 10;
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
      {/* 🆕 סינונים מדורגים */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>🎯 הימורים של כל השחקנים</h2>
        </div>
        
        <div style={{ 
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
                  setSelectedWeek(null);
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
                  setSelectedWeek(null);
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
                3️⃣ בחר שבוע נעול:
              </label>
              <select 
                value={selectedWeek?._id || ''} 
                onChange={(e) => {
                  const week = filteredWeeks.find(w => w._id === e.target.value);
                  setSelectedWeek(week || null);
                  if (week) {
                    loadWeekData(week._id);
                  }
                }}
                className="input"
                style={{ width: '100%' }}
                disabled={filteredWeeks.length === 0}
              >
                <option value="">בחר שבוע נעול לצפייה</option>
                {filteredWeeks.map(week => (
                  <option key={week._id} value={week._id}>
                    {week.name} - {months.find(m => m.value === week.month)?.label} 🔒
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
              {filteredWeeks.length} שבועות נעולים נמצאו
            </span>
          </div>

          {/* 🔒 הודעה על שבועות נעולים */}
          {filteredWeeks.length === 0 && selectedSeason && (
            <div style={{ 
              padding: '0.75rem', 
              backgroundColor: '#fff3cd', 
              borderRadius: '4px',
              fontSize: '14px',
              color: '#856404'
            }}>
              ⚠️ אין שבועות נעולים עבור הסינון הנבחר. הימורים גלויים רק לשבועות שהסתיימו.
            </div>
          )}
        </div>
      </div>

      {!selectedWeek && filteredWeeks.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '48px', marginBottom: '1rem' }}>🔒</div>
          <h2>אין שבועות נעולים עדיין</h2>
          <p style={{ color: '#666' }}>
            ההימורים של כל השחקנים יהיו זמינים לצפייה ברגע שיהיו שבועות נעולים
          </p>
        </div>
      ) : !selectedWeek ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#666' }}>בחר שבוע מהרשימה למעלה כדי לראות את ההימורים של כולם</p>
        </div>
      ) : loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #007bff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem auto'
          }}></div>
          <h3>טוען הימורים...</h3>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3>הימורי השבוע: {selectedWeek.name}</h3>
            <div style={{ fontSize: '14px', color: '#666' }}>
              🔒 שבוע נעול - כל ההימורים גלויים
            </div>
          </div>

          {matches.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666' }}>אין משחקים בשבוע זה</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '800px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ padding: '12px', textAlign: 'right', borderRight: '1px solid #ddd', position: 'sticky', left: 0, backgroundColor: '#f8f9fa' }}>
                      שחקן
                    </th>
                    {matches.map((match) => (
                      <th key={match._id} style={{ 
                        padding: '12px', 
                        textAlign: 'center', 
                        minWidth: '140px',
                        borderRight: '1px solid #ddd',
                        fontSize: '12px'
                      }}>
                        <div style={{ marginBottom: '4px' }}>
                          <span style={{
                            padding: '2px 6px',
                            backgroundColor: getLeagueColor(match),
                            color: 'white',
                            borderRadius: '3px',
                            fontSize: '10px',
                            marginBottom: '4px',
                            display: 'inline-block'
                          }}>
                            {getLeagueName(match)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                          {match.team1} נגד {match.team2}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          {match.date} {match.time}
                        </div>
                        {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                          <div style={{ 
                            marginTop: '3px',
                            fontSize: '10px',
                            color: '#ff9800',
                            fontWeight: 'bold'
                          }}>
                            📊 {match.odds.homeWin || '-'} / {match.odds.draw || '-'} / {match.odds.awayWin || '-'}
                          </div>
                        )}
                        {match.result && match.result.team1Goals !== undefined && (
                          <div style={{ 
                            marginTop: '4px', 
                            padding: '2px 6px',
                            backgroundColor: '#d4edda',
                            color: '#155724',
                            borderRadius: '3px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                          }}>
                            תוצאה: {match.result.team2Goals}-{match.result.team1Goals}
                          </div>
                        )}
                      </th>
                    ))}
                    <th style={{ padding: '12px', textAlign: 'center', borderRight: '1px solid #ddd', backgroundColor: '#e8f5e8' }}>
                      <div style={{ fontWeight: 'bold' }}>סה"כ נקודות</div>
                      <div style={{ fontSize: '10px', color: '#666' }}>בשבוע זה</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(player => {
                    let totalWeekPoints = 0;

                    return (
                      <tr key={player._id} style={{ 
                        backgroundColor: player._id === user.id ? '#e3f2fd' : 'transparent',
                        borderBottom: '1px solid #ddd'
                      }}>
                        <td style={{ 
                          padding: '12px', 
                          fontWeight: '500',
                          backgroundColor: player._id === user.id ? '#e3f2fd' : '#f8f9fa',
                          borderRight: '1px solid #ddd',
                          position: 'sticky',
                          left: 0
                        }}>
                          {player.name}
                          {player._id === user.id && <span style={{ color: '#1976d2', fontSize: '12px' }}> (אתה)</span>}
                        </td>
                        {matches.map(match => {
                          const bet = getBetForUserAndMatch(player._id, match._id);
                          let points = 0;
                          
                          if (bet && match.result && match.result.team1Goals !== undefined) {
                            points = bet.points !== undefined && bet.points !== null 
                              ? bet.points 
                              : calculateMatchPoints(bet.prediction, match.result, match.odds);
                            totalWeekPoints += points;
                          }
                          
                          return (
                            <td key={match._id} style={{ 
                              padding: '12px', 
                              textAlign: 'center',
                              borderRight: '1px solid #ddd',
                              backgroundColor: player._id === user.id ? '#f8f9ff' : 'white'
                            }}>
                              <div style={{ marginBottom: '6px' }}>
                                {bet && bet.prediction ? (
                                  <div style={{ 
                                    fontFamily: 'monospace', 
                                    fontSize: '16px', 
                                    fontWeight: 'bold',
                                    color: '#333'
                                  }}>
                                    {bet.prediction.team2Goals}-{bet.prediction.team1Goals}
                                  </div>
                                ) : (
                                  <div style={{ color: '#999', fontSize: '12px' }}>לא הימר</div>
                                )}
                              </div>
                              
                              {bet && match.result && match.result.team1Goals !== undefined && (
                                <div style={{ fontSize: '11px' }}>
                                  <span style={{
                                    padding: '3px 6px',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
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
                                      if (points === 0) return '❌ +0';
                                      const isExact = bet.prediction.team1Goals === match.result.team1Goals && bet.prediction.team2Goals === match.result.team2Goals;
                                      return isExact ? `🎯 +${points}` : `✅ +${points}`;
                                    })()}
                                  </span>
                                </div>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ 
                          padding: '12px', 
                          textAlign: 'center',
                          borderRight: '1px solid #ddd',
                          backgroundColor: '#e8f5e8',
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          {totalWeekPoints}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          
          <div style={{ marginTop: '1rem', fontSize: '12px', color: '#666', textAlign: 'center' }}>
            🎯 מדויק = כפול היחס (ללא יחסים: 3 נק׳) | ✅ כיוון נכון = היחס (ללא יחסים: 1 נק׳) | ❌ שגוי = 0
          </div>
        </div>
      )}
    </div>
  );
}

export default AllBetsViewer;