const { test } = require('node:test');
const assert = require('node:assert/strict');
const { goalsTendency, byLeague, teamBias, vsCrowd, rankHistory } = require('./playerInsights');

const P = (a, b) => ({ team1Goals: a, team2Goals: b });

test('goalsTendency: optimist when predicting more goals than happen', () => {
  const items = [
    { prediction: P(2, 1), result: P(1, 0) },
    { prediction: P(3, 1), result: P(1, 1) },
    { prediction: P(2, 2), result: P(0, 0) },
    { prediction: P(1, 1), result: P(1, 1) },
    { prediction: P(2, 0), result: P(1, 0) },
  ];
  const t = goalsTendency(items);
  assert.equal(t.matches, 5);
  assert.equal(t.avgPredicted, 3);
  assert.equal(t.avgActual, 1.2);
  assert.equal(t.label, 'optimist');
  assert.equal(t.overRate, 80);
});

test('goalsTendency: needs enough matches and skips missing results', () => {
  assert.equal(goalsTendency([{ prediction: P(1, 0), result: P(1, 0) }]), null);
  assert.equal(goalsTendency([{ prediction: P(1, 0), result: undefined }], { minMatches: 1 }), null);
});

test('byLeague: groups, filters small samples, sorts by accuracy', () => {
  const leagues = new Map([['A', { name: 'פרמייר ליג', color: '#f00' }], ['B', { name: 'לה ליגה' }], ['C', { name: 'קטנה' }]]);
  const items = [
    ...[1, 2, 3].map(() => ({ leagueId: 'A', prediction: P(1, 0), result: P(2, 0), points: 1 })),
    { leagueId: 'B', prediction: P(1, 0), result: P(0, 1), points: 0 },
    { leagueId: 'B', prediction: P(1, 1), result: P(1, 1), points: 3 },
    { leagueId: 'B', prediction: P(0, 2), result: P(1, 0), points: 0 },
    { leagueId: 'C', prediction: P(1, 0), result: P(1, 0), points: 3 },
  ];
  const rows = byLeague(items, leagues);
  assert.deepEqual(rows.map((r) => [r.name, r.accuracy, r.exact]), [['פרמייר ליג', 100, 0], ['לה ליגה', 33, 1]]);
  assert.equal(rows[1].avgPoints, 1);
});

test('teamBias: reads results from the team side, home or away', () => {
  const same = (a, b) => a === b;
  const items = [
    { team1: 'ברצלונה', team2: 'X', prediction: P(2, 0), result: P(1, 1), points: 0 },
    { team1: 'Y', team2: 'ברצלונה', prediction: P(0, 2), result: P(0, 1), points: 1 },
    { team1: 'ברצלונה', team2: 'Z', prediction: P(3, 0), result: P(0, 1), points: 0 },
    { team1: 'A', team2: 'B', prediction: P(1, 0), result: P(1, 0), points: 3 },
  ];
  const b = teamBias(items, 'ברצלונה', same);
  assert.equal(b.games, 3);
  assert.equal(b.predictedWinRate, 100);
  assert.equal(b.actualWinRate, 33);
  assert.equal(b.actualLossRate, 33);
  assert.equal(b.accuracy, 33);
  assert.equal(teamBias(items, null, same), null);
  assert.equal(teamBias(items, 'ריאל', same), null);
});

test('vsCrowd: counts going against the majority and what it earned', () => {
  const others = new Map([
    ['m1', [P(2, 0), P(1, 0), P(3, 1), P(0, 0)]], // רוב: בית
    ['m2', [P(2, 0), P(1, 0), P(0, 1), P(1, 2)]], // שוויון - לא נספר
    ['m3', [P(0, 1), P(0, 2), P(1, 3)]], // רוב: חוץ
    ['m4', [P(1, 0)]], // מעט מדי שחקנים
  ]);
  const mine = [
    { matchId: 'm1', prediction: P(1, 1), result: P(2, 2), points: 4.5, label: 'א-ב' }, // נגד, פגע
    { matchId: 'm2', prediction: P(0, 0), result: P(0, 0), points: 3 },
    { matchId: 'm3', prediction: P(0, 1), result: P(1, 0), points: 0 }, // עם, החטיא
    { matchId: 'm4', prediction: P(0, 0), result: P(0, 0), points: 3 },
  ];
  const c = vsCrowd(mine, others);
  assert.equal(c.matches, 2);
  assert.equal(c.againstCount, 1);
  assert.equal(c.againstHits, 1);
  assert.equal(c.againstPoints, 4.5);
  assert.equal(c.withHitRate, 0);
  assert.deepEqual(c.best, { label: 'א-ב', points: 4.5, crowdShare: 75 });
});

test('rankHistory: cumulative place per played week, ties share', () => {
  const weeks = [{ _id: 'w1', name: '1' }, { _id: 'w2', name: '2' }, { _id: 'w3', name: '3' }];
  const scores = [
    { userId: 'me', weekId: 'w1', weeklyScore: 1 },
    { userId: 'a', weekId: 'w1', weeklyScore: 3 },
    { userId: 'b', weekId: 'w1', weeklyScore: 2 },
    { userId: 'me', weekId: 'w2', weeklyScore: 4 },
    { userId: 'a', weekId: 'w2', weeklyScore: 2 },
    { userId: 'b', weekId: 'w2', weeklyScore: 0.1 },
  ];
  const h = rankHistory(weeks, scores, 'me');
  assert.deepEqual(h.map((x) => [x.name, x.rank, x.total]), [['1', 3, 1], ['2', 1, 5]]);
  assert.equal(h[0].players, 3);
  // תיקו חולק מקום
  const tie = rankHistory([{ _id: 'w', name: 'w' }], [{ userId: 'me', weekId: 'w', weeklyScore: 2 }, { userId: 'x', weekId: 'w', weeklyScore: 2 }], 'me');
  assert.equal(tie[0].rank, 1);
  assert.deepEqual(rankHistory(weeks, scores, 'nobody'), []);
});
