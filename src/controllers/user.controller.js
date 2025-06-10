const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    res.status(500);
    throw new Error('Server Error: ' + error.message);
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/users
 * @access  Private/Admin
 */
const getUsers = async (req, res) => {
  try {
    const users = await User.find({}).select('-password').sort('name');
    res.json(users);
  } catch (error) {
    res.status(500);
    throw new Error('Server Error: ' + error.message);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Private/Admin
 */
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    
    if (user) {
      res.json(user);
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

/**
 * @desc    Update user
 * @route   PUT /api/users/:id
 * @access  Private/Admin
 */
const updateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Only superadmin can update other admins
    if (user.role === 'superadmin' || user.role === 'projectadmin') {
      if (req.user.role !== 'superadmin') {
        res.status(403);
        throw new Error('Only super admins can update admin users');
      }
    }
    
    const { name, email, role, active, projects } = req.body;
    
    // Update fields if provided
    if (name) user.name = name;
    if (email) user.email = email;
    
    // Only superadmin can change roles
    if (role && req.user.role === 'superadmin') {
      user.role = role;
    }
    
    if (active !== undefined) {
      user.active = active;
    }
    
    if (projects) {
      user.projects = projects;
    }
    
    const updatedUser = await user.save();
    
    // Log the update
    await AuditLog.create({
      user: req.user._id,
      action: 'update',
      resourceType: 'user',
      resourceId: user._id,
      details: `Updated user "${user.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      projects: updatedUser.projects,
      active: updatedUser.active
    });
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

/**
 * @desc    Delete user
 * @route   DELETE /api/users/:id
 * @access  Private/SuperAdmin
 */
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      res.status(404);
      throw new Error('User not found');
    }
    
    // Cannot delete super admin
    if (user.role === 'superadmin') {
      res.status(400);
      throw new Error('Cannot delete super admin user');
    }
    
    await user.deleteOne();
    
    // Log the deletion
    await AuditLog.create({
      user: req.user._id,
      action: 'delete',
      resourceType: 'user',
      resourceId: user._id,
      details: `Deleted user "${user.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });
    
    res.json({ message: 'User removed' });
  } catch (error) {
    res.status(res.statusCode === 200 ? 500 : res.statusCode);
    throw new Error(error.message);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUser
}; 