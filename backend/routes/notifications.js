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

// 🔧 FIX: קבל סטטיסטיקות התראות - תיקון הבדיקה למערך!
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    
    // 🔧 FIX: בדיקה נכונה למערך subscriptions (לא ריק)
    const enabledUsers = await User.countDocuments({
      'pushSettings.enabled': true,
      'pushSettings.subscriptions.0': { $exists: true }  // ✅ לפחות מכשיר אחד במערך
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
        'pushSettings.subscriptions.0': { $exists: true }  // ✅ תיקון למערך
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
      // 🔧 FIX: בדיקה מדויקת למערך subscriptions
      isSubscribed: !!(
        user.pushSettings?.enabled && 
        user.pushSettings?.subscriptions && 
        user.pushSettings.subscriptions.length > 0
      ),
      hoursBeforeLock: user.pushSettings?.hoursBeforeLock || 2,
      // 🆕 מספר מכשירים רשומים
      devicesCount: user.pushSettings?.subscriptions?.length || 0
    }));
    
    res.json(formattedUsers);
  } catch (error) {
    console.error('Error getting all users:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔧 FIX: שמור subscription - הוסף למערך במקום לדרוס!
router.post('/subscribe', async (req, res) => {
  try {
    const { userId, subscription, hoursBeforeLock } = req.body;
    
    console.log(`📥 Saving subscription for user ${userId}`);
    console.log(`📥 Endpoint: ${subscription.endpoint?.substring(0, 50)}...`);
    
    // 🔧 FIX: מצא את המשתמש תחילה
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // 🔧 FIX: אתחל את המערך אם לא קיים
    if (!user.pushSettings.subscriptions) {
      user.pushSettings.subscriptions = [];
    }
    
    // 🔧 FIX: בדוק אם ה-endpoint כבר קיים (למנוע כפילויות)
    const existingIndex = user.pushSettings.subscriptions.findIndex(
      sub => sub.endpoint === subscription.endpoint
    );
    
    if (existingIndex !== -1) {
      // עדכן subscription קיים
      console.log(`🔄 Updating existing subscription at index ${existingIndex}`);
      user.pushSettings.subscriptions[existingIndex] = subscription;
    } else {
      // הוסף subscription חדש
      console.log(`➕ Adding new subscription (total will be ${user.pushSettings.subscriptions.length + 1})`);
      user.pushSettings.subscriptions.push(subscription);
    }
    
    // עדכן הגדרות
    user.pushSettings.enabled = true;
    user.pushSettings.hoursBeforeLock = hoursBeforeLock || 2;
    
    // שמור
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
      console.log(`✅ Test notification sent to ${user.name}`);
      res.json({ 
        message: 'Subscription saved successfully',
        devicesCount: user.pushSettings.subscriptions.length
      });
    } else {
      console.log(`❌ Failed to send test notification to ${user.name}`);
      res.status(500).json({ message: 'Failed to send test notification' });
    }
  } catch (error) {
    console.error('Error saving subscription:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔧 FIX: בטל subscription - הסר רק מכשיר זה!
router.post('/unsubscribe', async (req, res) => {
  try {
    const { userId, endpoint } = req.body;
    
    console.log(`📕 Unsubscribing user ${userId}`);
    console.log(`📕 Endpoint: ${endpoint?.substring(0, 50)}...`);
    
    if (!endpoint) {
      // אם אין endpoint, הסר את כל המכשירים
      console.log(`⚠️ No endpoint provided - removing all subscriptions`);
      const user = await User.findByIdAndUpdate(userId, {
        'pushSettings.enabled': false,
        'pushSettings.subscriptions': []
      }, { new: true });
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      console.log(`✅ All subscriptions removed for ${user.name}`);
      return res.json({ message: 'Unsubscribed successfully' });
    }
    
    // 🔧 FIX: הסר רק את המכשיר הספציפי מהמערך
    const user = await User.findByIdAndUpdate(
      userId,
      { 
        $pull: { 
          'pushSettings.subscriptions': { endpoint: endpoint }
        }
      },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // אם לא נשארו מכשירים, כבה את enabled
    if (!user.pushSettings.subscriptions || user.pushSettings.subscriptions.length === 0) {
      user.pushSettings.enabled = false;
      await user.save();
      console.log(`✅ Last device removed - disabled notifications for ${user.name}`);
    } else {
      console.log(`✅ Device removed - ${user.pushSettings.subscriptions.length} devices remaining for ${user.name}`);
    }
    
    res.json({ 
      message: 'Unsubscribed successfully',
      devicesRemaining: user.pushSettings.subscriptions.length
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
    if (!user || !user.pushSettings.enabled || !user.pushSettings.subscriptions || user.pushSettings.subscriptions.length === 0) {
      return res.status(400).json({ message: 'User not subscribed to notifications' });
    }
    
    const payload = {
      title: '🎯 בדיקת התראה',
      body: 'זו התראת בדיקה - ההתראות עובדות מצוין!',
      icon: '/logo192.png',
      badge: '/logo192.png'
    };
    
    // 🔧 FIX: שלח לכל המכשירים של המשתמש
    let sent = 0;
    let failed = 0;
    
    for (const subscription of user.pushSettings.subscriptions) {
      const success = await sendNotification(subscription, payload);
      if (success) {
        sent++;
      } else {
        failed++;
      }
    }
    
    console.log(`📊 Test sent to ${user.name}: ${sent} succeeded, ${failed} failed out of ${user.pushSettings.subscriptions.length} devices`);
    
    if (sent > 0) {
      res.json({ 
        message: `Test notification sent to ${sent} device(s)`,
        sent,
        failed,
        total: user.pushSettings.subscriptions.length
      });
    } else {
      res.status(500).json({ message: 'Failed to send test notification to any device' });
    }
  } catch (error) {
    console.error('Error sending test:', error);
    res.status(500).json({ message: error.message });
  }
});

// Route לבדיקה ידנית (עבור cron)
router.get('/check', checkRoute);

module.exports = router;