const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/user.controller');
const { protect, restrictToAdmin, restrictToSuperAdmin } = require('../middlewares/auth');

// All user routes require authentication
router.use(protect);

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