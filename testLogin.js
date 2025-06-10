const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ras_monitoring';

async function testLogin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    console.log('Admin user found:', adminUser ? 'Yes' : 'No');
    
    if (adminUser) {
      // Test password match
      const adminPasswordMatch = await adminUser.matchPassword('admin123');
      console.log('Admin password matches:', adminPasswordMatch);
    }

    // Find the demo user
    const demoUser = await User.findOne({ email: 'demo@example.com' });
    console.log('Demo user found:', demoUser ? 'Yes' : 'No');
    
    if (demoUser) {
      // Test password match
      const demoPasswordMatch = await demoUser.matchPassword('demo123');
      console.log('Demo password matches:', demoPasswordMatch);
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testLogin(); 