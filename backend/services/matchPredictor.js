// תחזית תוצאה למשחק. מחליף את החישוב הישן ("ממוצע השערים ב-5 המשחקים
// האחרונים"), שהתעלם משני דברים חשובים: כמה טובה הקבוצה באמת, ומול מי היא
// השיגה את התוצאות. 3 ניצחונות על תחתית הטבלה נראו שם כמו 3 ניצחונות על
// הצמרת.
//
// המודל (פואסון, בסגנון המודלים המקובלים לכדורגל):
//   1. כוח עונתי מהטבלה - שערי זכות וחובה למשחק ביחס לממוצע הליגה,
//      מכווץ לכיוון הממוצע כשיש מעט משחקים.
//   2. כושר מתוקנן ליריבה - בכל אחד מהמשחקים האחרונים, השערים מחולקים במה
//      שהיה צפוי מול אותה יריבה (לפי הכוח שלה בטבלה ובית/חוץ). 2-0 על
//      המוליכה שווה הרבה יותר מ-2-0 על האחרונה. משחקים חדשים שוקלים יותר.
//      כשיש xG למשחק (ליגות גדולות), כל משחק נמדד בשילוב של xG ושערים -
//      xG יציב יותר ומנבא טוב יותר את העתיד (פחות מזל), והשילוב של שניהם
//      הוא מה שעובד הכי טוב במחקר.
//   3. שילוב: ככל שעבר יותר מהעונה, הטבלה שוקלת יותר.
//   4. תיקון דיקסון-קולס: מודל פואסון פשוט מעריך בחסר תיקו נמוך (0-0, 1-1)
//      ובעודף 1-0/0-1. תיקון קטן על ארבע התוצאות האלה (rho שלילי).
//   5. כשיש יחסי הימורים - הם הסימן החזק ביותר, ומשולבים בתחזית.
//   6. התוצאה המוצעת היא זו עם הניקוד הצפוי הגבוה ביותר בשיטת הניקוד שלנו
//      (בול = 3, כיוון = 1), ולא סתם עיגול של צפי השערים.

const DEFAULT_GOALS = 1.35; // שערים לקבוצה למשחק, כשאין טבלה
const HOME = 1.12;          // יתרון ביתיות על שערים צפויים
const AWAY = 0.88;
const TABLE_PRIOR = 4;      // "משחקים מדומים" בממוצע הליגה - מכווץ טבלה קצרה
const FORM_PRIOR = 2;
const FORM_GAMES = 8;
const FORM_DECAY = 0.85;    // משקל כל משחק ביחס לחדש ממנו
const UNKNOWN_OPP = 0.6;    // משקל משחק מול יריבה שאין לנו את כוחה (גביע, אירופה)
const MAX_GOALS = 8;
const XG_WEIGHT = 0.6;      // משקל ה-xG מול השערים במשחק שיש לו xG
const RHO = -0.08;          // תיקון דיקסון-קולס לתוצאות נמוכות

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const leagueAverage = (rows) => {
  let goals = 0, played = 0;
  for (const r of rows || []) {
    if (r.gamePlayed > 0 && r.for != null) { goals += r.for; played += r.gamePlayed; }
  }
  return played >= 20 ? goals / played : DEFAULT_GOALS;
};

const tableStrength = (rows, id, avg) => {
  const r = (rows || []).find((x) => x.competitor?.id === id);
  if (!r || !(r.gamePlayed > 0) || r.for == null || r.against == null) return null;
  const p = r.gamePlayed;
  const att = (r.for / p) / avg;
  const def = (r.against / p) / avg;
  return {
    att: (att * p + TABLE_PRIOR) / (p + TABLE_PRIOR),
    def: (def * p + TABLE_PRIOR) / (p + TABLE_PRIOR),
    played: p
  };
};

const outcome = (game, teamId) => {
  const isHome = game.homeCompetitor?.id === teamId;
  const gf = isHome ? game.homeCompetitor?.score : game.awayCompetitor?.score;
  const ga = isHome ? game.awayCompetitor?.score : game.homeCompetitor?.score;
  if (gf == null || ga == null || gf < 0 || ga < 0) return null;
  return { isHome, gf, ga, gameId: game.id, oppId: isHome ? game.awayCompetitor?.id : game.homeCompetitor?.id };
};

// כוח לפי המשחקים האחרונים, כשכל תוצאה נמדדת מול מה שהיה צפוי מול היריבה
const formStrength = (teamId, games, rows, avg, xgByGame) => {
  let wSum = 0, attSum = 0, defSum = 0, n = 0, xgGames = 0;
  for (const g of games || []) {
    if (n >= FORM_GAMES) break;
    const o = outcome(g, teamId);
    if (!o) continue;
    const opp = tableStrength(rows, o.oppId, avg);
    const w = Math.pow(FORM_DECAY, n) * (opp ? 1 : UNKNOWN_OPP);
    const oa = opp ? opp.att : 1, od = opp ? opp.def : 1;
    const expFor = avg * od * (o.isHome ? HOME : AWAY);
    const expAgainst = avg * oa * (o.isHome ? AWAY : HOME);
    let att = clamp(o.gf / expFor, 0, 3);
    let def = clamp(o.ga / expAgainst, 0, 3);
    const xg = xgByGame && xgByGame.get(o.gameId);
    if (xg && xg[teamId] != null && xg[o.oppId] != null) {
      att = XG_WEIGHT * clamp(xg[teamId] / expFor, 0, 3) + (1 - XG_WEIGHT) * att;
      def = XG_WEIGHT * clamp(xg[o.oppId] / expAgainst, 0, 3) + (1 - XG_WEIGHT) * def;
      xgGames++;
    }
    attSum += w * att;
    defSum += w * def;
    wSum += w;
    n++;
  }
  if (!n) return null;
  return {
    att: (attSum + FORM_PRIOR) / (wSum + FORM_PRIOR),
    def: (defSum + FORM_PRIOR) / (wSum + FORM_PRIOR),
    games: n,
    xgGames
  };
};

