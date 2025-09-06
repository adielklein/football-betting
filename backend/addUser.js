const mongoose = require('mongoose');
const User = require('./models/User');
require('dotenv').config();

async function addUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully');
    
    // הוסף משתמש אחד לבדיקה
    const user = new User({
      name: 'Ediel Klein',
      email: 'ediel@example.com',
      role: 'admin'
    });
    
    await user.save();
    console.log('User created successfully:', user);
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating user:', error);
    process.exit(1);
  }
}

addUser();