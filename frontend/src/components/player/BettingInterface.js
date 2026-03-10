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
        successMsg.textContent = '✅ ההימור נשמר בהצלחה!';
        successMsg.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#d4edda;color:#155724;padding:12px 20px;border-radius:10px;z-index:10000;font-weight:bold;box-shadow:0 4px 15px rgba(0,0,0,0.2);font-size:14px;white-space:nowrap';
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
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>ממתינים לשבוע החדש</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>השבוע עדיין לא הופעל על ידי המנהל</p>
      </div>
    );
  }

  if (isLocked()) {
    return (
      <div className="card" style={{ textAlign: 'center', padding: '2rem 1rem' }}>
        <h2 style={{ fontSize: '1.1rem' }}>השבוע הסתיים</h2>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>שבוע {selectedWeek.name} הסתיים. עבור להיסטוריה לצפייה בתוצאות.</p>
      </div>
    );
  }

  const savedCount = Object.keys(bets).filter(id => bets[id].team1Goals !== undefined).length;

  return (
    <div>
      {/* כותרת + סטטוס */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '0.5rem',
        padding: '0 0.25rem'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>{selectedWeek.name}</h2>
        <span style={{
          fontSize: '12px',
          color: '#fff',
          backgroundColor: '#28a745',
          padding: '3px 8px',
          borderRadius: '12px',
          fontWeight: '600'
        }}>
          {savedCount}/{matches.length} נשמרו
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {matches.map((match, index) => {
          const currentBet = localBets[match._id] || {};
          const existingBet = bets[match._id] || {};
          const hasResult = match.result?.team1Goals !== undefined;
          const hasChanges = isBetChanged(match._id);
          const isComplete = isBetComplete(match._id);
          const isSaving = savingMatch === match._id;
          const isSaved = existingBet.team1Goals !== undefined;

          return (
            <div key={match._id} style={{
              padding: '0.65rem',
              border: '2px solid',
              borderColor: isSaved ? '#28a745' : '#e0e0e0',
              borderRadius: '10px',
              backgroundColor: isSaved ? '#f8fff8' : '#fafafa',
              transition: 'all 0.3s ease'
            }}>
              {/* שורה עליונה: מספר + ליגה + תאריך */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '0.4rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{
                    fontSize: '11px',
                    color: '#999',
                    fontWeight: 'bold',
                    minWidth: '18px'
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{
                    padding: '2px 6px',
                    backgroundColor: getLeagueColor(match),
                    color: 'white',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: '600'
                  }}>
                    {getLeagueName(match)}
                  </span>
                </div>
                <span style={{ color: '#888', fontSize: '12px' }}>
                  {match.date} • {match.time}
                </span>
              </div>

              {/* יחסים */}
              {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.3rem',
                  marginBottom: '0.4rem'
                }}>
                  <span style={{
                    padding: '1px 8px',
                    backgroundColor: '#e3f2fd',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#1565c0',
                    fontWeight: 'bold'
                  }}>
                    1: {match.odds.homeWin || '-'}
                  </span>
                  <span style={{
                    padding: '1px 8px',
                    backgroundColor: '#fff3e0',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#e65100',
                    fontWeight: 'bold'
                  }}>
                    X: {match.odds.draw || '-'}
                  </span>
                  <span style={{
                    padding: '1px 8px',
                    backgroundColor: '#e8f5e9',
                    borderRadius: '10px',
                    fontSize: '11px',
                    color: '#2e7d32',
                    fontWeight: 'bold'
                  }}>
                    2: {match.odds.awayWin || '-'}
                  </span>
                </div>
              )}

              {/* שמות קבוצות + קלט ניקוד - עיצוב מובייל */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                marginBottom: '0.3rem'
              }}>
                <div style={{
                  flex: '1 1 0',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '13px',
                  lineHeight: '1.2',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {match.team1}
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  flexShrink: 0
                }}>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={currentBet.team1Goals || ''}
                    onChange={(e) => handleBetChange(match._id, 'team1Goals', e.target.value)}
                    style={{
                      width: '44px',
                      height: '40px',
                      textAlign: 'center',
                      padding: '4px',
                      border: '2px solid',
                      borderColor: currentBet.team1Goals !== '' ? '#28a745' : '#ccc',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      backgroundColor: '#fff'
                    }}
                    className="input"
                    placeholder="?"
                    disabled={isSaving}
                  />
                  <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#999' }}>:</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={currentBet.team2Goals || ''}
                    onChange={(e) => handleBetChange(match._id, 'team2Goals', e.target.value)}
                    style={{
                      width: '44px',
                      height: '40px',
                      textAlign: 'center',
                      padding: '4px',
                      border: '2px solid',
                      borderColor: currentBet.team2Goals !== '' ? '#28a745' : '#ccc',
                      borderRadius: '8px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      backgroundColor: '#fff'
                    }}
                    className="input"
                    placeholder="?"
                    disabled={isSaving}
                  />
                </div>

                <div style={{
                  flex: '1 1 0',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: '13px',
                  lineHeight: '1.2',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {match.team2}
                </div>
              </div>

              {/* כפתור שמירה */}
              <button
                onClick={() => saveSingleBet(match._id)}
                disabled={isSaving || !isComplete || !hasChanges}
                style={{
                  width: '100%',
                  padding: '0.45rem',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  backgroundColor: hasChanges && isComplete ? '#28a745' : (isSaved ? '#e8f5e9' : '#e9ecef'),
                  color: hasChanges && isComplete ? 'white' : (isSaved ? '#2e7d32' : '#999'),
                  opacity: (!isComplete || !hasChanges) ? 0.8 : 1,
                  cursor: (!isComplete || !hasChanges) ? 'default' : 'pointer',
                  transition: 'all 0.2s ease',
                  WebkitAppearance: 'none',
                  touchAction: 'manipulation'
                }}
              >
                {isSaving ? '⏳ שומר...' : isSaved ? (hasChanges ? '💾 עדכן' : '✅ נשמר') : '💾 שמור'}
              </button>

              {/* הימור קודם אם קיים ושונה */}
              {isSaved && hasChanges && (
                <div style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  color: '#856404',
                  marginTop: '0.3rem',
                  backgroundColor: '#fff3cd',
                  padding: '3px 6px',
                  borderRadius: '6px'
                }}>
                  {existingBet.team1Goals}-{existingBet.team2Goals} ← {currentBet.team1Goals || '?'}-{currentBet.team2Goals || '?'}
                </div>
              )}

              {/* תוצאה סופית */}
              {hasResult && (
                <div style={{
                  marginTop: '0.4rem',
                  paddingTop: '0.4rem',
                  borderTop: '1px solid #eee',
                  textAlign: 'center',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ color: '#666' }}>תוצאה: </span>
                  <span style={{ fontWeight: 'bold' }}>
                    {match.result.team1Goals}-{match.result.team2Goals}
                  </span>
                  {isSaved && (
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      backgroundColor:
                        existingBet.team1Goals == match.result.team1Goals &&
                        existingBet.team2Goals == match.result.team2Goals
                          ? '#d4edda' : '#f8d7da',
                      color:
                        existingBet.team1Goals == match.result.team1Goals &&
                        existingBet.team2Goals == match.result.team2Goals
                          ? '#155724' : '#721c24',
                      fontSize: '11px',
                      fontWeight: 'bold'
                    }}>
                      {existingBet.team1Goals == match.result.team1Goals &&
                       existingBet.team2Goals == match.result.team2Goals
                        ? '🎯 מדויק!' : '❌'}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default BettingInterface;
