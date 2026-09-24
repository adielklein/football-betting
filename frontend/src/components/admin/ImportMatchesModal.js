import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../../services/api';
import { getHebrewNameByEnglish } from '../../utils/teamLogos';
import TeamLogo from '../TeamLogo';
import { groupLeagues, leaguePickerGroups } from '../../utils/leagueGroups';
import GroupedPicker from '../GroupedPicker';

const DAYS_OPTIONS = [3, 7, 14, 30];

// ערך דמה בבורר הליגה: מושך מכל התחרויות המוגדרות במקום אחת-אחת
const ALL_LEAGUES = '__all__';

// ובחירה של קבוצה שלמה - כל הגביעים, כל תחרויות הנבחרות. זה מה שבאמת
// עושים כשבונים שבוע: לא ליגה אחת ולא הכל, אלא סוג אחד
const GROUP_PREFIX = '__group__:';

// 365 חוסמים לפי IP על ריבוי בקשות בו-זמנית, ולכן מושכים כמה ליגות במקביל
// ולא את כולן יחד. חמש ולא שלוש: 16 ליגות בשלישיות היו כחצי דקה של המתנה
const LEAGUE_CONCURRENCY = 5;

// YYYY-MM-DD לפי התאריך המקומי (לא UTC, כדי שברירת המחדל תהיה "היום" האמיתי אצל האדמין)
const toYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (d, n) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

