import React, { useState, useEffect } from 'react';

function AllBetsViewer({ weeks, user }) {
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [allBets, setAllBets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  // מציאת כל השבועות הנעולים או שעבר זמן הנעילה
  const getLockedWeeks = () => {
    if (!weeks || weeks.length === 0) return [];
    
    return weeks.filter(w => {
      if (!w || !w.active) return false;
      
      // שבוע נעול
      if (w.locked) return true;
      
      // או שעבר זמן הנעילה
      if (w.lockTime) {
        const lockTime = new Date(w.lockTime);
        const now = new Date();
        return now >= lockTime;
      }
      
      return false;
    }).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // הכי חדשים קודם
  };

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
      
      // סינון אדמינים מרשימת המשתמשים
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

  const getLeagueColor = (league) => {
    const colors = {
      'english': '#dc3545',
      'spanish': '#007bff',
      'world': '#6f42c1'
    };
    return colors[league] || '#6c757d';
  };

  const getLeagueName = (league) => {
    const names = {
      'english': 'פרמייר ליג',
      'spanish': 'לה ליגה',
      'world': 'ליגת העל'
    };
    return names[league] || league;
  };

  const getBetForUserAndMatch = (userId, matchId) => {
    return allBets.find(bet => 
      bet.userId && bet.userId._id === userId && 
      bet.matchId && bet.matchId._id === matchId
    );
  };

  const calculateMatchPoints = (prediction, result) => {
    if (!prediction || !result || result.team1Goals === undefined) return 0;
    
    const predTeam1 = prediction.team1Goals;
    const predTeam2 = prediction.team2Goals;
    const resultTeam1 = result.team1Goals;
    const resultTeam2 = result.team2Goals;
    
    // Exact result = 3 points
    if (predTeam1 === resultTeam1 && predTeam2 === resultTeam2) {
      return 3;
    }
    
    // Correct outcome (winner/draw) = 1 point
    const predOutcome = predTeam1 > predTeam2 ? 'home' : predTeam1 < predTeam2 ? 'away' : 'draw';
    const resultOutcome = resultTeam1 > resultTeam2 ? 'home' : resultTeam1 < resultTeam2 ? 'away' : 'draw';
    
    if (predOutcome === resultOutcome) {
      return 1;
    }
    
    return 0;
  };

  const lockedWeeks = getLockedWeeks();

  const months = [
    { value: 1, label: 'ינואר' }, { value: 2, label: 'פברואר' }, { value: 3, label: 'מרץ' },
    { value: 4, label: 'אפריל' }, { value: 5, label: 'מאי' }, { value: 6, label: 'יוני' },
    { value: 7, label: 'יולי' }, { value: 8, label: 'אוגוסט' }, { value: 9, label: 'ספטמבר' },
    { value: 10, label: 'אוקטובר' }, { value: 11, label: 'נובמבר' }, { value: 12, label: 'דצמבר' }
  ];

  if (lockedWeeks.length === 0) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>🔒 אין שבועות נעולים עדיין</h2>
        <p style={{ color: '#666' }}>
          ההימורים של כל השחקנים יהיו זמינים לצפייה ברגע שישנם שבועות נעולים
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* בחירת שבוע */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>🎯 הימורים של כל השחקנים</h2>
          <select 
            value={selectedWeek?._id || ''} 
            onChange={(e) => {
              const week = lockedWeeks.find(w => w._id === e.target.value);
              setSelectedWeek(week || null);
              if (week) {
                loadWeekData(week._id);
              }
            }}
            className="input"
            style={{ width: '300px' }}
          >
            <option value="">בחר שבוע נעול לצפייה</option>
            {lockedWeeks.map(week => {
              const monthLabel = months.find(m => m.value === week.month)?.label || 'חודש לא ידוע';
              return (
                <option key={week._id} value={week._id}>
                  {week.name} - {monthLabel} {week.season} 🔒
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {!selectedWeek ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <p style={{ color: '#666' }}>בחר שבוע מהרשימה למעלה כדי לראות את ההימורים של כל השחקנים</p>
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
                            backgroundColor: getLeagueColor(match.league),
                            color: 'white',
                            borderRadius: '3px',
                            fontSize: '10px',
                            marginBottom: '4px',
                            display: 'inline-block'
                          }}>
                            {getLeagueName(match.league)}
                          </span>
                        </div>
                        <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                          {match.team1} נגד {match.team2}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666' }}>
                          {match.date} {match.time}
                        </div>
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
                            points = calculateMatchPoints(bet.prediction, match.result);
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
                              
                              {/* הצגת נקודות אם יש תוצאה */}
                              {bet && match.result && match.result.team1Goals !== undefined && (
                                <div style={{ fontSize: '11px' }}>
                                  <span style={{
                                    padding: '3px 6px',
                                    borderRadius: '3px',
                                    fontSize: '10px',
                                    fontWeight: 'bold',
                                    backgroundColor: points === 3 ? '#d4edda' : points === 1 ? '#cce5ff' : '#f8d7da',
                                    color: points === 3 ? '#155724' : points === 1 ? '#0066cc' : '#721c24'
                                  }}>
                                    {points === 3 ? '🎯 +3' : points === 1 ? '✅ +1' : '❌ +0'}
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
            🎯 מדויק = 3 נקודות | ✅ כיוון נכון = 1 נקודה | ❌ שגוי = 0 נקודות
          </div>
        </div>
      )}
    </div>
  );
}

export default AllBetsViewer;