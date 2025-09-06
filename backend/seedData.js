const mongoose = require('mongoose');
const User = require('./models/User');
const Week = require('./models/Week');
require('dotenv').config();

async function seedData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    console.log('Clearing existing data...');
    await User.deleteMany({});
    await Week.deleteMany({});
    
    console.log('Creating users...');
    const users = await User.insertMany([
      { name: 'Ediel Klein', email: 'ediel@example.com', role: 'admin' },
      { name: 'Guy Yariv', email: 'guy@example.com', role: 'player' },
      { name: 'Daniel Cohen', email: 'daniel@example.com', role: 'player' }
    ]);
    
    console.log('Creating week...');
    const week1 = await Week.create({
      name: 'Week 1',
      month: 1,
      active: false,
      locked: false
    });
    
    console.log(`SUCCESS: Created ${users.length} users and 1 week`);
    process.exit(0);
  } catch (error) {
    console.error('ERROR:', error);
    process.exit(1);
  }
}

seedData();