const express = require('express');
const router = express.Router();
const {
  createDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice
} = require('../controllers/device.controller');
const { protect, restrictToAdmin } = require('../middlewares/auth');

// All device routes are protected
router.use(protect);

// Admin only routes
router.route('/')
  .post(restrictToAdmin, createDevice)
  .get(getDevices);

router.route('/:id')
  .get(getDeviceById)
  .put(restrictToAdmin, updateDevice)
  .delete(restrictToAdmin, deleteDevice);

module.exports = router; 