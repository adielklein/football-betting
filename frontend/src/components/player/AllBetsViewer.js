import React, { useState, useEffect } from 'react';

function AllBetsViewer({ selectedWeek, matches, user }) {
  const [allBets, setAllBets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  useEffect(() => {
    if (selectedWeek && selectedWeek._id && isWeekLocked()) {
      loadAllBets();
    }
  }, [selectedWeek]);

  const isWeekLocked = () => {
    if (!selectedWeek) return false;
    
    // בדיקה אם השבוע נעול או עבר זמן הנעילה
    if (selectedWeek.locked) return true;
    
    if (selectedWeek.lockTime) {
      const lockTime = new Date(selectedWeek.lockTime);
      const now = new Date();
      return now >= lockTime;
    }
    
    return false;
  };

  const loadAllBets = async () => {
    try {
      setLoading(true);
      
      const [betsResponse, usersResponse] = await Promise.all([
        fetch(`${API_URL}/bets/week/${selectedWeek._id}`),
        fetch(`${API_URL}/auth/users`)
      ]);

      const betsData = await betsResponse.json();
      const usersData = await usersResponse.json();
      
      // סינון אדמינים מרשימת המשתמשים
      const playersOnly = usersData.filter(u => u.role !== 'admin');
      
      setAllBets(Array.isArray(betsData) ? betsData : []);
      setUsers(playersOnly);
    } catch (error) {
      console.error('Error loading all bets:', error);
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
    if (!prediction || !result) return 0;
    
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

  if (!selectedWeek) {
    return null;
  }

  if (!isWeekLocked()) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
        <h2>🔒 הימורים יוצגו לאחר הנעילה</h2>
        <p style={{ color: '#666' }}>
          ההימורים של כל השחקנים יהיו זמינים לצפייה ברגע שהשבוع ינעל
        </p>
        {selectedWeek.lockTime && (
          <p style={{ color: '#888', fontSize: '14px' }}>
            השבוע ינעל ב: {new Date(selectedWeek.lockTime).toLocaleString('he-IL')}
          </p>
        )}
      </div>
    );
  }

  if (loading) {
    return (
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
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>🎯 הימורים של כל השחקנים - {selectedWeek.name}</h2>
        <div style={{ fontSize: '14px', color: '#666' }}>
          🔒 השבוע נעול - כל ההימורים גלויים
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
                        תוצאה: {match.result.team1Goals}-{match.result.team2Goals}
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
                const playerBets = allBets.filter(bet => bet.userId && bet.userId._id === player._id);
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
                                {bet.prediction.team1Goals}-{bet.prediction.team2Goals}
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
  );
}

export default AllBetsViewer;