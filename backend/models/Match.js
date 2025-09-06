const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema({
  weekId: { type: mongoose.Schema.Types.ObjectId, ref: 'Week', required: true },
  league: { type: String, enum: ['english', 'spanish', 'world'], required: true },
  team1: { type: String, required: true },
  team2: { type: String, required: true },
  date: { type: String, required: true }, // "01.09"
  time: { type: String, required: true }, // "17:00"
  result: {
    team1Goals: { type: Number },
    team2Goals: { type: Number }
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);