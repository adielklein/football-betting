// תובנות נוספות לסטטיסטיקה האישית.
//
// כל הפונקציות כאן טהורות: הנתיב שולף, והן רק מחשבות. כך אפשר לבדוק
// אותן ישירות (playerInsights.test.js) בלי מסד.
//
// "פגיעה" בכל המודול = תוצאה מדויקת או כיוון נכון (מי ניצח / תיקו),
// אותה הגדרה כמו בעיגול שבסקירה.

const dir = (a, b) => (a > b ? 1 : a < b ? -1 : 0);
const valid = (p) => p && Number.isFinite(p.team1Goals) && Number.isFinite(p.team2Goals);
const isHit = (p, r) => dir(p.team1Goals, p.team2Goals) === dir(r.team1Goals, r.team2Goals);
const isExact = (p, r) => p.team1Goals === r.team1Goals && p.team2Goals === r.team2Goals;
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 100) : 0);
const r1 = (n) => Math.round((n || 0) * 10) / 10;

const usable = (items) => (items || []).filter((x) => valid(x.prediction) && valid(x.result));

/**
 * אופטימי או פסימי: כמה שערים אתה מנחש למשחק מול כמה יש בפועל.
 * @param items [{ prediction, result }]
 */
function goalsTendency(items, { minMatches = 5, threshold = 0.3 } = {}) {
  const rows = usable(items);
  if (rows.length < minMatches) return null;
  let pred = 0, actual = 0, over = 0, under = 0;
  for (const { prediction: p, result: r } of rows) {
    const pg = p.team1Goals + p.team2Goals;
    const ag = r.team1Goals + r.team2Goals;
    pred += pg; actual += ag;
    if (pg > ag) over++;
    else if (pg < ag) under++;
  }
  const avgPredicted = r1(pred / rows.length);
  const avgActual = r1(actual / rows.length);
  const diff = r1(pred / rows.length - actual / rows.length);
  return {
    matches: rows.length,
    avgPredicted,
    avgActual,
    diff,
    overRate: pct(over, rows.length),
    underRate: pct(under, rows.length),
    label: diff >= threshold ? 'optimist' : diff <= -threshold ? 'pessimist' : 'balanced',
  };
}

/**
 * פגיעה לפי ליגה.
 * @param items   [{ prediction, result, leagueId, points }]
 * @param leagues Map(leagueId -> { name, color })
 */
function byLeague(items, leagues, { minBets = 3 } = {}) {
  const groups = new Map();
  for (const x of usable(items)) {
    const id = x.leagueId ? String(x.leagueId) : null;
    if (!id || !leagues.has(id)) continue;
    if (!groups.has(id)) groups.set(id, { bets: 0, hits: 0, exact: 0, points: 0 });
    const g = groups.get(id);
    g.bets++;
    if (isHit(x.prediction, x.result)) g.hits++;
    if (isExact(x.prediction, x.result)) g.exact++;
    g.points += x.points || 0;
  }
  return [...groups.entries()]
    .filter(([, g]) => g.bets >= minBets)
    .map(([id, g]) => ({
      leagueId: id,
      name: leagues.get(id).name,
      color: leagues.get(id).color || null,
      bets: g.bets,
      hits: g.hits,
      exact: g.exact,
      accuracy: pct(g.hits, g.bets),
      avgPoints: r1(g.points / g.bets),
    }))
    .sort((a, b) => b.accuracy - a.accuracy || b.avgPoints - a.avgPoints);
}

/**
 * איך אתה מהמר על הקבוצה שלך (זו של ערכת הנושא), ומה קרה באמת.
 * @param items    [{ prediction, result, team1, team2, points }]
 * @param team     שם הקבוצה
 * @param sameTeam השוואת שמות (utils/teamMatch) - מוזרקת כדי שהמודול יישאר טהור
 */
function teamBias(items, team, sameTeam, { minGames = 3 } = {}) {
  if (!team) return null;
  let games = 0, predWins = 0, actualWins = 0, predLosses = 0, actualLosses = 0, hits = 0, points = 0;
  for (const x of usable(items)) {
    const side = sameTeam(x.team1, team) ? 1 : sameTeam(x.team2, team) ? 2 : 0;
    if (!side) continue;
    // התוצאה מנקודת המבט של הקבוצה: 1 ניצחון, 0 תיקו, -1 הפסד
    const flip = side === 1 ? 1 : -1;
    const pr = dir(x.prediction.team1Goals, x.prediction.team2Goals) * flip;
    const ac = dir(x.result.team1Goals, x.result.team2Goals) * flip;
    games++;
    if (pr === 1) predWins++;
    if (ac === 1) actualWins++;
    if (pr === -1) predLosses++;
    if (ac === -1) actualLosses++;
    if (pr === ac) hits++;
    points += x.points || 0;
  }
  if (games < minGames) return null;
  return {
    team,
    games,
    predictedWinRate: pct(predWins, games),
    actualWinRate: pct(actualWins, games),
    predictedLossRate: pct(predLosses, games),
    actualLossRate: pct(actualLosses, games),
    accuracy: pct(hits, games),
    avgPoints: r1(points / games),
  };
}

