const mongoose = require('mongoose');
const User = require('./src/models/user.model');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Connection URI
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ras_monitoring';

async function resetPasswords() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find the admin user
    const adminUser = await User.findOne({ email: 'admin@example.com' });
    if (adminUser) {
      console.log('Found admin user, resetting password...');
      adminUser.password = 'admin123'; // The model will hash this
      await adminUser.save();
      console.log('Admin password reset successfully');
    } else {
      console.log('Admin user not found');
    }
    
    // Find the demo user
    const demoUser = await User.findOne({ email: 'demo@example.com' });
    if (demoUser) {
      console.log('Found demo user, resetting password...');
      demoUser.password = 'demo123'; // The model will hash this
      await demoUser.save();
      console.log('Demo password reset successfully');
    } else {
      console.log('Demo user not found');
    }

    // Disconnect from MongoDB
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the reset
resetPasswords(); 