const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * Middleware to protect routes that require authentication
 */
const protect = async (req, res, next) => {
  let token;

  // Check if token exists in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_key_for_development');

      // Get user from the token (exclude password)
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
        res.status(401);
        throw new Error('User not found');
      }

      next();
    } catch (error) {
      console.error(error);
      res.status(401);
      throw new Error('Not authorized, token failed');
    }
  }

  if (!token) {
    res.status(401);
    throw new Error('Not authorized, no token');
  }
};

/**
 * Middleware to authorize specific roles
 * @param {...string} roles - Roles that are authorized to access the route
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      throw new Error('Not authenticated');
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403);
      throw new Error(`Not authorized, requires one of these roles: ${roles.join(', ')}`);
    }
    
    next();
  };
};

/**
 * Middleware to restrict access to Super Admin role
 * @deprecated Use authorize('superadmin') instead
 */
const restrictToSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized, requires Super Admin role');
  }
};

/**
 * Middleware to restrict access to Super Admin and Project Admin roles
 * @deprecated Use authorize('superadmin', 'projectadmin') instead
 */
const restrictToAdmin = (req, res, next) => {
  if (req.user && (req.user.role === 'superadmin' || req.user.role === 'projectadmin')) {
    next();
  } else {
    res.status(403);
    throw new Error('Not authorized, requires Admin role');
  }
};

/**
 * Middleware to validate API keys for device data submission
 */
const apiKeyAuth = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    res.status(401);
    throw new Error('API key is required');
  }

  try {
    // Find project with matching API key
    const Project = require('../models/project.model');
    const project = await Project.findOne({ apiKey });

    if (!project) {
      res.status(401);
      throw new Error('Invalid API key');
    }

    // Attach project to request for later use
    req.project = project;
    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { protect, authorize, restrictToSuperAdmin, restrictToAdmin, apiKeyAuth }; 