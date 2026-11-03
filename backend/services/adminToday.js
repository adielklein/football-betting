// "היום" של האדמין: מה צריך לעשות עכשיו, לכל שבוע רלוונטי.
//
// כל הנתונים כאן כבר היו קיימים - מי לא הימר, משחקים בלי תוצאה, ניקוד שלא
// עודכן, מצב 365 - אבל מפוזרים בין חמישה מסכים. הפונקציה מרכזת אותם לרשימה
// אחת, וכל פריט נושא את הפעולה שפותרת אותו.
//
// טהורה: מקבלת נתונים ומחזירה רשימה, בלי מסד. כך אפשר לבדוק אותה ישירות.

const { buildScoreAudit } = require('./scoreAudit');
const { classifyBettors } = require('./pendingBettors');

const id = (v) => (v && v._id ? String(v._id) : v == null ? '' : String(v));
const hasResult = (m) => m && m.result && m.result.team1Goals != null && m.result.team2Goals != null;
const kickoffOf = (m) => (m.fullDate ? new Date(m.fullDate).getTime() : NaN);

// משחק שבעט לפני פחות מזה ועוד אין לו תוצאה - כנראה מתנהל עכשיו
const LIVE_WINDOW_MS = 2.5 * 60 * 60 * 1000;

// עברית לא אומרת "1 משחקים": ליחיד יש ניסוח משלו
const count = (n, one, many) => (n === 1 ? one : `${n} ${many}`);

const isLocked = (week, now) => !!week.locked || (!!week.lockTime && now >= new Date(week.lockTime).getTime());

// טיוטה: עוד לא הופעל. פתוח: מקבל הימורים. רץ: ננעל ועוד יש מה להשלים.
// הושלם: לכל משחק יש תוצאה (או שנדחה) והניקוד תואם.
const STAGE_LABEL = { draft: 'טיוטה', open: 'פתוח להימורים', running: 'נעול - משחקים', done: 'הושלם' };

/**
 * מצב שבוע אחד והפריטים שלו.
 * @param week     { _id, name, active, locked, lockTime, month, season }
 * @param matches  משחקי השבוע
 * @param bets     ההימורים על משחקי השבוע
 * @param players  שחקנים (בלי אדמינים) - { _id, name, pushSettings }
 * @param users    כל המשתמשים - { _id, name, role }, לבדיקת הניקוד
 * @param scores   רשומות הניקוד של השבוע
 * @param exclusions מוחרגים מהחודש של השבוע
 */
