const SensorThreshold = require('../models/sensorThreshold.model');
const { DEFAULT_THRESHOLDS } = require('./seedSensorThresholds');

/**
 * Gets the appropriate threshold for a sensor reading
 * @param {string} sensorType - Type of sensor
 * @param {string} deviceId - Device ID
 * @param {string} projectId - Project ID
 * @returns {Promise<Object>} Threshold object
 */
const getThreshold = async (sensorType, deviceId = null, projectId = null) => {
  let threshold;
  
  // Try to find device-specific threshold
  if (deviceId) {
    threshold = await SensorThreshold.findOne({ 
      sensorType, 
      device: deviceId 
    });
    
    if (threshold) return threshold;
  }
  
  // Try to find project-specific threshold
  if (projectId) {
    threshold = await SensorThreshold.findOne({ 
      sensorType, 
      project: projectId,
      device: null
    });
    
    if (threshold) return threshold;
  }
  
  // Try to find default threshold from database
  threshold = await SensorThreshold.findOne({ 
    sensorType, 
    isDefault: true,
    device: null,
    project: null
  });
  
  if (threshold) return threshold;
  
  // If no threshold found in database, use hardcoded defaults
  const defaultThreshold = DEFAULT_THRESHOLDS.find(t => t.sensorType === sensorType);
  
  if (defaultThreshold) {
    return defaultThreshold;
  }
  
  // Return a generic threshold if nothing else is found
  return {
    sensorType,
    idealMin: 0,
    idealMax: 100,
    warningMin: 0,
    warningMax: 100,
    criticalMin: 0,
    criticalMax: 100,
    unit: ''
  };
};

/**
 * Validates sensor data based on thresholds
 * @param {string} sensorType - Type of sensor
 * @param {number} value - Sensor reading value
 * @param {string} deviceId - Device ID (optional)
 * @param {string} projectId - Project ID (optional)
 * @returns {Promise<Object>} Validation result with alert status and message
 */
const validateSensorData = async (sensorType, value, deviceId = null, projectId = null) => {
  // Get the appropriate threshold
  const threshold = await getThreshold(sensorType, deviceId, projectId);
  
  let isAlert = false;
  let alertLevel = 'normal';
  let alertMessage = '';
  
  // Check if value is in critical range
  if (value <= threshold.criticalMin || value >= threshold.criticalMax) {
    isAlert = true;
    alertLevel = 'critical';
    
    if (value <= threshold.criticalMin) {
      alertMessage = `Critical low ${sensorType}: ${value} ${threshold.unit} (below ${threshold.criticalMin} ${threshold.unit})`;
    } else {
      alertMessage = `Critical high ${sensorType}: ${value} ${threshold.unit} (above ${threshold.criticalMax} ${threshold.unit})`;
    }
  }
  // Check if value is in warning range
  else if (value <= threshold.warningMin || value >= threshold.warningMax) {
    isAlert = true;
    alertLevel = 'warning';
    
    if (value <= threshold.warningMin) {
      alertMessage = `Warning low ${sensorType}: ${value} ${threshold.unit} (below ${threshold.warningMin} ${threshold.unit})`;
    } else {
      alertMessage = `Warning high ${sensorType}: ${value} ${threshold.unit} (above ${threshold.warningMax} ${threshold.unit})`;
    }
  }

  return {
    isAlert,
    alertLevel,
    unit: threshold.unit,
    alertMessage
  };
};

/**
 * Generates mock sensor data for a device
 * @param {Object} device - Device object
 * @returns {Promise<Array>} Array of mock sensor readings
 */
const generateMockSensorData = async (device) => {
  if (!device || !device.sensorTypes || !device.sensorTypes.length) {
    return [];
  }
  
  const mockData = [];
  const now = new Date();
  
  // Generate a reading for each sensor type
  for (const sensorType of device.sensorTypes) {
    // Base values with some randomization
    let value;
    
    switch(sensorType) {
      case 'temperature':
        value = 25 + (Math.random() * 10 - 5); // 20-30°C
        break;
      case 'pH':
        value = 7.5 + (Math.random() * 2 - 1); // 6.5-8.5
        break;
      case 'dissolvedOxygen':
        value = 7.5 + (Math.random() * 5 - 2.5); // 5-10 mg/L
        break;
      case 'conductivity':
        value = 1150 + (Math.random() * 1000 - 500); // 650-1650 μS/cm
        break;
      case 'turbidity':
        value = 10 + (Math.random() * 60 - 10); // 0-70 NTU
        break;
      case 'ammonia':
        value = Math.random() * 1.2; // 0-1.2 mg/L
        break;
      case 'nitrate':
        value = Math.random() * 60; // 0-60 mg/L
        break;
      case 'nitrite':
        value = Math.random() * 0.6; // 0-0.6 mg/L
        break;
      case 'waterLevel':
        value = 50 + (Math.random() * 60 - 30); // 20-80%
        break;
      case 'flowRate':
        value = 50 + (Math.random() * 60 - 30); // 20-80 L/min
        break;
      case 'orp':
        value = 325 + (Math.random() * 100 - 50); // 275-375 mV
        break;
      case 'tds':
        value = 600 + (Math.random() * 500 - 250); // 350-850 PPM
        break;
      default:
        value = Math.random() * 100;
    }
    
    // Round to 2 decimal places
    value = Math.round(value * 100) / 100;
    
    // Validate the data
    const { isAlert, alertLevel, unit, alertMessage } = await validateSensorData(
      sensorType, 
      value, 
      device._id, 
      device.project
    );
    
    mockData.push({
      sensorType,
      value,
      unit,
      timestamp: now,
      isAlert,
      alertLevel,
      alertMessage
    });
  }
  
  return mockData;
};

module.exports = {
  validateSensorData,
  generateMockSensorData
}; 