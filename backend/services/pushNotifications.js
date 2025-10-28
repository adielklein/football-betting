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
 * שליחת התראה למשתמש אחד (מכשיר אחד)
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
 * 🔧 FIX: שליחת התראה לכל המשתמשים - תמיכה במספר מכשירים!
 */
async function sendNotificationToAll(title, body, data = {}) {
  try {
    console.log('📢 [PUSH] ========================================');
    console.log('📢 [PUSH] sendNotificationToAll called');
    console.log('📢 [PUSH] Title:', title);
    console.log('📢 [PUSH] Body:', body);
    console.log('📢 [PUSH] ========================================');
    
    // 🔧 FIX: מצא משתמשים עם מערך subscriptions לא ריק
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscriptions.0': { $exists: true }  // ✅ לפחות מכשיר אחד
    });

    console.log(`📢 [PUSH] Found ${users.length} subscribed users in database`);

    if (users.length === 0) {
      console.log('🔭 [PUSH] No users to send to');
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
    let totalDevices = 0;

    // 🔧 FIX: לולאה כפולה - עבור כל משתמש ועבור כל מכשיר שלו!
    for (const user of users) {
      const subscriptions = user.pushSettings.subscriptions || [];
      totalDevices += subscriptions.length;
      
      console.log(`👤 [PUSH] User: ${user.name} (${user.username}) - ${subscriptions.length} device(s)`);
      
      for (let i = 0; i < subscriptions.length; i++) {
        const subscription = subscriptions[i];
        try {
          console.log(`  → [PUSH] Sending to device ${i + 1}/${subscriptions.length}`);
          const success = await sendNotification(subscription, payload);
          if (success) {
            sent++;
            console.log(`  ✅ [PUSH] Successfully sent to device ${i + 1}`);
          } else {
            failed++;
            console.log(`  ❌ [PUSH] Failed to send to device ${i + 1}`);
          }
        } catch (error) {
          console.error(`  ❌ [PUSH] Exception sending to device ${i + 1}:`, error.message);
          failed++;
        }
      }
    }

    console.log('📢 [PUSH] ========================================');
    console.log(`📢 [PUSH] Results: ${sent} sent, ${failed} failed out of ${totalDevices} total devices`);
    console.log(`📢 [PUSH] Users: ${users.length}, Devices: ${totalDevices}`);
    console.log('📢 [PUSH] ========================================');

    return {
      success: true,
      sent,
      failed,
      total: totalDevices,
      users: users.length,
      message: `התראה נשלחה ל-${sent} מכשירים (${users.length} משתמשים)`
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
 * 🔧 FIX: שליחת התראה למשתמשים ספציפיים - תמיכה במספר מכשירים!
 */
async function sendNotificationToUsers(userIds, title, body, data = {}) {
  try {
    console.log('📢 [PUSH] ========================================');
    console.log('📢 [PUSH] sendNotificationToUsers called');
    console.log('📢 [PUSH] Requested user IDs:', userIds);
    console.log('📢 [PUSH] Title:', title);
    console.log('📢 [PUSH] ========================================');
    
    // 🔧 FIX: מצא משתמשים עם מערך subscriptions לא ריק
    const users = await User.find({
      _id: { $in: userIds },
      'pushSettings.enabled': true,
      'pushSettings.subscriptions.0': { $exists: true }
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
    let totalDevices = 0;

    // 🔧 FIX: לולאה כפולה - עבור כל משתמש ועבור כל מכשיר שלו!
    for (const user of users) {
      const subscriptions = user.pushSettings.subscriptions || [];
      totalDevices += subscriptions.length;
      
      console.log(`👤 [PUSH] User: ${user.name} - ${subscriptions.length} device(s)`);
      
      for (let i = 0; i < subscriptions.length; i++) {
        const subscription = subscriptions[i];
        try {
          console.log(`  → [PUSH] Sending to device ${i + 1}/${subscriptions.length}`);
          const success = await sendNotification(subscription, payload);
          if (success) {
            sent++;
            console.log(`  ✅ [PUSH] Successfully sent to device ${i + 1}`);
          } else {
            failed++;
            console.log(`  ❌ [PUSH] Failed to send to device ${i + 1}`);
          }
        } catch (error) {
          console.error(`  ❌ [PUSH] Exception sending to device ${i + 1}:`, error.message);
          failed++;
        }
      }
    }

    console.log('📢 [PUSH] ========================================');
    console.log(`📢 [PUSH] Results: ${sent} sent, ${failed} failed out of ${totalDevices} devices`);
    console.log('📢 [PUSH] ========================================');

    return {
      success: true,
      sent,
      failed,
      total: totalDevices,
      users: users.length
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
 * 🔧 FIX: שליחת התראות הפעלת שבוע - תמיכה במספר מכשירים!
 */
async function sendWeekActivationNotification(week) {
  try {
    console.log('🏆 [PUSH] ========================================');
    console.log('🏆 [PUSH] WEEK ACTIVATION NOTIFICATION');
    console.log('🏆 [PUSH] Week name:', week.name);
    console.log('🏆 [PUSH] Week ID:', week._id);
    console.log('🏆 [PUSH] Lock time:', week.lockTime);
    console.log('🏆 [PUSH] ========================================');
    
    // 🔧 FIX: מצא משתמשים עם מערך subscriptions לא ריק
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscriptions.0': { $exists: true }
    });

    console.log(`🏆 [PUSH] Found ${users.length} subscribed users`);

    if (users.length === 0) {
      console.log('🔭 [PUSH] No users subscribed to notifications');
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
    let totalDevices = 0;

    // 🔧 FIX: לולאה כפולה - עבור כל משתמש ועבור כל מכשיר שלו!
    for (const user of users) {
      const subscriptions = user.pushSettings.subscriptions || [];
      totalDevices += subscriptions.length;
      
      console.log(`👤 [PUSH] User: ${user.name} (${user.username}) - ${subscriptions.length} device(s)`);
      
      for (let i = 0; i < subscriptions.length; i++) {
        const subscription = subscriptions[i];
        try {
          console.log(`  → [PUSH] Sending week activation to device ${i + 1}/${subscriptions.length}`);
          const success = await sendNotification(subscription, payload);
          if (success) {
            sent++;
            console.log(`  ✅ [PUSH] Successfully sent to device ${i + 1}`);
          } else {
            failed++;
            console.log(`  ❌ [PUSH] Failed to send to device ${i + 1}`);
          }
        } catch (error) {
          console.error(`  ❌ [PUSH] Exception sending to device ${i + 1}:`, error.message);
          failed++;
        }
      }
    }

    console.log('🏆 [PUSH] ========================================');
    console.log('🏆 [PUSH] Week activation completed');
    console.log(`🏆 [PUSH] Results: sent=${sent}, failed=${failed}, total=${totalDevices} devices`);
    console.log(`🏆 [PUSH] Users: ${users.length}, Devices: ${totalDevices}`);
    console.log('🏆 [PUSH] ========================================');

    return {
      success: true,
      sent,
      failed,
      total: totalDevices,
      users: users.length,
      message: `התראה נשלחה ל-${sent} מכשירים (${users.length} משתמשים)`
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
    
    // 🔧 FIX: בדיקה עם subscriptions
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscriptions.0': { $exists: true }
    });

    console.log(`🔍 [PUSH] Found ${users.length} subscribed users`);

    // 🔧 FIX: ספור את המכשירים
    let totalDevices = 0;
    const userList = users.map(u => {
      const devicesCount = u.pushSettings?.subscriptions?.length || 0;
      totalDevices += devicesCount;
      return {
        name: u.name,
        username: u.username,
        devicesCount: devicesCount
      };
    });

    res.json({
      success: true,
      subscribedUsers: users.length,
      totalDevices: totalDevices,
      users: userList,
      vapidConfigured: !!vapidKeys.publicKey && !!vapidKeys.privateKey,
      message: 'Push notification service is running with multi-device support'
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
console.log('✅ [PUSH SERVICE] Multi-device support enabled');

module.exports = {
  vapidKeys,
  sendNotification,
  sendNotificationToAll,
  sendNotificationToUsers,
  sendWeekActivationNotification,
  checkRoute
};