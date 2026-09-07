const test = require('node:test');
const assert = require('node:assert');

// עותק זהה של payloadFor מתוך pushNotifications.js. המקור נטען רק עם מפתחות
// VAPID, ולכן הלוגיקה הקצרה הזו נבדקת כאן ישירות.
const APPLE_PUSH_HOST = 'web.push.apple.com';
const payloadFor = (subscription, payload) => {
  const endpoint = subscription?.endpoint || '';
  if (!endpoint.includes(APPLE_PUSH_HOST) || payload.image === undefined) return payload;
  const { image, ...rest } = payload;
  return rest;
};

const APPLE = { endpoint: 'https://web.push.apple.com/QOAB1c...' };
const FCM = { endpoint: 'https://fcm.googleapis.com/fcm/send/abc123' };
const MOZ = { endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/xyz' };

const withImage = {
  title: 'שבוע חדש',
  body: 'נפתח להימורים',
  image: 'https://i.ibb.co/abc/pic.jpg',
  data: { imageUrl: 'https://i.ibb.co/abc/pic.jpg', url: '/#/betting' }
};

test('אפל: image מוסר', () => {
  const out = payloadFor(APPLE, withImage);
  assert.strictEqual(out.image, undefined);
  assert.strictEqual('image' in out, false);
});

test('אפל: כל השאר נשמר, כולל התמונה בתוך data', () => {
  const out = payloadFor(APPLE, withImage);
  assert.strictEqual(out.title, withImage.title);
  assert.strictEqual(out.body, withImage.body);
  // האפליקציה מציגה את התמונה בפתיחה, ולכן היא חייבת להישאר כאן
  assert.strictEqual(out.data.imageUrl, withImage.data.imageUrl);
  assert.strictEqual(out.data.url, '/#/betting');
});

test('כרום ואנדרואיד: התמונה נשארת', () => {
  assert.strictEqual(payloadFor(FCM, withImage).image, withImage.image);
});

test('פיירפוקס: התמונה נשארת', () => {
  assert.strictEqual(payloadFor(MOZ, withImage).image, withImage.image);
});

test('בלי תמונה - אותו אובייקט חוזר כמו שהוא, בלי העתקה מיותרת', () => {
  const plain = { title: 'א', body: 'ב' };
  assert.strictEqual(payloadFor(APPLE, plain), plain);
  assert.strictEqual(payloadFor(FCM, plain), plain);
});

test('מנוי חסר או פגום לא מפיל את השליחה', () => {
  assert.strictEqual(payloadFor(null, withImage).image, withImage.image);
  assert.strictEqual(payloadFor({}, withImage).image, withImage.image);
  assert.strictEqual(payloadFor({ endpoint: null }, withImage).image, withImage.image);
});

test('ה-payload המקורי לא משתנה - אותו אובייקט נשלח לעוד מכשירים', () => {
  const original = { ...withImage };
  payloadFor(APPLE, withImage);
  assert.deepStrictEqual(withImage, original, 'אסור שהסרה למכשיר אחד תשפיע על השאר');
  assert.strictEqual(payloadFor(FCM, withImage).image, original.image);
});
