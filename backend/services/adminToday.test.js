const test = require('node:test');
const assert = require('node:assert');
const { buildWeekStatus, buildToday } = require('./adminToday');

const NOW = new Date('2026-11-07T15:00:00Z').getTime();
const H = 60 * 60 * 1000;
const players = [
  { _id: 'dana', name: 'דנה', pushSettings: { enabled: true, subscriptions: [{}] } },
  { _id: 'yossi', name: 'יוסי', pushSettings: { enabled: true, subscriptions: [{}] } },
  { _id: 'avi', name: 'אבי', pushSettings: { enabled: false } }
];
const users = [...players.map((p) => ({ ...p, role: 'player' })), { _id: 'adm', name: 'אדמין', role: 'admin' }];
const week = (over = {}) => ({ _id: 'w1', name: 'סופ״ש', month: 11, season: '2026-27', active: true, locked: false, lockTime: new Date(NOW + 5 * H), ...over });
const match = (id, kickoffOffsetH, result = null, extra = {}) => ({ _id: id, weekId: 'w1', team1: `בית ${id}`, team2: `חוץ ${id}`, fullDate: new Date(NOW + kickoffOffsetH * H), result, ...extra });
const bet = (u, m, a, b, points = 0) => ({ _id: `${u}${m}`, userId: u, matchId: m, weekId: 'w1', prediction: { team1Goals: a, team2Goals: b }, points });
const keys = (s) => s.items.map((i) => i.key);
const status = (over) => buildWeekStatus({ week: week(), players, users, now: NOW, ...over });

test('טיוטה בלי משחקים → "הוסף משחקים"', () => {
  const s = status({ week: week({ active: false, lockTime: null }) });
  assert.equal(s.stage, 'draft');
  assert.deepStrictEqual(keys(s), ['no_matches']);
  assert.deepStrictEqual(s.items[0].action, { type: 'goto', weekId: 'w1', step: 'matches' });
});

test('טיוטה עם משחקים → "הפעל"', () => {
  const s = status({ week: week({ active: false }), matches: [match('m1', 6)] });
  assert.deepStrictEqual(keys(s), ['not_active']);
  assert.equal(s.items[0].action.step, 'activate');
});

test('פתוח: מי שלא סיים להמר, ושליחת תזכורת רק למי שאפשר', () => {
  const s = status({
    matches: [match('m1', 6), match('m2', 7)],
    bets: [bet('dana', 'm1', 1, 0), bet('dana', 'm2', 2, 2), bet('yossi', 'm1', 0, 0)]
  });
  assert.equal(s.stage, 'open');
  const p = s.items.find((i) => i.key === 'pending_bettors');
  assert.equal(p.text, '2 שחקנים עוד לא סיימו להמר');
  assert.deepStrictEqual(p.names.sort(), ['אבי', 'יוסי (1/2)'].sort());
  assert.deepStrictEqual(p.action, { type: 'nudge', weekId: 'w1', count: 1 }, 'רק ליוסי יש התראות');
  assert.match(p.detail, /אחד מהם בלי התראות/);
  assert.equal(s.counts.betComplete, 1);
});

test('פתוח וכולם הימרו → פריט ירוק', () => {
  const s = status({ matches: [match('m1', 6)], bets: ['dana', 'yossi', 'avi'].map((u) => bet(u, 'm1', 1, 1)) });
  assert.ok(keys(s).includes('all_bet'));
});

test('מוחרג מהחודש לא נספר כמי שלא הימר', () => {
  const s = status({ matches: [match('m1', 6)], bets: [bet('dana', 'm1', 1, 1), bet('yossi', 'm1', 1, 1)], exclusions: [{ userId: 'avi' }] });
  assert.ok(keys(s).includes('all_bet'));
});

test('נעילה אחרי תחילת המשחק הראשון מסומנת', () => {
  const s = status({ week: week({ lockTime: new Date(NOW + 8 * H) }), matches: [match('m1', 6)] });
  assert.ok(keys(s).includes('lock_after_kickoff'));
});

test('פתוח בלי שעת נעילה מסומן', () => {
  const s = status({ week: week({ lockTime: null }), matches: [match('m1', 6)] });
  assert.ok(keys(s).includes('no_lock_time'));
});

test('נעול: משחק חי, משחק שנגמר בלי תוצאה, ומשחק שנדחה', () => {
  const s = status({
    week: week({ lockTime: new Date(NOW - 10 * H) }),
    matches: [match('m1', -1), match('m2', -5), match('m3', -4, null, { postponed: true }), match('m4', -6, { team1Goals: 1, team2Goals: 0 })]
  });
  assert.equal(s.stage, 'running');
  assert.deepStrictEqual(keys(s), ['live_now', 'missing_results', 'postponed']);
  assert.deepStrictEqual(s.items.find((i) => i.key === 'missing_results').action, { type: 'sync', weekId: 'w1' });
});

