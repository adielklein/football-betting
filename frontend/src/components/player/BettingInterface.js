import React, { useState, useEffect, useRef } from 'react';
import TeamLogo from '../TeamLogo';
import LeagueLogo from '../LeagueLogo';
import TvChannels from '../TvChannels';
import MatchInsightsModal from './MatchInsightsModal';
import LiveScore from './LiveScore';
import GoalFlash from './GoalFlash';
import useLiveScores from '../../services/useLiveScores';
import { showsLiveBadge } from '../../services/liveBetStatus';
import { setUnsavedChecker } from '../../services/unsavedGuard';
import { toast } from '../../services/toast';
import { pop, confettiFrom, once } from '../../services/motion';
import { hapticError } from '../../services/haptics';
import { formatCountdown, formatLockMoment } from '../../services/countdown';
import Score from '../Score';
import { textOn } from '../../services/readableColor';

// שם קבוצה לחיץ - פותח את חלון הנתונים. התג על הלוגו מסמן שאפשר ללחוץ
// בלי להוסיף גובה לשורה הצפופה.
function TeamPicker({ name, logo, onClick }) {
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
        fontSize: 'var(--fs-sm)',
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
      {/* הסמל שנשמר בייבוא מ-365 הוא של הקבוצה הנכונה. בלעדיו הרכיב
          מנחש לפי השם מול מקור אחר, וזה מה שהיה כאן עד עכשיו */}
      <TeamLogo name={name} src={logo} />
      {/* עד שתי שורות, ורק אז שלוש נקודות. בשורה אחת "מנצ'סטר סיטי" נחתך
          ל"מנצ'סטר ..." - ובדיוק המילה השנייה מבדילה בין שתי הקבוצות */}
      <span style={{
        fontWeight: 700, maxWidth: '100%',
        display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2,
        overflow: 'hidden', overflowWrap: 'anywhere'
      }}>
        {name}
        <span style={{ fontSize: 'var(--fs-xs)', opacity: 0.5, marginInlineStart: '3px' }} aria-hidden="true">📊</span>
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
// כמה זמן אחרי ההקשה האחרונה ההימור נשמר. מספיק כדי להקליד תוצאה
// דו-ספרתית ולעבור לשדה השני בלי שמירת ביניים, וקצר מספיק כדי שיישמר
// לפני שסוגרים את האפליקציה.
const AUTOSAVE_DELAY = 900;

function BettingInterface({ selectedWeek, matches, bets, user, onBetUpdate, onBetSaved, active = true }) {
  const [insightsFor, setInsightsFor] = useState(null);
  const [localBets, setLocalBets] = useState({});
  // מצב שמירה לכל משחק: 'saving' בזמן שליחה, 'error' אחרי כישלון
  const [saveStatus, setSaveStatus] = useState({});
  const timersRef = useRef({});
  const [savedAnimation, setSavedAnimation] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  // השרת דחה שמירה בגלל סגירה. הדגל מקומי בכוונה - הוא מסנכרן את המסך
  // עם המציאות מיד, בלי להמתין לטעינה מחדש של השבוע.
  const [lockedByServer, setLockedByServer] = useState(false);

  const { liveByMatchId, goalAtByMatchId } = useLiveScores(selectedWeek?._id, active);

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

  // ההימורים מהשרת נכנסים לטופס רק במשחקים שהמשתמש לא נוגע בהם כרגע.
  // עם שמירה אוטומטית ההימורים מתעדכנים תוך כדי הקלדה, והחלפה מלאה של
  // הטופס הייתה מוחקת ספרה שהוקלדה הרגע במשחק אחר.
  const prevBetsRef = useRef({});
  useEffect(() => {
    const prevServer = prevBetsRef.current;
    setLocalBets((prev) => {
      const next = { ...prev };
      Object.keys(bets).forEach((matchId) => {
        const b = bets[matchId];
        if (b.team1Goals === undefined || b.team2Goals === undefined) return;
        const local = prev[matchId];
        const old = prevServer[matchId];
        const dirty = local && (old
          ? local.team1Goals !== String(old.team1Goals) || local.team2Goals !== String(old.team2Goals)
          : (local.team1Goals || '') !== '' || (local.team2Goals || '') !== '');
        if (!dirty) next[matchId] = { team1Goals: String(b.team1Goals), team2Goals: String(b.team2Goals) };
      });
      return next;
    });
    prevBetsRef.current = bets;
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
    // שינוי אחרי כישלון הוא ניסיון חדש
    setSaveStatus((prev) => (prev[matchId] === 'error' ? { ...prev, [matchId]: undefined } : prev));
    if (digits) pop(document.getElementById(`bet-${matchId}-${field === 'team1Goals' ? 1 : 2}`));

    // אין כאן מעבר אוטומטי לשדה השני בכוונה. ניסיתי, וזה חוסך הקשה אחת
    // אבל מזיז את הסמן מתחת לאצבע: מי שמקליד תוצאה דו-ספרתית מקבל ספרה
    // בכל שדה, ומי שמתקן הימור קיים מגלה שהמיקוד קפץ. שני שחקנים דיווחו
    // באותו ערב שההימורים התהפכו - לא הצלחתי להוכיח קשר, אבל חיסכון של
    // הקשה אחת לא שווה ספק כזה.
  };

  // מיקוד בוחר את התוכן, כך שהקלדה מחליפה במקום להוסיף בסוף
  const selectOnFocus = (e) => e.target.select();

  // שמירה של משחק אחד. נקראת אוטומטית אחרי הקלדה, ומכפתור "נסה שוב".
  // keepalive מאפשר לבקשה להסתיים גם כשהדף נסגר באמצע.
  const saveBet = async (matchId, bet, { keepalive = false } = {}) => {
    setSaveStatus((prev) => ({ ...prev, [matchId]: 'saving' }));
    const prediction = {
      team1Goals: parseInt(bet.team1Goals, 10) || 0,
      team2Goals: parseInt(bet.team2Goals, 10) || 0
    };

    try {
      const response = await fetch(`${API_URL}/bets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive,
        body: JSON.stringify({
          userId: user.id,
          matchId: matchId,
          weekId: selectedWeek._id,
          ...prediction
        })
      });

      if (response.ok) {
        setSaveStatus((prev) => ({ ...prev, [matchId]: undefined }));
        setSavedAnimation(matchId);
        setTimeout(() => setSavedAnimation((cur) => (cur === matchId ? null : cur)), 1500);
        if (onBetSaved) onBetSaved(matchId, prediction);
        else await onBetUpdate();
      } else {
        const body = await response.json().catch(() => null);
        const reason = describeSaveError(body?.message);
        setSaveStatus((prev) => ({ ...prev, [matchId]: 'error' }));
        hapticError();
        toast.error(reason.text);

        // נסגר בזמן שהמסך היה פתוח: אין טעם להשאיר טופס חי שכל שמירה בו
        // תיכשל. המסך עובר מיד למצב סגור, כמו במסך שנטען מחדש.
        if (reason.closed) setLockedByServer(true);
      }
    } catch (error) {
      console.error('Error saving bet:', error);
      setSaveStatus((prev) => ({ ...prev, [matchId]: 'error' }));
      hapticError();
      toast.error('ההימור לא נשמר - בדקו את החיבור ונסו שוב');
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
    // שדה שלא נגעו בו הוא undefined ולא מחרוזת ריקה - שניהם "לא מולא".
    // בלי זה הימור עם צד אחד נשמר כאילו בצד השני הוקלד 0.
    const filled = (v) => v !== undefined && v !== null && v !== '';
    return !!bet && filled(bet.team1Goals) && filled(bet.team2Goals);
  };

  // משחקים שההימור בהם שלם, שונה מהשמור, ולא נמצא כרגע בשליחה או בכישלון
  const pendingIds = () => matches
    .map((m) => m._id)
    .filter((id) => isBetChanged(id) && isBetComplete(id) && !saveStatus[id]);

  // שמירה אוטומטית: כל הקלדה מאפסת את הטיימר של המשחק שלה
  useEffect(() => {
    if (isLocked()) return undefined;
    const timers = timersRef.current;
    Object.values(timers).forEach(clearTimeout);
    timersRef.current = {};
    pendingIds().forEach((id) => {
      const bet = localBets[id];
      timersRef.current[id] = setTimeout(() => saveBet(id, bet), AUTOSAVE_DELAY);
    });
    return () => Object.values(timersRef.current).forEach(clearTimeout);
  }, [localBets, bets, saveStatus, matches, lockedByServer, selectedWeek?._id]);

  // יציאה מהמסך, מעבר לאפליקציה אחרת או סגירה לפני שהטיימר הספיק:
  // שומרים מיד את מה שממתין, במקום לאבד אותו
  const flushRef = useRef(() => {});
  flushRef.current = () => {
    if (isLocked()) return;
    pendingIds().forEach((id) => {
      clearTimeout(timersRef.current[id]);
      saveBet(id, localBets[id], { keepalive: true });
    });
  };
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') flushRef.current(); };
    const onPageHide = () => flushRef.current();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      flushRef.current();
    };
  }, []);

  // מה שהשמירה האוטומטית לא יכולה להציל: הימור שמולא רק בצד אחד, או
  // שמירה שנכשלה. רק עליהם שואלים לפני יציאה.
  useEffect(
    () => setUnsavedChecker(() => matches.some((m) =>
      isBetChanged(m._id) && (!isBetComplete(m._id) || saveStatus[m._id] === 'error'))),
    [matches, localBets, bets, saveStatus]
  );

  // "כל ההימורים הוזנו": חגיגה קטנה ברגע שההימור האחרון נשמר. פעם אחת לשבוע
  // לכל מכשיר, ורק כשזה קורה מול העיניים - לא בכל כניסה למסך מלא
  const counterRef = useRef(null);
  const prevCount = useRef(null);
  const prevWeekId = useRef(null);
  const [celebrateDone, setCelebrateDone] = useState(false);
  const doneNow = matches.length > 0 &&
    Object.keys(bets).filter((id) => bets[id].team1Goals !== undefined).length >= matches.length;
  useEffect(() => {
    const count = Object.keys(bets).filter((id) => bets[id].team1Goals !== undefined).length;
    // מעבר לשבוע אחר הוא לא "סיים עכשיו" - מתחילים לספור מחדש
    if (prevWeekId.current !== selectedWeek?._id) {
      prevWeekId.current = selectedWeek?._id;
      prevCount.current = count;
      return undefined;
    }
    const before = prevCount.current;
    prevCount.current = count;
    if (before === null || !doneNow || before >= matches.length) return undefined;
    if (!once(`all-bets:${selectedWeek?._id}`)) return undefined;
    setCelebrateDone(true);
    confettiFrom(counterRef.current, { count: 70 });
    const t = setTimeout(() => setCelebrateDone(false), 4000);
    return () => clearTimeout(t);
  }, [bets, matches.length, doneNow, selectedWeek?._id]);

  if (!selectedWeek?.active) {
    return (
      <div className="card" style={{
        textAlign: 'center',
        padding: '2.5rem 1rem',
        background: 'var(--info-bg, #f8f9ff)'
      }}>
        <div style={{ fontSize: '40px', marginBottom: '0.75rem' }}>⏳</div>
        <h2 style={{ fontSize: 'var(--fs-md)', color: 'var(--text-2, #444)', marginBottom: '0.3rem' }}>ממתינים לשבוע החדש</h2>
        <p style={{ color: 'var(--text-3, #888)', fontSize: 'var(--fs-sm)' }}>השבוע עדיין לא הופעל על ידי המנהל</p>
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
        <h2 style={{ fontSize: 'var(--fs-md)', color: 'var(--text-2, #444)', marginBottom: '0.3rem' }}>ההימורים נסגרו</h2>
        <p style={{ color: 'var(--text-3, #888)', fontSize: 'var(--fs-sm)' }}>
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
          <h2 style={{ margin: 0, fontSize: 'var(--fs-md)', fontWeight: '700', color: 'var(--text, #333)' }}>{selectedWeek.name}</h2>
          <span ref={counterRef} style={{
            fontSize: 'var(--fs-xs)',
            color: savedCount === matches.length ? '#fff' : 'var(--good-fg, #28a745)',
            backgroundColor: savedCount === matches.length ? '#1a6b35' : 'var(--good-bg, #e8f5e9)',
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

        {celebrateDone ? (
          <div role="status" style={{
            fontSize: 'var(--fs-sm)', fontWeight: 700, color: 'var(--good-fg, #1a6b35)', background: 'var(--good-bg, #e8f5e9)',
            borderRadius: '10px', padding: '4px 8px', marginTop: '0.4rem', textAlign: 'center', animation: 'doneIn .45s ease-out both'
          }}>
            כל ההימורים הוזנו ✓
          </div>
        ) : (
          <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #5f6670)', marginTop: '0.3rem', textAlign: 'center' }}>
            ההימורים נשמרים אוטומטית
          </div>
        )}

        {/* ספירה לאחור: משפט כשנשאר יותר מיום, שעון ביום האחרון, ומתחת -
            מתי בדיוק ההימורים נסגרים. קודם היו שתי תיבות ("יום אחד" ו-
            "17:22:22") שלא היה ברור שהן זמן אחד */}
        {timeLeft && (() => {
          const urgent = timeLeft.total < 3600000;
          const today = timeLeft.total < 86400000;
          const fg = urgent ? 'var(--bad-fg, #a81f17)' : today ? 'var(--warn-fg, #7c5306)' : 'var(--info-fg, #1560ad)';
          const cd = formatCountdown(timeLeft);
          return (
            <div role="timer" aria-live="off" style={{
              marginTop: '0.5rem', padding: '0.5rem 0.7rem', borderRadius: '12px', textAlign: 'center',
              background: urgent ? 'var(--bad-bg, #fef2f2)' : today ? 'var(--warn-bg, #fffbeb)' : 'var(--info-bg, #eff6ff)',
              border: `1px solid ${urgent ? '#fca5a5' : today ? '#fde68a' : '#bfdbfe'}`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', color: fg }}>
                <span aria-hidden="true" style={{ fontSize: 'var(--fs-sm)' }}>{urgent ? '🔥' : today ? '⏳' : '⏰'}</span>
                <span style={{ fontSize: 'var(--fs-sm)', fontWeight: 600 }}>נסגר בעוד</span>
                <span dir={cd.clock ? 'ltr' : undefined} style={{
                  fontSize: 'var(--fs-md)', fontWeight: 800, fontVariantNumeric: 'tabular-nums',
                  // הדופק רק בשעה האחרונה, כשזה באמת דחוף
                  animation: urgent ? 'pulse 1s ease infinite' : undefined
                }}>
                  {cd.text}
                </span>
              </div>
              <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #5f6670)', marginTop: '2px' }}>
                {formatLockMoment(selectedWeek.lockTime)}
              </div>
            </div>
          );
        })()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {matches.map((match, index) => {
          const currentBet = localBets[match._id] || {};
          const existingBet = bets[match._id] || {};
          const hasResult = match.result?.team1Goals !== undefined;
          const hasChanges = isBetChanged(match._id);
          const isComplete = isBetComplete(match._id);
          const isSaving = saveStatus[match._id] === 'saving';
          const saveFailed = saveStatus[match._id] === 'error';
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
                    fontSize: 'var(--fs-xs)',
                    color: 'var(--text-4, #bbb)',
                    fontWeight: '700',
                    minWidth: '18px'
                  }}>
                    #{index + 1}
                  </span>
                  <LeagueLogo league={match.leagueId} size={16} />
                  <span style={{
                    padding: '2px 8px',
                    backgroundColor: getLeagueColor(match),
                    color: textOn(getLeagueColor(match)),
                    borderRadius: '6px',
                    fontSize: 'var(--fs-xs)',
                    fontWeight: '700',
                    letterSpacing: '0.3px',
                    boxShadow: `0 2px 4px ${getLeagueColor(match)}33`
                  }}>
                    {getLeagueName(match)}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                  {showsLiveBadge(live, match.result) ? (
                    <LiveScore live={live} prediction={existingBet} result={match.result} />
                  ) : (
                    <span style={{ color: 'var(--text-4, #aaa)', fontSize: 'var(--fs-xs)', fontWeight: '500' }}>
                      {match.date} • {match.time}
                    </span>
                  )}
                  <TvChannels match={match} />
                </div>
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
                    { label: '1', value: match.odds.homeWin, bg: '#eef4ff', color: '#2b5bb8' },
                    { label: 'X', value: match.odds.draw, bg: '#fef6e6', color: '#8a5300' },
                    { label: '2', value: match.odds.awayWin, bg: '#edf7ee', color: '#1f6b2e' }
                  ].map(odd => (
                    <span key={odd.label} style={{
                      padding: '2px 10px',
                      backgroundColor: odd.bg,
                      borderRadius: '8px',
                      fontSize: 'var(--fs-xs)',
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
                  logo={match.team1LogoUrl}
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
                      fontSize: 'var(--fs-lg)',
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
                  />
                  <span style={{
                    fontSize: 'var(--fs-lg)',
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
                      fontSize: 'var(--fs-lg)',
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
                  />
                </div>

                <TeamPicker
                  name={match.team2}
                  logo={match.team2LogoUrl}
                  onClick={() => setInsightsFor({ match, focusTeam: 2 })}
                />
              </div>

              {/* מצב שמירה: שורה קטנה במקום כפתור. גובה קבוע כדי שהכרטיס לא יקפוץ */}
              <div aria-live="polite" style={{
                minHeight: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.4rem', fontSize: 'var(--fs-xs)', fontWeight: '700'
              }}>
                {saveFailed ? (
                  <>
                    <span style={{ color: 'var(--bad-fg, #a81f17)' }}>⚠️ לא נשמר</span>
                    <button
                      onClick={() => saveBet(match._id, localBets[match._id])}
                      style={{
                        minHeight: '32px', padding: '0 12px', borderRadius: '8px',
                        border: '1px solid var(--bad-fg, #a81f17)', background: 'var(--bad-bg, #fdecea)',
                        color: 'var(--bad-fg, #a81f17)', fontSize: 'var(--fs-xs)', fontWeight: '700',
                        cursor: 'pointer', WebkitAppearance: 'none', touchAction: 'manipulation'
                      }}
                    >
                      נסה שוב
                    </button>
                  </>
                ) : (isSaving || (hasChanges && isComplete)) ? (
                  <span style={{ color: 'var(--text-3, #5f6670)' }}>שומר...</span>
                ) : hasChanges ? (
                  <span style={{ color: 'var(--text-3, #5f6670)', fontWeight: '600' }}>מלאו את שני הצדדים</span>
                ) : isSaved ? (
                  <span style={{ color: 'var(--good-fg, #1a6b35)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {/* הווי מצטייר רק ברגע השמירה; אחר כך הוא פשוט שם */}
                    <svg width="13" height="13" viewBox="0 0 14 14" aria-hidden="true" className={justSaved ? 'draw-check' : undefined}>
                      <path d="M2 7.5 L5.5 11 L12 3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    נשמר
                  </span>
                ) : null}
              </div>

              {/* תוצאה סופית */}
              {hasResult && (
                <div style={{
                  marginTop: '0.4rem',
                  paddingTop: '0.4rem',
                  borderTop: '1px solid var(--border, #f0f0f0)',
                  textAlign: 'center',
                  fontSize: 'var(--fs-sm)',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  <span style={{ color: 'var(--text-4, #999)', fontSize: 'var(--fs-xs)' }}>תוצאה:</span>
                  <span style={{ fontWeight: '800', fontSize: 'var(--fs-md)', color: 'var(--text, #333)' }}>
                    <Score home={match.result.team1Goals} away={match.result.team2Goals} />
                  </span>
                  {match.result.finalScore && (
                    <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-3, #888)', fontWeight: 'normal' }}>
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
                      fontSize: 'var(--fs-xs)',
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
