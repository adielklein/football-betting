const test = require('node:test');
const assert = require('node:assert');
const {
  pushServiceOf, modelFromUserAgent, platformFromUserAgent, describeSubscription
} = require('./deviceInfo');

const UA_A55 = 'Mozilla/5.0 (Linux; Android 14; SM-A556B Build/UP1A.231005.007) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
// כך נראה כרום מודרני באנדרואיד: הפלטפורמה מוקפאת והדגם הוא האות K
const UA_CHROME_REDUCED = 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36';
const APPLE_EP = 'https://web.push.apple.com/abc';
const FCM_EP = 'https://fcm.googleapis.com/fcm/send/xyz';

test('שירות הדחיפה מזוהה מהכתובת, וכתובת לא מוכרת מציגה את המאחסן', () => {
  assert.equal(pushServiceOf(APPLE_EP), 'Safari / Apple');
  assert.equal(pushServiceOf(FCM_EP), 'Chrome');
  assert.equal(pushServiceOf('https://push.example.org/v1/a'), 'push.example.org');
  assert.equal(pushServiceOf(''), 'לא ידוע');
});

test('דגם סמסונג מתורגם לשם השיווקי', () => {
  assert.equal(modelFromUserAgent(UA_A55), 'Galaxy A55');
  assert.equal(modelFromUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S918B)'), 'Galaxy S23 Ultra');
});

test('סיומת אזורית בקוד הדגם לא משנה את הזיהוי', () => {
  for (const suffix of ['B', 'E', 'U', 'N']) {
    assert.equal(
      modelFromUserAgent(`Mozilla/5.0 (Linux; Android 14; SM-A556${suffix} Build/X)`),
      'Galaxy A55',
      suffix
    );
  }
});

test('דגם סמסונג שאינו בטבלה מציג את המותג, והקוד בסוגריים', () => {
  const model = modelFromUserAgent('Mozilla/5.0 (Linux; Android 15; SM-Z999B Build/X)');
  assert.match(model, /^סמסונג/);
  assert.match(model, /SM-Z999B/);
});

test('יצרנים שמדווחים שם קריא מוצגים כמו שהוא', () => {
  assert.equal(modelFromUserAgent('Mozilla/5.0 (Linux; Android 15; Pixel 8) Mobile'), 'Pixel 8');
  assert.equal(
    modelFromUserAgent('Mozilla/5.0 (Linux; Android 13; Redmi Note 12 Build/T) Mobile'),
    'Redmi Note 12'
  );
});

test('באייפון אין דגם ב-User-Agent - אפל לא מדווחת אותו', () => {
  assert.equal(modelFromUserAgent(UA_IPHONE), null);
  assert.equal(platformFromUserAgent(UA_IPHONE), 'אייפון');
});

test('סוג המכשיר מוחזר בעברית, ומבדיל טלפון ממחשב', () => {
  assert.equal(platformFromUserAgent('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)'), 'אייפד');
  assert.equal(platformFromUserAgent('Mozilla/5.0 (Linux; Android 14; SM-A556B) Mobile'), 'אנדרואיד');
  assert.equal(platformFromUserAgent('Mozilla/5.0 (Linux; Android 13; SM-X200)'), 'טאבלט אנדרואיד');
  assert.equal(platformFromUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'מחשב Windows');
  assert.equal(platformFromUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'מק');
});

test('הדגם מה-UA הוא הזיהוי', () => {
  const d = describeSubscription({ endpoint: FCM_EP, userAgent: UA_A55 });
  assert.equal(d.model, 'Galaxy A55');
  assert.match(d.label, /Galaxy A55/);
  assert.equal(d.brand, 'סמסונג');
});

test('אייפון מוצג כ"אייפון" - אין ממה לגזור דגם', () => {
  const d = describeSubscription({ endpoint: APPLE_EP, userAgent: UA_IPHONE });
  const identity = d.label.split(' · ')[0];
  assert.equal(identity, 'אייפון');
  assert.equal(d.model, null);
  assert.equal(d.platform, 'אייפון');
});

test('מחשב מזוהה כמחשב ולא כדפדפן', () => {
  const d = describeSubscription({
    endpoint: FCM_EP, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120'
  });
  assert.match(d.label, /מחשב Windows/);
});

test('מנוי ישן בלי שום מידע מתואר בשירות בלבד, בלי כפילות', () => {
  const d = describeSubscription({ endpoint: FCM_EP });
  assert.equal(d.label, 'Chrome');
});

test('התיאור לעולם אינו כולל את כתובת הדחיפה', () => {
  const d = describeSubscription({
    endpoint: 'https://web.push.apple.com/SECRET-DEVICE-ID', userAgent: UA_IPHONE
  });
  assert.ok(!JSON.stringify(d).includes('SECRET-DEVICE-ID'));
});


test('"K" אינו דגם - זה מה שכרום שם אחרי שצמצם את ה-User-Agent', () => {
  assert.equal(modelFromUserAgent(UA_CHROME_REDUCED), null);
});

test('כרום מצומצם בלי Client Hints מוצג כ"אנדרואיד", לא כ-K', () => {
  const d = describeSubscription({ endpoint: FCM_EP, userAgent: UA_CHROME_REDUCED });
  const identity = d.label.split(' · ')[0];
  assert.equal(identity, 'אנדרואיד');
  assert.ok(!d.label.includes('K ·'), d.label);
});

test('Client Hints מחזיר את הדגם, והוא מתורגם לשם השיווקי', () => {
  const d = describeSubscription({
    endpoint: FCM_EP, userAgent: UA_CHROME_REDUCED, model: 'SM-A556B'
  });
  assert.equal(d.model, 'Galaxy A55');
  assert.match(d.label, /^Galaxy A55 · /);
});

test('Client Hints גובר על ה-User-Agent כשיש שניהם', () => {
  const d = describeSubscription({
    endpoint: FCM_EP, userAgent: UA_A55, model: 'SM-S918B'
  });
  assert.equal(d.model, 'Galaxy S23 Ultra');
});

test('Client Hints ריק או placeholder נופל לסוג המכשיר', () => {
  for (const model of ['', 'K', 'Unknown', null]) {
    const d = describeSubscription({ endpoint: FCM_EP, userAgent: UA_CHROME_REDUCED, model });
    assert.equal(d.label.split(' · ')[0], 'אנדרואיד', String(model));
  }
});
