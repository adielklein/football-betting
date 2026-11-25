import { test } from 'node:test';
import assert from 'node:assert/strict';
import { askNotificationPermission } from './notifyPermission.js';

test('already granted - no prompt at all', async () => {
  let asked = 0;
  globalThis.Notification = { permission: 'granted', requestPermission: () => { asked++; return new Promise(() => {}); } };
  assert.equal(await askNotificationPermission(), 'granted');
  assert.equal(asked, 0);
});

test('old Samsung Internet: callback only, no promise - still resolves', async () => {
  globalThis.Notification = { permission: 'default', requestPermission: (cb) => { setTimeout(() => cb('granted'), 5); return undefined; } };
  assert.equal(await askNotificationPermission(), 'granted');
});

test('modern browsers: promise', async () => {
  globalThis.Notification = { permission: 'default', requestPermission: () => Promise.resolve('denied') };
  assert.equal(await askNotificationPermission(), 'denied');
});
