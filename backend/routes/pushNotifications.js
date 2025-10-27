// backend/routes/pushNotifications.js
const express = require('express');
const router = express.Router();
const webpush = require('web-push');
const jwt = require('jsonwebtoken');

// יצירת VAPID keys - צריך לעשות פעם אחת
// npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BHQoW5ZPuNkBvhJzXMG8PQdRlqV_7x8wKZpLkYXY6c3FXQmGzJrqZvJjO0Nh_6doQzHDaW7JYvEbJ1xL-KPZuXQ',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'YOUR_PRIVATE_KEY_HERE'
};

// הגדרת Web Push
webpush.setVapidDetails(
  'mailto:admin@footballbetting.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// מבנה לאחסון subscriptions (במקרה אמיתי ישמרו ב-DB)
let subscriptions = new Map();

console.log('[PUSH] Push notifications service initialized');
console.log('[PUSH] VAPID Public Key:', vapidKeys.publicKey.substring(0, 20) + '...');
console.log('[PUSH] VAPID Private Key configured:', vapidKeys.privateKey !== 'YOUR_PRIVATE_KEY_HERE' ? 'YES' : 'NO - PLEASE SET IN RENDER!');

// Middleware לאימות משתמש
const authenticateUser = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'לא מורשה' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'my-super-secret-key-for-football-betting-2025');
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'טוקן לא תקף' });
  }
};

// Middleware לבדיקת הרשאות אדמין
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'נדרשות הרשאות אדמין' });
  }
  next();
};

// רישום/עדכון subscription להתראות
router.post('/subscribe', authenticateUser, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    console.log('[PUSH] Subscribe request from:', req.user.name);
    
    if (!subscription || !subscription.endpoint) {
      console.log('[PUSH] Missing subscription data');
      return res.status(400).json({ error: 'נתוני subscription חסרים' });
    }

    // שמור את ה-subscription
    subscriptions.set(req.user.id, {
      userId: req.user.id,
      userName: req.user.name,
      subscription,
      createdAt: new Date(),
      lastUsed: new Date()
    });

    console.log(`[PUSH] ✅ User ${req.user.name} subscribed to notifications`);
    console.log(`[PUSH] Total subscriptions now: ${subscriptions.size}`);

    res.json({ 
      success: true, 
      message: 'נרשמת בהצלחה להתראות'
    });
  } catch (error) {
    console.error('[PUSH] Error subscribing:', error);
    res.status(500).json({ error: error.message });
  }
});

// ביטול רישום להתראות
router.post('/unsubscribe', authenticateUser, async (req, res) => {
  try {
    console.log('[PUSH] Unsubscribe request from:', req.user.name);
    subscriptions.delete(req.user.id);
    
    console.log(`[PUSH] ❌ User ${req.user.name} unsubscribed from notifications`);
    console.log(`[PUSH] Total subscriptions now: ${subscriptions.size}`);

    res.json({ 
      success: true, 
      message: 'הרישום להתראות בוטל' 
    });
  } catch (error) {
    console.error('[PUSH] Error unsubscribing:', error);
    res.status(500).json({ error: error.message });
  }
});

