import React, { useState, useEffect } from 'react';
import TeamLogo from '../TeamLogo';
import MatchInsightsModal from './MatchInsightsModal';
import LiveScore from './LiveScore';
import GoalFlash from './GoalFlash';
import useLiveScores from '../../services/useLiveScores';
import { showsLiveBadge } from '../../services/liveBetStatus';
import { setUnsavedChecker } from '../../services/unsavedGuard';
import { toast } from '../../services/toast';
import Score from '../Score';

// שם קבוצה לחיץ - פותח את חלון הנתונים. התג על הלוגו מסמן שאפשר ללחוץ
// בלי להוסיף גובה לשורה הצפופה.
function TeamPicker({ name, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
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
        color: 'var(--text, #333)',
        background: 'transparent',
        border: 'none',
        padding: '4px 2px',
        borderRadius: '10px',
        cursor: 'pointer',
        font: 'inherit',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        transition: 'background 0.2s ease'
      }}
      onTouchStart={(e) => { e.currentTarget.style.background = 'var(--surface-3, #f2f6fc)'; }}
      onTouchEnd={(e) => { e.currentTarget.style.background = 'transparent'; }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3, #f2f6fc)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      aria-label={`נתונים על ${name}`}
    >
      {/* הסימון יושב ליד השם ולא על הלוגו. כשהוא היה מוצמד לפינת הלוגו הוא
          כיסה חלק ממנו, והסמל של הקבוצה הוא בדיוק מה שמזהים לפיו בסריקה
          מהירה של שלושה-עשר משחקים. */}
      <TeamLogo name={name} />
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '3px',
        fontWeight: 700, maxWidth: '100%'
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
        <span style={{ fontSize: '9px', opacity: 0.5, flexShrink: 0 }} aria-hidden="true">📊</span>
      </span>
    </button>
  );
}

// השרת מסביר בדיוק למה שמירה נדחתה, והלקוח היה זורק את ההסבר ומציג
// "שגיאה בשמירת ההימור" גנרי. שחקן שניסה להמר אחרי שההימורים נסגרו
// ראה שגיאה בלי לדעת למה, וחשב שהאפליקציה פשוט לא שמרה לו.
const SAVE_ERRORS = [
  { match: /locked/i, text: 'ההימורים לשבוע הזה כבר נסגרו', closed: true },
  { match: /expired/i, text: 'זמן ההימורים הסתיים', closed: true },
  { match: /not active/i, text: 'השבוע הזה אינו פתוח להימורים', closed: true }
];

