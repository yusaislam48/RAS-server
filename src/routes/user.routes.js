const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getCurrentUser
} = require('../controllers/user.controller');
const { protect, restrictToAdmin, restrictToSuperAdmin } = require('../middlewares/auth');

// All user routes require authentication
router.use(protect);

// Get current user profile
router.get('/me', getCurrentUser);

// Admin only routes
router.route('/')
  .get(restrictToAdmin, getUsers);

router.route('/:id')
  .get(restrictToAdmin, getUserById)
  .put(restrictToAdmin, updateUser);

// Super Admin only routes
router.route('/:id')
  .delete(restrictToSuperAdmin, deleteUser);

module.exports = router; 