// בדיקת סטטוס רישום להתראות
router.get('/status', authenticateUser, async (req, res) => {
  try {
    const userSubscription = subscriptions.get(req.user.id);

    res.json({
      subscribed: !!userSubscription,
      subscription: userSubscription ? {
        endpoint: userSubscription.subscription.endpoint.substring(0, 50) + '...',
        createdAt: userSubscription.createdAt,
        lastUsed: userSubscription.lastUsed
      } : null
    });
  } catch (error) {
    console.error('[PUSH] Error getting status:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==== API לאדמין בלבד ====

// שליחת התראה לכל המשתמשים
router.post('/broadcast', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { title, body, data } = req.body;

    console.log('[PUSH] Broadcast request:', { title, body });
    console.log('[PUSH] Total subscriptions:', subscriptions.size);

    if (!title || !body) {
      return res.status(400).json({ error: 'כותרת וגוף ההודעה נדרשים' });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: `broadcast-${Date.now()}`,
      data: data || {}
    });

    let sent = 0;
    let failed = 0;

    for (const [userId, sub] of subscriptions.entries()) {
      try {
        console.log(`[PUSH] Sending to: ${sub.userName}`);
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
        sub.lastUsed = new Date();
        console.log(`[PUSH] ✅ Sent to ${sub.userName}`);
      } catch (error) {
        console.error(`[PUSH] ❌ Failed to send to ${sub.userName}:`, error.message);
        failed++;
        
        // אם ה-subscription לא תקף יותר, הסר אותו
        if (error.statusCode === 410) {
          console.log(`[PUSH] Removing expired subscription for ${userId}`);
          subscriptions.delete(userId);
        }
      }
    }

    console.log(`[PUSH] Broadcast completed: sent=${sent}, failed=${failed}`);

    res.json({
      success: true,
      message: `ההתראה נשלחה ל-${sent} משתמשים`,
      details: { sent, failed }
    });
  } catch (error) {
    console.error('[PUSH] Error broadcasting:', error);
    res.status(500).json({ error: error.message });
  }
});

// שליחת התראה למשתמש ספציפי
router.post('/send-to-user', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { userId, title, body, data } = req.body;

    console.log('[PUSH] Send to user request:', { userId, title });

    if (!userId || !title || !body) {
      return res.status(400).json({ error: 'חסרים נתונים נדרשים' });
    }

    const userSub = subscriptions.get(userId);
    if (!userSub) {
      console.log(`[PUSH] User ${userId} has no active subscription`);
      return res.json({
        success: false,
        message: 'למשתמש אין התראות פעילות'
      });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: `user-${Date.now()}`,
      data: data || {}
    });

    try {
      console.log(`[PUSH] Sending to ${userSub.userName}`);
      await webpush.sendNotification(userSub.subscription, payload);
      userSub.lastUsed = new Date();
      console.log(`[PUSH] ✅ Sent to ${userSub.userName}`);
      
      res.json({
        success: true,
        message: 'ההתראה נשלחה בהצלחה'
      });
    } catch (error) {
      console.error(`[PUSH] ❌ Failed to send:`, error.message);
      if (error.statusCode === 410) {
        subscriptions.delete(userId);
      }
      throw error;
    }
  } catch (error) {
    console.error('[PUSH] Error sending to user:', error);
    res.status(500).json({ error: error.message });
  }
});

// שליחת התראה לקבוצת משתמשים
router.post('/send-to-group', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;

    console.log('[PUSH] Send to group request:', { userCount: userIds?.length, title });

    if (!userIds || !Array.isArray(userIds) || !title || !body) {
      return res.status(400).json({ error: 'חסרים נתונים נדרשים' });
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: `group-${Date.now()}`,
      data: data || {}
    });

    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      const userSub = subscriptions.get(userId);
      if (userSub) {
        try {
          console.log(`[PUSH] Sending to ${userSub.userName}`);
          await webpush.sendNotification(userSub.subscription, payload);
          userSub.lastUsed = new Date();
          sent++;
          console.log(`[PUSH] ✅ Sent to ${userSub.userName}`);
        } catch (error) {
          console.error(`[PUSH] ❌ Failed to send to ${userSub.userName}:`, error.message);
          failed++;
          if (error.statusCode === 410) {
            subscriptions.delete(userId);
          }
        }
      }
    }

    console.log(`[PUSH] Group send completed: sent=${sent}, failed=${failed}`);

    res.json({
      success: true,
      message: `ההתראה נשלחה ל-${sent} משתמשים`,
      details: { sent, failed }
    });
  } catch (error) {
    console.error('[PUSH] Error sending to group:', error);
    res.status(500).json({ error: error.message });
  }
});

