const webpush = require('web-push');
const User = require('../models/User');

console.log('🔔 [PUSH SERVICE] ========================================');
console.log('🔔 [PUSH SERVICE] Initializing Push Notifications Service...');
console.log('🔔 [PUSH SERVICE] Backward compatible - supports both models');
console.log('🔔 [PUSH SERVICE] ========================================');

// קריאת VAPID Keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

console.log('🔑 [PUSH SERVICE] Checking VAPID keys...');
console.log('🔑 [PUSH SERVICE] VAPID_PUBLIC_KEY exists:', !!vapidPublicKey);
console.log('🔑 [PUSH SERVICE] VAPID_PRIVATE_KEY exists:', !!vapidPrivateKey);

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('❌ [PUSH SERVICE] ERROR: VAPID keys not found!');
  throw new Error('VAPID keys not configured');
}

const vapidKeys = {
  publicKey: vapidPublicKey,
  privateKey: vapidPrivateKey
};

webpush.setVapidDetails(
  'mailto:admin@footballbetting.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

console.log('✅ [PUSH SERVICE] Web Push configured successfully');
console.log('🔔 [PUSH SERVICE] ========================================');

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

/**
 * שליחת התראה למכשיר אחד
 */
async function sendNotification(subscription, payload) {
  try {
    console.log('📤 [PUSH] Sending notification...');
    
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    
    console.log('✅ [PUSH] Sent successfully');
    return true;
  } catch (error) {
    console.error('❌ [PUSH] Error:', error.message);
    
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('🗑️ [PUSH] Subscription expired');
    }
    
    return false;
  }
}

/**
 * 🔧 שליחת התראה לכל המשתמשים - תומך בשני המבנים
 */
