// סנכרון מנוי ההתראות מול השרת, בכל פתיחה של האפליקציה.
//
// זה היה קודם בתוך NotificationSettings, שהיה מורכב מעל כל מסך. משהעבירו
// את הגדרות ההתראות לדף משלהן, הסנכרון עבר איתן - ומאז הוא רץ רק כשמישהו
// נכנס להגדרות. שתי תוצאות, והשנייה חמורה:
//
// 1. מידע על המכשיר (User-Agent) לא מתעדכן, ומסך הניהול ממשיך להציג
//    "Chrome" במקום דגם.
//
// 2. המנוי בדפדפן מתחלף מדי פעם בלי להודיע. השרת נשאר עם endpoint ישן
//    שנכשל ב-410 בשקט, וכל ההתראות מפסיקות להגיע - ומי שלא נכנס להגדרות
//    לא היה מתאושש מזה לעולם.
//
// לכן זה יושב כאן, נקרא מהמסך הראשי, ולא תלוי בשום לשונית.

const API_URL = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : 'https://football-betting-backend.onrender.com/api';

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
};

const isSupported = () =>
  'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;

/**
 * מוודא שיש מנוי תקף ומסנכרן אותו לשרת. שקט לחלוטין: לא מבקש הרשאה,
 * לא מציג דבר, ולא זורק. מחזיר את המנוי אם יש, אחרת null.
 */
export async function syncPushSubscription(user) {
  const userId = user?._id || user?.id;
  if (!userId || !isSupported()) return null;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();

    // ההרשאה ניתנה אבל המנוי נעלם - נרשמים מחדש בשקט, במקום להשאיר את
    // המשתמש בלי התראות בלי שידע
    if (!subscription && Notification.permission === 'granted') {
      try {
        const keyRes = await fetch(`${API_URL}/notifications/vapid-public-key`);
        const keyData = await keyRes.json();
        if (keyData.publicKey) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
          });
        }
      } catch (resubError) {
        console.warn('Silent re-subscribe failed:', resubError);
      }
    }

    if (!subscription) return null;

    // נשלח גם כשהמנוי לא השתנה: זה מה שמרענן את מידע המכשיר ואת
    // lastSeenAt, וזה מה שמאשר לשרת שה-endpoint עדיין חי
    await fetch(`${API_URL}/notifications/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, subscription, silent: true })
    }).catch((syncError) => console.warn('Subscription sync failed:', syncError));

    return subscription;
  } catch (error) {
    console.warn('Push sync skipped:', error);
    return null;
  }
}

export { isSupported };
