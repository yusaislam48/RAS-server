const express = require('express');
const router = express.Router();
const SensorThreshold = require('../models/sensorThreshold.model');
const { protect, authorize } = require('../middlewares/auth');

/**
 * @route   GET /api/thresholds
 * @desc    Get all sensor thresholds (global defaults)
 * @access  Private (Admin, ProjectAdmin, User)
 */
router.get('/', protect, async (req, res) => {
  try {
    const thresholds = await SensorThreshold.find({ 
      isDefault: true,
      device: null,
      project: null
    });
    
    res.json(thresholds);
  } catch (error) {
    console.error('Error fetching thresholds:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/thresholds/project/:projectId
 * @desc    Get all sensor thresholds for a specific project
 * @access  Private (Admin, ProjectAdmin, User with access)
 */
router.get('/project/:projectId', protect, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Get project-specific thresholds
    const projectThresholds = await SensorThreshold.find({ 
      project: projectId,
      device: null
    });
    
    // Get global defaults for any missing sensor types
    const defaultThresholds = await SensorThreshold.find({ 
      isDefault: true,
      device: null,
      project: null
    });
    
    // Combine project thresholds with defaults
    const combinedThresholds = [...projectThresholds];
    
    // Add default thresholds that don't have project overrides
    const projectSensorTypes = projectThresholds.map(t => t.sensorType);
    
    defaultThresholds.forEach(defaultThreshold => {
      if (!projectSensorTypes.includes(defaultThreshold.sensorType)) {
        combinedThresholds.push(defaultThreshold);
      }
    });
    
    res.json(combinedThresholds);
  } catch (error) {
    console.error('Error fetching project thresholds:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/thresholds/device/:deviceId
 * @desc    Get all sensor thresholds for a specific device
 * @access  Private (Admin, ProjectAdmin, User with access)
 */
router.get('/device/:deviceId', protect, async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    // Get device-specific thresholds
    const deviceThresholds = await SensorThreshold.find({ 
      device: deviceId 
    });
    
    // Get global defaults for any missing sensor types
    const defaultThresholds = await SensorThreshold.find({ 
      isDefault: true,
      device: null,
      project: null
    });
    
    // Combine device thresholds with defaults
    const combinedThresholds = [...deviceThresholds];
    
    // Add default thresholds that don't have device overrides
    const deviceSensorTypes = deviceThresholds.map(t => t.sensorType);
    
    defaultThresholds.forEach(defaultThreshold => {
      if (!deviceSensorTypes.includes(defaultThreshold.sensorType)) {
        combinedThresholds.push(defaultThreshold);
      }
    });
    
    res.json(combinedThresholds);
  } catch (error) {
    console.error('Error fetching device thresholds:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/thresholds
 * @desc    Create or update a global default threshold
 * @access  Private (SuperAdmin only)
 */
router.post('/', protect, authorize('superadmin'), async (req, res) => {
  try {
    const {
      sensorType,
      idealMin,
      idealMax,
      warningMin,
      warningMax,
      criticalMin,
      criticalMax,
      unit
    } = req.body;
    
    // Validate required fields
    if (!sensorType || 
        idealMin === undefined || 
        idealMax === undefined || 
        warningMin === undefined || 
        warningMax === undefined || 
        criticalMin === undefined || 
        criticalMax === undefined || 
        !unit) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if threshold already exists
    let threshold = await SensorThreshold.findOne({ 
      sensorType, 
      isDefault: true,
      device: null,
      project: null
    });
    
    if (threshold) {
      // Update existing threshold
      threshold.idealMin = idealMin;
      threshold.idealMax = idealMax;
      threshold.warningMin = warningMin;
      threshold.warningMax = warningMax;
      threshold.criticalMin = criticalMin;
      threshold.criticalMax = criticalMax;
      threshold.unit = unit;
      
      await threshold.save();
      res.json(threshold);
    } else {
      // Create new threshold
      threshold = await SensorThreshold.create({
        sensorType,
        idealMin,
        idealMax,
        warningMin,
        warningMax,
        criticalMin,
        criticalMax,
        unit,
        isDefault: true
      });
      
      res.status(201).json(threshold);
    }
  } catch (error) {
    console.error('Error creating/updating threshold:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/thresholds/project/:projectId
 * @desc    Create or update a project-specific threshold
 * @access  Private (Admin, ProjectAdmin)
 */
router.post('/project/:projectId', protect, authorize('superadmin', 'admin', 'projectadmin'), async (req, res) => {
  try {
    const { projectId } = req.params;
    const {
      sensorType,
      idealMin,
      idealMax,
      warningMin,
      warningMax,
      criticalMin,
      criticalMax,
      unit
    } = req.body;
    
    // Validate required fields
    if (!sensorType || 
        idealMin === undefined || 
        idealMax === undefined || 
        warningMin === undefined || 
        warningMax === undefined || 
        criticalMin === undefined || 
        criticalMax === undefined || 
        !unit) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if threshold already exists
    let threshold = await SensorThreshold.findOne({ 
      sensorType, 
      project: projectId,
      device: null
    });
    
    if (threshold) {
      // Update existing threshold
      threshold.idealMin = idealMin;
      threshold.idealMax = idealMax;
      threshold.warningMin = warningMin;
      threshold.warningMax = warningMax;
      threshold.criticalMin = criticalMin;
      threshold.criticalMax = criticalMax;
      threshold.unit = unit;
      
      await threshold.save();
      res.json(threshold);
    } else {
      // Create new threshold
      threshold = await SensorThreshold.create({
        sensorType,
        project: projectId,
        idealMin,
        idealMax,
        warningMin,
        warningMax,
        criticalMin,
        criticalMax,
        unit
      });
      
      res.status(201).json(threshold);
    }
  } catch (error) {
    console.error('Error creating/updating project threshold:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/thresholds/device/:deviceId
 * @desc    Create or update a device-specific threshold
 * @access  Private (Admin, ProjectAdmin)
 */
router.post('/device/:deviceId', protect, authorize('superadmin', 'admin', 'projectadmin'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const {
      sensorType,
      idealMin,
      idealMax,
      warningMin,
      warningMax,
      criticalMin,
      criticalMax,
      unit,
      projectId
    } = req.body;
    
    // Validate required fields
    if (!sensorType || 
        idealMin === undefined || 
        idealMax === undefined || 
        warningMin === undefined || 
        warningMax === undefined || 
        criticalMin === undefined || 
        criticalMax === undefined || 
        !unit ||
        !projectId) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Check if threshold already exists
    let threshold = await SensorThreshold.findOne({ 
      sensorType, 
      device: deviceId
    });
    
    if (threshold) {
      // Update existing threshold
      threshold.idealMin = idealMin;
      threshold.idealMax = idealMax;
      threshold.warningMin = warningMin;
      threshold.warningMax = warningMax;
      threshold.criticalMin = criticalMin;
      threshold.criticalMax = criticalMax;
      threshold.unit = unit;
      
      await threshold.save();
      res.json(threshold);
    } else {
      // Create new threshold
      threshold = await SensorThreshold.create({
        sensorType,
        device: deviceId,
        project: projectId,
        idealMin,
        idealMax,
        warningMin,
        warningMax,
        criticalMin,
        criticalMax,
        unit
      });
      
      res.status(201).json(threshold);
    }
  } catch (error) {
    console.error('Error creating/updating device threshold:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/thresholds/:id
 * @desc    Delete a threshold
 * @access  Private (SuperAdmin for global, Admin/ProjectAdmin for project/device)
 */
router.delete('/:id', protect, authorize('superadmin', 'admin', 'projectadmin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const threshold = await SensorThreshold.findById(id);
    
    if (!threshold) {
      return res.status(404).json({ message: 'Threshold not found' });
    }
    
    // Only superadmin can delete global defaults
    if (threshold.isDefault && req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Not authorized to delete global defaults' });
    }
    
    await SensorThreshold.deleteOne({ _id: threshold._id });
    
    res.json({ message: 'Threshold deleted successfully' });
  } catch (error) {
    console.error('Error deleting threshold:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router; 