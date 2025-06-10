const seedDefaultThresholds = require('../seed/defaultThresholds');

/**
 * Seeds sensor thresholds
 */
const seedSensorThresholds = async () => {
  try {
    console.log('Seeding sensor thresholds...');
    await seedDefaultThresholds();
    console.log('Sensor threshold seeding completed!');
  } catch (error) {
    console.error('Error seeding sensor thresholds:', error);
  }
};

module.exports = { seedSensorThresholds }; 