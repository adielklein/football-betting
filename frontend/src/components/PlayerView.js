import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

function PlayerView({ user, onLogout }) {
  const [weeks, setWeeks] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [matches, setMatches] = useState([]);
  const [bets, setBets] = useState({});
  const [leaderboard, setLeaderboard] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const weeksData = await api.getWeeks();
      setWeeks(weeksData);
      
      if (weeksData.length > 0) {
        const activeWeek = weeksData.find(w => w.active) || weeksData[0];
        setSelectedWeek(activeWeek);
        await loadWeekData(activeWeek._id);
      }

      // Load leaderboard
      const response = await fetch('http://localhost:5000/api/scores/leaderboard');
      const leaderData = await response.json();
      setLeaderboard(leaderData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadWeekData = async (weekId) => {
    try {
      const [matchesData, betsData] = await Promise.all([
        api.getMatches(weekId),
        api.getUserBets(user.id, weekId)
      ]);
      
      setMatches(matchesData);
      
      // Convert bets array to object for easier access
      const betsObj = {};
      betsData.forEach(bet => {
        betsObj[bet.matchId._id] = bet.prediction;
      });
      setBets(betsObj);
    } catch (error) {
      console.error('Error loading week data:', error);
    }
  };

  const updateBet = async (matchId, team1Goals, team2Goals) => {
    if (selectedWeek?.locked) {
      alert('ההימורים נעולים לשבוע זה');
      return;
    }

    try {
      await api.createBet({
        userId: user.id,
        matchId,
        weekId: selectedWeek._id,
        team1Goals: parseInt(team1Goals) || 0,
        team2Goals: parseInt(team2Goals) || 0
      });

      setBets(prev => ({
        ...prev,
        [matchId]: { team1Goals: parseInt(team1Goals) || 0, team2Goals: parseInt(team2Goals) || 0 }
      }));

      alert('הימור נשמר!');
    } catch (error) {
      console.error('Error saving bet:', error);
      alert('שגיאה בשמירת ההימור');
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
      'english': 'אנגלית',
      'spanish': 'ספרדית',
      'world': 'העולם'
    };
    return names[league] || league;
  };

  return (
    <div>
      <div className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>שלום {user.name}!</h1>
              <p style={{ color: '#666' }}>
                {selectedWeek?.name || 'אין שבוע פעיל'}
                {selectedWeek?.locked && ' (נעול)'}
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '12px', color: '#666' }}>הניקוד שלך</div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {leaderboard.find(l => l.user._id === user.id)?.totalScore || 0}
                </div>
              </div>
              <button onClick={onLogout} className="btn">יציאה</button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {!selectedWeek?.active ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2>ממתינים לשבוع החדש</h2>
            <p style={{ color: '#666' }}>השבוע עדיין לא הופעל על ידי המנהל</p>
          </div>
        ) : (
          <>
            {/* הימורים */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>הימורים ל{selectedWeek.name}</h2>
                <div style={{ fontSize: '14px' }}>
                  {selectedWeek.locked ? (
                    <span style={{ color: '#dc3545', fontWeight: '500' }}>🔒 הימורים נעולים</span>
                  ) : (
                    <span style={{ color: '#28a745', fontWeight: '500' }}>✅ ניתן להמר</span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {matches.map(match => {
                  const bet = bets[match._id] || {};
                  const hasResult = match.result?.team1Goals !== undefined;

                  return (
                    <div key={match._id} style={{ 
                      padding: '1rem',
                      border: '1px solid #ddd',
                      borderRadius: '8px',
                      backgroundColor: '#f9f9f9'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <span style={{
                          padding: '4px 8px',
                          backgroundColor: getLeagueColor(match.league),
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '12px'
                        }}>
                          {getLeagueName(match.league)}
                        </span>
                        <span style={{ color: '#666', fontSize: '14px' }}>
                          {match.date} • {match.time}
                        </span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ textAlign: 'right', fontWeight: '500' }}>{match.team1}</div>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {selectedWeek.locked ? (
                            <div style={{ 
                              padding: '0.5rem',
                              backgroundColor: '#e9ecef',
                              borderRadius: '4px',
                              minWidth: '60px',
                              textAlign: 'center',
                              fontFamily: 'monospace'
                            }}>
                              {bet.team1Goals !== undefined ? `${bet.team1Goals}-${bet.team2Goals}` : 'לא הומר'}
                            </div>
                          ) : (
                            <>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={bet.team1Goals || ''}
                                onChange={(e) => updateBet(match._id, e.target.value, bet.team2Goals)}
                                style={{ width: '50px', textAlign: 'center' }}
                                className="input"
                              />
                              <span>-</span>
                              <input
                                type="number"
                                min="0"
                                max="20"
                                value={bet.team2Goals || ''}
                                onChange={(e) => updateBet(match._id, bet.team1Goals, e.target.value)}
                                style={{ width: '50px', textAlign: 'center' }}
                                className="input"
                              />
                            </>
                          )}
                        </div>
                        
                        <div style={{ textAlign: 'left', fontWeight: '500' }}>{match.team2}</div>
                      </div>

                      {hasResult && (
                        <div style={{ 
                          marginTop: '1rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid #ddd',
                          textAlign: 'center',
                          fontSize: '14px'
                        }}>
                          <span style={{ color: '#666' }}>תוצאה: </span>
                          <span style={{ fontWeight: 'bold' }}>
                            {match.result.team1Goals}-{match.result.team2Goals}
                          </span>
                          {bet.team1Goals !== undefined && (
                            <span style={{ marginLeft: '1rem' }}>
                              ניקוד: <span style={{ fontWeight: 'bold', color: '#28a745' }}>
                                {/* חישוב ניקוד יתבצע בשרת */}
                                ?
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* דירוג */}
            <div className="card">
              <h2>דירוג כללי</h2>
              <div className="table" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'right' }}>מקום</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>שחקן</th>
                      <th style={{ padding: '12px', textAlign: 'right' }}>ניקוד כללי</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaderboard.map((entry, index) => (
                      <tr key={entry.user._id} style={{ 
                        backgroundColor: entry.user._id === user.id ? '#e3f2fd' : 'transparent' 
                      }}>
                        <td style={{ padding: '12px' }}>
                          {index === 0 && '🥇 '}
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {index + 1}
                        </td>
                        <td style={{ padding: '12px', fontWeight: '500' }}>
                          {entry.user.name}
                          {entry.user._id === user.id && <span style={{ color: '#1976d2', fontSize: '12px' }}> (אתה)</span>}
                        </td>
                        <td style={{ padding: '12px', fontWeight: 'bold', fontSize: '18px' }}>
                          {entry.totalScore}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PlayerView;