const crypto = require('crypto');
const User = require('../models/User');
const authToken = require('../services/authToken');

// טוקן שנוצר מחדש בכל עליית שרת ומשמש רק לקריאות שהשרת עושה לעצמו (ה-cron).
// כך אין צורך במשתנה סביבה נוסף, ואי אפשר לנחש אותו מבחוץ.
const INTERNAL_TOKEN = crypto.randomBytes(32).toString('hex');

// ── זיהוי ────────────────────────────────────────────────────────
//
// הזהות מגיעה רק מטוקן חתום שהשרת הנפיק בכניסה עם סיסמה. עד עכשיו היא
// הגיעה ממזהה שהלקוח שלח (X-User-Id / adminId / requestedByUserId) - והמזהים
// פומביים, כך שכל אחד יכול היה לפעול בשם כל אחד, כולל אדמין. שדות כאלה
// בבקשה כבר לא קובעים כלום.
//
// רץ על כל בקשה ולעולם לא דוחה בעצמו: נתיבים פתוחים נשארים פתוחים. מי שדורש
// הזדהות עושה את זה עם requireUser / requireAdmin / requireSelfOrAdmin.
async function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return next();

  const data = authToken.verify(token);
  if (!data) {
    req.authError = 'invalid';
    return next();
  }

  try {
    const user = await User.findById(data.uid).select('name role tokenVersion');
    // גרסת טוקנים שעלתה (החלפת סיסמה) מבטלת את כל מה שהונפק לפני
    if (!user || (user.tokenVersion || 0) !== (data.tv || 0)) {
      req.authError = 'revoked';
      return next();
    }
    req.authUser = user;

    // טוקן ותיק מתחדש בשקט, כדי שמי שמשתמש באפליקציה לא ינותק לעולם
    if (authToken.shouldRenew(data)) {
      res.set('X-Auth-Token', authToken.sign({ uid: user._id, tv: user.tokenVersion || 0 }));
    }
  } catch (err) {
    req.authError = 'invalid';
  }
  return next();
}

// 401 עם סימון בכותרת, כדי שהלקוח ידע להחזיר למסך הכניסה ולא רק להציג שגיאה
const unauthorized = (req, res) => {
  res.set('X-Auth-Status', req.authError || 'missing');
  return res.status(401).json({
    message: req.authError ? 'החיבור פג - צריך להתחבר מחדש' : 'נדרשת התחברות',
    code: 'AUTH_REQUIRED'
  });
};

// מי שמבצע פעולת ניהול נרשם ביומן הפעולות לפי מה שהלקוח שלח (adminId).
// עכשיו זה נדרס בזהות האמיתית, כדי שהיומן לא יהיה ניתן לזיוף
const stampAdmin = (req, user) => {
  req.adminUser = user;
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) req.body.adminId = String(user._id);
  if (req.query && typeof req.query === 'object') req.query.adminId = String(user._id);
};

// כל משתמש מחובר
function requireUser(req, res, next) {
  if (req.headers['x-internal-token'] === INTERNAL_TOKEN) return next();
  if (!req.authUser) return unauthorized(req, res);
  if (req.authUser.role === 'admin') req.adminUser = req.authUser;
  return next();
}

async function requireAdmin(req, res, next) {
  if (req.headers['x-internal-token'] === INTERNAL_TOKEN) return next();
  if (!req.authUser) return unauthorized(req, res);
  if (req.authUser.role !== 'admin') {
    return res.status(403).json({ message: 'הפעולה הזו מותרת למנהלים בלבד' });
  }
  stampAdmin(req, req.authUser);
  return next();
}

// לנתיבים אישיים (הרשמה להתראות, הגדרות, סיסמה). משתמש רשאי לפעול על עצמו
// בלבד; מנהל רשאי לפעול על כל אחד.
function requireSelfOrAdmin(getTargetId) {
  return (req, res, next) => {
    if (req.headers['x-internal-token'] === INTERNAL_TOKEN) return next();
    if (!req.authUser) return unauthorized(req, res);

    // קודם "על עצמו": אדמין שמחליף את הסיסמה של עצמו עדיין נדרש לסיסמה הנוכחית
    const targetId = getTargetId(req);
    if (targetId && String(req.authUser._id) === String(targetId)) return next();
    if (req.authUser.role === 'admin') {
      stampAdmin(req, req.authUser);
      return next();
    }
    return res.status(403).json({ message: 'אין הרשאה לפעול עבור משתמש אחר' });
  };
}

module.exports = { authenticate, requireUser, requireAdmin, requireSelfOrAdmin, INTERNAL_TOKEN };
