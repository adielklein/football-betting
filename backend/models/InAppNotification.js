const mongoose = require('mongoose');

const inAppNotificationSchema = new mongoose.Schema({
  title: { type: String, required: true },
  body: { type: String, required: true },
  imageUrl: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('InAppNotification', inAppNotificationSchema);
