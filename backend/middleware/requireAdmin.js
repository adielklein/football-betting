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

// לנתיבים אישיים שמקבלים מזהה משתמש בגוף הבקשה (הרשמה להתראות, הגדרות,
// שליחת בדיקה). משתמש רשאי לפעול על עצמו בלבד; מנהל רשאי לפעול על כל אחד.
// בלי זה כל אחד יכול היה לבטל את ההתראות של מישהו אחר או להציף אותו.
function requireSelfOrAdmin(getTargetId) {
  return async (req, res, next) => {
    if (req.headers['x-internal-token'] === INTERNAL_TOKEN) return next();

    const requesterId = req.headers['x-user-id'] || req.body?.adminId;
    if (!requesterId) {
      return res.status(401).json({ message: 'נדרשת הזדהות' });
    }

    const targetId = getTargetId(req);
    if (targetId && String(requesterId) === String(targetId)) return next();

    try {
      const user = await User.findById(requesterId).select('role name');
      if (user && user.role === 'admin') {
        req.adminUser = user;
        return next();
      }
    } catch (err) {
      // נופל להודעת ההרשאה שלמטה
    }

    return res.status(403).json({ message: 'אין הרשאה לפעול עבור משתמש אחר' });
  };
}

module.exports = { requireAdmin, requireSelfOrAdmin, INTERNAL_TOKEN };