const describeSaveError = (serverMessage) => {
  const hit = SAVE_ERRORS.find((e) => e.match.test(serverMessage || ''));
  return hit || { text: 'שגיאה בשמירת ההימור', closed: false };
};
function BettingInterface({ selectedWeek, matches, bets, user, onBetUpdate }) {
  const [insightsFor, setInsightsFor] = useState(null);
  const [localBets, setLocalBets] = useState({});
  const [savingMatch, setSavingMatch] = useState(null);
  const [savedAnimation, setSavedAnimation] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  // השרת דחה שמירה בגלל סגירה. הדגל מקומי בכוונה - הוא מסנכרן את המסך
  // עם המציאות מיד, בלי להמתין לטעינה מחדש של השבוע.
  const [lockedByServer, setLockedByServer] = useState(false);

  const { liveByMatchId, goalAtByMatchId } = useLiveScores(selectedWeek?._id);

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

  useEffect(() => { setLockedByServer(false); }, [selectedWeek?._id]);

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

  // הקלט מוגבל לספרות בלבד ולשתי תווים. עם inputMode מספרי הדפדפן פותח
  // מקלדת ספרות במקום מקלדת מלאה, וזה חוסך את רוב החיכוך במילוי שלושה-עשר
  // משחקים - בלי לקחת מקום מהפריסה, שאין בה מקום לתת.
  const handleBetChange = (matchId, field, value) => {
    const digits = String(value).replace(/\D/g, '').slice(0, 2);

    setLocalBets(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: digits
      }
    }));

    // אין כאן מעבר אוטומטי לשדה השני בכוונה. ניסיתי, וזה חוסך הקשה אחת
    // אבל מזיז את הסמן מתחת לאצבע: מי שמקליד תוצאה דו-ספרתית מקבל ספרה
    // בכל שדה, ומי שמתקן הימור קיים מגלה שהמיקוד קפץ. שני שחקנים דיווחו
    // באותו ערב שההימורים התהפכו - לא הצלחתי להוכיח קשר, אבל חיסכון של
    // הקשה אחת לא שווה ספק כזה.
  };

  // מיקוד בוחר את התוכן, כך שהקלדה מחליפה במקום להוסיף בסוף
  const selectOnFocus = (e) => e.target.select();

  const saveSingleBet = async (matchId) => {
    if (selectedWeek?.locked) {
      toast.error('ההימורים נעולים לשבוע זה');
      return;
    }

    if (selectedWeek?.lockTime) {
      const lockTime = new Date(selectedWeek.lockTime);
      const now = new Date();
      if (now >= lockTime) {
        toast.error('זמן ההימורים הסתיים לשבוע זה');
        return;
      }
    }

    const bet = localBets[matchId];
    if (!bet || bet.team1Goals === '' || bet.team2Goals === '') {
      toast.warning('יש למלא את שני הצדדים של ההימור');
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

        toast.success('ההימור נשמר בהצלחה!');
      } else {
        const body = await response.json().catch(() => null);
        const reason = describeSaveError(body?.message);
        toast.error(reason.text);

        // נסגר בזמן שהמסך היה פתוח: אין טעם להשאיר טופס חי שכל שמירה בו
        // תיכשל. המסך עובר מיד למצב סגור, כמו במסך שנטען מחדש.
        if (reason.closed) setLockedByServer(true);
      }
    } catch (error) {
      console.error('Error saving bet:', error);
      toast.error('שגיאה בשמירת ההימור');
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
    if (lockedByServer) return true;
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

  // ההימורים לא נשמרים אוטומטית, ולכן מעבר לשונית או סגירת הדף עלולים
  // לאבד תוצאה שהוקלדה. הבודק נרשם גלובלית כי הוא נדרש גם מחוץ למסך הזה.
  useEffect(
    () => setUnsavedChecker(() => matches.some((m) => isBetChanged(m._id))),
    [matches, localBets, bets]
  );

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
        background: 'var(--info-bg, #f8f9ff)'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '0.75rem' }}>⏳</div>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-2, #444)', marginBottom: '0.3rem' }}>ממתינים לשבוע החדש</h2>
        <p style={{ color: 'var(--text-3, #888)', fontSize: '0.85rem' }}>השבוע עדיין לא הופעל על ידי המנהל</p>
      </div>
    );
  }

  if (isLocked()) {
    return (
      <div className="card" style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        background: 'var(--warn-bg, #fff8f0)'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '0.75rem' }}>🔒</div>
        <h2 style={{ fontSize: '1.1rem', color: 'var(--text-2, #444)', marginBottom: '0.3rem' }}>ההימורים נסגרו</h2>
        <p style={{ color: 'var(--text-3, #888)', fontSize: '0.85rem' }}>
          ההימורים ל{selectedWeek.name} נסגרו עם תחילת המשחק הראשון
          {selectedWeek.lockTime ? ` (${new Date(selectedWeek.lockTime).toLocaleString('he-IL', { weekday: 'long', hour: '2-digit', minute: '2-digit' })})` : ''}.
          {' '}אפשר לעקוב אחרי התוצאות בלשונית הטבלה.
        </p>
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
          <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: 'var(--text, #333)' }}>{selectedWeek.name}</h2>
          <span style={{
            fontSize: '12px',
            color: savedCount === matches.length ? '#fff' : 'var(--good-fg, #28a745)',
            backgroundColor: savedCount === matches.length ? '#28a745' : 'var(--good-bg, #e8f5e9)',
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
          backgroundColor: 'var(--surface-3, #e8e8e8)',
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
              ? 'var(--bad-bg, #fef2f2)'
              : timeLeft.total < 86400000
                ? 'var(--warn-bg, #fffbeb)'
                : 'var(--info-bg, #eff6ff)',
            borderRadius: '12px',
            border: `1px solid ${timeLeft.total < 3600000 ? '#fca5a5' : timeLeft.total < 86400000 ? '#fde68a' : '#bfdbfe'}`
          }}>
            <span style={{ fontSize: '13px' }}>
              {timeLeft.total < 3600000 ? '🔥' : timeLeft.total < 86400000 ? '⏳' : '⏰'}
            </span>
            <span style={{
              fontSize: '12px', fontWeight: '600',
              color: timeLeft.total < 3600000 ? 'var(--bad-fg, #dc2626)' : timeLeft.total < 86400000 ? '#d97706' : 'var(--info-fg, #2563eb)'
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
          const live = liveByMatchId[match._id];

          return (
            <div key={match._id} style={{
              position: 'relative',
              padding: '0.7rem',
              border: '2px solid',
              borderColor: justSaved ? '#20c997' : (isSaved ? 'var(--border-2, #c3e6cb)' : 'var(--border, #eee)'),
              borderRadius: '14px',
              backgroundColor: isSaved ? 'var(--surface-2, #fbfefb)' : 'var(--surface, #fff)',
              transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              boxShadow: justSaved
                ? '0 0 0 3px rgba(40,167,69,0.15), 0 4px 12px rgba(40,167,69,0.1)'
                : (isSaved ? '0 2px 8px rgba(0,0,0,0.04)' : '0 1px 4px rgba(0,0,0,0.06)'),
              animation: `slideUp 0.3s ease ${index * 0.03}s both`
            }}>
              <GoalFlash at={goalAtByMatchId[match._id]} radius="14px" />
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
                    color: 'var(--text-4, #bbb)',
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
                {showsLiveBadge(live, match.result) ? (
                  <LiveScore live={live} prediction={existingBet} result={match.result} />
                ) : (
                  <span style={{ color: 'var(--text-4, #aaa)', fontSize: '11px', fontWeight: '500' }}>
                    {match.date} • {match.time}
                  </span>
                )}
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
                <TeamPicker
                  name={match.team1}
                  onClick={() => setInsightsFor({ match, focusTeam: 1 })}
                />

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  flexShrink: 0
                }}>
                  <input
                    id={`bet-${match._id}-1`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    autoComplete="off"
                    value={currentBet.team1Goals || ''}
                    onFocus={selectOnFocus}
                    onChange={(e) => handleBetChange(match._id, 'team1Goals', e.target.value)}
                    style={{
                      width: '46px',
                      height: '42px',
                      textAlign: 'center',
                      padding: '4px',
                      border: '2px solid',
                      borderColor: currentBet.team1Goals !== '' && currentBet.team1Goals !== undefined ? '#28a745' : 'var(--border-2, #ddd)',
                      borderRadius: '10px',
                      fontSize: '20px',
                      fontWeight: '800',
                      backgroundColor: 'var(--surface, #fff)',
                      color: 'var(--text, #333)',
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
                    color: 'var(--text-4, #ccc)',
                    lineHeight: 1
                  }}>:</span>
                  <input
                    id={`bet-${match._id}-2`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={2}
                    autoComplete="off"
                    value={currentBet.team2Goals || ''}
                    onFocus={selectOnFocus}
                    onChange={(e) => handleBetChange(match._id, 'team2Goals', e.target.value)}
                    style={{
                      width: '46px',
                      height: '42px',
                      textAlign: 'center',
                      padding: '4px',
                      border: '2px solid',
                      borderColor: currentBet.team2Goals !== '' && currentBet.team2Goals !== undefined ? '#28a745' : 'var(--border-2, #ddd)',
                      borderRadius: '10px',
                      fontSize: '20px',
                      fontWeight: '800',
                      backgroundColor: 'var(--surface, #fff)',
                      color: 'var(--text, #333)',
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

                <TeamPicker
                  name={match.team2}
                  onClick={() => setInsightsFor({ match, focusTeam: 2 })}
                />
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
                    : (isSaved ? '#f0faf0' : 'var(--surface-3, #f5f5f5)'),
                  color: hasChanges && isComplete ? 'white' : (isSaved ? 'var(--good-fg, #2e7d32)' : 'var(--text-4, #aaa)'),
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
                  color: 'var(--warn-fg, #856404)',
                  marginTop: '0.3rem',
                  backgroundColor: 'var(--warn-bg, #fff8e1)',
                  padding: '4px 8px',
                  borderRadius: '8px',
                  border: '1px solid #ffe082'
                }}>
                  <Score home={existingBet.team1Goals} away={existingBet.team2Goals} /> ← <Score home={currentBet.team1Goals} away={currentBet.team2Goals} />
                </div>
              )}

              {/* תוצאה סופית */}
              {hasResult && (
                <div style={{
                  marginTop: '0.4rem',
                  paddingTop: '0.4rem',
                  borderTop: '1px solid var(--border, #f0f0f0)',
                  textAlign: 'center',
                  fontSize: '13px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ color: 'var(--text-4, #999)', fontSize: '12px' }}>תוצאה:</span>
                  <span style={{ fontWeight: '800', fontSize: '15px', color: 'var(--text, #333)' }}>
                    <Score home={match.result.team1Goals} away={match.result.team2Goals} />
                  </span>
                  {match.result.finalScore && (
                    <span style={{ fontSize: '11px', color: 'var(--text-3, #888)', fontWeight: 'normal' }}>
                      (<Score home={match.result.finalScore.team1Goals} away={match.result.finalScore.team2Goals} />
                      {match.result.finalScore.penalties && (
                        <>, פנדלים <Score home={match.result.finalScore.penalties.team1} away={match.result.finalScore.penalties.team2} /></>
                      )} לאחר הארכה)
                    </span>
                  )}
                  {isSaved && (
                    <span style={{
                      padding: '2px 10px',
                      borderRadius: '8px',
                      backgroundColor:
                        existingBet.team1Goals == match.result.team1Goals &&
                        existingBet.team2Goals == match.result.team2Goals
                          ? 'var(--good-bg, #d4edda)' : 'var(--bad-bg, #fce4ec)',
                      color:
                        existingBet.team1Goals == match.result.team1Goals &&
                        existingBet.team2Goals == match.result.team2Goals
                          ? 'var(--good-fg, #155724)' : 'var(--bad-fg, #c62828)',
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

      {insightsFor && (
        <MatchInsightsModal
          match={insightsFor.match}
          focusTeam={insightsFor.focusTeam}
          onClose={() => setInsightsFor(null)}
        />
      )}
    </div>
  );
}

export default BettingInterface;
