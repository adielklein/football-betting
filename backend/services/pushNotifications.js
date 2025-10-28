const webpush = require('web-push');
const User = require('../models/User');

console.log('🔔 [PUSH SERVICE] ========================================');
console.log('🔔 [PUSH SERVICE] Initializing Push Notifications Service...');
console.log('🔔 [PUSH SERVICE] ========================================');

// 🔧 קריאת VAPID Keys מה-ENV (חובה!)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

console.log('🔑 [PUSH SERVICE] Checking VAPID keys...');
console.log('🔑 [PUSH SERVICE] VAPID_PUBLIC_KEY exists:', !!vapidPublicKey);
console.log('🔑 [PUSH SERVICE] VAPID_PRIVATE_KEY exists:', !!vapidPrivateKey);

// בדיקה שהמפתחות קיימים
if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('❌ [PUSH SERVICE] ERROR: VAPID keys not found in environment variables!');
  console.error('❌ [PUSH SERVICE] Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Render environment settings');
  throw new Error('VAPID keys not configured');
}

console.log('🔑 [PUSH SERVICE] Public Key (first 30 chars):', vapidPublicKey.substring(0, 30) + '...');
console.log('🔑 [PUSH SERVICE] Private Key (first 10 chars):', vapidPrivateKey.substring(0, 10) + '...');

const vapidKeys = {
  publicKey: vapidPublicKey,
  privateKey: vapidPrivateKey
};

// הגדרת Web Push עם המפתחות הנכונים
webpush.setVapidDetails(
  'mailto:admin@footballbetting.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

console.log('✅ [PUSH SERVICE] Web Push configured successfully');
console.log('🔔 [PUSH SERVICE] ========================================');

/**
 * שליחת התראה למשתמש אחד
 */
async function sendNotification(subscription, payload) {
  try {
    console.log('📤 [PUSH] Attempting to send notification...');
    console.log('📤 [PUSH] Endpoint:', subscription.endpoint?.substring(0, 50) + '...');
    
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    
    console.log('✅ [PUSH] Notification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ [PUSH] Error sending notification:', error.message);
    console.error('❌ [PUSH] Status Code:', error.statusCode);
    console.error('❌ [PUSH] Error Body:', error.body);
    
    // אם ה-subscription לא תקף יותר, מחק אותו
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('🗑️ [PUSH] Subscription expired/gone - should be removed from DB');
    }
    
    return false;
  }
}

/**
 * שליחת התראה לכל המשתמשים
 */
async function sendNotificationToAll(title, body, data = {}) {
  try {
    console.log('📢 [PUSH] ========================================');
    console.log('📢 [PUSH] sendNotificationToAll called');
    console.log('📢 [PUSH] Title:', title);
    console.log('📢 [PUSH] Body:', body);
    console.log('📢 [PUSH] ========================================');
    
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    console.log(`📢 [PUSH] Found ${users.length} subscribed users in database`);

    if (users.length === 0) {
      console.log('📭 [PUSH] No users to send to');
      return {
        success: true,
        sent: 0,
        failed: 0,
        total: 0,
        message: 'No users subscribed'
      };
    }

    const payload = {
      title,
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: `broadcast-${Date.now()}`,
      data: data || {}
    };

    console.log('📢 [PUSH] Payload prepared:', JSON.stringify(payload, null, 2));

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        console.log(`→ [PUSH] Sending to: ${user.name} (${user.username})`);
        const success = await sendNotification(user.pushSettings.subscription, payload);
        if (success) {
          sent++;
          console.log(`✅ [PUSH] Successfully sent to ${user.name}`);
        } else {
          failed++;
          console.log(`❌ [PUSH] Failed to send to ${user.name}`);
        }
      } catch (error) {
        console.error(`❌ [PUSH] Exception sending to ${user.name}:`, error.message);
        failed++;
      }
    }

    console.log('📢 [PUSH] ========================================');
    console.log(`📢 [PUSH] Results: ${sent} sent, ${failed} failed out of ${users.length} total`);
    console.log('📢 [PUSH] ========================================');

    return {
      success: true,
      sent,
      failed,
      total: users.length,
      message: `התראה נשלחה ל-${sent} משתמשים`
    };
  } catch (error) {
    console.error('❌ [PUSH] Critical error in sendNotificationToAll:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: 0,
      total: 0
    };
  }
}

/**
 * שליחת התראה למשתמשים ספציפיים
 */
