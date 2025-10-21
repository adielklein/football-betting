import React, { useState, useEffect } from 'react';

function BettingInterface({ selectedWeek, matches, bets, user, onBetUpdate }) {
  const [localBets, setLocalBets] = useState({});
  const [savingMatch, setSavingMatch] = useState(null);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  // טען הימורים קיימים כשמקבלים נתונים חדשים
  useEffect(() => {
    const existingBets = {};
    Object.keys(bets).forEach(matchId => {
      if (bets[matchId].team1Goals !== undefined && bets[matchId].team2Goals !== undefined) {
        existingBets[matchId] = {
          team1Goals: bets[matchId].team1Goals.toString(),
          team2Goals: bets[matchId].team2Goals.toString()
        };
      }
    });
    setLocalBets(existingBets);
  }, [bets]);

  const handleBetChange = (matchId, field, value) => {
    setLocalBets(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
  };

  const saveSingleBet = async (matchId) => {
    // בדוק נעילת שבוע
    if (selectedWeek?.locked) {
      alert('ההימורים נעולים לשבוע זה');
      return;
    }

    if (selectedWeek?.lockTime) {
      const lockTime = new Date(selectedWeek.lockTime);
      const now = new Date();
      if (now >= lockTime) {
        alert('זמן ההימורים הסתיים לשבוע זה');
        return;
      }
    }

    const bet = localBets[matchId];
    if (!bet || bet.team1Goals === '' || bet.team2Goals === '') {
      alert('יש למלא את שני הצדדים של ההימור');
      return;
    }

    setSavingMatch(matchId);
    
    try {
      const response = await fetch(`${API_URL}/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          matchId: matchId,
          weekId: selectedWeek._id,
          team1Goals: parseInt(bet.team1Goals) || 0,
          team2Goals: parseInt(bet.team2Goals) || 0
        })
      });

      if (response.ok) {
        await onBetUpdate();
        
        // הצג הודעת הצלחה
        const successMsg = document.createElement('div');
        successMsg.textContent = `✅ ההימור נשמר בהצלחה!`;
        successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:#d4edda;color:#155724;padding:15px 20px;border-radius:5px;z-index:1000;font-weight:bold;box-shadow:0 2px 10px rgba(0,0,0,0.2)';
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
      setSavingMatch(null);
    }
  };

  const getLeagueColor = (match) => {
    // בדוק אם יש populate של leagueId
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.color) {
      return match.leagueId.color;
    }
    
    // fallback למפתח הישן
    const colors = {
      'english': '#dc3545',
      'spanish': '#007bff',
      'world': '#6f42c1'
    };
    return colors[match.league] || '#6c757d';
  };

  const getLeagueName = (match) => {
    // בדוק אם יש populate של leagueId
    if (match.leagueId && typeof match.leagueId === 'object' && match.leagueId.name) {
      return match.leagueId.name;
    }
    
    // fallback למפתח הישן
    const names = {
      'english': 'פרמייר ליג',
      'spanish': 'לה ליגה',
      'world': 'ליגת העל'
    };
    return names[match.league] || match.league;
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

  const isBetChanged = (matchId) => {
    const current = localBets[matchId];
    const existing = bets[matchId];
    
    if (!current) return false;
    if (!existing) return current.team1Goals !== '' || current.team2Goals !== '';
    
    return current.team1Goals !== existing.team1Goals?.toString() || 
           current.team2Goals !== existing.team2Goals?.toString();
  };

  const isBetComplete = (matchId) => {
    const bet = localBets[matchId];
    return bet && bet.team1Goals !== '' && bet.team2Goals !== '';
  };

  if (!selectedWeek?.active) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
        <h2>ממתינים לשבוע החדש</h2>
        <p style={{ color: '#666' }}>השבוע עדיין לא הופעל על ידי המנהל</p>
      </div>
    );
  }

  if (isLocked()) {
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
        <div style={{ fontSize: '14px', color: '#28a745', fontWeight: '500' }}>
          ✅ ניתן להמר
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {matches.map((match, index) => {
          const currentBet = localBets[match._id] || {};
          const existingBet = bets[match._id] || {};
          const hasResult = match.result?.team1Goals !== undefined;
          const hasChanges = isBetChanged(match._id);
          const isComplete = isBetComplete(match._id);
          const isSaving = savingMatch === match._id;

          return (
            <div key={match._id} style={{ 
              padding: '1rem',
              border: '2px solid',
              borderColor: existingBet.team1Goals !== undefined ? '#28a745' : '#ddd',
              borderRadius: '8px',
              backgroundColor: '#f9f9f9',
              transition: 'all 0.3s ease'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ 
                    fontSize: '12px', 
                    color: '#666',
                    fontWeight: 'bold'
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{
                    padding: '4px 8px',
                    backgroundColor: getLeagueColor(match),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {getLeagueName(match)}
                  </span>
                </div>
                <span style={{ color: '#666', fontSize: '14px' }}>
                  📅 {match.date} • ⏰ {match.time}
                </span>
              </div>

              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr auto 1fr auto', 
                gap: '1rem', 
                alignItems: 'center',
                marginBottom: '0.5rem'
              }}>
                <div style={{ textAlign: 'right', fontWeight: '500' }}>
                  {match.team1} (בית)
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={currentBet.team1Goals || ''}
                    onChange={(e) => handleBetChange(match._id, 'team1Goals', e.target.value)}
                    style={{ 
                      width: '50px', 
                      textAlign: 'center',
                      padding: '5px',
                      border: '2px solid',
                      borderColor: currentBet.team1Goals !== '' ? '#28a745' : '#ddd',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                    className="input"
                    placeholder="?"
                    disabled={isSaving}
                  />
                  <span style={{ fontSize: '18px', fontWeight: 'bold' }}>-</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={currentBet.team2Goals || ''}
                    onChange={(e) => handleBetChange(match._id, 'team2Goals', e.target.value)}
                    style={{ 
                      width: '50px', 
                      textAlign: 'center',
                      padding: '5px',
                      border: '2px solid',
                      borderColor: currentBet.team2Goals !== '' ? '#28a745' : '#ddd',
                      borderRadius: '4px',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                    className="input"
                    placeholder="?"
                    disabled={isSaving}
                  />
                </div>
                
                <div style={{ textAlign: 'left', fontWeight: '500' }}>
                  {match.team2} (חוץ)
                </div>

                {/* כפתור שמירה לכל משחק */}
                <button
                  onClick={() => saveSingleBet(match._id)}
                  disabled={isSaving || !isComplete || !hasChanges}
                  className="btn"
                  style={{
                    padding: '6px 16px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    backgroundColor: hasChanges && isComplete ? '#28a745' : '#6c757d',
                    color: 'white',
                    opacity: (!isComplete || !hasChanges) ? 0.5 : 1,
                    cursor: (!isComplete || !hasChanges) ? 'not-allowed' : 'pointer',
                    minWidth: '80px'
                  }}
                >
                  {isSaving ? (
                    <>⏳</>
                  ) : existingBet.team1Goals !== undefined ? (
                    hasChanges ? '💾 עדכן' : '✅ נשמר'
                  ) : (
                    '💾 שמור'
                  )}
                </button>
              </div>

              {/* הימור קודם אם קיים ושונה */}
              {existingBet.team1Goals !== undefined && hasChanges && (
                <div style={{ 
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '0.5rem',
                  backgroundColor: '#fff3cd',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  ההימור הנוכחי: {existingBet.team1Goals}-{existingBet.team2Goals} ← ישונה ל: {currentBet.team1Goals || '?'}-{currentBet.team2Goals || '?'}
                </div>
              )}

              {/* הימור נשמר */}
              {existingBet.team1Goals !== undefined && !hasChanges && (
                <div style={{ 
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#155724',
                  marginTop: '0.5rem',
                  backgroundColor: '#d4edda',
                  padding: '4px 8px',
                  borderRadius: '4px'
                }}>
                  ✅ ההימור שלך: {existingBet.team1Goals}-{existingBet.team2Goals}
                </div>
              )}

              {hasResult && (
                <div style={{ 
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid #ddd',
                  textAlign: 'center',
                  fontSize: '14px'
                }}>
                  <span style={{ color: '#666' }}>תוצאה סופית: </span>
                  <span style={{ fontWeight: 'bold', color: '#333' }}>
                    {match.result.team1Goals}-{match.result.team2Goals}
                  </span>
                  {existingBet.team1Goals !== undefined && (
                    <span style={{ 
                      marginLeft: '1rem',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 
                        existingBet.team1Goals == match.result.team1Goals && 
                        existingBet.team2Goals == match.result.team2Goals 
                          ? '#d4edda' 
                          : '#f8d7da',
                      color: 
                        existingBet.team1Goals == match.result.team1Goals && 
                        existingBet.team2Goals == match.result.team2Goals 
                          ? '#155724' 
                          : '#721c24',
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}>
                      {existingBet.team1Goals == match.result.team1Goals && 
                       existingBet.team2Goals == match.result.team2Goals 
                        ? '🎯 ניחוש מדויק!' 
                        : '❌ לא דייקת'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* סיכום סטטוס */}
      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center',
        fontSize: '14px'
      }}>
        <strong>סטטוס הימורים:</strong> {' '}
        {Object.keys(bets).filter(id => bets[id].team1Goals !== undefined).length} מתוך {matches.length} משחקים נשמרו
      </div>
    </div>
  );
}

export default BettingInterface;