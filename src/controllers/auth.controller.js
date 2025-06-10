const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');
const generateToken = require('../utils/generateToken');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public/Admin for creating other users
 */
const registerUser = async (req, res) => {
  const { name, email, password, role, projects } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400);
    throw new Error('User already exists');
  }

  // Create user with basic information
  const user = await User.create({
    name,
    email,
    password,
    role: role || 'user',
    projects: projects || []
  });

  if (user) {
    // Log the registration
    await AuditLog.create({
      user: user._id,
      action: 'create',
      resourceType: 'user',
      resourceId: user._id,
      details: 'User registered',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      projects: user.projects,
      token: generateToken(user._id, user.role)
    });
  } else {
    res.status(400);
    throw new Error('Invalid user data');
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  // Find user by email
  const user = await User.findOne({ email });

  // Check if user exists and password matches
  if (user && (await user.matchPassword(password))) {
    // Update last login time
    user.lastLogin = Date.now();
    await user.save();

    // Log the login
    await AuditLog.create({
      user: user._id,
      action: 'login',
      resourceType: 'system',
      details: 'User logged in',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      projects: user.projects,
      token: generateToken(user._id, user.role)
    });
  } else {
    res.status(401);
    throw new Error('Invalid email or password');
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logoutUser = async (req, res) => {
  // Log the logout
  await AuditLog.create({
    user: req.user._id,
    action: 'logout',
    resourceType: 'system',
    details: 'User logged out',
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({ message: 'Logout successful' });
};

/**
 * @desc    Get user profile
 * @route   GET /api/auth/profile
 * @access  Private
 */
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');

  if (user) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      projects: user.projects
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    // Log the profile update
    await AuditLog.create({
      user: user._id,
      action: 'update',
      resourceType: 'user',
      resourceId: user._id,
      details: 'User profile updated',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      projects: updatedUser.projects,
      token: generateToken(updatedUser._id, updatedUser.role)
    });
  } else {
    res.status(404);
    throw new Error('User not found');
  }
};

module.exports = {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile
}; 