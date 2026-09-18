const test = require('node:test');
const assert = require('node:assert');
const {
  pushServiceOf, modelFromUserAgent, platformFromUserAgent, iphoneFromScreen, describeSubscription
} = require('./deviceInfo');

const UA_A55 = 'Mozilla/5.0 (Linux; Android 14; SM-A556B Build/UP1A.231005.007) AppleWebKit/537.36 Chrome/123.0 Mobile Safari/537.36';
const UA_IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
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

test('דגם סמסונג שאינו בטבלה מוצג כקוד, ולא כשם מומצא', () => {
  const model = modelFromUserAgent('Mozilla/5.0 (Linux; Android 15; SM-Z999B Build/X)');
  assert.equal(model, 'SM-Z999B');
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
  assert.equal(platformFromUserAgent(UA_IPHONE), 'iPhone');
});

test('גיאומטריית מסך מחזירה קבוצת דגמים, ולא דגם בודד', () => {
  const group = iphoneFromScreen({ width: 393, height: 852, dpr: 3 });
  // אותו viewport בדיוק באייפון 15, ב-15 Pro וב-16, ולכן חייבים להופיע
  // כמה דגמים - קבוצה ולא הכרעה
  assert.ok(group.includes('15'), group);
  assert.ok(group.includes('16'), group);
  assert.ok(group.split('/').length >= 3, group);
});

test('הכיוון שבו הטלפון מוחזק לא משנה את הזיהוי', () => {
  const portrait = iphoneFromScreen({ width: 393, height: 852, dpr: 3 });
  const landscape = iphoneFromScreen({ width: 852, height: 393, dpr: 3 });
  assert.equal(portrait, landscape);
});

test('מסך לא מוכר או חסר לא מייצר ניחוש', () => {
  assert.equal(iphoneFromScreen({ width: 1234, height: 4321, dpr: 3 }), null);
  assert.equal(iphoneFromScreen({}), null);
  assert.equal(iphoneFromScreen(null), null);
});

test('שם שהמשתמש נתן גובר על כל זיהוי אחר', () => {
  const d = describeSubscription({
    endpoint: FCM_EP, userAgent: UA_A55, deviceName: 'הסמסונג של אדיאל'
  });
  assert.equal(d.deviceName, 'הסמסונג של אדיאל');
  assert.match(d.label, /הסמסונג של אדיאל/);
  assert.equal(d.approximate, false);
});

test('בלי שם - הדגם מה-UA הוא הזיהוי, והוא אינו משוער', () => {
  const d = describeSubscription({ endpoint: FCM_EP, userAgent: UA_A55 });
  assert.equal(d.model, 'Galaxy A55');
  assert.match(d.label, /Galaxy A55/);
  assert.equal(d.approximate, false);
});

test('אייפון עם מסך מזוהה מסומן כמשוער, כי זו קבוצה', () => {
  const d = describeSubscription({
    endpoint: APPLE_EP, userAgent: UA_IPHONE, screen: { width: 393, height: 852, dpr: 3 }
  });
  assert.equal(d.approximate, true);
  assert.match(d.label, /iPhone 1[56]/);
});

test('אייפון בלי מסך נופל ל"iPhone" בלי דגם, ולא למשוער', () => {
  const d = describeSubscription({ endpoint: APPLE_EP, userAgent: UA_IPHONE });
  assert.equal(d.platform, 'iPhone');
  assert.equal(d.approximate, false);
  assert.match(d.label, /iPhone/);
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

test('שם מכשיר ארוך נחתך, כדי שלא ישבור את המסך', () => {
  const d = describeSubscription({ endpoint: FCM_EP, deviceName: 'א'.repeat(200) });
  assert.ok(d.deviceName.length <= 40);
});