// שליחת התראת הפעלת שבוע
router.post('/week-activated', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const { weekData, sendNotifications } = req.body;
    
    console.log('[PUSH] ========================================');
    console.log('[PUSH] week-activated called!');
    console.log('[PUSH] Week name:', weekData?.name);
    console.log('[PUSH] Send notifications:', sendNotifications);
    console.log('[PUSH] Lock time:', weekData?.lockTime);
    console.log('[PUSH] Total subscriptions:', subscriptions.size);
    console.log('[PUSH] ========================================');

    if (!weekData) {
      return res.status(400).json({ error: 'נתוני שבוע חסרים' });
    }

    if (!sendNotifications) {
      console.log('[PUSH] Notifications disabled for this activation');
      return res.json({
        success: true,
        message: 'השבוע הופעל ללא שליחת התראות'
      });
    }

    if (subscriptions.size === 0) {
      console.log('[PUSH] ⚠️ WARNING: No subscriptions found!');
      return res.json({
        success: true,
        message: 'השבוע הופעל אבל אין משתמשים רשומים להתראות',
        details: { sent: 0, failed: 0 }
      });
    }

    console.log('[PUSH] Preparing notification payload...');

    const payload = JSON.stringify({
      title: '🏆 שבוע חדש הופעל!',
      body: `${weekData.name} נפתח להימורים!\n⏰ נעילה: ${formatDate(weekData.lockTime)}`,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: `week-${weekData._id}`,
      data: {
        type: 'week_activated',
        weekId: weekData._id,
        url: '/betting'
      },
      actions: [
        {
          action: 'bet',
          title: 'להימורים',
          icon: '/bet-icon.png'
        },
        {
          action: 'later',
          title: 'אחר כך',
          icon: '/clock-icon.png'
        }
      ]
    });

    console.log('[PUSH] Payload prepared, starting to send...');

    let sent = 0;
    let failed = 0;

    for (const [userId, sub] of subscriptions.entries()) {
      try {
        console.log(`[PUSH] → Sending to: ${sub.userName} (${userId})`);
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
        sub.lastUsed = new Date();
        console.log(`[PUSH] ✅ Successfully sent to ${sub.userName}`);
      } catch (error) {
        console.error(`[PUSH] ❌ Failed to send to ${sub.userName}:`, error.message);
        console.error(`[PUSH] Error details:`, {
          statusCode: error.statusCode,
          body: error.body,
          endpoint: sub.subscription.endpoint.substring(0, 50)
        });
        failed++;
        if (error.statusCode === 410) {
          console.log(`[PUSH] Removing expired subscription for ${userId}`);
          subscriptions.delete(userId);
        }
      }
    }

    console.log('[PUSH] ========================================');
    console.log('[PUSH] Finished sending notifications');
    console.log('[PUSH] Results: sent=', sent, ', failed=', failed);
    console.log('[PUSH] ========================================');

    res.json({
      success: true,
      message: `השבוע הופעל והתראה נשלחה ל-${sent} משתמשים`,
      details: { sent, failed }
    });
  } catch (error) {
    console.error('[PUSH] ❌ CRITICAL ERROR in week-activated:', error);
    res.status(500).json({ error: error.message });
  }
});

// קבלת סטטיסטיקות התראות
router.get('/statistics', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    let usageLastDay = 0;
    let usageLastWeek = 0;

    for (const sub of subscriptions.values()) {
      if (sub.lastUsed >= dayAgo) usageLastDay++;
      if (sub.lastUsed >= weekAgo) usageLastWeek++;
    }

    res.json({
      total: subscriptions.size,
      active: subscriptions.size,
      uniqueUsers: subscriptions.size,
      usageLastDay,
      usageLastWeek
    });
  } catch (error) {
    console.error('[PUSH] Error getting statistics:', error);
    res.status(500).json({ error: error.message });
  }
});

// קבלת רשימת משתמשים רשומים להתראות
router.get('/subscribers', authenticateUser, requireAdmin, async (req, res) => {
  try {
    const subscribers = Array.from(subscriptions.values()).map(sub => ({
      user: {
        _id: sub.userId,
        name: sub.userName
      },
      devices: [{
        endpoint: sub.subscription.endpoint.substring(0, 50) + '...',
        createdAt: sub.createdAt,
        lastUsed: sub.lastUsed
      }]
    }));

    res.json({
      total: subscribers.length,
      subscribers
    });
  } catch (error) {
    console.error('[PUSH] Error getting subscribers:', error);
    res.status(500).json({ error: error.message });
  }
});

// בדיקת push notification
router.post('/test', authenticateUser, async (req, res) => {
  try {
    const userSub = subscriptions.get(req.user.id);
    
    console.log('[PUSH] Test notification request from:', req.user.name);
    
    if (!userSub) {
      console.log('[PUSH] User has no subscription');
      return res.json({
        success: false,
        message: 'אין התראות פעילות'
      });
    }

    const payload = JSON.stringify({
      title: '🧪 בדיקת התראה',
      body: 'אם אתה רואה את זה, ההתראות עובדות מעולה!',
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: 'test-notification',
      data: {
        type: 'test',
        timestamp: Date.now()
      }
    });

    console.log('[PUSH] Sending test notification...');
    await webpush.sendNotification(userSub.subscription, payload);
    userSub.lastUsed = new Date();
    console.log('[PUSH] ✅ Test notification sent successfully');

    res.json({
      success: true,
      message: 'התראת בדיקה נשלחה!'
    });
  } catch (error) {
    console.error('[PUSH] ❌ Error sending test:', error);
    res.status(500).json({ error: error.message });
  }
});

// פונקציית עזר לפורמט תאריך
function formatDate(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${day}/${month} ${hours}:${minutes}`;
}

module.exports = router;