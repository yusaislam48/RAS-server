const Device = require('../models/device.model');
const Project = require('../models/project.model');
const AuditLog = require('../models/auditLog.model');

/**
 * @desc    Create a new device
 * @route   POST /api/devices
 * @access  Private/Admin
 */
const createDevice = async (req, res) => {
  const { name, deviceId, project, description, location, sensorTypes } = req.body;

  try {
    console.log(`Creating device: ${name}, deviceId: ${deviceId}, project: ${project}`);
    console.log(`User role: ${req.user.role}, userId: ${req.user._id}`);
    
    // Check if project exists
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      res.status(404);
      throw new Error('Project not found');
    }
    
    console.log(`Project found: ${projectExists.name}`);

    // Super admins can add devices to any project
    // Project admins can only add devices to projects they administer
    const hasAccess = 
      req.user.role === 'superadmin' || 
      (req.user.role === 'projectadmin' && projectExists.admin.toString() === req.user._id.toString());
    
    console.log(`Has access: ${hasAccess}, Project admin: ${projectExists.admin}, User: ${req.user._id}`);

    if (!hasAccess) {
      res.status(403);
      throw new Error('Not authorized to add devices to this project');
    }

    // Check if device with this ID already exists
    const deviceExists = await Device.findOne({ deviceId });
    if (deviceExists) {
      res.status(400);
      throw new Error('Device with this ID already exists');
    }

    // Create device
    const device = await Device.create({
      name,
      deviceId,
      project,
      description,
      location,
      sensorTypes
    });

    // Log the action
    await AuditLog.create({
      user: req.user._id,
      action: 'create',
      resourceType: 'device',
      resourceId: device._id,
      details: `Created device "${device.name}" for project "${projectExists.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(device);
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

/**
 * @desc    Get all devices (filtered by projects if specified)
 * @route   GET /api/devices
 * @access  Private
 */
const getDevices = async (req, res) => {
  try {
    // Extract query parameters
    const { projects, projectSpecific } = req.query;
    let filter = {};
    
    // If projects are specified, filter by them
    if (projects) {
      const projectIds = projects.split(',');
      filter.project = { $in: projectIds };
    } else if (projectSpecific === 'true') {
      // For superadmin panel, when projectSpecific is true, show only devices from specified projects
      if (req.user.role === 'superadmin' && req.query.projectId) {
        filter.project = req.query.projectId;
      } else if (req.user.role !== 'superadmin') {
        // If not super admin, only show devices from user's projects
        filter.project = { $in: req.user.projects };
      }
    } else if (req.user.role !== 'superadmin') {
      // If not super admin, only show devices from user's projects
      filter.project = { $in: req.user.projects };
    }

    const devices = await Device.find(filter)
      .populate('project', 'name')
      .sort({ name: 1 });

    res.json(devices);
  } catch (error) {
    res.status(500);
    throw new Error('Server Error: ' + error.message);
  }
};

/**
 * @desc    Get device by ID
 * @route   GET /api/devices/:id
 * @access  Private
 */
const getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id)
      .populate('project', 'name');

    if (!device) {
      res.status(404);
      throw new Error('Device not found');
    }

    // Check if user has access to the project
    const project = await Project.findById(device.project._id);
    const hasAccess = 
      req.user.role === 'superadmin' || 
      project.admin.equals(req.user._id) ||
      project.users.includes(req.user._id);

    if (!hasAccess) {
      res.status(403);
      throw new Error('Not authorized to view this device');
    }

    // Log the view
    await AuditLog.create({
      user: req.user._id,
      action: 'view',
      resourceType: 'device',
      resourceId: device._id,
      details: `Viewed device "${device.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(device);
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

/**
 * @desc    Update device
 * @route   PUT /api/devices/:id
 * @access  Private/Admin
 */
const updateDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      res.status(404);
      throw new Error('Device not found');
    }

    // Check if user has access to the project
    const project = await Project.findById(device.project);
    const hasAccess = 
      req.user.role === 'superadmin' || 
      project.admin.equals(req.user._id);

    if (!hasAccess) {
      res.status(403);
      throw new Error('Not authorized to update this device');
    }

    // Update device
    const { name, description, location, sensorTypes, status } = req.body;
    
    if (name) device.name = name;
    if (description) device.description = description;
    if (location) device.location = location;
    if (sensorTypes) device.sensorTypes = sensorTypes;
    if (status) device.status = status;

    // Cannot change deviceId or project
    const updatedDevice = await device.save();

    // Log the update
    await AuditLog.create({
      user: req.user._id,
      action: 'update',
      resourceType: 'device',
      resourceId: device._id,
      details: `Updated device "${device.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(updatedDevice);
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

/**
 * @desc    Delete device
 * @route   DELETE /api/devices/:id
 * @access  Private/Admin
 */
const deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);

    if (!device) {
      res.status(404);
      throw new Error('Device not found');
    }

    // Check if user has access to the project
    const project = await Project.findById(device.project);
    const hasAccess = 
      req.user.role === 'superadmin' || 
      project.admin.equals(req.user._id);

    if (!hasAccess) {
      res.status(403);
      throw new Error('Not authorized to delete this device');
    }

    await device.deleteOne();

    // Log the deletion
    await AuditLog.create({
      user: req.user._id,
      action: 'delete',
      resourceType: 'device',
      resourceId: device._id,
      details: `Deleted device "${device.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Device removed' });
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

module.exports = {
  createDevice,
  getDevices,
  getDeviceById,
  updateDevice,
  deleteDevice
};
