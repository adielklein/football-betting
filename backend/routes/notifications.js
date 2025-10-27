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

// קבל את ה-public key
router.get('/vapid-public-key', (req, res) => {
  console.log('📤 Sending VAPID public key');
  res.json({ publicKey: vapidKeys.publicKey });
});

// 🔧 FIX: קבל סטטיסטיקות התראות - תיקון הבדיקה!
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // 🔧 FIX: בדיקה נכונה - השדה קיים וגם לא null!
    const enabledUsers = await User.countDocuments({
      'pushSettings.enabled': true,
      'pushSettings.subscription': { $exists: true, $ne: null }  // ✅ גם קיים וגם לא null
    });
    
    const stats = {
      totalUsers,
      enabledUsers,
      disabledUsers: totalUsers - enabledUsers,
      percentage: totalUsers > 0 ? Math.round((enabledUsers / totalUsers) * 100) : 0
    };
    
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
        'pushSettings.subscription': { $exists: true, $ne: null }  // ✅ תיקון כאן גם
      },
      'name username pushSettings.hoursBeforeLock'
    );
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: error.message });
  }
});

// קבל את כל המשתמשים עם סטטוס ההתראות שלהם
router.get('/all-users', async (req, res) => {
  try {
    const users = await User.find(
      {},
      'name username pushSettings'
    );
    
    // פורמט הנתונים לקומפוננטה
    const formattedUsers = users.map(user => ({
      _id: user._id,
      name: user.name,
      username: user.username,
      // 🔧 FIX: בדיקה מדויקת - גם enabled וגם subscription לא null וגם לא ריק
      isSubscribed: !!(
        user.pushSettings?.enabled && 
        user.pushSettings?.subscription && 
        Object.keys(user.pushSettings.subscription || {}).length > 0
      ),
      hoursBeforeLock: user.pushSettings?.hoursBeforeLock || 2
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ message: error.message });
  }
});

// שמור subscription
router.post('/subscribe', async (req, res) => {
  try {
    const { userId, subscription, hoursBeforeLock } = req.body;
    
    console.log(`📥 Saving subscription for user ${userId}`);
    
    const user = await User.findByIdAndUpdate(userId, {
      'pushSettings.enabled': true,
      'pushSettings.subscription': subscription,
      'pushSettings.hoursBeforeLock': hoursBeforeLock || 2
    }, { new: true });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
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
      console.log(`✅ Subscription saved for ${user.name}`);
      res.json({ message: 'Subscription saved successfully' });
    } else {
      console.log(`❌ Failed to send test notification to ${user.name}`);
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: error.message });
  }
});

// בטל subscription
router.post('/unsubscribe', async (req, res) => {
  try {
    const { userId } = req.body;
    
    console.log(`📕 Unsubscribing user ${userId}`);
    
    const user = await User.findByIdAndUpdate(userId, {
      'pushSettings.enabled': false,
      'pushSettings.subscription': null
    }, { new: true });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log(`✅ Unsubscribed ${user.name}`);
    res.json({ message: 'Unsubscribed successfully' });
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

// שלח התראה לכולם (רק אדמין)
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

// בדיקת התראה ידנית (לבדיקות)
router.post('/test', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const user = await User.findById(userId);
    if (!user || !user.pushSettings.enabled || !user.pushSettings.subscription) {
      return res.status(400).json({ message: 'User not subscribed to notifications' });
    }
    
    const payload = {
      title: '🎯 בדיקת התראה',
      body: 'זו התראת בדיקה - ההתראות עובדות מצוין!',
      icon: '/logo192.png',
      badge: '/logo192.png'
    };
    
    const sent = await sendNotification(user.pushSettings.subscription, payload);
    
    if (sent) {
      res.json({ message: 'Test notification sent' });
    } else {
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  } catch (error) {
    console.error('Error sending test:', error);
    res.status(500).json({ message: error.message });
  }
});

// Route לבדיקה ידנית (עבור cron)
router.get('/check', checkRoute);

module.exports = router;