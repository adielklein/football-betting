const { test } = require('node:test');
const assert = require('node:assert/strict');
const { sortMatches } = require('./matchOrder');

const PL = { _id: 'pl', name: 'פרמייר ליג', order: 1 };
const LL = { _id: 'll', name: 'לה ליגה', order: 2 };
const m = (id, league, date, created = '2026-11-01') => ({ id, leagueId: league, fullDate: date, createdAt: created });

test('league first (by display order), then kickoff, regardless of insertion order', () => {
  const out = sortMatches([
    m('ll-late', LL, '2026-11-22T20:00'),
    m('pl-late', PL, '2026-11-22T18:30'),
    m('ll-early', LL, '2026-11-21T17:15'),
    m('pl-added-last-but-first', PL, '2026-11-21T14:30', '2026-11-05'),
  ]).map((x) => x.id);
  assert.deepEqual(out, ['pl-added-last-but-first', 'pl-late', 'll-early', 'll-late']);
});

test('same display order -> by league name; no league -> last', () => {
  const A = { name: 'ליגת העל', order: 0 };
  const B = { name: 'בונדסליגה', order: 0 };
  const out = sortMatches([m('none', null, '2026-11-20'), m('a', A, '2026-11-21'), m('b', B, '2026-11-22')]).map((x) => x.id);
  assert.deepEqual(out, ['b', 'a', 'none']);
});

test('custom league lookup (unpopulated leagueId)', () => {
  const leagues = new Map([['pl', PL], ['ll', LL]]);
  const out = sortMatches([m('x', 'll', '2026-11-20'), m('y', 'pl', '2026-11-25')], (mm) => leagues.get(mm.leagueId)).map((x) => x.id);
  assert.deepEqual(out, ['y', 'x']);
});

test('missing kickoff falls back to creation time', () => {
  const out = sortMatches([m('b', PL, null, '2026-11-03'), m('a', PL, null, '2026-11-02')]).map((x) => x.id);
  assert.deepEqual(out, ['a', 'b']);
});