function buildWeekStatus({ week, matches = [], bets = [], players = [], users = [], scores = [], exclusions = [], now = Date.now() }) {
  const wid = id(week);
  const items = [];
  const add = (level, key, text, extra = {}) => items.push({ level, key, text, ...extra });

  const total = matches.length;
  const withResult = matches.filter(hasResult).length;
  const postponed = matches.filter((m) => !hasResult(m) && m.postponed).length;
  const locked = isLocked(week, now);

  const kickoffs = matches.map(kickoffOf).filter(Number.isFinite);
  const firstKickoff = kickoffs.length ? Math.min(...kickoffs) : null;

  // הניקוד ומשחקים שנגמרו בלי תוצאה - אותה בדיקה שבמסך "בדיקת ניקוד"
  const audit = buildScoreAudit({ weeks: [week], matches, bets, scores, users, exclusions, now });
  const missingResults = audit.issues.filter((i) => i.kind === 'missing_result');
  const scoreErrors = audit.issues.filter((i) => i.kind === 'bet_points' || i.kind === 'weekly_score');
  const liveNow = matches.filter((m) => {
    const k = kickoffOf(m);
    return !hasResult(m) && !m.postponed && Number.isFinite(k) && now >= k && now - k < LIVE_WINDOW_MS;
  }).length;

  let stage;
  if (!week.active && !locked) stage = 'draft';
  else if (!locked) stage = 'open';
  else if (withResult + postponed >= total && total > 0 && scoreErrors.length === 0) stage = 'done';
  else stage = 'running';

  const bettors = classifyBettors(players, matches.map((m) => m._id), bets, exclusions);

  if (stage === 'draft') {
    if (total === 0) {
      add('todo', 'no_matches', 'אין עדיין משחקים בשבוע', { action: { type: 'goto', weekId: wid, step: 'matches' } });
    } else {
      add('todo', 'not_active', `${count(total, 'משחק אחד מוכן', 'משחקים מוכנים')}, אבל השבוע לא הופעל - השחקנים עוד לא רואים אותו`, { action: { type: 'goto', weekId: wid, step: 'activate' } });
    }
  }

  if (stage === 'open') {
    if (!week.lockTime) {
      add('warn', 'no_lock_time', 'אין שעת נעילה - ההימורים לא ייסגרו מעצמם', { action: { type: 'goto', weekId: wid, step: 'activate' } });
    } else {
      add('info', 'locks_at', 'פתוח להימורים', { at: new Date(week.lockTime) });
      if (firstKickoff && new Date(week.lockTime).getTime() > firstKickoff) {
        add('warn', 'lock_after_kickoff', 'הנעילה אחרי תחילת המשחק הראשון - אפשר יהיה להמר על משחק שכבר התחיל', { action: { type: 'goto', weekId: wid, step: 'activate' } });
      }
    }
    if (total === 0) {
      add('todo', 'no_matches', 'השבוע פתוח אבל אין בו משחקים', { action: { type: 'goto', weekId: wid, step: 'matches' } });
    }
    const pending = bettors.pending;
    if (total > 0 && pending.length > 0) {
      const reachable = pending.filter((p) => p.canBeNotified).length;
      add('todo', 'pending_bettors', count(pending.length, 'שחקן אחד עוד לא סיים להמר', 'שחקנים עוד לא סיימו להמר'), {
        names: pending.map((p) => (p.placed > 0 ? `${p.name} (${p.placed}/${p.of})` : p.name)),
        action: reachable > 0 ? { type: 'nudge', weekId: wid, count: reachable } : null,
        detail: reachable < pending.length ? `${pending.length - reachable === 1 ? 'אחד מהם' : `${pending.length - reachable} מהם`} בלי התראות - צריך להזכיר ידנית` : null
      });
    } else if (total > 0) {
      add('ok', 'all_bet', 'כל השחקנים הימרו על כל המשחקים');
    }
  }

  if (stage === 'running' || stage === 'done') {
    if (liveNow > 0) add('info', 'live_now', count(liveNow, 'משחק אחד מתנהל עכשיו', 'משחקים מתנהלים עכשיו'));
    if (missingResults.length > 0) {
      add('todo', 'missing_results', count(missingResults.length, 'משחק אחד נגמר ואין לו תוצאה', 'משחקים נגמרו ואין להם תוצאה'), {
        names: missingResults.map((i) => i.match),
        action: { type: 'sync', weekId: wid }
      });
    }
    if (postponed > 0) add('warn', 'postponed', `${count(postponed, 'משחק אחד נדחה', 'משחקים נדחו')} - כדאי להחליט אם להוציא מהשבוע`, { action: { type: 'goto', weekId: wid, step: 'results' } });
    if (scoreErrors.length > 0) {
      add('todo', 'score_mismatch', 'הניקוד לא מעודכן לפי התוצאות השמורות', {
        detail: `${scoreErrors.length} פערים`,
        action: { type: 'recalc', weekId: wid }
      });
    }
    if (stage === 'done') add('ok', 'done', 'כל התוצאות נכנסו והניקוד תקין');
  }

  return {
    weekId: wid,
    name: week.name,
    stage,
    stageLabel: STAGE_LABEL[stage],
    active: !!week.active,
    locked,
    lockTime: week.lockTime || null,
    firstKickoff: firstKickoff ? new Date(firstKickoff) : null,
    counts: {
      matches: total,
      withResult,
      postponed,
      liveNow,
      players: bettors.pending.length + bettors.complete.length,
      betComplete: bettors.complete.length,
      scoreErrors: scoreErrors.length
    },
    items
  };
}

/**
 * המסך כולו: השבועות האחרונים שעוד יש בהם מה לעשות, ופריטים כלליים.
 * @param weekData [{ week, matches, bets, scores, exclusions }] - מהחדש לישן
 * @param providers מצב הספקים (providerHealth.snapshot)
 */
function buildToday({ weekData = [], players = [], users = [], providers = [], liveBackoff = null, now = Date.now() }) {
  const statuses = weekData.map((d) => buildWeekStatus({ ...d, players, users, now }));

  // השבוע החדש תמיד מוצג; ישנים יותר רק כשעוד נשאר בהם משהו לעשות
  const weeks = statuses.filter((s, i) => i === 0 || s.stage !== 'done');

  const global = [];
  const upcoming = statuses.some((s) => s.stage === 'open' || s.stage === 'draft');
  if (!upcoming) {
    global.push({ level: 'todo', key: 'no_upcoming', text: 'אין שבוע פתוח להימורים - הגיע הזמן ליצור את הבא', action: { type: 'create' } });
  }

  for (const p of providers) {
    if (p.consecutiveFailures >= 3) {
      global.push({
        level: 'warn', key: `provider_${p.source}`,
        text: `${p.source}: ${p.consecutiveFailures} כישלונות ברצף`,
        detail: p.lastError?.status ? `סטטוס ${p.lastError.status}` : p.lastError?.message || null,
        action: { type: 'logs' }
      });
    }
  }
  if (liveBackoff?.until) {
    global.push({ level: 'warn', key: 'live_backoff', text: 'התוצאות החיות בהפסקה אחרי כישלונות מול 365', at: liveBackoff.until, action: { type: 'logs' } });
  }

  const openTodos = [...global, ...weeks.flatMap((w) => w.items)].filter((i) => i.level === 'todo').length;
  return { generatedAt: new Date(now), todo: openTodos, global, weeks };
}

module.exports = { buildWeekStatus, buildToday, STAGE_LABEL };
