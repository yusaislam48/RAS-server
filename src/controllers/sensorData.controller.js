const SensorData = require('../models/sensorData.model');
const Device = require('../models/device.model');
const Project = require('../models/project.model');
const AuditLog = require('../models/auditLog.model');
const { validateSensorData } = require('../utils/sensorDataUtils');

/**
 * @desc    Submit sensor data from a device
 * @route   POST /api/sensor-data
 * @access  Private/APIKey
 */
const submitSensorData = async (req, res) => {
  try {
    const { deviceId, readings } = req.body;
    const project = req.project; // Set by apiKeyAuth middleware

    // Check if device exists and belongs to the project
    const device = await Device.findOne({ 
      deviceId, 
      project: project._id 
    });

    if (!device) {
      res.status(404);
      throw new Error('Device not found or not associated with this project');
    }

    // Update device last seen
    device.lastSeen = new Date();
    device.status = 'online';
    await device.save();

    // Process readings
    const processedReadings = [];
    for (const reading of readings) {
      // Validate sensor type
      if (!device.sensorTypes.includes(reading.sensorType)) {
        continue; // Skip readings for sensor types not registered for this device
      }

      // Validate sensor data based on thresholds
      const { isAlert, alertLevel, unit, alertMessage } = await validateSensorData(
        reading.sensorType, 
        reading.value,
        device._id,
        project._id
      );

      // Create sensor data record
      const sensorData = await SensorData.create({
        device: device._id,
        project: project._id,
        timestamp: reading.timestamp || new Date(),
        sensorType: reading.sensorType,
        value: reading.value,
        unit,
        isAlert,
        alertLevel,
        alertMessage
      });

      processedReadings.push(sensorData);

      // Always emit a WebSocket event for real-time updates
      if (req.app.get('io')) {
        const io = req.app.get('io');
        io.to(project._id.toString()).emit('new-sensor-data', sensorData);
        console.log(`Emitted sensor data to project ${project._id}: ${reading.sensorType}, value: ${reading.value}`);
      }
    }

    res.status(201).json({
      success: true,
      count: processedReadings.length,
      data: processedReadings
    });
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

/**
 * @desc    Get sensor data for a project or device (with filtering)
 * @route   GET /api/sensor-data
 * @access  Private
 */
const getSensorData = async (req, res) => {
  try {
    const { 
      deviceId, 
      device, // Allow querying by device _id (from frontend) 
      projectId,
      sensorType, 
      startDate, 
      endDate, 
      limit = 100,
      page = 1,
      alertsOnly
    } = req.query;

    // Check user access to project if project specified
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404);
        throw new Error('Project not found');
      }

      const hasAccess = 
        req.user.role === 'superadmin' || 
        project.admin.equals(req.user._id) ||
        project.users.includes(req.user._id);

      if (!hasAccess) {
        res.status(403);
        throw new Error('Not authorized to access this project data');
      }
    }

    // Build query
    let query = {};

    // Filter by project or user's projects
    if (projectId) {
      query.project = projectId;
    } else {
      // If not super admin, only show data from user's projects
      if (req.user.role !== 'superadmin') {
        query.project = { $in: req.user.projects };
      }
    }

    // Filter by device if specified
    if (deviceId) {
      const deviceObj = await Device.findOne({ deviceId });
      if (deviceObj) {
        query.device = deviceObj._id;
      } else {
        // If device ID is invalid, return empty results
        return res.json({
          success: true,
          count: 0,
          data: []
        });
      }
    }
    
    // Handle direct device _id from frontend
    if (device) {
      query.device = device;
      console.log(`Querying sensor data for device: ${device}`);
    }

    // Filter by sensor type if specified
    if (sensorType) {
      query.sensorType = sensorType;
    }

    // Filter by date range if specified
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }

    // Filter alerts only if specified
    if (alertsOnly === 'true') {
      query.isAlert = true;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Execute query with pagination and sorting
    const sensorData = await SensorData.find(query)
      .populate('device', 'name deviceId')
      .populate('project', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const totalCount = await SensorData.countDocuments(query);

    // Log the data access
    await AuditLog.create({
      user: req.user._id,
      action: 'view',
      resourceType: 'sensorData',
      details: `Viewed sensor data (${sensorData.length} records)`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      count: sensorData.length,
      totalCount,
      pages: Math.ceil(totalCount / parseInt(limit)),
      currentPage: parseInt(page),
      data: sensorData
    });
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

/**
 * @desc    Get recent sensor data
 * @route   GET /api/sensor-data/recent
 * @access  Private
 */
const getRecentSensorData = async (req, res) => {
  try {
    const { projects, limit = 20 } = req.query;
    
    let projectFilter = {};
    
    // Filter by specific projects if provided
    if (projects) {
      const projectIds = projects.split(',');
      projectFilter = { project: { $in: projectIds } };
    } else if (req.user.role !== 'superadmin') {
      // If not super admin, only show data from user's projects
      projectFilter = { project: { $in: req.user.projects } };
    }
    
    // Find most recent data points for each device and sensor type
    const sensorData = await SensorData.find(projectFilter)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('device', 'name deviceId status')
      .populate('project', 'name');
    
    res.json(sensorData);
  } catch (error) {
    res.status(500);
    throw new Error('Server Error: ' + error.message);
  }
};

/**
 * @desc    Export sensor data as CSV
 * @route   GET /api/sensor-data/export
 * @access  Private
 */
const exportSensorData = async (req, res) => {
  try {
    const { projectId, deviceId, sensorType, startDate, endDate } = req.query;
    
    // Build query similar to getSensorData
    let query = {};
    
    // Filter by project
    if (projectId) {
      const project = await Project.findById(projectId);
      if (!project) {
        res.status(404);
        throw new Error('Project not found');
      }

      const hasAccess = 
        req.user.role === 'superadmin' || 
        project.admin.equals(req.user._id) ||
        project.users.includes(req.user._id);

      if (!hasAccess) {
        res.status(403);
        throw new Error('Not authorized to export this project data');
      }
      
      query.project = projectId;
    } else {
      // If not super admin, only show data from user's projects
      if (req.user.role !== 'superadmin') {
        query.project = { $in: req.user.projects };
      }
    }
    
    // Add other filters
    if (deviceId) {
      const device = await Device.findOne({ deviceId });
      if (device) {
        query.device = device._id;
      }
    }
    
    if (sensorType) {
      query.sensorType = sensorType;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        query.timestamp.$lte = new Date(endDate);
      }
    }
    
    // Get data for export
    const sensorData = await SensorData.find(query)
      .populate('device', 'name deviceId')
      .populate('project', 'name')
      .sort({ timestamp: -1 })
      .limit(10000); // Limit export size
    
    // Log the export
    await AuditLog.create({
      user: req.user._id,
      action: 'export',
      resourceType: 'sensorData',
      details: `Exported sensor data (${sensorData.length} records)`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    // Convert to CSV
    const csvHeader = 'Timestamp,Project,Device,DeviceID,SensorType,Value,Unit,Alert\n';
    const csvRows = sensorData.map(reading => {
      const timestamp = new Date(reading.timestamp).toISOString();
      const project = reading.project ? reading.project.name : 'Unknown';
      const device = reading.device ? reading.device.name : 'Unknown';
      const deviceId = reading.device ? reading.device.deviceId : 'Unknown';
      
      return `${timestamp},${project},${device},${deviceId},${reading.sensorType},${reading.value},${reading.unit},${reading.isAlert}`;
    });
    
    const csv = csvHeader + csvRows.join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=sensor_data_export_${Date.now()}.csv`);
    
    res.send(csv);
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

module.exports = {
  submitSensorData,
  getSensorData,
  getRecentSensorData,
  exportSensorData
}; 