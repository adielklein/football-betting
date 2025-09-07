const express = require('express');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const router = express.Router();

// מאחסן קודים זמניים (במציאות צריך Redis או DB)
const tempCodes = new Map();

// פונקציה לייצור קוד רנדומלי
function generateCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// Google OAuth Strategy עם אדמין אוטומטי (הישן - נשאר לתאימות)
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: "/api/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
  try {
    console.log('Google profile:', profile.displayName, profile.emails[0].value);
    
    const email = profile.emails[0].value;
    
    // רשימת אדמינים - הוסף כאן אימיילים נוספים לפי הצורך
    const adminEmails = ['adielklein@gmail.com'];
    const isAdmin = adminEmails.includes(email);
    
    // Search for existing user
    let user = await User.findOne({ email });
    
    if (!user) {
      // Create new user
      user = new User({
        name: profile.displayName,
        email: email,
        role: isAdmin ? 'admin' : 'player'
      });
      await user.save();
      console.log(`New ${isAdmin ? 'ADMIN' : 'player'} created:`, user.name);
    } else {
      // אם המשתמש קיים אבל צריך להיות אדמין
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
        console.log(`Updated ${user.name} to ADMIN`);
      }
      console.log('Existing user logged in:', user.name, `(${user.role})`);
    }
    
    return done(null, user);
  } catch (error) {
    console.error('OAuth error:', error);
    return done(error, null);
  }
}));

// Passport serialization
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// ========== התחברות חדשה עם אימייל וקוד ==========

// בקשת קוד התחברות
router.post('/request-login', async (req, res) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      return res.status(400).json({ message: 'אימייל ושם נדרשים' });
    }

    console.log('בקשת קוד עבור:', email, name);

    // בדוק אם זה אדמין
    const adminEmails = ['adielklein@gmail.com'];
    const isAdmin = adminEmails.includes(email);

    // חפש או צור משתמש
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        name,
        email,
        role: isAdmin ? 'admin' : 'player'
      });
      await user.save();
      console.log(`משתמש חדש נוצר: ${name} (${user.role})`);
    } else {
      // עדכן שם אם השתנה
      if (user.name !== name) {
        user.name = name;
        await user.save();
      }
      
      // עדכן לאדמין אם צריך
      if (isAdmin && user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
        console.log(`${name} עודכן לאדמין`);
      }
    }

    // צור קוד
    const code = generateCode();
    const expiry = Date.now() + 10 * 60 * 1000; // תוקף של 10 דקות
    
    tempCodes.set(email, {
      code,
      expiry,
      userId: user._id
    });

    console.log(`קוד נוצר עבור ${email}: ${code}`);

    // במציאות - שלח SMS או מייל. לבינתיים רק log
    console.log(`
    ==========================================
    📧 קוד התחברות עבור ${name}:
    📞 ${code}
    ⏰ תוקף: 10 דקות
    ==========================================
    `);

    res.json({ 
      message: 'קוד נשלח בהצלחה',
      email,
      // לבדיקה - בפרודקשן אל תחזיר את הקוד!
      debug_code: process.env.NODE_ENV === 'development' ? code : undefined
    });

  } catch (error) {
    console.error('שגיאה בבקשת קוד:', error);
    res.status(500).json({ message: 'שגיאה פנימית' });
  }
});

// אימות קוד והתחברות
router.post('/verify-login', async (req, res) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({ message: 'אימייל וקוד נדרשים' });
    }

    console.log('אימות קוד עבור:', email, 'קוד:', code);

    // בדוק אם יש קוד
    const storedData = tempCodes.get(email);
    if (!storedData) {
      return res.status(400).json({ message: 'לא נמצא קוד עבור אימייל זה' });
    }

    // בדוק תוקף
    if (Date.now() > storedData.expiry) {
      tempCodes.delete(email);
      return res.status(400).json({ message: 'הקוד פג תוקף' });
    }

    // בדוק קוד
    if (storedData.code !== code) {
      return res.status(400).json({ message: 'קוד שגוי' });
    }

    // קוד תקין - מחק אותו ואמת משתמש
    tempCodes.delete(email);
    
    const user = await User.findById(storedData.userId);
    if (!user) {
      return res.status(404).json({ message: 'משתמש לא נמצא' });
    }

    console.log(`התחברות מוצלחת: ${user.name} (${user.role})`);

    res.json({
      message: 'התחברות מוצלחת',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('שגיאה באימות קוד:', error);
    res.status(500).json({ message: 'שגיאה פנימית' });
  }
});

// ========== Routes ישנים (נשארים לתאימות) ==========

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login-failed' }),
  (req, res) => {
    // Success - redirect back to Frontend - עדכון לproduction
    const userData = encodeURIComponent(JSON.stringify({
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role
    }));
    
    res.redirect(`https://football-betting-app.onrender.com?login=success&user=${userData}`);
  }
);

// Logout
router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ message: 'Logout failed' });
    res.json({ message: 'Logged out successfully' });
  });
});

// Get current user
router.get('/me', (req, res) => {
  if (req.user) {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

// Get all users
router.get('/users', async (req, res) => {
  try {
    console.log('Getting all users...');
    const users = await User.find().select('name email role');
    console.log('Found users:', users.length);
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: error.message });
  }
});

// Legacy login (for testing)
router.post('/login', async (req, res) => {
  try {
    const { email } = req.body;
    let user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update user
router.patch('/users/:id', async (req, res) => {
  try {
    console.log(`Updating user ${req.params.id}:`, req.body);
    const { name, email, role } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role },
      { new: true }
    ).select('name email role');
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('Updated user:', user);
    res.json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    console.log('Deleting user:', req.params.id);
    
    // Delete the user
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
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

// Add new user
router.post('/register', async (req, res) => {
  try {
    console.log('Registering new user:', req.body);
    const { name, email, role = 'player' } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }
    
    const user = new User({ name, email, role });
    await user.save();
    
    console.log('User registered successfully:', user);
    res.status(201).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;