import React, { useState, useEffect } from 'react';
import TeamLogo from '../TeamLogo';

function BettingInterface({ selectedWeek, matches, bets, user, onBetUpdate }) {
  const [localBets, setLocalBets] = useState({});
  const [savingMatch, setSavingMatch] = useState(null);
  const [savedAnimation, setSavedAnimation] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : 'https://football-betting-backend.onrender.com/api';

  // Live countdown timer
  useEffect(() => {
    if (!selectedWeek?.lockTime) { setTimeLeft(null); return; }
    const calcTimeLeft = () => {
      const diff = new Date(selectedWeek.lockTime) - new Date();
      if (diff <= 0) return null;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      return { days, hours, minutes, seconds, total: diff };
    };
    setTimeLeft(calcTimeLeft());
    const timer = setInterval(() => {
      const tl = calcTimeLeft();
      setTimeLeft(tl);
      if (!tl) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [selectedWeek?.lockTime]);

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
        setSavedAnimation(matchId);
        setTimeout(() => setSavedAnimation(null), 1500);

        const successMsg = document.createElement('div');
        successMsg.textContent = 'ההימור נשמר בהצלחה!';
        successMsg.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:linear-gradient(135deg,#28a745,#20c997);color:white;padding:12px 24px;border-radius:12px;z-index:10000;font-weight:600;box-shadow:0 8px 24px rgba(40,167,69,0.35);font-size:14px;white-space:nowrap;animation:toastIn 0.3s ease';
        document.body.appendChild(successMsg);
        setTimeout(() => {
          if (document.body.contains(successMsg)) {
            successMsg.style.transition = 'opacity 0.3s ease';
            successMsg.style.opacity = '0';
            setTimeout(() => {
              if (document.body.contains(successMsg)) {
                document.body.removeChild(successMsg);
              }
            }, 300);
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

  const countdownBoxStyle = (total) => ({
    padding: '2px 5px', borderRadius: '6px', fontSize: '13px', fontWeight: '800',
    fontVariantNumeric: 'tabular-nums', textAlign: 'center',
    background: total < 3600000 ? '#fecaca' : total < 86400000 ? '#fde68a' : '#bfdbfe',
    color: total < 3600000 ? '#991b1b' : total < 86400000 ? '#92400e' : '#1e3a5f',
  });

  if (!selectedWeek?.active) {
    return (
      <div className="card" style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        background: 'linear-gradient(135deg, #f8f9ff 0%, #f0f4ff 100%)'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '0.75rem' }}>⏳</div>
        <h2 style={{ fontSize: '1.1rem', color: '#444', marginBottom: '0.3rem' }}>ממתינים לשבוע החדש</h2>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>השבוע עדיין לא הופעל על ידי המנהל</p>
      </div>
    );
  }

  if (isLocked()) {
    return (
      <div className="card" style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        background: 'linear-gradient(135deg, #fff8f0 0%, #fff3e0 100%)'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '0.75rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.1rem', color: '#444', marginBottom: '0.3rem' }}>השבוע הסתיים</h2>
        <p style={{ color: '#888', fontSize: '0.85rem' }}>שבוע {selectedWeek.name} הסתיים. עבור להיסטוריה לצפייה בתוצאות.</p>
      </div>
    );
  }

  const savedCount = Object.keys(bets).filter(id => bets[id].team1Goals !== undefined).length;
  const progressPercent = matches.length > 0 ? (savedCount / matches.length) * 100 : 0;

  return (
    <div>
      {/* כותרת + פרוגרס */}
      <div style={{
        marginBottom: '0.6rem',
        padding: '0 0.15rem'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.4rem'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#333' }}>{selectedWeek.name}</h2>
          <span style={{
            fontSize: '12px',
            color: savedCount === matches.length ? '#fff' : '#28a745',
            backgroundColor: savedCount === matches.length ? '#28a745' : '#e8f5e9',
            padding: '3px 10px',
            borderRadius: '12px',
            fontWeight: '700',
            transition: 'all 0.3s ease'
          }}>
            {savedCount}/{matches.length}
          </span>
        </div>
        {/* Progress bar */}
        <div style={{
          height: '3px',
          backgroundColor: '#e8e8e8',
          borderRadius: '2px',
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${progressPercent}%`,
            background: progressPercent === 100
              ? 'linear-gradient(90deg, #28a745, #20c997)'
              : 'linear-gradient(90deg, #007bff, #0dcaf0)',
            borderRadius: '2px',
            transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
          }}></div>
        </div>

        {/* Countdown Timer */}
        {timeLeft && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '6px', marginTop: '0.5rem', padding: '0.45rem 0.6rem',
            background: timeLeft.total < 3600000
              ? 'linear-gradient(135deg, #fef2f2, #fee2e2)'
              : timeLeft.total < 86400000
                ? 'linear-gradient(135deg, #fffbeb, #fef3c7)'
                : 'linear-gradient(135deg, #eff6ff, #dbeafe)',
            borderRadius: '12px',
            border: `1px solid ${timeLeft.total < 3600000 ? '#fca5a5' : timeLeft.total < 86400000 ? '#fde68a' : '#bfdbfe'}`
          }}>
            <span style={{ fontSize: '13px' }}>
              {timeLeft.total < 3600000 ? '🔥' : timeLeft.total < 86400000 ? '⏳' : '⏰'}
            </span>
            <span style={{
              fontSize: '12px', fontWeight: '600',
              color: timeLeft.total < 3600000 ? '#dc2626' : timeLeft.total < 86400000 ? '#d97706' : '#2563eb'
            }}>
              נסגר בעוד
            </span>
            <div style={{ display: 'flex', gap: '3px' }}>
              {timeLeft.days > 0 && (
                <span style={countdownBoxStyle(timeLeft.total)}>{timeLeft.days}<small>י</small></span>
              )}
              <span style={countdownBoxStyle(timeLeft.total)}>
                {String(timeLeft.hours).padStart(2, '0')}<small>ש</small>
              </span>
              <span style={{ ...countdownBoxStyle(timeLeft.total), minWidth: '32px' }}>
                {String(timeLeft.minutes).padStart(2, '0')}<small>ד</small>
              </span>
              <span style={{
                ...countdownBoxStyle(timeLeft.total), minWidth: '32px',
                animation: 'pulse 1s ease infinite'
              }}>
                {String(timeLeft.seconds).padStart(2, '0')}<small>ש</small>
              </span>
            </div>
          </div>
        )}
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
          const justSaved = savedAnimation === match._id;

          return (
            <div key={match._id} style={{
              padding: '0.7rem',
              border: '2px solid',
              borderColor: justSaved ? '#20c997' : (isSaved ? '#c3e6cb' : '#eee'),
              borderRadius: '14px',
              backgroundColor: isSaved ? '#fbfefb' : '#fff',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: justSaved
                ? '0 0 0 3px rgba(40,167,69,0.15), 0 4px 12px rgba(40,167,69,0.1)'
                : (isSaved ? '0 2px 8px rgba(0,0,0,0.04)' : '0 1px 4px rgba(0,0,0,0.06)'),
              animation: `slideUp 0.3s ease ${index * 0.03}s both`
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
                    fontSize: '10px',
                    color: '#bbb',
                    fontWeight: '700',
                    minWidth: '18px'
                  }}>
                    #{index + 1}
                  </span>
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: getLeagueColor(match),
                    color: 'white',
                    borderRadius: '6px',
                    fontSize: '10px',
                    fontWeight: '700',
                    letterSpacing: '0.3px',
                    boxShadow: `0 2px 4px ${getLeagueColor(match)}33`
                  }}>
                    {getLeagueName(match)}
                  </span>
                </div>
                <span style={{ color: '#aaa', fontSize: '11px', fontWeight: '500' }}>
                  {match.date} • {match.time}
                </span>
              </div>

              {/* יחסים */}
              {match.odds && (match.odds.homeWin || match.odds.draw || match.odds.awayWin) && (
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  gap: '0.25rem',
                  marginBottom: '0.4rem'
                }}>
                  {[
                    { label: '1', value: match.odds.homeWin, bg: '#eef4ff', color: '#3b6fd4' },
                    { label: 'X', value: match.odds.draw, bg: '#fef6e6', color: '#c67e00' },
                    { label: '2', value: match.odds.awayWin, bg: '#edf7ee', color: '#2d8a3e' }
                  ].map(odd => (
                    <span key={odd.label} style={{
                      padding: '2px 10px',
                      backgroundColor: odd.bg,
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: odd.color,
                      fontWeight: '700',
                      minWidth: '48px',
                      textAlign: 'center'
                    }}>
                      {odd.label}: {odd.value || '-'}
                    </span>
                  ))}
                </div>
              )}

              {/* שמות קבוצות + קלט ניקוד */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                marginBottom: '0.4rem'
              }}>
                <div style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '13px',
                  lineHeight: '1.2',
                  minWidth: 0,
                  color: '#333'
                }}>
                  <TeamLogo name={match.team1} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{match.team1}</span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  flexShrink: 0
                }}>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={currentBet.team1Goals || ''}
                    onChange={(e) => handleBetChange(match._id, 'team1Goals', e.target.value)}
                    style={{
                      width: '46px',
                      height: '42px',
                      textAlign: 'center',
                      padding: '4px',
                      border: '2px solid',
                      borderColor: currentBet.team1Goals !== '' && currentBet.team1Goals !== undefined ? '#28a745' : '#ddd',
                      borderRadius: '10px',
                      fontSize: '20px',
                      fontWeight: '800',
                      backgroundColor: '#fff',
                      color: '#333',
                      boxShadow: currentBet.team1Goals !== '' && currentBet.team1Goals !== undefined
                        ? '0 0 0 3px rgba(40,167,69,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    className="input"
                    placeholder="?"
                    disabled={isSaving}
                  />
                  <span style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#ccc',
                    lineHeight: 1
                  }}>:</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={currentBet.team2Goals || ''}
                    onChange={(e) => handleBetChange(match._id, 'team2Goals', e.target.value)}
                    style={{
                      width: '46px',
                      height: '42px',
                      textAlign: 'center',
                      padding: '4px',
                      border: '2px solid',
                      borderColor: currentBet.team2Goals !== '' && currentBet.team2Goals !== undefined ? '#28a745' : '#ddd',
                      borderRadius: '10px',
                      fontSize: '20px',
                      fontWeight: '800',
                      backgroundColor: '#fff',
                      color: '#333',
                      boxShadow: currentBet.team2Goals !== '' && currentBet.team2Goals !== undefined
                        ? '0 0 0 3px rgba(40,167,69,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    className="input"
                    placeholder="?"
                    disabled={isSaving}
                  />
                </div>

                <div style={{
                  flex: '1 1 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  textAlign: 'center',
                  fontWeight: '700',
                  fontSize: '13px',
                  lineHeight: '1.2',
                  minWidth: 0,
                  color: '#333'
                }}>
                  <TeamLogo name={match.team2} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>{match.team2}</span>
                </div>
              </div>

              {/* כפתור שמירה */}
              <button
                onClick={() => saveSingleBet(match._id)}
                disabled={isSaving || !isComplete || !hasChanges}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '700',
                  background: hasChanges && isComplete
                    ? 'linear-gradient(135deg, #28a745, #20c997)'
                    : (isSaved ? '#f0faf0' : '#f5f5f5'),
                  color: hasChanges && isComplete ? 'white' : (isSaved ? '#2e7d32' : '#aaa'),
                  opacity: (!isComplete || !hasChanges) ? 0.85 : 1,
                  cursor: (!isComplete || !hasChanges) ? 'default' : 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                  WebkitAppearance: 'none',
                  touchAction: 'manipulation',
                  boxShadow: hasChanges && isComplete ? '0 4px 12px rgba(40,167,69,0.25)' : 'none',
                  letterSpacing: '0.3px'
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
                  backgroundColor: '#fff8e1',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  border: '1px solid #ffe082'
                }}>
                  {existingBet.team1Goals}-{existingBet.team2Goals} ← {currentBet.team1Goals || '?'}-{currentBet.team2Goals || '?'}
                </div>
              )}

              {/* תוצאה סופית */}
              {hasResult && (
                <div style={{
                  marginTop: '0.4rem',
                  paddingTop: '0.4rem',
                  borderTop: '1px solid #f0f0f0',
                  textAlign: 'center',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ color: '#999', fontSize: '12px' }}>תוצאה:</span>
                  <span style={{ fontWeight: '800', fontSize: '15px', color: '#333' }}>
                    {match.result.team1Goals}-{match.result.team2Goals}
                  </span>
                  {isSaved && (
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '8px',
                      backgroundColor:
                        existingBet.team1Goals == match.result.team1Goals &&
                        existingBet.team2Goals == match.result.team2Goals
                          ? '#d4edda' : '#fce4ec',
                      color:
                        existingBet.team1Goals == match.result.team1Goals &&
                        existingBet.team2Goals == match.result.team2Goals
                          ? '#155724' : '#c62828',
                      fontSize: '11px',
                      fontWeight: '700'
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
