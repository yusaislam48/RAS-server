const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addUserToProject,
  removeUserFromProject,
  regenerateApiKey
} = require('../controllers/project.controller');
const { protect, restrictToSuperAdmin, restrictToAdmin } = require('../middlewares/auth');

// Super Admin only routes for creation
router.post('/', protect, restrictToSuperAdmin, createProject);

// Modified: Allow all authenticated users to see all projects 
// (the controller will handle permissions)
router.get('/', protect, getProjects);

router.delete('/:id', protect, restrictToSuperAdmin, deleteProject);

// User routes
router.get('/my-projects', protect, getUserProjects);
router.get('/:id', protect, getProjectById);

// Admin routes (Super Admin or Project Admin)
router.put('/:id', protect, restrictToAdmin, updateProject);
router.post('/:id/users', protect, restrictToAdmin, addUserToProject);
router.delete('/:id/users/:userId', protect, restrictToAdmin, removeUserFromProject);
router.post('/:id/regenerate-api-key', protect, restrictToAdmin, regenerateApiKey);

module.exports = router; 