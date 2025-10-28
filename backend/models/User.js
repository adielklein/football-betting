const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'player'],
    default: 'player'
  },
  theme: {
    type: String,
    default: 'default'
  },
  pushSettings: {
    enabled: { 
      type: Boolean, 
      default: false 
    },
    // 🔧 תמיכה בשני המבנים:
    subscription: {  // ישן - למשתמשים שעדיין לא עברו migration
      type: Object 
    },
    subscriptions: [{  // חדש - תמיכה במספר מכשירים
      type: Object 
    }],
    hoursBeforeLock: { 
      type: Number, 
      default: 2 
    },
    soundEnabled: { 
      type: Boolean, 
      default: true 
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('User', userSchema);