function ImportMatchesModal({ week, leagues, adminId, onClose, onImported }) {
  const importableLeagues = useMemo(
    () => (leagues || []).filter((l) => l.footballDataCode || l.scores365CompetitionId || l.sportsDbLeagueId || l.sofaScoreTournamentId || l.espnLeagueCode),
    [leagues]
  );

  // ריק בכוונה: המסך נפתח בלי בחירה ובלי למשוך דבר. בחירה אוטומטית של
  // הליגה הראשונה שלחה בקשה לספק בכל פתיחה של החלון, על תחרות שאיש לא
  // ביקש - וגם הציגה רשימה שנראית כמו תשובה לשאלה שלא נשאלה
  const [leagueId, setLeagueId] = useState('');
  const [days, setDays] = useState(7);
  // 'days' - X ימים קדימה מהיום (ברירת המחדל). 'range' - טווח תאריכים מפורש,
  // לשבוע ספציפי שלא בהכרח מתחיל היום (למשל מתכננים שבוע הבא מראש)
  const [rangeMode, setRangeMode] = useState('days');
  const [customFrom, setCustomFrom] = useState(() => toYmd(new Date()));
  const [customTo, setCustomTo] = useState(() => toYmd(addDays(new Date(), 7)));
  const [includeOdds, setIncludeOdds] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fixtures, setFixtures] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  // ליגות שהמשיכה שלהן נכשלה. במצב "כל הליגות" כישלון של אחת לא אמור
  // להפיל את כל השאר, אבל כן צריך להיות גלוי
  const [failedLeagues, setFailedLeagues] = useState([]);
  // התקדמות המשיכה מכל הליגות. המשחקים מוצגים בזרימה, ולכן צריך גם לומר
  // שהרשימה עוד לא שלמה
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  // משחקים שנשלחו וכבר היו בשבוע. השרת מדלג עליהם, והמודאל נשאר פתוח
  // כדי שהאדמין יראה מה בדיוק לא נוסף במקום שהחלון ייסגר כאילו הכל עבר
  const [skipped, setSkipped] = useState(null);

  const groups = useMemo(() => groupLeagues(importableLeagues), [importableLeagues]);
  const pickerGroups = useMemo(() => leaguePickerGroups(importableLeagues), [importableLeagues]);

  // הבחירה היא אחת משלוש: הכל, קבוצה שלמה, או תחרות אחת
  const resolveTargets = () => {
    if (leagueId === ALL_LEAGUES) return importableLeagues;
    if (leagueId.startsWith(GROUP_PREFIX)) {
      const key = leagueId.slice(GROUP_PREFIX.length);
      return (groups.find((g) => g.key === key)?.leagues) || [];
    }
    return importableLeagues.filter((l) => l._id === leagueId);
  };

  const isMulti = leagueId === ALL_LEAGUES || leagueId.startsWith(GROUP_PREFIX);

  const loadFixtures = async ({ refresh = false } = {}) => {
    if (!leagueId) return;
    if (rangeMode === 'range' && (!customFrom || !customTo)) return;
    setLoading(true);
    setError('');
    setSkipped(null);
    setFixtures([]);
    setFailedLeagues([]);

    const targets = resolveTargets();

    const failures = [];
    let cursor = 0;
    let done = 0;
    setProgress({ done: 0, total: targets.length });

    try {
      await Promise.all(
        Array.from({ length: Math.min(LEAGUE_CONCURRENCY, targets.length) }, async () => {
          while (cursor < targets.length) {
            const lg = targets[cursor++];
            try {
              const data = await api.getUpcomingFixtures({
                leagueId: lg._id,
                days,
                includeOdds,
                refresh,
                ...(rangeMode === 'range' ? { fromDate: customFrom, toDate: customTo } : {})
              });

              // הספק נכשל, והתשובה חזרה ריקה ותקינה למראה. בלי זה
              // "אין משחקים בטווח" ו"365 חסמו אותנו" נראים זהים
              if (data.providerError) {
                failures.push({ league: lg.name, message: data.providerError });
              }

              const arrived = (data.fixtures || []).map((f) => ({
                ...f,
                selected: false,
                leagueId: lg._id,
                leagueName: lg.name,
                // הספק נשמר לכל משחק בנפרד: במשיכה מכל הליגות הוא עשוי
                // להיות שונה מליגה לליגה
                provider: data.provider || null,
                // אם הספק החזיר שם בעברית (365scores) - נשתמש בו ישירות, אחרת נתרגם
                team1: f.team1He || getHebrewNameByEnglish(f.team1En),
                team2: f.team2He || getHebrewNameByEnglish(f.team2En),
                oddsEdited: f.odds
                  ? {
                      homeWin: f.odds.homeWin ?? '',
                      draw: f.odds.draw ?? '',
                      awayWin: f.odds.awayWin ?? ''
                    }
                  : { homeWin: '', draw: '', awayWin: '' }
              }));

              // כל ליגה מוצגת ברגע שהיא חוזרת, ולא בסוף. הזמן הכולל לא
              // משתנה, אבל ההמתנה הריקה כן - ואפשר להתחיל לבחור מיד.
              // ממוזג לפי שעת פתיחה כדי שהסדר יישמר גם בזרימה
              if (arrived.length > 0) {
                setFixtures((prev) =>
                  [...prev, ...arrived].sort((a, b) => new Date(a.kickoffIso) - new Date(b.kickoffIso))
                );
              }
            } catch (err) {
              failures.push({ league: lg.name, message: err.message || 'שגיאה' });
            } finally {
              done++;
              setProgress({ done, total: targets.length });
            }
          }
        })
      );

      setFailedLeagues(failures);

      // כשליגה אחת נבחרה וגם היא נכשלה, זו שגיאה של המסך כולו ולא הערה בצד
      if (failures.length > 0 && targets.length === 1) {
        setError(failures[0].message);
      } else if (failures.length > 0 && failures.length === targets.length) {
        // כולן נכשלו - זו לא בעיה של ליגה מסוימת אלא של הספק
        setError(`כל הליגות נכשלו מול הספק: ${failures[0].message}`);
      }
    } catch (err) {
      setError(err.message || 'שגיאה בטעינת משחקים');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (leagueId) loadFixtures();
  }, [leagueId, days, includeOdds, rangeMode, customFrom, customTo]);

  const toggleSelected = (idx) => {
    setFixtures((prev) => prev.map((f, i) => (i === idx ? { ...f, selected: !f.selected } : f)));
  };

  const updateField = (idx, field, value) => {
    setFixtures((prev) => prev.map((f, i) => (i === idx ? { ...f, [field]: value } : f)));
  };

  const updateOdds = (idx, key, value) => {
    setFixtures((prev) =>
      prev.map((f, i) =>
        i === idx ? { ...f, oddsEdited: { ...f.oddsEdited, [key]: value } } : f
      )
    );
  };

  const selectedCount = fixtures.filter((f) => f.selected).length;

  // חיפוש שם קבוצה אחרי משיכה - נוח כשליגה מחזירה עשרות משחקים ורוצים
  // לאתר מהר משחק ספציפי בלי לגלול על כל הרשימה
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredIndexed = fixtures
    .map((f, idx) => ({ f, idx }))
    .filter(({ f }) => {
      if (!normalizedQuery) return true;
      const t1 = (f.team1 || '').toLowerCase();
      const t2 = (f.team2 || '').toLowerCase();
      const lg = (f.leagueName || '').toLowerCase();
      return t1.includes(normalizedQuery) || t2.includes(normalizedQuery) || lg.includes(normalizedQuery);
    });

  // ליגות שנמשכו מספק גיבוי. 365 הוא היחיד שמזין יחסים, תובנות וטבלה חיה,
  // ולכן עדיף לדעת על זה בזמן הייבוא ולא כשמגלים חלון ריק אחר כך
  const nonScores365 = [...new Set(
    fixtures.filter((f) => f.provider && f.provider !== '365scores').map((f) => f.leagueName)
  )];

  const handleSelectAll = () => {
    const visibleIdx = filteredIndexed.map(({ idx }) => idx);
    const allSelected = visibleIdx.length > 0 && visibleIdx.every((idx) => fixtures[idx].selected);
    setFixtures((prev) => prev.map((f, i) => (visibleIdx.includes(i) ? { ...f, selected: !allSelected } : f)));
  };

  const handleImport = async () => {
    const chosen = fixtures.filter((f) => f.selected);
    if (chosen.length === 0) {
      setError('בחר לפחות משחק אחד');
      return;
    }
    const invalid = chosen.find((f) => !f.team1?.trim() || !f.team2?.trim());
    if (invalid) {
      setError('יש למלא שמות קבוצות לכל המשחקים שנבחרו');
      return;
    }
    setSubmitting(true);
    setError('');
    setSkipped(null);
    try {
      const payload = {
        weekId: week._id,
        adminId,
        // ליגה ברמת הבקשה היא רשת ביטחון למשחק שאיבד את שלו. במצב "כל הליגות"
        // אין ערך כזה, וכל משחק נושא את הליגה שלו
        ...(isMulti ? {} : { leagueId }),
        matches: chosen.map((f) => {
          const obj = {
            team1: f.team1.trim(),
            team2: f.team2.trim(),
            date: f.date,
            time: f.time,
            externalId: f.apiId,
            externalProvider: f.provider,
            // הסיבוב אצל הספק: "מחזור 5", "שלב הבתים"
            round: f.round || null,
            // כל משחק נושא את הליגה שלו, כדי ש"כל הליגות" ייובא נכון בבקשה אחת
            leagueId: f.leagueId,
            // הסמל והמזהה שהספק כבר החזיר - נשמרים במקום להתגלות מחדש אחר כך
            team1LogoUrl: f.team1LogoUrl,
            team2LogoUrl: f.team2LogoUrl,
            team1ExternalId: f.team1ExternalId,
            team2ExternalId: f.team2ExternalId
          };
          if (includeOdds) {
            const odds = {};
            const h = parseFloat(f.oddsEdited.homeWin);
            const d = parseFloat(f.oddsEdited.draw);
            const a = parseFloat(f.oddsEdited.awayWin);
            if (Number.isFinite(h) && h >= 1) odds.homeWin = h;
            if (Number.isFinite(d) && d >= 1) odds.draw = d;
            if (Number.isFinite(a) && a >= 1) odds.awayWin = a;
            if (Object.keys(odds).length > 0) obj.odds = odds;
          }
          return obj;
        })
      };
      const result = await api.bulkCreateMatches(payload);
      if (onImported) onImported(result);

      const duplicates = Array.isArray(result?.duplicates) ? result.duplicates : [];
      if (duplicates.length > 0) {
        setSkipped({ created: result?.created || 0, duplicates });
        return;
      }
      onClose();
    } catch (err) {
      setError(err.message || 'שגיאה בייבוא המשחקים');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100000,
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        className="card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '900px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexShrink: 0 }}>
          <h3 style={{ margin: 0 }}>📥 ייבוא משחקים ל-{week?.name}</h3>
          <button onClick={onClose} className="btn" style={{ background: 'transparent', fontSize: '20px' }}>✖</button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginBottom: '1rem', flexShrink: 0 }}>
          <div style={{ flex: '1 1 200px' }}>
            <label>תחרות:</label>
            {/* קבוצה שלמה נבחרת מתוך הקבוצה עצמה, ולא מרשימה נפרדת - כך
                הקשר בין "כל הגביעים" לגביעים עצמם גלוי לעין */}
            <GroupedPicker
              groups={pickerGroups}
              value={leagueId}
              onChange={setLeagueId}
              disabled={loading || submitting || importableLeagues.length === 0}
              allOption={importableLeagues.length > 0
                ? { value: ALL_LEAGUES, label: `🌍 כל התחרויות (${importableLeagues.length})` }
                : null}
              groupAllPrefix={GROUP_PREFIX}
              placeholder={importableLeagues.length === 0 ? 'אין תחרויות עם מזהה חיצוני' : 'בחר תחרות'}
            />
          </div>
          <div style={{ flex: '0 0 120px' }}>
            <label>טווח:</label>
            <select
              value={rangeMode}
              onChange={(e) => setRangeMode(e.target.value)}
              className="input"
              disabled={loading || submitting}
            >
              <option value="days">ימים קדימה</option>
              <option value="range">תאריכים מותאם</option>
            </select>
          </div>
          {rangeMode === 'days' ? (
            <div style={{ flex: '0 0 120px' }}>
              <label>מספר ימים:</label>
              <select
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value, 10))}
                className="input"
                disabled={loading || submitting}
              >
                {DAYS_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d} ימים</option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div style={{ flex: '0 0 150px' }}>
                <label>מתאריך:</label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="input"
                  disabled={loading || submitting}
                />
              </div>
              <div style={{ flex: '0 0 150px' }}>
                <label>עד תאריך:</label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="input"
                  disabled={loading || submitting}
                />
              </div>
            </>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '14px' }}>
            <input
              type="checkbox"
              checked={includeOdds}
              onChange={(e) => setIncludeOdds(e.target.checked)}
              disabled={loading || submitting}
            />
            טען יחסי ווינר
          </label>
          <button
            onClick={() => loadFixtures({ refresh: true })}
            className="btn"
            disabled={loading || submitting || !leagueId}
          >
            🔄 רענן
          </button>
        </div>

        {includeOdds && (
          <div style={{
            background: 'var(--warn-bg, #fffaf0)', border: '1px solid #f5e3c0', color: 'var(--warn-fg, #9a7b3f)',
            padding: '0.45rem 0.7rem', borderRadius: '8px', fontSize: '12px',
            marginBottom: '0.75rem', flexShrink: 0
          }}>
            ℹ️ ווינר מפרסמים יחסים רק למחזור הקרוב. משחקים רחוקים יותר ייובאו בלי יחסים —
            אפשר להשלים אותם אחר כך בכפתור <strong>"💰 עדכן יחסי ווינר"</strong> במסך השבוע.
            {isMulti && ' משיכת יחסים לכמה תחרויות יחד אורכת זמן — כל משחק הוא פנייה נפרדת לספק.'}
          </div>
        )}

        {error && (
          <div style={{ background: 'var(--bad-bg, #fee)', color: 'var(--bad-fg, #900)', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', flexShrink: 0 }}>
            {error}
          </div>
        )}

        {skipped && (
          <div style={{
            background: 'var(--warn-bg, #fffaf0)', border: '1px solid #f5e3c0', color: 'var(--warn-fg, #9a7b3f)',
            padding: '0.45rem 0.7rem', borderRadius: '8px', fontSize: '12px',
            marginBottom: '0.75rem', flexShrink: 0
          }}>
            {skipped.created > 0
              ? `נוספו ${skipped.created} משחקים. `
              : ''}
            {skipped.duplicates.length} משחקים כבר היו בשבוע ולכן לא נוספו שוב:{' '}
            {skipped.duplicates.slice(0, 5).join(', ')}
            {skipped.duplicates.length > 5 && ` ועוד ${skipped.duplicates.length - 5}`}
          </div>
        )}

        {nonScores365.length > 0 && (
          <div style={{
            background: 'var(--warn-bg, #fffaf0)', border: '1px solid #f5e3c0', color: 'var(--warn-fg, #9a7b3f)',
            padding: '0.45rem 0.7rem', borderRadius: '8px', fontSize: '12px',
            marginBottom: '0.75rem', flexShrink: 0
          }}>
            ⚠️ {nonScores365.join(', ')} נמשכו מספק גיבוי ולא מ-365scores (365 לא החזיר משחקים בטווח).
            משחקים כאלה ייובאו בלי יחסי ווינר, בלי תובנות טרום-משחק ובלי טבלה חיה.
          </div>
        )}

        {failedLeagues.length > 0 && (
          <div style={{
            background: 'var(--warn-bg, #fffaf0)', border: '1px solid #f5e3c0', color: 'var(--warn-fg, #9a7b3f)',
            padding: '0.45rem 0.7rem', borderRadius: '8px', fontSize: '12px',
            marginBottom: '0.75rem', flexShrink: 0
          }}>
            ⚠️ {failedLeagues.length} ליגות לא נמשכו: {failedLeagues.map((f) => f.league).join(', ')}
          </div>
        )}

        <div style={{ overflowY: 'auto', flex: 1, paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
          {/* בזמן טעינה מרובה הרשימה כבר מוצגת, ולכן זו שורת התקדמות ולא
              מסך המתנה חוסם */}
          {loading && (
            <div style={{
              textAlign: 'center', padding: fixtures.length > 0 ? '0.5rem' : '2rem',
              color: 'var(--text-3, #666)', fontSize: fixtures.length > 0 ? '12px' : '14px'
            }}>
              ⏳ טוען
              {progress.total > 1 && ` ליגות… ${progress.done} מתוך ${progress.total}`}
              {progress.total <= 1 && ' משחקים…'}
            </div>
          )}

          {!loading && !leagueId && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3, #666)' }}>
              בחר תחרות כדי למשוך משחקים
            </div>
          )}

          {!loading && leagueId && fixtures.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-3, #666)' }}>
              {/* הטווח מוצג במפורש: טורניר שאינו בעונתו נראה בדיוק כמו תקלה,
                  וההבדל היחיד הוא הידיעה מה בכלל נבדק */}
              אין משחקים בטווח {rangeMode === 'range'
                ? `${customFrom} עד ${customTo}`
                : `${days} הימים הקרובים`}
              <div style={{ fontSize: '11px', color: 'var(--text-4, #aaa)', marginTop: '0.4rem' }}>
                תחרות שאינה בעונתה תחזור ריקה. אפשר להרחיב את הטווח או לבחור תאריכים.
              </div>
            </div>
          )}

          {fixtures.length > 0 && (
            <>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input"
                placeholder="🔎 חיפוש לפי שם קבוצה..."
                style={{ marginBottom: '0.5rem', width: '100%' }}
              />

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                <button onClick={handleSelectAll} className="btn" style={{ fontSize: '13px' }} disabled={filteredIndexed.length === 0}>
                  {filteredIndexed.length > 0 && filteredIndexed.every(({ idx }) => fixtures[idx].selected) ? 'נקה הכל' : 'בחר הכל'}
                </button>
                <span style={{ fontSize: '13px', color: 'var(--text-3, #666)' }}>
                  {selectedCount} מתוך {fixtures.length} נבחרו
                  {normalizedQuery && ` (מוצגים ${filteredIndexed.length})`}
                </span>
              </div>

              {normalizedQuery && filteredIndexed.length === 0 && (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-3, #666)', fontSize: '13px' }}>
                  לא נמצאו משחקים התואמים "{searchQuery}"
                </div>
              )}

              {filteredIndexed.map(({ f, idx }) => (
                <div
                  key={`${f.leagueId}_${f.apiId}`}
                  style={{
                    border: f.selected ? '2px solid #0a7' : '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    marginBottom: '0.5rem',
                    background: f.selected ? '#f0fff7' : 'var(--surface, #fff)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    <input
                      type="checkbox"
                      checked={f.selected}
                      onChange={() => toggleSelected(idx)}
                      style={{ width: '18px', height: '18px' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: '1 1 200px', minWidth: '180px' }}>
                      <TeamLogo name={f.team1} size={20} src={f.team1LogoUrl} />
                      <input
                        type="text"
                        value={f.team1}
                        onChange={(e) => updateField(idx, 'team1', e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <span style={{ color: 'var(--text-3, #888)', fontWeight: 'bold' }}>vs</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', flex: '1 1 200px', minWidth: '180px' }}>
                      <TeamLogo name={f.team2} size={20} src={f.team2LogoUrl} />
                      <input
                        type="text"
                        value={f.team2}
                        onChange={(e) => updateField(idx, 'team2', e.target.value)}
                        className="input"
                        style={{ flex: 1 }}
                      />
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--text-2, #444)', whiteSpace: 'nowrap' }}>
                      📅 {f.date} | 🕒 {f.time}
                    </div>
                    {isMulti && f.leagueName && (
                      <span style={{
                        fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap',
                        padding: '2px 8px', borderRadius: '10px',
                        background: 'var(--surface-3, #eef3f8)', color: 'var(--text-3, #667)'
                      }}>
                        {f.leagueName}
                      </span>
                    )}
                  </div>
                  {includeOdds && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', alignItems: 'center', paddingRight: '30px' }}>
                      <span style={{ fontSize: '12px', color: 'var(--text-3, #888)' }}>יחסים:</span>
                      <label style={{ fontSize: '12px' }}>1:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={f.oddsEdited.homeWin}
                        onChange={(e) => updateOdds(idx, 'homeWin', e.target.value)}
                        className="input"
                        style={{ width: '70px', textAlign: 'center' }}
                        placeholder="בית"
                      />
                      <label style={{ fontSize: '12px' }}>X:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={f.oddsEdited.draw}
                        onChange={(e) => updateOdds(idx, 'draw', e.target.value)}
                        className="input"
                        style={{ width: '70px', textAlign: 'center' }}
                        placeholder="תיקו"
                      />
                      <label style={{ fontSize: '12px' }}>2:</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        value={f.oddsEdited.awayWin}
                        onChange={(e) => updateOdds(idx, 'awayWin', e.target.value)}
                        className="input"
                        style={{ width: '70px', textAlign: 'center' }}
                        placeholder="חוץ"
                      />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', flexShrink: 0, gap: '0.5rem' }}>
          <button onClick={onClose} className="btn" disabled={submitting}>
            {skipped ? 'סגור' : 'ביטול'}
          </button>
          <button
            onClick={handleImport}
            className="btn btn-primary"
            disabled={submitting || selectedCount === 0 || !!skipped}
          >
            {submitting ? 'מייבא...' : `➕ הוסף ${selectedCount} משחקים נבחרים`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ImportMatchesModal;
