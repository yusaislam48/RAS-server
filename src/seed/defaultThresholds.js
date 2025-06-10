const mongoose = require('mongoose');
const SensorThreshold = require('../models/sensorThreshold.model');

// Default threshold values for different sensor types
const defaultThresholds = [
  {
    sensorType: 'temperature',
    idealMin: 24,
    idealMax: 28,
    warningMin: 20,
    warningMax: 30,
    criticalMin: 18,
    criticalMax: 32,
    unit: '°C',
    isDefault: true
  },
  {
    sensorType: 'pH',
    idealMin: 7.0,
    idealMax: 8.0,
    warningMin: 6.5,
    warningMax: 8.5,
    criticalMin: 6.0,
    criticalMax: 9.0,
    unit: 'pH',
    isDefault: true
  },
  {
    sensorType: 'dissolvedOxygen',
    idealMin: 6.0,
    idealMax: 8.0,
    warningMin: 4.0,
    warningMax: 10.0,
    criticalMin: 3.0,
    criticalMax: 12.0,
    unit: 'mg/L',
    isDefault: true
  },
  {
    sensorType: 'conductivity',
    idealMin: 800,
    idealMax: 1500,
    warningMin: 500,
    warningMax: 2000,
    criticalMin: 300,
    criticalMax: 2500,
    unit: 'μS/cm',
    isDefault: true
  },
  {
    sensorType: 'turbidity',
    idealMin: 0,
    idealMax: 10,
    warningMin: 10,
    warningMax: 20,
    criticalMin: 0,
    criticalMax: 30,
    unit: 'NTU',
    isDefault: true
  },
  {
    sensorType: 'orp',
    idealMin: 150,
    idealMax: 250,
    warningMin: 100,
    warningMax: 300,
    criticalMin: 50,
    criticalMax: 350,
    unit: 'mV',
    isDefault: true
  },
  {
    sensorType: 'tds',
    idealMin: 100,
    idealMax: 300,
    warningMin: 50,
    warningMax: 500,
    criticalMin: 20,
    criticalMax: 700,
    unit: 'PPM',
    isDefault: true
  }
];

// Function to seed default thresholds
const seedDefaultThresholds = async () => {
  console.log('Checking for default thresholds...');
  
  try {
    // Get existing default thresholds
    const existingThresholds = await SensorThreshold.find({ 
      isDefault: true,
      device: null,
      project: null
    });
    
    const existingSensorTypes = existingThresholds.map(t => t.sensorType);
    
    // Create any missing default thresholds
    const missingThresholds = defaultThresholds.filter(
      dt => !existingSensorTypes.includes(dt.sensorType)
    );
    
    if (missingThresholds.length > 0) {
      console.log(`Creating ${missingThresholds.length} missing default thresholds...`);
      await SensorThreshold.insertMany(missingThresholds);
      console.log('Default thresholds created successfully!');
    } else {
      console.log('All default thresholds already exist!');
    }

    // Remove any sensor types that are not in our specified list
    const validSensorTypes = defaultThresholds.map(dt => dt.sensorType);
    const extraThresholds = existingThresholds.filter(
      et => !validSensorTypes.includes(et.sensorType) && et.isDefault === true
    );

    if (extraThresholds.length > 0) {
      console.log(`Removing ${extraThresholds.length} extra default thresholds...`);
      for (const threshold of extraThresholds) {
        await SensorThreshold.deleteOne({ _id: threshold._id });
      }
      console.log('Extra thresholds removed successfully!');
    }
  } catch (error) {
    console.error('Error seeding default thresholds:', error);
  }
};

module.exports = seedDefaultThresholds; 