// טבלה חיה: איך הייתה נראית הטבלה השבועית אילו הכל היה נגמר עכשיו.
//
// הרעיון אינו להראות ניקוד נוסף אלא תנועה. הטבלה הרגילה מראה את מה שכבר
// סגור; כאן רואים מה המשחקים שמתנהלים ברגע זה עושים לדירוג, ולכן שער אחד
// במגרש מזיז שורות על המסך.
//
// ההשוואה היא בין שני מצבים של אותו שבוע:
//   מאושר - רק משחקים שיש להם תוצאה שמורה
//   חי     - אותם משחקים, ובנוסף התוצאה הנוכחית של אלה שמתנהלים
//
// ההפרש בין הדירוגים הוא מה שמעניין.

const { calculateMatchPoints } = require('./scoring');

const rankOf = (score, others) => others.filter((s) => s > score).length + 1;

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * @param players [{ _id, name }] - שחקנים בלבד, בלי מנהלים
 * @param matches [{ _id, team1, team2, result, odds }]
 * @param bets    [{ userId, matchId, prediction }]
 * @param live    [{ matchId, status, team1Goals, team2Goals, minute }]
 */
const buildLiveTable = (players, matches, bets, live = []) => {
  const liveById = new Map(live.map((l) => [String(l.matchId), l]));

  const hasSaved = (m) => m.result && m.result.team1Goals != null && m.result.team2Goals != null;

  // תוצאה חיה נחשבת רק כשהיא באמת קיימת ולמשחק אין עדיין תוצאה שמורה.
  // משחק שהסתיים וכבר נשמר - התוצאה השמורה היא הקובעת, כי היא כוללת
  // הארכה ופנדלים והיא זו שהניקוד הרשמי חושב לפיה.
  const liveResultFor = (m) => {
    if (hasSaved(m)) return null;
    const l = liveById.get(String(m._id));
    if (!l || l.team1Goals == null || l.team2Goals == null) return null;
    if (l.status !== 'live' && l.status !== 'finished') return null;
    return { result: { team1Goals: l.team1Goals, team2Goals: l.team2Goals }, info: l };
  };

  const matchById = new Map(matches.map((m) => [String(m._id), m]));

  const confirmed = new Map(players.map((p) => [String(p._id), 0]));
  const withLive = new Map(players.map((p) => [String(p._id), 0]));
  const liveGains = new Map(players.map((p) => [String(p._id), []]));

  for (const bet of bets) {
    const uid = String(bet.userId);
    if (!confirmed.has(uid)) continue;
    const match = matchById.get(String(bet.matchId));
    if (!match || !bet.prediction) continue;

    if (hasSaved(match)) {
      const pts = calculateMatchPoints(bet.prediction, match.result, match.odds);
      confirmed.set(uid, confirmed.get(uid) + pts);
      withLive.set(uid, withLive.get(uid) + pts);
      continue;
    }

    const l = liveResultFor(match);
    if (!l) continue;

    const pts = calculateMatchPoints(bet.prediction, l.result, match.odds);
    withLive.set(uid, withLive.get(uid) + pts);
    if (pts > 0) {
      liveGains.get(uid).push({
        matchId: String(match._id),
        team1: match.team1,
        team2: match.team2,
        score: `${l.result.team1Goals}-${l.result.team2Goals}`,
        minute: l.info.minute || null,
        points: round1(pts),
        exact: bet.prediction.team1Goals === l.result.team1Goals
          && bet.prediction.team2Goals === l.result.team2Goals
      });
    }
  }

  const confirmedScores = [...confirmed.values()];
  const liveScores = [...withLive.values()];

  const rows = players.map((p) => {
    const uid = String(p._id);
    const c = confirmed.get(uid);
    const w = withLive.get(uid);
    const confirmedRank = rankOf(c, confirmedScores);
    const liveRank = rankOf(w, liveScores);

    return {
      userId: uid,
      name: p.name,
      confirmedScore: round1(c),
      liveScore: round1(w),
      gained: round1(w - c),
      confirmedRank,
      liveRank,
      // חיובי = טיפס. זו השורה שגורמת לאנשים להסתכל.
      rankChange: confirmedRank - liveRank,
      gains: liveGains.get(uid).sort((a, b) => b.points - a.points)
    };
  });

  rows.sort((a, b) => b.liveScore - a.liveScore || a.name.localeCompare(b.name, 'he'));

  const liveMatches = matches.filter((m) => {
    const l = liveById.get(String(m._id));
    return !hasSaved(m) && l && l.status === 'live';
  }).length;

  return {
    rows,
    liveMatches,
    // כמה משחקים בשבוע עדיין לא הוכרעו בכלל
    pendingMatches: matches.filter((m) => !hasSaved(m) && !liveResultFor(m)).length
  };
};

module.exports = { buildLiveTable, rankOf };
