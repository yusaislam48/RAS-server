const mongoose = require('mongoose');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Device = require('../models/device.model');
const SensorData = require('../models/sensorData.model');
const { generateMockSensorData } = require('./sensorDataUtils');
const { seedSensorThresholds } = require('./seedSensorThresholds');

/**
 * Creates a default super admin user if none exists
 */
const createSuperAdmin = async () => {
  try {
    // Check if super admin exists
    const adminExists = await User.findOne({ role: 'superadmin' });
    
    if (!adminExists) {
      console.log('Creating super admin user...');
      
      // Create super admin - don't hash the password, the model will handle it
      await User.create({
        name: 'Super Admin',
        email: 'admin@example.com',
        password: 'admin123',
        role: 'superadmin'
      });
      
      console.log('Super admin created successfully!');
      console.log('Email: admin@example.com');
      console.log('Password: admin123');
    } else {
      console.log('Super admin already exists. Skipping creation.');
    }
  } catch (error) {
    console.error('Error creating super admin:', error);
  }
};

/**
 * Creates demo projects, devices, and sensor data
 */
const createDemoData = async () => {
  try {
    // Check if demo data exists
    const projectExists = await Project.findOne({ name: 'Demo Project' });
    
    if (!projectExists) {
      console.log('Creating demo data...');
      
      // Create a demo user with project admin role - don't hash the password, the model will handle it
      const demoUser = await User.create({
        name: 'Demo User',
        email: 'demo@example.com',
        password: 'demo123',
        role: 'projectadmin'
      });
      
      // Create a demo project
      const demoProject = await Project.create({
        name: 'Demo Project',
        description: 'A demonstration project with sample data',
        location: 'Demo Location',
        admin: demoUser._id,
        users: [demoUser._id]
      });
      
      // Update user with project reference
      demoUser.projects.push(demoProject._id);
      await demoUser.save();
      
      // Create demo devices
      const devices = [
        {
          name: 'RAS Unit 1',
          deviceId: 'RAS-001',
          project: demoProject._id,
          description: 'Main tank system',
          location: 'Section A',
          sensorTypes: ['temperature', 'pH', 'dissolvedOxygen', 'conductivity', 'ammonia'],
          status: 'online'
        },
        {
          name: 'RAS Unit 2',
          deviceId: 'RAS-002',
          project: demoProject._id,
          description: 'Secondary tank system',
          location: 'Section B',
          sensorTypes: ['temperature', 'pH', 'dissolvedOxygen', 'waterLevel', 'flowRate'],
          status: 'online'
        },
        {
          name: 'Water Treatment',
          deviceId: 'WT-001',
          project: demoProject._id,
          description: 'Water treatment system',
          location: 'Section C',
          sensorTypes: ['nitrate', 'nitrite', 'ammonia', 'conductivity'],
          status: 'maintenance'
        }
      ];
      
      // Save devices
      const createdDevices = [];
      for (const deviceData of devices) {
        const device = await Device.create(deviceData);
        createdDevices.push(device);
      }
      
      // Generate mock sensor data for each device
      for (const device of createdDevices) {
        // Generate data points for the last 7 days
        const today = new Date();
        
        for (let i = 0; i < 7; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          
          // Generate several readings per day
          for (let j = 0; j < 4; j++) {
            date.setHours(j * 6); // Data points every 6 hours
            
            const mockReadings = generateMockSensorData(device);
            
            for (const reading of mockReadings) {
              await SensorData.create({
                device: device._id,
                project: demoProject._id,
                timestamp: new Date(date),
                sensorType: reading.sensorType,
                value: reading.value,
                unit: reading.unit,
                isAlert: reading.isAlert,
                alertMessage: reading.alertMessage
              });
            }
          }
        }
      }
      
      console.log('Demo data created successfully!');
      console.log('Demo user email: demo@example.com');
      console.log('Demo user password: demo123');
    } else {
      console.log('Demo data already exists. Skipping creation.');
    }
  } catch (error) {
    console.error('Error creating demo data:', error);
  }
};

/**
 * Main seed function
 */
const seedDatabase = async () => {
  try {
    console.log('Seeding database...');
    await createSuperAdmin();
    await createDemoData();
    await seedSensorThresholds();
    console.log('Database seeding completed!');
  } catch (error) {
    console.error('Error seeding database:', error);
  }
};

module.exports = { seedDatabase }; 