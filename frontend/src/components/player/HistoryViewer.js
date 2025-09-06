import React, { useState, useEffect } from 'react';

function HistoryViewer({ weeks, user }) {
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState(null);
  const [historyData, setHistoryData] = useState({ matches: [], bets: [], allBets: [] });
  const [loading, setLoading] = useState(false);

  const loadHistoryData = async (weekId) => {
    if (!weekId) return;
    
    setLoading(true);
    try {
      const [matchesResponse, userBetsResponse, allBetsResponse] = await Promise.all([
        fetch(`http://localhost:5000/api/matches/week/${weekId}`),
        fetch(`http://localhost:5000/api/bets/user/${user.id}/week/${weekId}`),
        fetch(`http://localhost:5000/api/bets/week/${weekId}`)
      ]);

      const matches = await matchesResponse.json();
      const userBetsArray = await userBetsResponse.json();
      const allBets = await allBetsResponse.json();

      console.log('היסטוריה - נתונים נטענו:', { matches, userBetsArray, allBets });

      // Convert user bets to object
      const userBetsObj = {};
      if (Array.isArray(userBetsArray)) {
        userBetsArray.forEach(bet => {
          if (bet && bet.matchId) {
            // אם matchId הוא object עם _id
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

  // פונקציה מדויקת יותר לבדיקת סטטוס שבוע
  const getWeekStatus = (week) => {
    if (!week.active) {
      return 'לא פעיל';
    }
    
    if (week.locked) {
      return 'הסתיים';
    }
    
    // אם פעיל אבל לא נעול, בדוק אם עבר זמן הנעילה
    if (week.lockTime) {
      const lockTime = new Date(week.lockTime);
      const now = new Date();
      
      console.log(`🔍 בודק זמן נעילה של "${week.name}":`, {
        lockTime: lockTime.toLocaleString('he-IL'),
        now: now.toLocaleString('he-IL'),
        passed: now >= lockTime
      });
      
      if (now >= lockTime) {
        return 'הסתיים (עבר זמן)';
      } else {
        return 'פתוח להימורים';
      }
    }
    
    return 'פתוח להימורים';
  };

  // הראה את כל השבועות
  const availableWeeks = weeks.filter(week => week && week._id);

  console.log('השבועות הזמינים להיסטוריה:', availableWeeks);

  return (
    <div className="card">
      <h2>היסטוריית שבועות</h2>
      
      <div style={{ marginBottom: '1rem' }}>
        <select 
          value={selectedHistoryWeek?._id || ''} 
          onChange={(e) => {
            const week = weeks.find(w => w._id === e.target.value);
            setSelectedHistoryWeek(week);
            if (week) loadHistoryData(week._id);
          }}
          className="input"
          style={{ width: '300px' }}
        >
          <option value="">בחר שבוע לצפייה</option>
          {availableWeeks.map(week => {
            const status = getWeekStatus(week);
            
            return (
              <option key={week._id} value={week._id}>
                {week.name} ({status})
              </option>
            );
          })}
        </select>
        
        {availableWeeks.length === 0 && (
          <p style={{ color: '#666', marginTop: '1rem' }}>
            אין שבועות זמינים עדיין
          </p>
        )}
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          טוען נתונים...
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
              <p style={{ margin: 0, color: '#666' }}>
                {getWeekStatus(selectedHistoryWeek)}
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
                    if (bet.team1Goals === match.result.team1Goals && bet.team2Goals === match.result.team2Goals) {
                      points = 3;
                    } else {
                      const betOutcome = bet.team1Goals > bet.team2Goals ? 'home' : bet.team1Goals < bet.team2Goals ? 'away' : 'draw';
                      const resultOutcome = match.result.team1Goals > match.result.team2Goals ? 'home' : match.result.team1Goals < match.result.team2Goals ? 'away' : 'draw';
                      if (betOutcome === resultOutcome) {
                        points = 1;
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
                            backgroundColor: getLeagueColor(match.league),
                            color: 'white',
                            borderRadius: '3px',
                            fontSize: '10px',
                            marginRight: '8px'
                          }}>
                            {getLeagueName(match.league)}
                          </span>
                          <strong>{match.team1} נגד {match.team2}</strong>
                        </div>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          {match.date} • {match.time}
                        </span>
                      </div>

                      {/* ההימור שלך - מודגש ובמיקום בולט */}
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
                        {/* התוצאה האמיתית תחת ההימור עם שמות הקבוצות */}
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
                        {!hasResult && (
                          <div style={{ fontSize: '10px', color: '#666', marginTop: '0.2rem' }}>
                            {bet && `${match.team1} ${bet.team1Goals} - ${bet.team2Goals} ${match.team2}`}
                          </div>
                        )}
                      </div>

                      {/* הניקוד */}
                      <div style={{ textAlign: 'center' }}>
                        {hasResult && bet && (
                          <span style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            backgroundColor: points === 3 ? '#d4edda' : points === 1 ? '#cce5ff' : '#f8d7da',
                            color: points === 3 ? '#155724' : points === 1 ? '#0066cc' : '#721c24'
                          }}>
                            {points === 3 ? '🎯 מדויק +3' : points === 1 ? '✅ כיוון +1' : '❌ שגוי +0'}
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

      {!selectedHistoryWeek && !loading && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
          בחר שבוע מהרשימה למעלה כדי לראות את ההיסטוריה
        </div>
      )}
    </div>
  );
}

export default HistoryViewer;