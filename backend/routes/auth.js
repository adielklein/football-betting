const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { logAdminAction } = require('../services/auditService');
const { requireAdmin, requireSelfOrAdmin } = require('../middleware/requireAdmin');
const router = express.Router();

// אוטומטית צור אדמין בהפעלת השרת
const createDefaultAdmin = async () => {
  try {
    // בדוק אם יש כבר אדמין
    const existingAdmin = await User.findOne({ username: 'adielklein' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // הסיסמה מגיעה ממשתנה סביבה בלבד. קודם היא הייתה כתובה כאן בטקסט גלוי,
    // בריפו ציבורי, כך שכל מי שהגיע לקוד יכול היה להתחבר כמנהל.
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultPassword) {
      console.log('ℹ️ DEFAULT_ADMIN_PASSWORD not set - skipping default admin creation');
      return;
    }

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const adminUser = new User({
      name: 'עדיאל קליין',
      username: 'adielklein',
      password: hashedPassword,
      role: 'admin',
      theme: 'default'
    });

    await adminUser.save();
    console.log('🎉 Default admin user created: adielklein');
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// הרץ יצירת אדמין כשהמודול נטען
setTimeout(createDefaultAdmin, 2000);

// Login with username and password
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'שם משתמש וסיסמה נדרשים' });
    }

    console.log('Login attempt:', username);

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'שם משתמש או סיסמה שגויים' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'שם משתמש או סיסמה שגויים' });
    }

    console.log(`התחברות מוצלחת: ${user.name} (${user.role}) - ערכת נושא: ${user.theme || 'default'}`);

    res.json({
      message: 'התחברות מוצלחת',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        theme: user.theme || 'default',
        defaultTab: user.defaultTab || 'betting',
        nameLocked: !!user.nameLocked
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'שגיאה פנימית' });
  }
});

// Get all users (for admin)
router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('name username role theme pushSettings nameLocked defaultTab')
      .lean();

    // הנתיב הזה פתוח - האפליקציה צריכה את שמות השחקנים כדי להציג טבלאות.
    // עד עכשיו הוא החזיר גם את אובייקטי המנוי המלאים של כולם, כולל
    // כתובת הדחיפה ומפתחות ההצפנה של כל מכשיר. אי אפשר לשלוח התראה בלי
    // מפתח ה-VAPID הפרטי, אבל כתובות הדחיפה הן מזהי מכשיר ואין שום סיבה
    // שהן יהיו גלויות. מוחזר סיכום בלבד.
    const summarize = (ps) => {
      const subs = [
        ...(Array.isArray(ps?.subscriptions) ? ps.subscriptions : []),
        ...(ps?.subscription ? [ps.subscription] : [])
      ];
      return {
        enabled: !!ps?.enabled,
        hoursBeforeLock: ps?.hoursBeforeLock ?? 2,
        exactScoreAlerts: ps?.exactScoreAlerts !== false,
        // גם אלה חלק מהסיכום: בלעדיהם כל קורא היה מסיק שהן כבויות
        goalAlerts: !!ps?.goalAlerts,
        redCardAlerts: !!ps?.redCardAlerts,
        matchStartAlerts: !!ps?.matchStartAlerts,
        matchEndAlerts: !!ps?.matchEndAlerts,
        deviceCount: subs.length,
        // כמה מהמכשירים הם של אפל. מסך שליחת ההתראות משתמש בזה כדי
        // להזהיר שהתמונה לא תוצג להם - WebKit לא מממש את image.
        appleDevices: subs.filter((x) => String(x?.endpoint || '').includes('web.push.apple.com')).length
      };
    };

    res.json(users.map((u) => ({ ...u, pushSettings: summarize(u.pushSettings) })));
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add new user (admin only)
router.post('/users', requireAdmin, async (req, res) => {
  try {
    console.log('Creating new user:', req.body);
    const { name, username, password, role = 'player', theme = 'default', adminId } = req.body;
    
    if (!name || !username || !password) {
      return res.status(400).json({ message: 'שם, שם משתמש וסיסמה נדרשים' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'שם משתמש כבר קיים' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({ 
      name, 
      username, 
      password: hashedPassword,
      // העותק הקריא, כדי שמנהל יוכל לעזור למי ששכח. ראו הערה במודל
      passwordPlain: password,
      role,
      theme
    });
    await user.save();
    
    console.log('User created successfully:', user);

    // Audit log
    if (adminId) {
      logAdminAction(adminId, 'יצירת משתמש', `${name} (${username}, ${role})`, { userId: user._id });
    }

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        theme: user.theme
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// ערכת הנושא של המשתמש עצמו.
//
// עד עכשיו רק אדמין יכול היה לשנות אותה, דרך הנתיב הכללי של עדכון
// משתמש - כלומר העדפה אישית לגמרי, איזו קבוצה אני אוהד, הצריכה לבקש
// ממנהל. כאן המשתמש משנה את שלו בלבד, ורק את השדה הזה: התפקיד, השם
// והסיסמה אינם נגישים מכאן.
router.patch('/users/:id/theme', requireSelfOrAdmin((req) => req.params.id), async (req, res) => {
  try {
    const theme = String(req.body?.theme || '').trim().slice(0, 60);
    if (!theme) return res.status(400).json({ message: 'חסרה ערכת נושא' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { theme },
      { new: true }
    ).select('name username role theme');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ theme: user.theme });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ message: error.message });
  }
});

// פרופיל המשתמש עצמו: שם תצוגה ומסך פתיחה.
//
// שניהם היו עד עכשיו מאחורי נתיב ניהולי - כלומר כדי לתקן ניקוד בשם או
// להיכנס ישר לטבלה היה צריך לבקש ממנהל. שם נעול (nameLocked) נשאר
// בשליטת המנהל בלבד.
router.patch('/users/:id/profile', requireSelfOrAdmin((req) => req.params.id), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isAdminRequest = !!req.adminUser;
    const updates = {};

    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim().slice(0, 40);
      if (!name) return res.status(400).json({ message: 'השם לא יכול להיות ריק' });
      if (user.nameLocked && !isAdminRequest) {
        return res.status(403).json({ message: 'השם שלך נעול לשינוי. פנה למנהל' });
      }
      updates.name = name;
    }

    if (req.body.defaultTab !== undefined) {
      updates.defaultTab = String(req.body.defaultTab).trim().slice(0, 20) || 'betting';
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'אין מה לעדכן' });
    }

    Object.assign(user, updates);
    await user.save();

    res.json({ name: user.name, defaultTab: user.defaultTab, nameLocked: user.nameLocked });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: error.message });
  }
});

