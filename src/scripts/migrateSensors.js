const mongoose = require('mongoose');
const dotenv = require('dotenv');
const SensorData = require('../models/sensorData.model');
const Device = require('../models/device.model');
const SensorThreshold = require('../models/sensorThreshold.model');

// Load environment variables
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
  migrateSensors();
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

async function migrateSensors() {
  try {
    console.log('Starting sensor migration...');
    
    // 1. Update devices - remove invalid sensor types
    console.log('Updating devices...');
    const devices = await Device.find({});
    let deviceUpdateCount = 0;
    
    for (const device of devices) {
      const oldSensorTypesCount = device.sensorTypes.length;
      device.sensorTypes = device.sensorTypes.filter(type => VALID_SENSOR_TYPES.includes(type));
      
      if (oldSensorTypesCount !== device.sensorTypes.length) {
        await device.save();
        deviceUpdateCount++;
      }
    }
    console.log(`Updated ${deviceUpdateCount} devices with invalid sensor types`);
    
    // 2. Remove sensor data with invalid sensor types
    console.log('Removing invalid sensor data...');
    const sensorDataResult = await SensorData.deleteMany({
      sensorType: { $nin: VALID_SENSOR_TYPES }
    });
    console.log(`Removed ${sensorDataResult.deletedCount} sensor data entries with invalid types`);
    
    // 3. Remove thresholds with invalid sensor types
    console.log('Removing invalid sensor thresholds...');
    const thresholdResult = await SensorThreshold.deleteMany({
      sensorType: { $nin: VALID_SENSOR_TYPES }
    });
    console.log(`Removed ${thresholdResult.deletedCount} threshold entries with invalid types`);
    
    console.log('Sensor migration completed successfully!');
    
    // Close MongoDB connection
    mongoose.connection.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    mongoose.connection.close();
    process.exit(1);
  }
} 