/**
 * נגד הקהל: כמה פעמים הלכת נגד רוב השחקנים, וכמה זה הרוויח.
 *
 * "הקהל" = הכיוון (1/X/2) שרוב השחקנים האחרים בחרו. משחק שבו אין כיוון
 * מוביל ברור (שוויון בין שני כיוונים) או שהימרו עליו פחות מ-minOthers
 * שחקנים אחרים - לא נספר, כי אין בו רוב ללכת נגדו.
 *
 * @param mine          [{ matchId, prediction, result, points, label }]
 * @param othersByMatch Map(matchId -> [prediction])
 */
function vsCrowd(mine, othersByMatch, { minOthers = 3 } = {}) {
  let withCount = 0, withHits = 0, againstCount = 0, againstHits = 0, againstPoints = 0;
  let best = null;
  for (const x of usable(mine)) {
    const others = (othersByMatch.get(String(x.matchId)) || []).filter(valid);
    if (others.length < minOthers) continue;
    const tally = new Map();
    for (const p of others) {
      const d = dir(p.team1Goals, p.team2Goals);
      tally.set(d, (tally.get(d) || 0) + 1);
    }
    const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
    if (ranked[1] && ranked[1][1] === ranked[0][1]) continue; // אין רוב ברור
    const [crowdDir, crowdCount] = ranked[0];
    const myDir = dir(x.prediction.team1Goals, x.prediction.team2Goals);
    const hit = isHit(x.prediction, x.result);
    if (myDir === crowdDir) {
      withCount++;
      if (hit) withHits++;
    } else {
      againstCount++;
      if (hit) {
        againstHits++;
        againstPoints += x.points || 0;
        if (!best || (x.points || 0) > best.points) {
          best = { label: x.label || '', points: r1(x.points), crowdShare: pct(crowdCount, others.length) };
        }
      }
    }
  }
  if (withCount + againstCount === 0) return null;
  return {
    matches: withCount + againstCount,
    againstCount,
    againstRate: pct(againstCount, withCount + againstCount),
    againstHits,
    againstHitRate: pct(againstHits, againstCount),
    againstPoints: r1(againstPoints),
    withCount,
    withHitRate: pct(withHits, withCount),
    best,
  };
}

/**
 * המקום שלך בטבלה העונתית אחרי כל שבוע.
 *
 * @param weeks  שבועות העונה בסדר כרונולוגי [{ _id, name }]
 * @param scores ניקודים שבועיים [{ userId, weekId, weeklyScore }] - בלי אדמינים
 * @param userId השחקן
 *
 * מקום משותף בתיקו (1, 2, 2, 4), כמו בטבלה עצמה. שחקן שעוד לא היה לו
 * ניקוד באותו שלב נספר עם 0, כי כך הוא מופיע גם בטבלה.
 */
function rankHistory(weeks, scores, userId) {
  const me = String(userId);
  const byWeek = new Map();
  const players = new Set();
  for (const s of scores || []) {
    const w = String(s.weekId);
    if (!byWeek.has(w)) byWeek.set(w, []);
    byWeek.get(w).push(s);
    players.add(String(s.userId));
  }
  if (!players.has(me)) return [];

  const totals = new Map([...players].map((p) => [p, 0]));
  const out = [];
  for (const w of weeks || []) {
    const rows = byWeek.get(String(w._id));
    if (!rows || rows.length === 0) continue; // שבוע בלי ניקוד עוד לא שוחק
    for (const s of rows) totals.set(String(s.userId), totals.get(String(s.userId)) + (s.weeklyScore || 0));
    const mine = r1(totals.get(me));
    const rank = 1 + [...totals.values()].filter((t) => r1(t) > mine).length;
    out.push({ weekId: String(w._id), name: w.name, rank, players: players.size, total: mine });
  }
  return out;
}

module.exports = { goalsTendency, byLeague, teamBias, vsCrowd, rankHistory };
