const { test } = require('node:test');
const assert = require('node:assert/strict');
const { predictMatch } = require('./matchPredictor');

// ליגה של 10 קבוצות אחרי 20 מחזורים. 1 = הכי חזקה, 10 = הכי חלשה
const row = (id, gf, ga, played = 20) => ({ competitor: { id }, gamePlayed: played, for: gf, against: ga });
const ROWS = [
  row(1, 48, 14), row(2, 42, 18), row(3, 36, 22), row(4, 30, 26), row(5, 27, 27),
  row(6, 25, 29), row(7, 22, 31), row(8, 20, 34), row(9, 17, 38), row(10, 15, 43)
];
// משחק שהסתיים, מנקודת המבט של team: [יריבה, שערי זכות, שערי חובה, בבית?]
const games = (team, list) => list.map(([opp, gf, ga, home]) => (home
  ? { homeCompetitor: { id: team, score: gf }, awayCompetitor: { id: opp, score: ga } }
  : { homeCompetitor: { id: opp, score: ga }, awayCompetitor: { id: team, score: gf } }));

test('a top team with tough recent games beats a weak team that only beat the bottom', () => {
  // 2 (צמרת): תוצאות בינוניות, אבל מול 1, 3 ו-4
  const strong = games(2, [[1, 1, 1, false], [3, 1, 2, false], [4, 1, 1, true], [1, 0, 1, true], [3, 2, 1, true]]);
  // 8 (תחתית): 5 ניצחונות רצופים, כולם על 9 ו-10
  const hot = games(8, [[10, 3, 0, true], [9, 2, 0, false], [10, 2, 1, false], [9, 3, 1, true], [10, 2, 0, true]]);
  const p = predictMatch({ homeId: 8, awayId: 2, standingsRows: ROWS, homeGames: hot, awayGames: strong });
  assert.ok(p.expectedAway > p.expectedHome, `expected away favourite, got ${p.expectedHome}-${p.expectedAway}`);
  assert.ok(p.probabilities.away > p.probabilities.home);
  assert.ok(p.suggestedAway >= p.suggestedHome);
});

test('beating strong opponents counts more than beating weak ones', () => {
  const vsStrong = games(5, [[1, 2, 1, true], [2, 2, 1, false], [3, 2, 1, true]]);
  const vsWeak = games(5, [[10, 2, 1, true], [9, 2, 1, false], [8, 2, 1, true]]);
  const opp = games(6, [[5, 1, 1, true]]);
  const a = predictMatch({ homeId: 5, awayId: 6, standingsRows: ROWS, homeGames: vsStrong, awayGames: opp });
  const b = predictMatch({ homeId: 5, awayId: 6, standingsRows: ROWS, homeGames: vsWeak, awayGames: opp });
  assert.ok(a.expectedHome > b.expectedHome);
  assert.ok(a.expectedAway < b.expectedAway);
});

test('odds pull the prediction toward the market', () => {
  const g1 = games(5, [[6, 1, 1, true]]);
  const g2 = games(6, [[5, 1, 1, false]]);
  const base = predictMatch({ homeId: 5, awayId: 6, standingsRows: ROWS, homeGames: g1, awayGames: g2 });
  const withOdds = predictMatch({ homeId: 5, awayId: 6, standingsRows: ROWS, homeGames: g1, awayGames: g2, odds: { homeWin: 4.5, draw: 3.8, awayWin: 1.7 } });
  assert.ok(withOdds.probabilities.away > base.probabilities.away);
  assert.ok(withOdds.expectedAway > withOdds.expectedHome);
  assert.equal(withOdds.basis.odds, true);
});

test('works without a table (cups) and returns null with no data at all', () => {
  const g1 = games(11, [[12, 2, 0, true], [13, 1, 0, false]]);
  const g2 = games(14, [[15, 0, 2, true]]);
  const p = predictMatch({ homeId: 11, awayId: 14, homeGames: g1, awayGames: g2 });
  assert.ok(p && p.expectedHome > p.expectedAway);
  assert.equal(p.basis.table, false);
  assert.equal(predictMatch({ homeId: 1, awayId: 2 }), null);
});

test('probabilities sum to ~100 and the pick is a sane scoreline', () => {
  const p = predictMatch({ homeId: 1, awayId: 10, standingsRows: ROWS, homeGames: [], awayGames: [] });
  const s = p.probabilities.home + p.probabilities.draw + p.probabilities.away;
  assert.ok(s >= 99 && s <= 101);
  assert.ok(p.suggestedHome > p.suggestedAway);
  assert.ok(p.suggestedHome <= 5);
});

test('xG tempers lucky results: same goals, lower xG -> weaker attack', () => {
  const g = (id, list) => list.map(([opp, gf, ga], k) => ({ id: id * 100 + k, homeCompetitor: { id, score: gf }, awayCompetitor: { id: opp, score: ga } }));
  const recent = g(5, [[6, 3, 0], [7, 3, 0], [4, 3, 0], [6, 3, 0]]);
  const opp = games(6, [[5, 1, 1, true]]);
  const xgLucky = new Map(recent.map((x) => [x.id, { 5: 0.6, [x.awayCompetitor.id]: 1.2 }]));
  const xgReal = new Map(recent.map((x) => [x.id, { 5: 2.8, [x.awayCompetitor.id]: 0.3 }]));
  const lucky = predictMatch({ homeId: 5, awayId: 6, standingsRows: ROWS, homeGames: recent, awayGames: opp, xgByGame: xgLucky });
  const real = predictMatch({ homeId: 5, awayId: 6, standingsRows: ROWS, homeGames: recent, awayGames: opp, xgByGame: xgReal });
  const none = predictMatch({ homeId: 5, awayId: 6, standingsRows: ROWS, homeGames: recent, awayGames: opp });
  assert.ok(lucky.expectedHome < none.expectedHome);
  assert.ok(real.expectedHome > lucky.expectedHome);
  assert.ok(lucky.expectedAway > real.expectedAway);
});

test('Dixon-Coles correction lifts low draws', () => {
  const { scoreGrid } = require('./matchPredictor')._internal;
  const g = scoreGrid(1.2, 1.0);
  const indep = Math.exp(-1.2) * Math.exp(-1.0) * 1.2 * 1.0;
  assert.ok(g.grid[1][1] > indep);
});

test('pickForScoring follows our scoring, including match odds', () => {
  const { pickForScoring } = require('./matchPredictor');
  const plain = pickForScoring(1.6, 1.0);
  assert.ok(plain.home > plain.away);
  // יחס גבוה מאוד על החוץ הופך את ההימור עליו למשתלם יותר
  const juicy = pickForScoring(1.6, 1.0, { homeWin: 1.5, draw: 3.5, awayWin: 9 });
  assert.ok(juicy.away > juicy.home);
});
