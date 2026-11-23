const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseMongoUri, sameDatabase, stripDevices } = require('./stagingSeed');

const prod = 'mongodb+srv://u:p@cluster0.abc.mongodb.net/football?retryWrites=true';
const stage = 'mongodb+srv://u:p@cluster0.abc.mongodb.net/football-staging?retryWrites=true';

test('parses host and database', () => {
  assert.deepEqual(parseMongoUri(prod), { hosts: 'cluster0.abc.mongodb.net', db: 'football' });
  assert.equal(parseMongoUri('mongodb+srv://u:p@cluster0.abc.mongodb.net/?x=1').db, 'test');
  assert.equal(parseMongoUri('mongodb+srv://u:p@cluster0.abc.mongodb.net').db, 'test');
});

test('same cluster, different database is not the same', () => {
  assert.equal(sameDatabase(prod, stage), false);
});

test('same database is detected, also with different user or params', () => {
  assert.equal(sameDatabase(prod, 'mongodb+srv://other:pw@CLUSTER0.abc.mongodb.net/football'), true);
  // בלי שם מסד בשתיהן - שתיהן "test"
  assert.equal(sameDatabase('mongodb+srv://a@h.net/', 'mongodb+srv://b@h.net/?w=1'), true);
});

test('unparseable uri counts as same, so nothing is copied', () => {
  assert.equal(sameDatabase('garbage', stage), true);
});

test('user devices are removed, other settings kept', () => {
  const u = { name: 'x', pushSettings: { enabled: true, subscription: { endpoint: 'a' }, subscriptions: [{ endpoint: 'b' }], goalAlerts: true } };
  const s = stripDevices(u);
  assert.deepEqual(s.pushSettings.subscriptions, []);
  assert.equal(s.pushSettings.subscription, undefined);
  assert.equal(s.pushSettings.enabled, false);
  assert.equal(s.pushSettings.goalAlerts, true);
  assert.equal(u.pushSettings.subscriptions.length, 1);
});
