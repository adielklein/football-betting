const express = require('express');
const { requireAdmin, requireSelfOrAdmin } = require('../middleware/requireAdmin');
const router = express.Router();
const User = require('../models/User');
const InAppNotification = require('../models/InAppNotification');
const {
  sendNotification,
  removeDeadSubscriptions,
  deadEndpointsFrom,
  sendNotificationToAll,
  sendNotificationToUsers,
  vapidKeys,
  checkRoute
} = require('../services/pushNotifications');

// 🔧 פונקציית עזר - מחזירה את כל ה-subscriptions (תומך בשני המבנים)
function getUserSubscriptions(user) {
  // אם יש subscriptions (חדש) - החזר אותו
  if (user.pushSettings?.subscriptions && Array.isArray(user.pushSettings.subscriptions)) {
    return user.pushSettings.subscriptions;
  }
  
  // אם יש subscription (ישן) - החזר אותו כמערך
  if (user.pushSettings?.subscription) {
    return [user.pushSettings.subscription];
  }
  
  // אין כלום
  return [];
}

// 🔧 פונקציית עזר - בדיקה אם משתמש רשום
function isUserSubscribed(user) {
  const subs = getUserSubscriptions(user);
  return user.pushSettings?.enabled && subs.length > 0;
}

// קבל את ה-public key
router.get('/vapid-public-key', (req, res) => {
  console.log('📤 Sending VAPID public key');
  res.json({ publicKey: vapidKeys.publicKey });
});

// סטטיסטיקות - תומך בשני המבנים
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // 🔧 תמיכה בשני המבנים
    const enabledUsers = await User.countDocuments({
      'pushSettings.enabled': true,
      $or: [
        { 'pushSettings.subscriptions.0': { $exists: true } },  // חדש
        { 'pushSettings.subscription': { $exists: true, $ne: null } }  // ישן
      ]
    });
    
    const stats = {
      totalUsers,
      enabledUsers,
      disabledUsers: totalUsers - enabledUsers,
      percentage: totalUsers > 0 ? Math.round((enabledUsers / totalUsers) * 100) : 0
    };
    
    console.log('📊 Stats:', stats);
    res.json(stats);
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ message: error.message });
  }
});

// קבל רשימת משתמשים עם התראות
router.get('/users', async (req, res) => {
  try {
    const users = await User.find(
      { 
        'pushSettings.enabled': true,
        $or: [
          { 'pushSettings.subscriptions.0': { $exists: true } },
          { 'pushSettings.subscription': { $exists: true, $ne: null } }
        ]
      },
      'name username pushSettings'
    );
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: error.message });
  }
});

