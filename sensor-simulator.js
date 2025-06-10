/**
 * Sensor Data Simulator for RAS Monitoring System
 * 
 * This script simulates sensor data from RAS devices and sends it to the API.
 * It uses API keys for authentication and can run continuously to generate
 * realistic sensor data with random variations.
 * 
 * Usage:
 * 1. Set the configuration variables below
 * 2. Run with: node sensor-simulator.js
 */

const axios = require('axios');

// Configuration
const API_URL = 'http://localhost:5001/api/sensor-data';
const API_KEY = 'bcd2abd4492b23fc079f83880e367a84f6d77998bd6996df81244c75e7eb14e7'; // Replace with your actual project API key
const DEVICE_ID = 'IUB002'; // Device with all 7 supported sensors
const INTERVAL_MS = 5000; // 5 seconds between data points

// Sensor configurations with realistic base values and variation ranges
const SENSORS = {
  temperature: { 
    base: 26.0,  // Center in the ideal range (24-28°C)
    variation: 8.0,  // Large variation to hit all ranges: ±8°C gives range of 18-34°C
    unit: '°C' 
  },
  pH: { base: 7.2, variation: 0.3, unit: 'pH' },
  dissolvedOxygen: { base: 6.5, variation: 0.5, unit: 'mg/L' },
  conductivity: { base: 320, variation: 30, unit: 'μS/cm' },
  turbidity: { base: 5, variation: 2, unit: 'NTU' },
  orp: { base: 200, variation: 20, unit: 'mV' },
  tds: { base: 250, variation: 25, unit: 'PPM' },
};

// Helper function to generate a random value within the variation range
function generateSensorValue(base, variation) {
  return base + (Math.random() * 2 - 1) * variation;
}

// Function to generate a set of sensor readings
function generateReadings() {
  const readings = [];
  
  // Send all 7 sensor readings at once
  for (const [sensorType, config] of Object.entries(SENSORS)) {
    const value = generateSensorValue(config.base, config.variation);
    readings.push({
      sensorType,
      value: parseFloat(value.toFixed(2)),
      timestamp: new Date().toISOString()
    });
  }
  
  return readings;
}

// Function to send data to the API
async function sendData() {
  const readings = generateReadings();
  
  try {
    const response = await axios.post(API_URL, {
      deviceId: DEVICE_ID,
      readings
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY
      }
    });
    
    console.log(`[${new Date().toLocaleTimeString()}] Data sent successfully:`, 
      response.data.success ? 'OK' : 'Error',
      `(${response.data.count} readings)`
    );
    
    // Log individual readings
    readings.forEach(reading => {
      console.log(`  - ${reading.sensorType}: ${reading.value} ${SENSORS[reading.sensorType].unit}`);
    });
    
  } catch (error) {
    console.error(`[${new Date().toLocaleTimeString()}] Error sending data:`, 
      error.response ? error.response.data : error.message);
  }
}

// Main function to run the simulator
function startSimulator() {
  console.log('RAS Sensor Data Simulator');
  console.log('------------------------');
  console.log(`API URL: ${API_URL}`);
  console.log(`Device ID: ${DEVICE_ID}`);
  console.log(`Interval: ${INTERVAL_MS}ms`);
  console.log('------------------------');
  console.log('Press Ctrl+C to stop the simulator');
  console.log('------------------------');
  
  // Send initial data
  sendData();
  
  // Set interval for continuous data sending
  setInterval(sendData, INTERVAL_MS);
}

// Start the simulator
startSimulator(); 