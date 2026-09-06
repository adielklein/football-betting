const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { logAdminAction } = require('../services/auditService');
const { requireAdmin } = require('../middleware/requireAdmin');
const router = express.Router();

// אוטומטית צור אדמין בהפעלת השרת
const createDefaultAdmin = async () => {
  try {
    // בדוק אם יש כבר אדמין
    const existingAdmin = await User.findOne({ username: 'adielklein' });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }

    // הסיסמה מגיעה ממשתנה סביבה בלבד. קודם היא הייתה כתובה כאן בטקסט גלוי,
    // בריפו ציבורי, כך שכל מי שהגיע לקוד יכול היה להתחבר כמנהל.
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!defaultPassword) {
      console.log('ℹ️ DEFAULT_ADMIN_PASSWORD not set - skipping default admin creation');
      return;
    }

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);
    const adminUser = new User({
      name: 'עדיאל קליין',
      username: 'adielklein',
      password: hashedPassword,
      role: 'admin',
      theme: 'default'
    });

    await adminUser.save();
    console.log('🎉 Default admin user created: adielklein');
  } catch (error) {
    console.error('Error creating default admin:', error);
  }
};

// הרץ יצירת אדמין כשהמודול נטען
setTimeout(createDefaultAdmin, 2000);

// Login with username and password
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ message: 'שם משתמש וסיסמה נדרשים' });
    }

    console.log('Login attempt:', username);

    // Find user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: 'שם משתמש או סיסמה שגויים' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'שם משתמש או סיסמה שגויים' });
    }

    console.log(`התחברות מוצלחת: ${user.name} (${user.role}) - ערכת נושא: ${user.theme || 'default'}`);

    res.json({
      message: 'התחברות מוצלחת',
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        theme: user.theme || 'default'
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'שגיאה פנימית' });
  }
});

// Get all users (for admin)
router.get('/users', async (req, res) => {
  try {
    console.log('Getting all users...');
    // 🔧 FIX: הוסף pushSettings לתגובה!
    const users = await User.find().select('name username role theme pushSettings');
    console.log('Found users:', users.length);
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Add new user (admin only)
router.post('/users', requireAdmin, async (req, res) => {
  try {
    console.log('Creating new user:', req.body);
    const { name, username, password, role = 'player', theme = 'default', adminId } = req.body;
    
    if (!name || !username || !password) {
      return res.status(400).json({ message: 'שם, שם משתמש וסיסמה נדרשים' });
    }
    
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: 'שם משתמש כבר קיים' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = new User({ 
      name, 
      username, 
      password: hashedPassword,
      role,
      theme
    });
    await user.save();
    
    console.log('User created successfully:', user);

    // Audit log
    if (adminId) {
      logAdminAction(adminId, 'יצירת משתמש', `${name} (${username}, ${role})`, { userId: user._id });
    }

    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        role: user.role,
        theme: user.theme
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update user (admin only)
router.patch('/users/:id', requireAdmin, async (req, res) => {
  try {
    console.log(`Updating user ${req.params.id}:`, req.body);
    const { name, username, role, password, theme, adminId } = req.body;
    
    const updateData = { name, username, role };
    
    if (theme !== undefined) {
      updateData.theme = theme;
      console.log(`🎨 Updating theme to: ${theme}`);
    }
    
    // If password is provided, hash it
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('name username role theme pushSettings'); // 🔧 FIX: הוסף pushSettings
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Audit log
    if (adminId) {
      logAdminAction(adminId, 'עדכון משתמש', `${user.name} (${user.username})`, { userId: user._id });
    }

    console.log('Updated user:', user);
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete user (admin only)
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    console.log('Deleting user:', req.params.id);
    
    // Find user before deletion for audit
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Audit log before deletion
    const adminId = req.query.adminId;
    if (adminId) {
      logAdminAction(adminId, 'מחיקת משתמש', `${user.name} (${user.username})`, { userId: user._id });
    }

    await User.findByIdAndDelete(req.params.id);

    // Delete all user's bets
    await require('../models/Bet').deleteMany({ userId: req.params.id });
    // Delete all user's scores
    await require('../models/Score').deleteMany({ userId: req.params.id });
    
    console.log('User deleted successfully');
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Debug endpoint to check admin status
router.get('/check-admin', async (req, res) => {
  try {
    const admin = await User.findOne({ username: 'adielklein' });
    res.json({
      adminExists: !!admin,
      adminDetails: admin ? {
        name: admin.name,
        username: admin.username,
        role: admin.role,
        theme: admin.theme
      } : null,
      totalUsers: await User.countDocuments()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;