const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  email: { type: String }, // הסרנו unique constraint
  role: { type: String, enum: ['admin', 'player'], default: 'player' },
  theme: { type: String, default: 'default' }, // 🆕 הוספת שדה theme
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);