// קבל את כל המשתמשים
router.get('/all-users', async (req, res) => {
  try {
    const users = await User.find({}, 'name username pushSettings');
    
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      isSubscribed: isUserSubscribed(user),
      deviceCount: getUserSubscriptions(user).length,
      hoursBeforeLock: user.pushSettings?.hoursBeforeLock || 2
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔧 שמור subscription - תמיכה בשני המבנים
router.post('/subscribe', requireSelfOrAdmin((req) => req.body?.userId), async (req, res) => {
  try {
    // silent - סנכרון רקע של מנוי קיים. בלעדיו כל פתיחה של האפליקציה
    // הייתה שולחת התראת "התראות הופעלו".
    const { userId, subscription, hoursBeforeLock, silent } = req.body;

    console.log(`📥 Saving subscription for user ${userId}${silent ? ' (silent sync)' : ''}`);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!user.pushSettings) {
      user.pushSettings = {};
    }
    
    // 🔧 אתחל subscriptions אם לא קיים
    if (!user.pushSettings.subscriptions) {
      user.pushSettings.subscriptions = [];
    }
    
    // בדוק אם ה-endpoint כבר קיים
    const existingIndex = user.pushSettings.subscriptions.findIndex(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (existingIndex >= 0) {
      console.log(`🔄 Updating existing subscription`);
      user.pushSettings.subscriptions[existingIndex] = subscription;
    } else {
      console.log(`➕ Adding new subscription (total will be ${user.pushSettings.subscriptions.length + 1})`);
      user.pushSettings.subscriptions.push(subscription);
    }
    
    user.pushSettings.enabled = true;
    user.pushSettings.hoursBeforeLock = hoursBeforeLock || 2;
    
    await user.save();
    
    console.log(`✅ Subscription saved for ${user.name} (${user.pushSettings.subscriptions.length} devices)`);
    
    if (silent) {
      return res.json({
        message: 'Subscription synced',
        deviceCount: user.pushSettings.subscriptions.length
      });
    }

    // שלח התראת בדיקה
    const payload = {
      title: '✅ התראות הופעלו',
      body: `תקבל תזכורת ${hoursBeforeLock || 2} שעות לפני נעילת השבוע`,
      icon: '/logo192.png',
      badge: '/logo192.png'
    };

    const sent = await sendNotification(subscription, payload);

    if (sent) {
      res.json({
        message: 'Subscription saved successfully',
        deviceCount: user.pushSettings.subscriptions.length
      });
    } else {
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔧 בטל subscription
router.post('/unsubscribe', requireSelfOrAdmin((req) => req.body?.userId), async (req, res) => {
  try {
    const { userId, endpoint } = req.body;
    
    console.log(`📕 Unsubscribing device for user ${userId}`);
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!endpoint) {
      // בטל את כל ההתראות
      user.pushSettings.enabled = false;
      user.pushSettings.subscriptions = [];
    } else {
      // הסר את המכשיר הספציפי
      if (user.pushSettings.subscriptions && Array.isArray(user.pushSettings.subscriptions)) {
        user.pushSettings.subscriptions = user.pushSettings.subscriptions.filter(
          sub => sub.endpoint !== endpoint
        );
        
        if (user.pushSettings.subscriptions.length === 0) {
          user.pushSettings.enabled = false;
        }
      }
    }
    
    await user.save();
    
    console.log(`✅ Unsubscribed ${user.name}`);
    res.json({ 
      message: 'Unsubscribed successfully',
      devicesRemaining: user.pushSettings.subscriptions?.length || 0
    });
  } catch (error) {
    console.error('Error unsubscribing:', error);
    res.status(500).json({ message: error.message });
  }
});

// עדכן הגדרות
router.patch('/settings', requireSelfOrAdmin((req) => req.body?.userId), async (req, res) => {
  try {
    const { userId, hoursBeforeLock, soundEnabled, exactScoreAlerts } = req.body;

    console.log(`⚙️ Updating settings for user ${userId}`);

    const updateFields = {
      'pushSettings.hoursBeforeLock': hoursBeforeLock,
      'pushSettings.soundEnabled': soundEnabled
    };
    if (exactScoreAlerts !== undefined) {
      updateFields['pushSettings.exactScoreAlerts'] = exactScoreAlerts;
    }

    const user = await User.findByIdAndUpdate(userId, updateFields, { new: true });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`✅ Settings updated for ${user.name}`);
    res.json({ message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ שלח התראה לכולם - עם תמונה
router.post('/send-to-all', requireAdmin, async (req, res) => {
  try {
    const { title, body, imageUrl, data } = req.body; // ✅ הוספת imageUrl
    
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    
    console.log('📢 Admin sending notification to all users');
    if (imageUrl) {
      console.log('🖼️ With image');
    }

    // שמירה כהתראה in-app
    await InAppNotification.create({ title, body, imageUrl: imageUrl || undefined });

    const result = await sendNotificationToAll(title, body, data, imageUrl); // ✅ העברת imageUrl

    res.json(result);
  } catch (error) {
    console.error('Error sending to all:', error);
    res.status(500).json({ message: error.message });
  }
});

// ✅ שלח התראה למשתמשים נבחרים - עם תמונה
router.post('/send-to-users', requireAdmin, async (req, res) => {
  try {
    const { userIds, title, body, imageUrl, data } = req.body; // ✅ הוספת imageUrl
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }
    
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    
    console.log(`📢 Admin sending notification to ${userIds.length} users`);
    if (imageUrl) {
      console.log('🖼️ With image');
    }

    // שמירה כהתראה in-app
    await InAppNotification.create({ title, body, imageUrl: imageUrl || undefined });

    const result = await sendNotificationToUsers(userIds, title, body, data, imageUrl); // ✅ העברת imageUrl

    res.json(result);
  } catch (error) {
    console.error('Error sending to users:', error);
    res.status(500).json({ message: error.message });
  }
});

// קבלת ההתראה האחרונה (in-app)
router.get('/latest', async (req, res) => {
  try {
    const latest = await InAppNotification.findOne().sort({ createdAt: -1 });
    res.json(latest || null);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 🔧 בדיקת התראה - תומך בשני המבנים
router.post('/test', requireSelfOrAdmin((req) => req.body?.userId), async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    if (!isUserSubscribed(user)) {
      return res.status(400).json({ message: 'User not subscribed to notifications' });
    }
    
    const subscriptions = getUserSubscriptions(user);
    
    const payload = {
      title: '🎯 בדיקת התראה',
      body: 'זו התראת בדיקה - ההתראות עובדות מצוין!',
      icon: '/logo192.png',
      badge: '/logo192.png'
    };
    
    console.log(`🧪 Sending test to ${user.name} (${subscriptions.length} devices)`);
    
    let sent = 0;
    let failed = 0;
    const errors = [];

    for (const subscription of subscriptions) {
      const success = await sendNotification(subscription, payload, errors);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }

    console.log(`✅ Test sent: ${sent} success, ${failed} failed`);

    // גם בדיקה מנקה מנויים מתים, אחרת המשתמש נשאר מסומן כרשום
    const purged = await removeDeadSubscriptions(user, deadEndpointsFrom(errors));

    res.json({
      message: 'Test notification sent',
      sent,
      failed,
      purged,
      total: subscriptions.length,
      errors
    });
  } catch (error) {
    console.error('Error sending test:', error);
    res.status(500).json({ message: error.message });
  }
});

// ⚽ מי עדיין לא סיים להמר בשבוע, ודחיפה אליהם.
//
// "רשום לחודש" נקבע לפי MonthExclusion - רשימת מי שאינו משתתף בחודש.
// שחקן שהוחרג מהחודש של השבוע לא אמור לקבל דחיפה להמר בו: הוא בכלל לא
// בתחרות החודש הזה, וההתראה תיראה לו כטעות.

const loadPending = async (weekId) => {
  const Week = require('../models/Week');
  const Match = require('../models/Match');
  const Bet = require('../models/Bet');
  const MonthExclusion = require('../models/MonthExclusion');
  const { classifyBettors } = require('../services/pendingBettors');

  const week = await Week.findById(weekId).lean();
  if (!week) return null;

  const [matches, players, bets, exclusions] = await Promise.all([
    Match.find({ weekId }, '_id').lean(),
    User.find({ role: { $ne: 'admin' } }, 'name pushSettings').lean(),
    Bet.find({ weekId }, 'userId matchId').lean(),
    MonthExclusion.find({ month: week.month, season: week.season }, 'userId').lean()
  ]);

  return {
    week,
    ...classifyBettors(players, matches.map((m) => m._id), bets, exclusions)
  };
};

// רשימה בלבד, בלי לשלוח דבר
router.get('/pending-bettors/:weekId', requireAdmin, async (req, res) => {
  try {
    const data = await loadPending(req.params.weekId);
    if (!data) return res.status(404).json({ message: 'השבוע לא נמצא' });
    res.json({
      week: { _id: data.week._id, name: data.week.name, month: data.week.month, season: data.week.season },
      matchCount: data.matchCount,
      reachable: data.reachable,
      pending: data.pending,
      complete: data.complete,
      notRegistered: data.notRegistered
    });
  } catch (error) {
    console.error('pending-bettors error:', error);
    res.status(500).json({ message: error.message });
  }
});

// שליחה. בלי גוף - לכל מי שחסר וניתן להשגה; עם userIds - לתת-קבוצה בלבד.
router.post('/nudge/:weekId', requireAdmin, async (req, res) => {
  try {
    const { userIds } = req.body || {};
    const data = await loadPending(req.params.weekId);
    if (!data) return res.status(404).json({ message: 'השבוע לא נמצא' });

    const chosen = Array.isArray(userIds) && userIds.length > 0
      ? new Set(userIds.map(String))
      : null;

    // גם כשנשלחת בחירה מפורשת, היא מסוננת מול רשימת החסרים. כך אי אפשר
    // לדחוף בטעות מישהו שכבר סיים או שאינו רשום לחודש.
    const targets = data.pending.filter(
      (r) => r.canBeNotified && (!chosen || chosen.has(r.userId))
    );

    if (targets.length === 0) {
      return res.json({ sent: 0, users: 0, message: 'אין למי לשלוח' });
    }

    const { nudgeMessage } = require('../services/pendingBettors');

    // ההודעה אישית: כמה חסר לכל אחד. "לא הימרת" למי שמילא עשרה משחקים
    // מתוך שלושה-עשר נשמע שגוי ומוריד את האמון בהתראות.
    let sent = 0;
    let reached = 0;
    for (const row of targets) {
      const { title, body } = nudgeMessage(data.week, row);
      const result = await sendNotificationToUsers(
        [row.userId], title, body,
        { type: 'nudge', weekId: String(data.week._id), url: '/#/betting' }
      );
      sent += result?.sent || 0;
      if ((result?.sent || 0) > 0) reached++;
    }

    const { logAdminAction } = require('../services/auditService');
    const adminId = req.headers['x-user-id'] || req.body?.adminId;
    if (adminId) {
      logAdminAction(adminId, 'תזכורת למי שלא הימר', `${data.week.name} - ${reached} שחקנים`, {
        weekId: data.week._id
      });
    }

    res.json({ sent, users: reached, attempted: targets.length });
  } catch (error) {
    console.error('nudge error:', error);
    res.status(500).json({ message: error.message });
  }
});

// Route לבדיקה
router.get('/check', checkRoute);

module.exports = router;