async function sendNotificationToUsers(userIds, title, body, data = {}) {
  try {
    console.log('📢 [PUSH] ========================================');
    console.log('📢 [PUSH] sendNotificationToUsers called');
    console.log('📢 [PUSH] Requested user IDs:', userIds);
    console.log('📢 [PUSH] Title:', title);
    console.log('📢 [PUSH] ========================================');
    
    const users = await User.find({
      _id: { $in: userIds },
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    console.log(`📢 [PUSH] Found ${users.length} subscribed users from ${userIds.length} requested`);

    const payload = {
      title,
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: `group-${Date.now()}`,
      data: data || {}
    };

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        console.log(`→ [PUSH] Sending to: ${user.name}`);
        const success = await sendNotification(user.pushSettings.subscription, payload);
        if (success) {
          sent++;
          console.log(`✅ [PUSH] Successfully sent to ${user.name}`);
        } else {
          failed++;
          console.log(`❌ [PUSH] Failed to send to ${user.name}`);
        }
      } catch (error) {
        console.error(`❌ [PUSH] Exception sending to ${user.name}:`, error.message);
        failed++;
      }
    }

    console.log('📢 [PUSH] ========================================');
    console.log(`📢 [PUSH] Results: ${sent} sent, ${failed} failed`);
    console.log('📢 [PUSH] ========================================');

    return {
      success: true,
      sent,
      failed,
      total: users.length
    };
  } catch (error) {
    console.error('❌ [PUSH] Critical error in sendNotificationToUsers:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * שליחת התראת הפעלת שבוע
 */
async function sendWeekActivationNotification(week) {
  try {
    console.log('🏆 [PUSH] ========================================');
    console.log('🏆 [PUSH] WEEK ACTIVATION NOTIFICATION');
    console.log('🏆 [PUSH] Week name:', week.name);
    console.log('🏆 [PUSH] Week ID:', week._id);
    console.log('🏆 [PUSH] Lock time:', week.lockTime);
    console.log('🏆 [PUSH] ========================================');
    
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    console.log(`🏆 [PUSH] Found ${users.length} subscribed users`);

    if (users.length === 0) {
      console.log('📭 [PUSH] No users subscribed to notifications');
      return {
        success: true,
        sent: 0,
        failed: 0,
        total: 0,
        message: 'No users subscribed'
      };
    }

    // פורמט תאריך נעילה
    const lockDate = new Date(week.lockTime);
    const day = lockDate.getDate().toString().padStart(2, '0');
    const month = (lockDate.getMonth() + 1).toString().padStart(2, '0');
    const hours = lockDate.getHours().toString().padStart(2, '0');
    const minutes = lockDate.getMinutes().toString().padStart(2, '0');
    const formattedLockTime = `${day}/${month} ${hours}:${minutes}`;

    console.log('🏆 [PUSH] Formatted lock time:', formattedLockTime);

    const payload = {
      title: '🏆 שבוע חדש הופעל!',
      body: `${week.name} נפתח להימורים!\n⏰ נעילה: ${formattedLockTime}`,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200, 100, 200],
      tag: `week-${week._id}`,
      data: {
        type: 'week_activated',
        weekId: week._id,
        weekName: week.name,
        lockTime: week.lockTime,
        url: '/betting'
      },
      actions: [
        {
          action: 'bet',
          title: 'להימורים',
          icon: '/logo192.png'
        },
        {
          action: 'close',
          title: 'סגור',
          icon: '/logo192.png'
        }
      ]
    };

    console.log('🏆 [PUSH] Payload prepared');

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        console.log(`→ [PUSH] Sending week activation to: ${user.name} (${user.username})`);
        const success = await sendNotification(user.pushSettings.subscription, payload);
        if (success) {
          sent++;
          console.log(`✅ [PUSH] Successfully sent to ${user.name}`);
        } else {
          failed++;
          console.log(`❌ [PUSH] Failed to send to ${user.name}`);
        }
      } catch (error) {
        console.error(`❌ [PUSH] Exception sending to ${user.name}:`, error.message);
        failed++;
      }
    }

    console.log('🏆 [PUSH] ========================================');
    console.log('🏆 [PUSH] Week activation completed');
    console.log(`🏆 [PUSH] Results: sent=${sent}, failed=${failed}, total=${users.length}`);
    console.log('🏆 [PUSH] ========================================');

    return {
      success: true,
      sent,
      failed,
      total: users.length,
      message: `התראה נשלחה ל-${sent} משתמשים`
    };
  } catch (error) {
    console.error('❌ [PUSH] Critical error in sendWeekActivationNotification:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: 0,
      total: 0
    };
  }
}

/**
 * route לבדיקה (עבור cron)
 */
async function checkRoute(req, res) {
  try {
    console.log('🔍 [PUSH] Check route called');
    
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    console.log(`🔍 [PUSH] Found ${users.length} subscribed users`);

    const userList = users.map(u => ({
      name: u.name,
      username: u.username,
      hasSubscription: !!u.pushSettings?.subscription
    }));

    res.json({
      success: true,
      subscribedUsers: users.length,
      users: userList,
      vapidConfigured: !!vapidKeys.publicKey && !!vapidKeys.privateKey,
      message: 'Push notification service is running'
    });
  } catch (error) {
    console.error('❌ [PUSH] Error in check route:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

console.log('✅ [PUSH SERVICE] Module loaded successfully');
console.log('✅ [PUSH SERVICE] All functions exported');

module.exports = {
  vapidKeys,
  sendNotification,
  sendNotificationToAll,
  sendNotificationToUsers,
  sendWeekActivationNotification,
  checkRoute
};