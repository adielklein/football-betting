import { test } from 'node:test';
import assert from 'node:assert/strict';
import { shirtsForMatch, kitFor } from './kits.js';

test('known team gets its kit pattern, unknown team gets the 365 color', () => {
  const s = shirtsForMatch({ team1ExternalId: '132', team2ExternalId: '99999', team1Color: '#282E60', team2Color: '#00FF00' });
  assert.equal(s.team1.kit.p, 'stripes');
  assert.deepEqual(s.team2, { color: '#00FF00' });
});

test('no kit and no color -> no shirt', () => {
  assert.deepEqual(shirtsForMatch({}), { team1: null, team2: null });
});

test('away kit clashing with home goes to the 365 second-kit color', () => {
  // ליברפול (אדום) מול ארסנל (אדום) - 365 בחרו לארסנל את הכחול-כהה
  const s = shirtsForMatch({ team1ExternalId: 108, team2ExternalId: 104, team1Color: '#E41E2C', team2Color: '#33436E' });
  assert.equal(s.team1.kit.body, '#C8102E');
  assert.deepEqual(s.team2, { color: '#33436E' });
});

test('no clash keeps the away kit', () => {
  const s = shirtsForMatch({ team1ExternalId: 116, team2ExternalId: 104, team1Color: '#FFFFFF', team2Color: '#E10000' });
  assert.equal(s.team2.kit.body, '#EF0107');
});

test('ids work as numbers or strings', () => {
  assert.ok(kitFor(116));
  assert.ok(kitFor('116'));
  assert.equal(kitFor(null), null);
});
