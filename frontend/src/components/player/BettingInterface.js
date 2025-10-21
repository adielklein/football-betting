import React, { useState, useEffect } from 'react';

function BettingInterface({ selectedWeek, matches, bets, user, onBetUpdate }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localBets, setLocalBets] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

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
    setHasChanges(false);
  }, [bets]);

  const handleBetChange = (matchId, field, value) => {
    setLocalBets(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const submitBets = async () => {
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

    // ודא שיש הימורים לשלוח
    const betsToSubmit = [];
    for (const matchId in localBets) {
      const bet = localBets[matchId];
      if (bet && bet.team1Goals !== '' && bet.team2Goals !== '') {
        // בדוק אם ההימור שונה מהקיים
        const existingBet = bets[matchId];
        if (!existingBet || 
            existingBet.team1Goals?.toString() !== bet.team1Goals || 
            existingBet.team2Goals?.toString() !== bet.team2Goals) {
          betsToSubmit.push({
            matchId,
            team1Goals: parseInt(bet.team1Goals) || 0,
            team2Goals: parseInt(bet.team2Goals) || 0
          });
        }
      }
    }

    if (betsToSubmit.length === 0) {
      alert('אין הימורים חדשים או מעודכנים לשליחה');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // שלח כל הימור בנפרד
      const results = await Promise.allSettled(
        betsToSubmit.map(bet => 
          fetch(`${API_URL}/bets`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.id,
              matchId: bet.matchId,
              weekId: selectedWeek._id,
              team1Goals: bet.team1Goals,
              team2Goals: bet.team2Goals
            })
          })
        )
      );

      // בדוק כמה הצליחו
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.ok).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.ok).length;

      if (successful > 0) {
        await onBetUpdate();
        
        // הצג הודעת הצלחה
        const successMsg = document.createElement('div');
        successMsg.textContent = `✅ ${successful} הימורים נשמרו בהצלחה!`;
        successMsg.style.cssText = 'position:fixed;top:20px;right:20px;background:#d4edda;color:#155724;padding:15px 20px;border-radius:5px;z-index:1000;font-weight:bold;box-shadow:0 2px 10px rgba(0,0,0,0.2)';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          if (document.body.contains(successMsg)) {
            document.body.removeChild(successMsg);
          }
        }, 3000);

        setHasChanges(false);
      }

      if (failed > 0) {
        alert(`⚠️ ${failed} הימורים נכשלו. נסה שוב.`);
      }
    } catch (error) {
      console.error('Error saving bets:', error);
      alert('שגיאה בשמירת ההימורים');
    } finally {
      setIsSubmitting(false);
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

  const allBetsFilled = () => {
    return matches.every(match => {
      const bet = localBets[match._id];
      return bet && bet.team1Goals !== '' && bet.team2Goals !== '';
    });
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

      {/* הודעת הסבר */}
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#e3f2fd', 
        borderRadius: '8px',
        marginBottom: '1.5rem',
        fontSize: '14px'
      }}>
        💡 <strong>הוראות:</strong> מלא את כל התחזיות ולחץ על "שלח הימורים" בתחתית העמוד
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {matches.map((match, index) => {
          const currentBet = localBets[match._id] || {};
          const existingBet = bets[match._id] || {};
          const hasResult = match.result?.team1Goals !== undefined;

          return (
            <div key={match._id} style={{ 
              padding: '1rem',
              border: '2px solid',
              borderColor: currentBet.team1Goals !== '' && currentBet.team2Goals !== '' ? '#28a745' : '#ddd',
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
                gridTemplateColumns: '1fr auto 1fr', 
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
                  />
                </div>
                
                <div style={{ textAlign: 'left', fontWeight: '500' }}>
                  {match.team2} (חוץ)
                </div>
              </div>

              {/* הימור קודם אם קיים */}
              {existingBet.team1Goals !== undefined && (
                <div style={{ 
                  textAlign: 'center',
                  fontSize: '12px',
                  color: '#666',
                  marginTop: '0.5rem'
                }}>
                  ההימור השמור: {existingBet.team1Goals}-{existingBet.team2Goals}
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
                  <span style={{ color: '#666' }}>תוצאה: </span>
                  <span style={{ fontWeight: 'bold' }}>
                    {match.result.team1Goals}-{match.result.team2Goals}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* כפתור שליחה */}
      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f8f9fa',
        borderRadius: '8px',
        textAlign: 'center'
      }}>
        <div style={{ marginBottom: '1rem', fontSize: '14px', color: '#666' }}>
          {allBetsFilled() 
            ? `✅ כל ${matches.length} ההימורים מולאו` 
            : `⚠️ מולאו ${Object.keys(localBets).filter(id => localBets[id]?.team1Goals && localBets[id]?.team2Goals).length} מתוך ${matches.length} הימורים`
          }
        </div>
        
        <button
          onClick={submitBets}
          disabled={isSubmitting || !hasChanges || Object.keys(localBets).length === 0}
          className="btn btn-primary"
          style={{
            fontSize: '18px',
            padding: '12px 40px',
            fontWeight: 'bold',
            opacity: (!hasChanges || Object.keys(localBets).length === 0) ? 0.5 : 1,
            cursor: (!hasChanges || Object.keys(localBets).length === 0) ? 'not-allowed' : 'pointer'
          }}
        >
          {isSubmitting ? (
            <>⏳ שולח...</>
          ) : (
            <>🎯 שלח הימורים</>
          )}
        </button>

        {!allBetsFilled() && hasChanges && (
          <div style={{ marginTop: '0.5rem', fontSize: '12px', color: '#dc3545' }}>
            שים לב: רק הימורים מלאים (עם שני ערכים) יישמרו
          </div>
        )}
      </div>
    </div>
  );
}

export default BettingInterface;