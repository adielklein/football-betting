import React, { useState } from 'react';

function BettingInterface({ selectedWeek, matches, bets, user, onBetUpdate }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [betValues, setBetValues] = useState({});

  const updateBet = async (matchId, team1Goals, team2Goals) => {
    if (selectedWeek?.locked) {
      alert('ההימורים נעולים לשבוע זה');
      return;
    }

    if (selectedWeek?.lockTime) {
      const lockTime = new Date(selectedWeek.lockTime);
      const now = new Date();
      if (now >= lockTime) {
        alert('זמן ההימורים הסתיים למשחק זה');
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:5000/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          matchId,
          weekId: selectedWeek._id,
          team1Goals: parseInt(team1Goals) || 0,
          team2Goals: parseInt(team2Goals) || 0
        })
      });

      if (response.ok) {
        setBetValues(prev => ({
          ...prev,
          [matchId]: { team1Goals: parseInt(team1Goals) || 0, team2Goals: parseInt(team2Goals) || 0 }
        }));
        
        await onBetUpdate();
        
        const successMsg = document.createElement('div');
        successMsg.textContent = 'הימור נשמר!';
        successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:#d4edda;color:#155724;padding:10px;border-radius:5px;z-index:1000;font-weight:bold';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          if (document.body.contains(successMsg)) {
            document.body.removeChild(successMsg);
          }
        }, 2000);
      } else {
        alert('שגיאה בשמירת ההימור');
      }
    } catch (error) {
      console.error('Error saving bet:', error);
      alert('שגיאה בשמירת ההימור');
    } finally {
      setIsSubmitting(false);
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

  const isLocked = () => {
    if (selectedWeek?.locked) return true;
    if (selectedWeek?.lockTime) {
      const lockTime = new Date(selectedWeek.lockTime);
      const now = new Date();
      return now >= lockTime;
    }
    return false;
  };

  if (!selectedWeek?.active) {
    console.log('אין שבוע פעיל:', selectedWeek);
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>ממתינים לשבוע החדש</h2>
        <p style={{ color: '#666' }}>השבוע עדיין לא הופעל על ידי המנהל</p>
      </div>
    );
  }

  if (selectedWeek?.locked) {
    console.log('השבוע נעול:', selectedWeek);
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>השבוע הסתיים</h2>
        <p style={{ color: '#666' }}>שבוע {selectedWeek.name} הסתיים. עבור להיסטוריה לצפייה בתוצאות.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2>הימורים ל{selectedWeek.name}</h2>
        <div style={{ fontSize: '14px' }}>
          {isLocked() ? (
            <span style={{ color: '#dc3545', fontWeight: '500' }}>הימורים נעולים</span>
          ) : (
            <span style={{ color: '#28a745', fontWeight: '500' }}>ניתן להמר</span>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {matches.map(match => {
          const bet = bets[match._id] || betValues[match._id] || {};
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
                  {isLocked() ? (
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
                        value={betValues[match._id]?.team1Goals ?? bet.team1Goals ?? ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setBetValues(prev => ({
                            ...prev,
                            [match._id]: { 
                              ...prev[match._id], 
                              team1Goals: newValue 
                            }
                          }));
                        }}
                        onBlur={(e) => {
                          const team1Value = e.target.value;
                          const team2Value = betValues[match._id]?.team2Goals ?? bet.team2Goals ?? '';
                          
                          if (team1Value !== '' && team2Value !== '') {
                            updateBet(match._id, team1Value, team2Value);
                          }
                        }}
                        style={{ width: '50px', textAlign: 'center' }}
                        className="input"
                        disabled={isSubmitting}
                        placeholder="0"
                      />
                      <span>-</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={betValues[match._id]?.team2Goals ?? bet.team2Goals ?? ''}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setBetValues(prev => ({
                            ...prev,
                            [match._id]: { 
                              ...prev[match._id], 
                              team2Goals: newValue 
                            }
                          }));
                        }}
                        onBlur={(e) => {
                          const team2Value = e.target.value;
                          const team1Value = betValues[match._id]?.team1Goals ?? bet.team1Goals ?? '';
                          
                          if (team1Value !== '' && team2Value !== '') {
                            updateBet(match._id, team1Value, team2Value);
                          }
                        }}
                        style={{ width: '50px', textAlign: 'center' }}
                        className="input"
                        disabled={isSubmitting}
                        placeholder="0"
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
                    <div style={{ marginTop: '0.5rem' }}>
                      <span style={{ color: '#666' }}>ההימור שלך: </span>
                      <span style={{ fontWeight: 'bold' }}>
                        {bet.team1Goals}-{bet.team2Goals}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {isSubmitting && (
        <div style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          zIndex: 1000,
          textAlign: 'center'
        }}>
          <div style={{
            width: '30px',
            height: '30px',
            border: '3px solid #333',
            borderTop: '3px solid #fff',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 10px auto'
          }}></div>
          שומר הימור...
          
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}

export default BettingInterface;