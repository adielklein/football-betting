const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

console.log('Starting simple server...');

// Basic routes only
app.get('/', (req, res) => {
  res.json({ message: 'Simple server working!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'Test endpoint working!' });
});

app.get('/api/setup', async (req, res) => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const User = require('./models/User');
    await User.deleteMany({});
    
    const users = await User.insertMany([
      { name: 'Test User', email: 'test@example.com', role: 'admin' }
    ]);
    
    res.json({ message: 'Setup complete', users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Simple server running on port ${PORT}`);
});