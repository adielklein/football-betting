const mongoose = require('mongoose');

const monthExclusionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: {
    type: Number,
    required: true,
    min: 1,
    max: 12
  },
  season: {
    type: String,
    required: true
  },
  excludedAt: {
    type: Date,
    default: Date.now
  }
});

monthExclusionSchema.index({ userId: 1, month: 1, season: 1 }, { unique: true });
monthExclusionSchema.index({ month: 1, season: 1 });

module.exports = mongoose.model('MonthExclusion', monthExclusionSchema);