async function sendNotificationToAll(title, body, data = {}) {
  try {
    console.log('📢 [PUSH] ========================================');
    console.log('📢 [PUSH] sendNotificationToAll');
    console.log('📢 [PUSH] Title:', title);
    console.log('📢 [PUSH] ========================================');
    
    // 🔧 תמיכה בשני המבנים
    const users = await User.find({
      'pushSettings.enabled': true,
      $or: [
        { 'pushSettings.subscriptions.0': { $exists: true } },
        { 'pushSettings.subscription': { $exists: true, $ne: null } }
      ]
    });

    console.log(`📢 [PUSH] Found ${users.length} subscribed users`);

    if (users.length === 0) {
      return {
        success: true,
        sent: 0,
        failed: 0,
        users: 0,
        total: 0
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

    let totalSent = 0;
    let totalFailed = 0;
    let usersReached = 0;

    for (const user of users) {
      const subscriptions = getUserSubscriptions(user);
      console.log(`→ [PUSH] ${user.name}: ${subscriptions.length} device(s)`);
      
      let userSent = 0;
      
      for (const subscription of subscriptions) {
        const success = await sendNotification(subscription, payload);
        if (success) {
          userSent++;
          totalSent++;
        } else {
          totalFailed++;
        }
      }
      
      if (userSent > 0) {
        usersReached++;
        console.log(`  ✅ ${user.name}: ${userSent} devices`);
      }
    }

    console.log('📢 [PUSH] ========================================');
    console.log(`📢 [PUSH] Results: ${totalSent} sent, ${totalFailed} failed`);
    console.log(`📢 [PUSH] Users reached: ${usersReached}/${users.length}`);
    console.log('📢 [PUSH] ========================================');

    return {
      success: true,
      sent: totalSent,
      failed: totalFailed,
      users: usersReached,
      total: users.length,
      message: `התראה נשלחה ל-${totalSent} מכשירים של ${usersReached} משתמשים`
    };
  } catch (error) {
    console.error('❌ [PUSH] Error:', error);
    return {
      success: false,
      error: error.message,
      sent: 0,
      failed: 0
    };
  }
}

/**
 * 🔧 שליחת התראה למשתמשים ספציפיים - תומך בשני המבנים
 */
async function sendNotificationToUsers(userIds, title, body, data = {}) {
  try {
    console.log('📢 [PUSH] ========================================');
    console.log('📢 [PUSH] sendNotificationToUsers');
    console.log('📢 [PUSH] Users:', userIds);
    console.log('📢 [PUSH] ========================================');
    
    const users = await User.find({
      _id: { $in: userIds },
      'pushSettings.enabled': true,
      $or: [
        { 'pushSettings.subscriptions.0': { $exists: true } },
        { 'pushSettings.subscription': { $exists: true, $ne: null } }
      ]
    });

    console.log(`📢 [PUSH] Found ${users.length} users`);

    const payload = {
      title,
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: `group-${Date.now()}`,
      data: data || {}
    };

    let totalSent = 0;
    let totalFailed = 0;
    let usersReached = 0;

    for (const user of users) {
      const subscriptions = getUserSubscriptions(user);
      let userSent = 0;
      
      for (const subscription of subscriptions) {
        const success = await sendNotification(subscription, payload);
        if (success) {
          userSent++;
          totalSent++;
        } else {
          totalFailed++;
        }
      }
      
      if (userSent > 0) {
        usersReached++;
        console.log(`  ✅ ${user.name}: ${userSent} devices`);
      }
    }

    console.log('📢 [PUSH] ========================================');
    console.log(`📢 [PUSH] Results: ${totalSent} sent`);
    console.log('📢 [PUSH] ========================================');

    return {
      success: true,
      sent: totalSent,
      failed: totalFailed,
      users: usersReached,
      total: users.length
    };
  } catch (error) {
    console.error('❌ [PUSH] Error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * 🔧 שליחת התראת הפעלת שבוע - תומך בשני המבנים
 */
async function sendWeekActivationNotification(week) {
  try {
    console.log('🏆 [PUSH] Week activation notification');
    
    const users = await User.find({
      'pushSettings.enabled': true,
      $or: [
        { 'pushSettings.subscriptions.0': { $exists: true } },
        { 'pushSettings.subscription': { $exists: true, $ne: null } }
      ]
    });

    if (users.length === 0) {
      return { success: true, sent: 0, users: 0 };
    }

    const lockDate = new Date(week.lockTime);
    const formattedLockTime = lockDate.toLocaleString('he-IL');

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
        url: '/betting'
      }
    };

    let totalSent = 0;
    let usersReached = 0;

    for (const user of users) {
      const subscriptions = getUserSubscriptions(user);
      let userSent = 0;
      
      for (const subscription of subscriptions) {
        if (await sendNotification(subscription, payload)) {
          userSent++;
          totalSent++;
        }
      }
      
      if (userSent > 0) usersReached++;
    }

    console.log(`🏆 [PUSH] Results: ${totalSent} devices, ${usersReached} users`);

    return {
      success: true,
      sent: totalSent,
      users: usersReached,
      total: users.length
    };
  } catch (error) {
    console.error('❌ [PUSH] Error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * route לבדיקה
 */
async function checkRoute(req, res) {
  try {
    const users = await User.find({
      'pushSettings.enabled': true,
      $or: [
        { 'pushSettings.subscriptions.0': { $exists: true } },
        { 'pushSettings.subscription': { $exists: true, $ne: null } }
      ]
    });

    let totalDevices = 0;
    const userList = users.map(u => {
      const subs = getUserSubscriptions(u);
      totalDevices += subs.length;
      return {
        name: u.name,
        username: u.username,
        devices: subs.length
      };
    });

    res.json({
      success: true,
      subscribedUsers: users.length,
      totalDevices: totalDevices,
      users: userList,
      message: 'Push service running - backward compatible'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

console.log('✅ [PUSH SERVICE] Module loaded');
console.log('✅ [PUSH SERVICE] Backward compatible mode');

module.exports = {
  vapidKeys,
  sendNotification,
  sendNotificationToAll,
  sendNotificationToUsers,
  sendWeekActivationNotification,
  checkRoute
};