test('ניקוד שלא תואם לתוצאות → "חשב מחדש"', () => {
  const s = status({
    week: week({ lockTime: new Date(NOW - 10 * H) }),
    matches: [match('m1', -6, { team1Goals: 1, team2Goals: 1 })],
    bets: [bet('dana', 'm1', 2, 1, 3)],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 3 }]
  });
  assert.equal(s.stage, 'running', 'לא "הושלם" כשיש פערים');
  assert.deepStrictEqual(s.items.find((i) => i.key === 'score_mismatch').action, { type: 'recalc', weekId: 'w1' });
});

test('הכל נכנס והניקוד תקין → הושלם', () => {
  const s = status({
    week: week({ lockTime: new Date(NOW - 10 * H) }),
    matches: [match('m1', -6, { team1Goals: 2, team2Goals: 1 })],
    bets: [bet('dana', 'm1', 2, 1, 3)],
    scores: [{ userId: 'dana', weekId: 'w1', weeklyScore: 3 }]
  });
  assert.equal(s.stage, 'done');
  assert.deepStrictEqual(keys(s), ['done']);
});

test('המסך: אין שבוע פתוח → "צור שבוע"; שבוע ישן שהושלם לא מוצג', () => {
  const done = { week: week({ _id: 'w0', lockTime: new Date(NOW - 100 * H) }), matches: [], bets: [], scores: [], exclusions: [] };
  // כל המשחקים כבר שוחקו (אחד עוד בלי תוצאה) - זה הזמן לשבוע הבא
  const running = { week: week({ lockTime: new Date(NOW - 10 * H) }), matches: [match('m1', -5)], bets: [], scores: [], exclusions: [] };
  const today = buildToday({ weekData: [running, { ...done, matches: [match('x', -100, { team1Goals: 0, team2Goals: 0 }, { weekId: 'w0' })] }], players, users, now: NOW });
  assert.deepStrictEqual(today.global.map((g) => g.key), ['no_upcoming']);
  assert.deepStrictEqual(today.weeks.map((w) => w.weekId), ['w1']);
});

test('המסך: 365 שנכשל שוב ושוב מופיע עם קישור ללוגים', () => {
  const today = buildToday({
    weekData: [{ week: week(), matches: [match('m1', 6)], bets: [], scores: [], exclusions: [] }],
    players, users, now: NOW,
    providers: [{ source: '365 חי', consecutiveFailures: 4, lastError: { status: 403 } }, { source: '365 ייבוא ונתונים', consecutiveFailures: 1 }]
  });
  assert.deepStrictEqual(today.global.map((g) => g.key), ['provider_365 חי']);
  assert.equal(today.global[0].action.type, 'logs');
  assert.ok(today.todo >= 1);
});

test('ניסוח ליחיד: "משחק אחד", לא "1 משחקים"', () => {
  const s = status({ week: week({ lockTime: new Date(NOW - 10 * H) }), matches: [match('m1', -1), match('m2', -5)] });
  assert.deepStrictEqual(s.items.map((i) => i.text), ['משחק אחד מתנהל עכשיו', 'משחק אחד נגמר ואין לו תוצאה']);
});

test('שבוע נעול שעוד משחקים בו - לא מציעים ליצור את הבא', () => {
  const lockedWeek = week({ lockTime: new Date(NOW - 20 * H) });
  const partial = (ms) => buildToday({ weekData: [{ week: lockedWeek, matches: ms, bets: [], scores: [], exclusions: [] }], players, users, now: NOW });
  // שניים נגמרו, אחד חי, אחד מחר
  const playing = partial([
    match('m1', -20, { team1Goals: 1, team2Goals: 0 }), match('m2', -19, { team1Goals: 2, team2Goals: 2 }),
    match('m3', -1), match('m4', 20)
  ]);
  assert.deepStrictEqual(playing.global.map((g) => g.key), [], 'לא מציע ליצור שבוע');
  assert.equal(playing.weeks[0].counts.upcoming, 1);

  // רק משחק עתידי, בלי חי
  assert.deepStrictEqual(partial([match('m1', -20, { team1Goals: 1, team2Goals: 0 }), match('m4', 20)]).global, []);

  // כל המשחקים כבר התחילו ונגמרו - עכשיו כן
  const finished = partial([match('m1', -20, { team1Goals: 1, team2Goals: 0 }), match('m2', -19, { team1Goals: 0, team2Goals: 0 })]);
  assert.deepStrictEqual(finished.global.map((g) => g.key), ['no_upcoming']);
});

test('שבוע נעול עם משחקים קדימה מראה מתי הבא', () => {
  const s = status({ week: week({ lockTime: new Date(NOW - 20 * H) }), matches: [match('m1', 20), match('m2', 30)] });
  const it = s.items.find((i) => i.key === 'upcoming');
  assert.equal(it.text, '2 משחקים עוד לפנינו');
  assert.equal(it.atLabel, 'הבא');
  assert.equal(new Date(it.at).getTime(), NOW + 20 * H);
});
