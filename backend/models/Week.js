const mongoose = require('mongoose');

const weekSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, 'Week name is required'],
    trim: true,
    minlength: [1, 'Week name cannot be empty'],
    maxlength: [100, 'Week name is too long']
  },
  month: { 
    type: Number, 
    required: [true, 'Month is required'],
    min: [1, 'Month must be at least 1'],
    max: [12, 'Month cannot be more than 12']
  },
  season: {
    type: String,
    required: [true, 'Season is required'],
    default: '2025-26',
    trim: true
  },
  active: { 
    type: Boolean, 
    default: false 
  },
  locked: { 
    type: Boolean, 
    default: false 
  },
  lockTime: { 
    type: Date 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Update updatedAt on save
weekSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Update updatedAt on findOneAndUpdate
weekSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

module.exports = mongoose.model('Week', weekSchema);