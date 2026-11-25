// בקשת הרשאה להתראות שעובדת גם בדפדפנים ישנים.
//
// ב-Samsung Internet ישן (וספארי ישן) requestPermission לא מחזיר Promise -
// רק קורא ל-callback. await על התוצאה חיכה לנצח, גם כשההרשאה כבר ניתנה:
// אצל שחקן עם סמסונג (אנדרואיד 10) ההפעלה נתקעה בשלב הזה בדיוק.
// כשההרשאה כבר ידועה (granted / denied) לא שואלים בכלל.
export const askNotificationPermission = () => {
  if (typeof Notification === 'undefined') return Promise.resolve('unsupported');
  if (Notification.permission === 'granted' || Notification.permission === 'denied') {
    return Promise.resolve(Notification.permission);
  }
  return new Promise((resolve) => {
    try {
      const maybe = Notification.requestPermission((p) => resolve(p));
      if (maybe && typeof maybe.then === 'function') maybe.then(resolve, () => resolve(Notification.permission));
    } catch (e) {
      resolve(Notification.permission);
    }
  });
};
