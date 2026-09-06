const crypto = require('crypto');
const User = require('../models/User');

// טוקן שנוצר מחדש בכל עליית שרת ומשמש רק לקריאות שהשרת עושה לעצמו (ה-cron).
// כך אין צורך במשתנה סביבה נוסף, ואי אפשר לנחש אותו מבחוץ.
const INTERNAL_TOKEN = crypto.randomBytes(32).toString('hex');

// האפליקציה לא עובדת עם טוקנים - מזהה המשתמש מגיע מהלקוח. זו אמנם לא הגנה
// קריפטוגרפית, אבל היא סוגרת את הפער המהותי: עד עכשיו שדה adminId שימש אך ורק
// לרישום ב-audit log ומעולם לא נבדק, כך שכל אחד יכול היה לקרוא לנתיב ניהולי
// ישירות - למשל ליצור לעצמו משתמש עם role: "admin".
async function requireAdmin(req, res, next) {
  if (req.headers['x-internal-token'] === INTERNAL_TOKEN) return next();

  const userId = req.headers['x-user-id'] || req.body?.adminId || req.query?.adminId;
  if (!userId) {
    return res.status(401).json({ message: 'נדרשת הזדהות' });
  }

  try {
    const user = await User.findById(userId).select('role name');
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ message: 'הפעולה הזו מותרת למנהלים בלבד' });
    }
    req.adminUser = user;
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'הזדהות נכשלה' });
  }
}

module.exports = { requireAdmin, INTERNAL_TOKEN };
