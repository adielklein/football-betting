const test = require('node:test');
const assert = require('node:assert');
const { buildScoreAudit } = require('./scoreAudit');

const NOW = new Date('2026-10-20T12:00:00Z').getTime();
const week = { _id: 'w1', name: 'סופ״ש 1', month: 10, season: '2026-27', lockTime: new Date('2026-10-17T10:00:00Z') };
const users = [{ _id: 'dana', name: 'דנה', role: 'user' }, { _id: 'yossi', name: 'יוסי', role: 'user' }, { _id: 'adm', name: 'אדמין', role: 'admin' }];
const match = (id, result, odds = null, extra = {}) => ({
  _id: id, weekId: 'w1', team1: `בית ${id}`, team2: `חוץ ${id}`,
  fullDate: new Date('2026-10-18T18:00:00Z'), result, odds, ...extra
});
const bet = (userId, matchId, a, b, points, extra = {}) => ({
  _id: `${userId}-${matchId}`, userId, matchId, weekId: 'w1',
  prediction: { team1Goals: a, team2Goals: b }, points, updatedAt: new Date('2026-10-16T10:00:00Z'), ...extra
});
const audit = (over) => buildScoreAudit({ weeks: [week], users, now: NOW, scores: [], ...over });
const kinds = (r, severity) => r.issues.filter((i) => !severity || i.severity === severity).map((i) => i.kind);

// הערכים כאן חושבו ביד לפי הכלל, ולא דרך calculateMatchPoints - כדי שגם
// טעות בכלל עצמו תיתפס
test('ניקוד תקין בלי יחסים: בול 3, כיוון 1, החטאה 0 - אין ממצאים', () => {
  const r = audit({
    matches: [match('m1', { team1Goals: 2, team2Goals: 1 })],
    bets: [bet('dana', 'm1', 2, 1, 3), bet('yossi', 'm1', 1, 0, 1), bet('adm', 'm1', 0, 2, 0)],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 3 }, { userId: 'yossi', weekId: 'w1', weeklyScore: 1 }, { userId: 'adm', weekId: 'w1', weeklyScore: 0 }]
  });
  assert.deepStrictEqual(r.issues, []);
  assert.equal(r.summary.betsChecked, 3);
  const dana = r.players.find((p) => p.userId === 'dana');
  assert.deepStrictEqual([dana.exact, dana.expectedPoints, dana.storedPoints], [1, 3, 3]);
});

test('ניקוד תקין עם יחסים: בול = יחס×2/3, כיוון = יחס/3, לפי היחס של מה שקרה', () => {
  // ניצחון בית, יחס 2.4: בול 1.6, כיוון 0.8
  const r = audit({
    matches: [match('m1', { team1Goals: 2, team2Goals: 1 }, { homeWin: 2.4, draw: 3.1, awayWin: 2.9 })],
    bets: [bet('dana', 'm1', 2, 1, 1.6), bet('yossi', 'm1', 3, 0, 0.8)],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 1.6 }, { userId: 'yossi', weekId: 'w1', weeklyScore: 0.8 }]
  });
  assert.deepStrictEqual(r.issues, []);
});

test('ניקוד שלא עודכן אחרי תיקון תוצאה נתפס, והשבוע מסומן לחישוב מחדש', () => {
  // התוצאה תוקנה ל-1-1, אבל ההימור עוד מחזיק את 3 הנקודות של 2-1
  const r = audit({
    matches: [match('m1', { team1Goals: 1, team2Goals: 1 })],
    bets: [bet('dana', 'm1', 2, 1, 3)],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 3 }]
  });
  const pointsIssue = r.issues.find((i) => i.kind === 'bet_points');
  assert.deepStrictEqual([pointsIssue.stored, pointsIssue.expected], [3, 0]);
  assert.ok(kinds(r).includes('weekly_score'));
  assert.equal(r.weeks[0].needsRecalc, true);
  assert.equal(r.summary.errors, 2);
});

