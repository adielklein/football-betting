const test = require('node:test');
const assert = require('node:assert');
const { pushServiceOf, deviceFromUserAgent, describeSubscription } = require('./deviceInfo');

test('שירות הדחיפה מזוהה מהכתובת', () => {
  assert.equal(pushServiceOf('https://web.push.apple.com/QABC123'), 'Safari / Apple');
  assert.equal(pushServiceOf('https://fcm.googleapis.com/fcm/send/xyz'), 'Chrome');
  assert.equal(pushServiceOf('https://updates.push.services.mozilla.com/wpush/v2/abc'), 'Firefox');
});

test('כתובת לא מוכרת מציגה את המאחסן ולא "לא ידוע"', () => {
  assert.equal(pushServiceOf('https://push.example.org/v1/abc'), 'push.example.org');
});

test('בלי כתובת אין מה לזהות', () => {
  assert.equal(pushServiceOf(''), 'לא ידוע');
  assert.equal(pushServiceOf(undefined), 'לא ידוע');
});

test('Chrome בדסקטופ ובאנדרואיד חולקים את אותו שירות, ולכן לא נטען אנדרואיד מהכתובת', () => {
  // שתי הכתובות זהות מבחינת FCM - ההבדל יכול לבוא רק מה-User-Agent
  assert.equal(pushServiceOf('https://fcm.googleapis.com/fcm/send/desktop'), 'Chrome');
  assert.equal(pushServiceOf('https://fcm.googleapis.com/fcm/send/phone'), 'Chrome');
});

test('המכשיר נגזר מה-User-Agent', () => {
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'iPhone');
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'iPad');
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S911B) Mobile'), 'Android');
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'Windows');
});

test('אייפד מזוהה לפני מק, כי הוא מדווח גם על Mac OS X', () => {
  const ipad = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
  assert.equal(deviceFromUserAgent(ipad), 'iPad');
});

test('מק אמיתי כן מזוהה כמק', () => {
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'Mac');
});

test('טאבלט אנדרואיד נפרד מטלפון לפי Mobile', () => {
  assert.equal(deviceFromUserAgent('Mozilla/5.0 (Linux; Android 13; SM-X200)'), 'טאבלט Android');
});

test('בלי User-Agent מוחזר null, כדי שלא ננחש דגם', () => {
  assert.equal(deviceFromUserAgent(''), null);
  assert.equal(deviceFromUserAgent(undefined), null);
  assert.equal(deviceFromUserAgent('משהו שלא מזכיר שום מערכת'), null);
});

test('מנוי עם User-Agent מתואר בדגם ובשירות', () => {
  const d = describeSubscription({
    endpoint: 'https://web.push.apple.com/abc',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
  });
  assert.equal(d.device, 'iPhone');
  assert.equal(d.service, 'Safari / Apple');
  assert.equal(d.label, 'iPhone · Safari / Apple');
});

test('מנוי ישן בלי User-Agent מתואר בשירות בלבד', () => {
  const d = describeSubscription({ endpoint: 'https://fcm.googleapis.com/fcm/send/xyz' });
  assert.equal(d.device, null);
  assert.equal(d.label, 'Chrome');
});

test('התיאור לעולם אינו כולל את כתובת הדחיפה', () => {
  const endpoint = 'https://web.push.apple.com/SECRET-DEVICE-ID';
  const d = describeSubscription({ endpoint, userAgent: 'iPhone' });
  assert.ok(!JSON.stringify(d).includes('SECRET-DEVICE-ID'));
});