const combine = (table, form) => {
  if (table && form) {
    const wt = 0.8 * (table.played / (table.played + 8)); // 10 משחקים: 0.44, 30: 0.63
    return { att: wt * table.att + (1 - wt) * form.att, def: wt * table.def + (1 - wt) * form.def };
  }
  return table || form || null;
};

const poisson = (lambda, k) => {
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p *= lambda / i;
  return p;
};

const scoreGrid = (lh, la) => {
  const ph = [], pa = [];
  for (let k = 0; k <= MAX_GOALS; k++) { ph.push(poisson(lh, k)); pa.push(poisson(la, k)); }
  const grid = [];
  let home = 0, draw = 0, away = 0;
  for (let i = 0; i <= MAX_GOALS; i++) {
    grid.push([]);
    for (let j = 0; j <= MAX_GOALS; j++) {
      let p = ph[i] * pa[j];
      if (i === 0 && j === 0) p *= 1 - lh * la * RHO;
      else if (i === 0 && j === 1) p *= 1 + lh * RHO;
      else if (i === 1 && j === 0) p *= 1 + la * RHO;
      else if (i === 1 && j === 1) p *= 1 - RHO;
      p = Math.max(0, p);
      grid[i].push(p);
      if (i > j) home += p; else if (i === j) draw += p; else away += p;
    }
  }
  const total = home + draw + away;
  return { grid, home: home / total, draw: draw / total, away: away / total };
};

const marketProbs = (odds) => {
  if (!odds || !odds.homeWin || !odds.draw || !odds.awayWin) return null;
  const h = 1 / odds.homeWin, d = 1 / odds.draw, a = 1 / odds.awayWin;
  const t = h + d + a;
  return { home: h / t, draw: d / t, away: a / t };
};

// צפי השערים שמתאים הכי טוב להסתברויות של היחסים, קרוב לסך השערים של המודל
const fitToMarket = (m, total) => {
  let best = null;
  for (let T = 1.2; T <= 4.5; T += 0.05) {
    for (let s = -3; s <= 3; s += 0.05) {
      const lh = (T + s) / 2, la = (T - s) / 2;
      if (lh < 0.1 || la < 0.1) continue;
      const g = scoreGrid(lh, la);
      const err = (g.home - m.home) ** 2 + (g.draw - m.draw) ** 2 + (g.away - m.away) ** 2 +
        0.002 * (T - total) ** 2;
      if (!best || err < best.err) best = { err, lh, la };
    }
  }
  return best;
};

// התוצאה עם הניקוד הצפוי הגבוה ביותר: בול = 3, כיוון = 1
// => ניקוד צפוי = 2 * P(התוצאה) + P(הכיוון שלה)
const bestPick = (g) => {
  let best = null;
  for (let i = 0; i <= 5; i++) {
    for (let j = 0; j <= 5; j++) {
      const dir = i > j ? g.home : i === j ? g.draw : g.away;
      const ep = 2 * g.grid[i][j] + dir;
      if (!best || ep > best.ep) best = { ep, i, j };
    }
  }
  return best;
};

const round1 = (v) => Math.round(v * 10) / 10;

/**
 * homeId, awayId - מזהי 365
 * standingsRows - שורות הטבלה של התחרות (אפשר ריק)
 * homeGames, awayGames - משחקים שהסתיימו, החדשים ראשונים (מבנה 365)
 * odds - { homeWin, draw, awayWin } או null
 * xgByGame - Map של gameId -> { competitorId: xG } (אפשר null)
 */
const predictMatch = ({ homeId, awayId, standingsRows = [], homeGames = [], awayGames = [], odds = null, xgByGame = null }) => {
  const avg = leagueAverage(standingsRows);
  const hTable = tableStrength(standingsRows, homeId, avg);
  const aTable = tableStrength(standingsRows, awayId, avg);
  const hForm = formStrength(homeId, homeGames, standingsRows, avg, xgByGame);
  const aForm = formStrength(awayId, awayGames, standingsRows, avg, xgByGame);
  const h = combine(hTable, hForm);
  const a = combine(aTable, aForm);
  const market = marketProbs(odds);
  if ((!h || !a) && !market) return null;

  let lh = h && a ? avg * HOME * h.att * a.def : avg * HOME;
  let la = h && a ? avg * AWAY * a.att * h.def : avg * AWAY;
  lh = clamp(lh, 0.2, 4.5);
  la = clamp(la, 0.2, 4.5);

  if (market) {
    const fit = fitToMarket(market, lh + la);
    const wm = h && a ? 0.75 : 1; // יחסים לבד כשאין נתונים, אחרת שילוב
    lh = wm * fit.lh + (1 - wm) * lh;
    la = wm * fit.la + (1 - wm) * la;
  }

  const g = scoreGrid(lh, la);
  const pick = bestPick(g);
  return {
    expectedHome: round1(lh),
    expectedAway: round1(la),
    suggestedHome: pick.i,
    suggestedAway: pick.j,
    probabilities: {
      home: Math.round(g.home * 100),
      draw: Math.round(g.draw * 100),
      away: Math.round(g.away * 100)
    },
    basis: {
      table: Boolean(hTable && aTable),
      form: Boolean(hForm && aForm),
      xg: Boolean(hForm && aForm && hForm.xgGames >= 3 && aForm.xgGames >= 3),
      odds: Boolean(market)
    }
  };
};

module.exports = { predictMatch, _internal: { leagueAverage, tableStrength, formStrength, scoreGrid, bestPick, fitToMarket } };