test('ניקוד שבועי שלא תואם לסכום ההימורים נתפס', () => {
  const r = audit({
    matches: [match('m1', { team1Goals: 2, team2Goals: 1 }), match('m2', { team1Goals: 0, team2Goals: 0 })],
    bets: [bet('dana', 'm1', 2, 1, 3), bet('dana', 'm2', 0, 0, 3)],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 3 }]
  });
  const w = r.issues.find((i) => i.kind === 'weekly_score');
  assert.deepStrictEqual([w.stored, w.expected], [3, 6]);
});

test('שחקן עם נקודות בלי רשומת ניקוד בכלל - לא מופיע בטבלה', () => {
  const r = audit({ matches: [match('m1', { team1Goals: 2, team2Goals: 1 })], bets: [bet('dana', 'm1', 2, 1, 3)] });
  assert.match(r.issues.find((i) => i.kind === 'weekly_score').message, /אין רשומת ניקוד/);
});

test('סכומים שבריים לא מייצרים אזעקות שווא (0.1+0.2)', () => {
  const r = audit({
    matches: [match('m1', { team1Goals: 1, team2Goals: 0 }, { homeWin: 0.3 }), match('m2', { team1Goals: 1, team2Goals: 0 }, { homeWin: 0.6 })],
    bets: [bet('dana', 'm1', 2, 0, 0.1), bet('dana', 'm2', 2, 0, 0.2)],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 0.1 + 0.2 }]
  });
  assert.deepStrictEqual(kinds(r, 'error'), []);
});

test('משחק שנגמר בלי תוצאה נתפס; משחק שנדחה או שעוד לא נגמר - לא', () => {
  const r = audit({
    matches: [
      match('m1', null),
      match('m2', null, null, { postponed: true }),
      match('m3', null, null, { fullDate: new Date(NOW - 60 * 60 * 1000) })
    ],
    bets: []
  });
  assert.deepStrictEqual(r.issues.filter((i) => i.kind === 'missing_result').map((i) => i.matchId), ['m1']);
});

test('יחסים חסרים לתוצאה שקרתה מסומנים - הניקוד נפל ליחס 1', () => {
  const r = audit({
    matches: [match('m1', { team1Goals: 1, team2Goals: 1 }, { homeWin: 2, awayWin: 3 })],
    bets: [bet('dana', 'm1', 1, 1, 0.7)], // 1 × 2/3
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 0.7 }]
  });
  assert.deepStrictEqual(kinds(r), ['odds_fallback']);
});

test('משחק כפול, יחס חריג, הארכה, והימור שעודכן אחרי הנעילה מדווחים', () => {
  const r = audit({
    matches: [
      match('m1', { team1Goals: 1, team2Goals: 1, finalScore: { team1Goals: 2, team2Goals: 1 } }, { homeWin: 0.5, draw: 3, awayWin: 2 }),
      { ...match('m2', { team1Goals: 1, team2Goals: 1 }), team1: 'בית m1', team2: 'חוץ m1', fullDate: new Date('2026-10-18T20:00:00Z') }
    ],
    bets: [bet('dana', 'm1', 1, 1, 2, { updatedAt: new Date('2026-10-18T19:00:00Z') })],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 2 }]
  });
  assert.deepStrictEqual(kinds(r).sort(), ['bet_after_lock', 'duplicate_match', 'extra_time', 'odds_suspicious'].sort());
});

test('הימור שרשום על שבוע אחר מהמשחק שלו מסומן', () => {
  const r = audit({
    matches: [match('m1', { team1Goals: 0, team2Goals: 0 })],
    bets: [bet('dana', 'm1', 0, 0, 3, { weekId: 'w-old' })],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 3 }]
  });
  assert.deepStrictEqual(kinds(r), ['bet_week_mismatch']);
});

test('הממצאים ממוינים: שגיאות, אזהרות, הערות', () => {
  const r = audit({
    matches: [match('m1', { team1Goals: 1, team2Goals: 1, finalScore: { team1Goals: 2, team2Goals: 1 } }), match('m2', null)],
    bets: [bet('dana', 'm1', 1, 1, 0)],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 0 }]
  });
  const sev = r.issues.map((i) => i.severity);
  assert.deepStrictEqual(sev, [...sev].sort((a, b) => ['error', 'warn', 'info'].indexOf(a) - ['error', 'warn', 'info'].indexOf(b)));
  assert.equal(sev[0], 'error');
});
