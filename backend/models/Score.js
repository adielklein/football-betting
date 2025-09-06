const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  weekId: { type: mongoose.Schema.Types.ObjectId, ref: 'Week', required: true },
  weeklyScore: { type: Number, default: 0 },
  monthlyScore: { type: Number, default: 0 },
  totalScore: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now }
});

// Prevent duplicate scores for same user/week
scoreSchema.index({ userId: 1, weekId: 1 }, { unique: true });

module.exports = mongoose.model('Score', scoreSchema);