// החלפת סיסמה על ידי המשתמש עצמו.
//
// המשתמש חייב לדעת את הסיסמה הנוכחית; מנהל שמאפס למי ששכח אינו חייב.
// בשני המקרים מתעדכן גם העותק הקריא, אחרת הוא היה מציג סיסמה ישנה -
// וזה גרוע יותר מלא להציג כלום.
router.patch('/users/:id/password', requireSelfOrAdmin((req) => req.params.id), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    const password = String(newPassword || '');

    if (password.length < 4) {
      return res.status(400).json({ message: 'הסיסמה החדשה קצרה מדי (לפחות 4 תווים)' });
    }

    const user = await User.findById(req.params.id).select('+passwordPlain');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isAdminRequest = !!req.adminUser;
    if (!isAdminRequest) {
      const valid = await bcrypt.compare(String(currentPassword || ''), user.password);
      if (!valid) return res.status(403).json({ message: 'הסיסמה הנוכחית שגויה' });
    }

    user.password = await bcrypt.hash(password, 10);
    user.passwordPlain = password;
    await user.save();

    if (isAdminRequest && req.adminUser) {
      logAdminAction(req.adminUser._id, 'איפוס סיסמה', user.name, { userId: user._id });
    }

    res.json({ message: 'הסיסמה עודכנה' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ message: error.message });
  }
});

// הצגת סיסמה למנהל, למי ששכח.
//
// נתיב נפרד ולא שדה ברשימת המשתמשים: סיסמה קריאה לא צריכה לנסוע ברשת
// בכל טעינת מסך, אלא רק כשמישהו באמת ביקש לראות אותה - וכל בקשה כזו
// נרשמת ביומן הפעולות, כדי שצפייה בסיסמה של מישהו תשאיר עקבות.
router.get('/users/:id/password', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('+passwordPlain name username');
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.adminUser) {
      logAdminAction(req.adminUser._id, 'צפייה בסיסמה', user.name, { userId: user._id });
    }

    res.json({
      // סיסמה שנקבעה לפני שהשדה הזה קיים אינה שמורה בשום מקום קריא
      password: user.passwordPlain || null,
      username: user.username
    });
  } catch (error) {
    console.error('Error reading password:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user (admin only)
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    console.log(`Updating user ${req.params.id}:`, req.body);
    const { name, username, role, password, theme, adminId, nameLocked } = req.body;
    
    const updateData = { name, username, role };

    if (nameLocked !== undefined) {
      updateData.nameLocked = !!nameLocked;
    }
    
    if (theme !== undefined) {
      updateData.theme = theme;
      console.log(`🎨 Updating theme to: ${theme}`);
    }
    
    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      // גם העותק הקריא, אחרת הוא יישאר על הסיסמה הקודמת
      updateData.passwordPlain = password;
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('name username role theme pushSettings'); // 🔧 FIX: הוסף pushSettings
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Audit log
    if (adminId) {
      logAdminAction(adminId, 'עדכון משתמש', `${user.name} (${user.username})`, { userId: user._id });
    }

    console.log('Updated user:', user);
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    console.log('Deleting user:', req.params.id);
    
    // Find user before deletion for audit
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Audit log before deletion
    const adminId = req.query.adminId;
    if (adminId) {
      logAdminAction(adminId, 'מחיקת משתמש', `${user.name} (${user.username})`, { userId: user._id });
    }

    await User.findByIdAndDelete(req.params.id);

    // Delete all user's bets
    await require('../models/Bet').deleteMany({ userId: req.params.id });
    // Delete all user's scores
    await require('../models/Score').deleteMany({ userId: req.params.id });
    
    console.log('User deleted successfully');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Debug endpoint to check admin status
router.get('/check-admin', async (req, res) => {
  try {
    const admin = await User.findOne({ username: 'adielklein' });
    res.json({
      adminExists: !!admin,
      adminDetails: admin ? {
        name: admin.name,
        username: admin.username,
        role: admin.role,
        theme: admin.theme
      } : null,
      totalUsers: await User.countDocuments()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;