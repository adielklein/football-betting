// services/pushNotifications.js
const webpush = require('web-push');
const User = require('../models/User');

// VAPID Keys - להחליף עם המפתחות שלך
// npx web-push generate-vapid-keys
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || 'BHQoW5ZPuNkBvhJzXMG8PQdRlqV_7x8wKZpLkYXY6c3FXQmGzJrqZvJjO0Nh_6doQzHDaW7JYvEbJ1xL-KPZuXQ',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'uWbp3xqL9kCm2vN4zXdF6hJ8tY1rP5sO7wQ3eA4bM2n'
};

// הגדרת Web Push
webpush.setVapidDetails(
  'mailto:admin@footballbetting.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

/**
 * שליחת התראה למשתמש אחד
 */
async function sendNotification(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('✅ Notification sent successfully');
    return true;
  } catch (error) {
    console.error('❌ Error sending notification:', error);
    
    // אם ה-subscription לא תקף יותר, מחק אותו
    if (error.statusCode === 404 || error.statusCode === 410) {
      console.log('🗑️ Subscription expired, should be removed');
    }
    
    return false;
  }
}

/**
 * שליחת התראה לכל המשתמשים
 */
async function sendNotificationToAll(title, body, data = {}) {
  try {
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    console.log(`📢 Sending notification to ${users.length} users`);

    const payload = {
      title,
      body,
      icon: '/logo192.png',
      badge: '/logo192.png',
      vibrate: [200, 100, 200],
      tag: `broadcast-${Date.now()}`,
      data: data || {}
    };

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const success = await sendNotification(user.pushSettings.subscription, payload);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to send to ${user.name}:`, error);
        failed++;
      }
    }

    return {
      success: true,
      sent,
      failed,
      total: users.length
    };
  } catch (error) {
    console.error('Error in sendNotificationToAll:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * שליחת התראה למשתמשים ספציפיים
 */
async function sendNotificationToUsers(userIds, title, body, data = {}) {
  try {
    const users = await User.find({
      _id: { $in: userIds },
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    console.log(`📢 Sending notification to ${users.length} specific users`);

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
        const success = await sendNotification(user.pushSettings.subscription, payload);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to send to ${user.name}:`, error);
        failed++;
      }
    }

    return {
      success: true,
      sent,
      failed,
      total: users.length
    };
  } catch (error) {
    console.error('Error in sendNotificationToUsers:', error);
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
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    if (users.length === 0) {
      console.log('📭 No users subscribed to notifications');
      return {
        success: true,
        sent: 0,
        failed: 0,
        total: 0,
        message: 'No users subscribed'
      };
    }

    console.log(`🏆 Sending week activation to ${users.length} users`);

    // פורמט תאריך נעילה
    const lockDate = new Date(week.lockTime);
    const day = lockDate.getDate().toString().padStart(2, '0');
    const month = (lockDate.getMonth() + 1).toString().padStart(2, '0');
    const hours = lockDate.getHours().toString().padStart(2, '0');
    const minutes = lockDate.getMinutes().toString().padStart(2, '0');
    const formattedLockTime = `${day}/${month} ${hours}:${minutes}`;

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

    let sent = 0;
    let failed = 0;

    for (const user of users) {
      try {
        const success = await sendNotification(user.pushSettings.subscription, payload);
        if (success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to send to ${user.name}:`, error);
        failed++;
      }
    }

    console.log(`📊 Week activation: ${sent} sent, ${failed} failed`);

    return {
      success: true,
      sent,
      failed,
      total: users.length,
      message: `התראה נשלחה ל-${sent} משתמשים`
    };
  } catch (error) {
    console.error('Error in sendWeekActivationNotification:', error);
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
    const users = await User.find({
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }
    });

    res.json({
      success: true,
      subscribedUsers: users.length,
      message: 'Push notification service is running'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

module.exports = {
  vapidKeys,
  sendNotification,
  sendNotificationToAll,
  sendNotificationToUsers,
  sendWeekActivationNotification,
  checkRoute
};