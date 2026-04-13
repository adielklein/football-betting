const AuditLog = require('../models/AuditLog');
const User = require('../models/User');
const { sendNotificationToUsers } = require('./pushNotifications');

// ID של האדמין הראשי שמקבל התראות
const PRIMARY_ADMIN_USERNAME = 'adielklein';

/**
 * תיעוד פעולת אדמין + שליחת התראה לאדמין הראשי אם מישהו אחר ביצע
 */
async function logAdminAction(adminId, action, details, metadata = {}) {
  try {
    // מצא את האדמין שביצע את הפעולה
    const admin = await User.findById(adminId);
    if (!admin) {
      console.log('⚠️ Audit: admin not found:', adminId);
      return;
    }

    // שמור לוג
    const log = await AuditLog.create({
      adminId,
      adminName: admin.name,
      action,
      details,
      metadata
    });

    console.log(`📋 Audit: ${admin.name} → ${action} | ${details}`);

    // אם זה לא האדמין הראשי - שלח התראה
    if (admin.username !== PRIMARY_ADMIN_USERNAME) {
      try {
        const primaryAdmin = await User.findOne({ username: PRIMARY_ADMIN_USERNAME });
        if (primaryAdmin) {
          const title = `🔔 ${admin.name} ביצע פעולה`;
          const body = `${action}\n${details}`;
          await sendNotificationToUsers([primaryAdmin._id], title, body, { type: 'audit' });
          console.log(`📨 Audit notification sent to ${PRIMARY_ADMIN_USERNAME}`);
        }
      } catch (notifyError) {
        console.error('Audit notification error (non-critical):', notifyError.message);
      }
    }

    return log;
  } catch (error) {
    console.error('Audit log error (non-critical):', error.message);
  }
}

module.exports = { logAdminAction };
