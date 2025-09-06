const mongoose = require('mongoose');

const betSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required: true },
  weekId: { type: mongoose.Schema.Types.ObjectId, ref: 'Week', required: true },
  prediction: {
    team1Goals: { type: Number, required: true, min: 0, max: 20 },
    team2Goals: { type: Number, required: true, min: 0, max: 20 }
  },
  points: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Prevent duplicate bets for same user/match
betSchema.index({ userId: 1, matchId: 1 }, { unique: true });

module.exports = mongoose.model('Bet', betSchema);