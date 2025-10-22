const webpush = require('web-push');
const cron = require('node-cron');
const User = require('../models/User');
const Week = require('../models/Week');

// הגדר VAPID keys מה-env
const vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// בדוק שהמפתחות קיימים
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.error('❌ חסרים VAPID keys ב-environment variables!');
  console.error('הוסף את המפתחות ב-Render Dashboard > Environment');
} else {
  // הגדר את webpush
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'admin@football-betting.com'}`,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log('✅ Push Notifications service initialized');
}

// פונקציה לשליחת התראה
const sendNotification = async (subscription, payload) => {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload));
    console.log('✅ התראה נשלחה בהצלחה');
    return true;
  } catch (error) {
    console.error('❌ שגיאה בשליחת התראה:', error);
    return false;
  }
};

// בדיקת שבועות שעומדים להינעל
const checkUpcomingLocks = async () => {
  try {
    console.log('🔍 בודק שבועות לנעילה...');
    
    const activeWeeks = await Week.find({ 
      active: true, 
      locked: false,
      lockTime: { $exists: true }
    });
    
    console.log(`מצאתי ${activeWeeks.length} שבועות פעילים`);
    
    for (const week of activeWeeks) {
      const lockTime = new Date(week.lockTime);
      const now = new Date();
      const timeUntilLock = lockTime - now;
      const hoursUntilLock = timeUntilLock / (1000 * 60 * 60);
      
      console.log(`שבוע ${week.name} יינעל בעוד ${hoursUntilLock.toFixed(2)} שעות`);
      
      // אם נשאר פחות מ-24 שעות
      if (hoursUntilLock <= 24 && hoursUntilLock > 0) {
        // מצא משתמשים שרוצים התראות
        const users = await User.find({ 
          'pushSettings.enabled': true,
          'pushSettings.subscription': { $exists: true }
        });
        
        console.log(`נמצאו ${users.length} משתמשים עם התראות פעילות`);
        
        for (const user of users) {
          const notificationTime = user.pushSettings.hoursBeforeLock || 2;
          
          // שלח התראה אם הזמן מתאים (בטווח של 30 דקות)
          if (hoursUntilLock <= notificationTime && hoursUntilLock > notificationTime - 0.5) {
            console.log(`📨 שולח התראה ל-${user.name}`);
            
            const payload = {
              title: '⏰ תזכורת הימורים',
              body: `${week.name} יינעל בעוד ${Math.round(hoursUntilLock)} שעות!`,
              icon: '/logo192.png',
              badge: '/logo192.png',
              data: {
                weekId: week._id,
                url: '/'
              }
            };
            
            const sent = await sendNotification(user.pushSettings.subscription, payload);
            
            if (!sent) {
              // אם ההתראה נכשלה, כנראה ה-subscription לא תקף
              console.log(`🔄 מנקה subscription לא תקף עבור ${user.name}`);
              await User.findByIdAndUpdate(user._id, {
                'pushSettings.enabled': false,
                'pushSettings.subscription': null
              });
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in checkUpcomingLocks:', error);
  }
};

// הפעל בדיקה כל 30 דקות
cron.schedule('*/30 * * * *', () => {
  console.log('⏰ Running scheduled notification check...');
  checkUpcomingLocks();
});

// בדיקה ראשונית
checkUpcomingLocks();

// הוסף route לבדיקה ידנית (עבור Render)
const checkRoute = async (req, res) => {
  console.log('🔔 Manual check triggered');
  await checkUpcomingLocks();
  res.json({ message: 'Check completed', timestamp: new Date() });
};

module.exports = {
  webpush,
  sendNotification,
  checkUpcomingLocks,
  checkRoute,
  vapidKeys
};