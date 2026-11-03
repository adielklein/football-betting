const test = require('node:test');
const assert = require('node:assert');
process.env.AUTH_SECRET = 'test-secret';
const { sign, verify, shouldRenew, resetKey, TTL_MS, RENEW_AFTER_MS } = require('./authToken');

test('טוקן שנחתם עובר אימות ומחזיר את המשתמש', () => {
  const data = verify(sign({ uid: 'u1', tv: 2 }));
  assert.equal(data.uid, 'u1');
  assert.equal(data.tv, 2);
});

test('שינוי של תו אחד בתוכן או בחתימה נדחה', () => {
  const t = sign({ uid: 'u1' });
  const [payload, sig] = t.split('.');
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), uid: 'admin' })).toString('base64url');
  assert.equal(verify(`${forged}.${sig}`), null, 'החלפת המשתמש');
  assert.equal(verify(`${payload}.${sig.slice(0, -2)}AA`), null, 'חתימה שגויה');
  assert.equal(verify(`${payload}.`), null);
});

test('מזהה משתמש לבד - מה שנשלח עד היום - איננו טוקן', () => {
  assert.equal(verify('64f1c2a9e1b2c3d4e5f60718'), null);
  assert.equal(verify(''), null);
  assert.equal(verify(undefined), null);
  assert.equal(verify({ uid: 'x' }), null);
});

test('טוקן שפג תוקפו נדחה', () => {
  const now = Date.now();
  const t = sign({ uid: 'u1' }, now);
  assert.ok(verify(t, now + TTL_MS - 1000));
  assert.equal(verify(t, now + TTL_MS + 1000), null);
});

test('טוקן שנחתם במפתח אחר נדחה', () => {
  const t = sign({ uid: 'u1' });
  process.env.AUTH_SECRET = 'other-secret';
  resetKey();
  assert.equal(verify(t), null);
  process.env.AUTH_SECRET = 'test-secret';
  resetKey();
  assert.ok(verify(t));
});

test('בלי AUTH_SECRET המפתח נגזר מ-VAPID ונשאר יציב בין הפעלות', () => {
  delete process.env.AUTH_SECRET;
  process.env.VAPID_PRIVATE_KEY = 'vapid-private';
  resetKey();
  const t = sign({ uid: 'u1' });
  resetKey(); // "הפעלה מחדש"
  assert.ok(verify(t), 'אותו מפתח אחרי הפעלה מחדש');
  process.env.AUTH_SECRET = 'test-secret';
  resetKey();
});

test('חידוש: רק טוקן ותיק מספיק', () => {
  const now = Date.now();
  const data = verify(sign({ uid: 'u1' }, now), now);
  assert.equal(shouldRenew(data, now + 1000), false);
  assert.equal(shouldRenew(data, now + RENEW_AFTER_MS + 1000), true);
});
