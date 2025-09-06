const mongoose = require('mongoose');
require('dotenv').config();

async function test() {
  console.log('Starting test...');
  
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB connected successfully');
    
    // Just test the connection
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Database collections:', collections.map(c => c.name));
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();