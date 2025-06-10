const mongoose = require('mongoose');
const Device = require('../models/device.model');

// MongoDB URI (same as in server.js)
const MONGO_URI = 'mongodb://localhost:27017/ras_monitoring';

// Connect to MongoDB
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  migrateDevices();
}).catch(err => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const VALID_SENSOR_TYPES = [
  'temperature',
  'pH',
  'dissolvedOxygen',
  'conductivity',
  'turbidity',
  'orp',
  'tds'
];

async function migrateDevices() {
  try {
    console.log('Starting device migration...');
    
    // Find all devices
    const devices = await Device.find({});
    console.log(`Found ${devices.length} devices to check`);
    
    let updatedCount = 0;
    
    // Update each device to remove invalid sensor types
    for (const device of devices) {
      console.log(`Processing device: ${device.name} (${device.deviceId})`);
      console.log(`  Original sensor types: ${device.sensorTypes.join(', ')}`);
      
      const originalCount = device.sensorTypes.length;
      device.sensorTypes = device.sensorTypes.filter(type => VALID_SENSOR_TYPES.includes(type));
      
      // Ensure the device has at least one sensor type
      if (device.sensorTypes.length === 0) {
        console.log('  No valid sensors left, adding temperature as default');
        device.sensorTypes.push('temperature');
      }
      
      console.log(`  Updated sensor types: ${device.sensorTypes.join(', ')}`);
      
      if (originalCount !== device.sensorTypes.length) {
        await device.save();
        updatedCount++;
        console.log('  Device updated successfully');
      } else {
        console.log('  No changes needed');
      }
    }
    
    console.log(`Migration complete. Updated ${updatedCount} devices.`);
    mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    mongoose.connection.close();
    process.exit(1);
  }
} 