const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendNotification, vapidKeys } = require('../services/pushNotifications');

// קבל את ה-public key
router.get('/vapid-public-key', (req, res) => {
  console.log('📤 Sending VAPID public key');
  res.json({ publicKey: vapidKeys.publicKey });
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
    
    console.log(`🔕 Unsubscribing user ${userId}`);
    
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
// הוסף route לבדיקה ידנית (עבור Render)
const { checkRoute } = require('../services/pushNotifications');
router.get('/check', checkRoute);
module.exports = router;