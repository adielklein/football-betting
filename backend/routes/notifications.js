const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { 
  sendNotification, 
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
router.post('/subscribe', async (req, res) => {
  try {
    const { userId, subscription, hoursBeforeLock } = req.body;
    
    console.log(`📥 Saving subscription for user ${userId}`);
    
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
router.post('/unsubscribe', async (req, res) => {
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
router.patch('/settings', async (req, res) => {
  try {
    const { userId, hoursBeforeLock, soundEnabled } = req.body;
    
    console.log(`⚙️ Updating settings for user ${userId}`);
    
    const user = await User.findByIdAndUpdate(userId, {
      'pushSettings.hoursBeforeLock': hoursBeforeLock,
      'pushSettings.soundEnabled': soundEnabled
    }, { new: true });
    
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

// שלח התראה לכולם
router.post('/send-to-all', async (req, res) => {
  try {
    const { title, body, data } = req.body;
    
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    
    console.log('📢 Admin sending notification to all users');
    const result = await sendNotificationToAll(title, body, data);
    
    res.json(result);
  } catch (error) {
    console.error('Error sending to all:', error);
    res.status(500).json({ message: error.message });
  }
});

// שלח התראה למשתמשים נבחרים
router.post('/send-to-users', async (req, res) => {
  try {
    const { userIds, title, body, data } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: 'User IDs array is required' });
    }
    
    if (!title || !body) {
      return res.status(400).json({ message: 'Title and body are required' });
    }
    
    console.log(`📢 Admin sending notification to ${userIds.length} users`);
    const result = await sendNotificationToUsers(userIds, title, body, data);
    
    res.json(result);
  } catch (error) {
    console.error('Error sending to users:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔧 בדיקת התראה - תומך בשני המבנים
router.post('/test', async (req, res) => {
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
    
    for (const subscription of subscriptions) {
      const success = await sendNotification(subscription, payload);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }
    
    console.log(`✅ Test sent: ${sent} success, ${failed} failed`);
    
    res.json({ 
      message: 'Test notification sent',
      sent,
      failed,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('Error sending test:', error);
    res.status(500).json({ message: error.message });
  }
});

// Route לבדיקה
router.get('/check', checkRoute);

module.exports = router;