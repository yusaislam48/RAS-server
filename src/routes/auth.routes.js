const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  logoutUser,
  getUserProfile,
  updateUserProfile
} = require('../controllers/auth.controller');
const { protect, restrictToAdmin } = require('../middlewares/auth');

// Public routes
router.post('/login', loginUser);

// Protected routes
router.post('/logout', protect, logoutUser);
router.get('/profile', protect, getUserProfile);
router.get('/me', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// Admin only routes
router.post('/register', protect, restrictToAdmin, registerUser);

module.exports = router; 