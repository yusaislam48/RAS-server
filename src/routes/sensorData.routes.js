const express = require('express');
const router = express.Router();
const {
  submitSensorData,
  getSensorData,
  getRecentSensorData,
  exportSensorData
} = require('../controllers/sensorData.controller');
const { protect, apiKeyAuth } = require('../middlewares/auth');

// API key protected route for device data submission
router.post('/', apiKeyAuth, submitSensorData);

// User authenticated routes
router.get('/', protect, getSensorData);
router.get('/recent', protect, getRecentSensorData);
router.get('/export', protect, exportSensorData);

module.exports = router; 