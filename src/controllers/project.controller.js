const Project = require('../models/project.model');
const User = require('../models/user.model');
const AuditLog = require('../models/auditLog.model');

/**
 * @desc    Create a new project
 * @route   POST /api/projects
 * @access  Private/SuperAdmin
 */
const createProject = async (req, res) => {
  const { name, description, location, admin: adminId } = req.body;

  // Check if admin user exists
  const adminUser = await User.findById(adminId);
  if (!adminUser) {
    res.status(404);
    throw new Error('Admin user not found');
  }

  // Create new project
  const project = await Project.create({
    name,
    description,
    location,
    admin: adminId,
    users: [adminId] // Add admin as a user
  });

  if (project) {
    // Add project to the admin's projects
    adminUser.projects.push(project._id);
    await adminUser.save();

    // Log the action
    await AuditLog.create({
      user: req.user._id,
      action: 'create',
      resourceType: 'project',
      resourceId: project._id,
      details: `Project "${project.name}" created`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.status(201).json(project);
  } else {
    res.status(400);
    throw new Error('Invalid project data');
  }
};

/**
 * @desc    Get all projects
 * @route   GET /api/projects
 * @access  Private/SuperAdmin
 */
const getProjects = async (req, res) => {
  const projects = await Project.find({})
    .populate('admin', 'name email')
    .populate('users', 'name email');

  res.json(projects);
};

/**
 * @desc    Get user's projects
 * @route   GET /api/projects/my-projects
 * @access  Private
 */
const getUserProjects = async (req, res) => {
  // Find projects where the user is either an admin or a regular user
  const projects = await Project.find({
    $or: [
      { admin: req.user._id },
      { users: req.user._id }
    ]
  }).populate('admin', 'name email');

  res.json(projects);
};

/**
 * @desc    Get project by ID
 * @route   GET /api/projects/:id
 * @access  Private (Users with access to the project)
 */
const getProjectById = async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('admin', 'name email')
    .populate('users', 'name email');

  if (project) {
    // Check if user has access to this project
    const hasAccess = 
      req.user.role === 'superadmin' || 
      project.admin.equals(req.user._id) || 
      project.users.some(userId => userId.equals(req.user._id));

    if (!hasAccess) {
      res.status(403);
      throw new Error('Not authorized to access this project');
    }

    // Log the view
    await AuditLog.create({
      user: req.user._id,
      action: 'view',
      resourceType: 'project',
      resourceId: project._id,
      details: `Viewed project "${project.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(project);
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
};

/**
 * @desc    Update project
 * @route   PUT /api/projects/:id
 * @access  Private/SuperAdmin or ProjectAdmin
 */
const updateProject = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (project) {
    // Check if user is authorized to update
    const canUpdate = 
      req.user.role === 'superadmin' || 
      (req.user.role === 'projectadmin' && project.admin.equals(req.user._id));

    if (!canUpdate) {
      res.status(403);
      throw new Error('Not authorized to update this project');
    }

    project.name = req.body.name || project.name;
    project.description = req.body.description || project.description;
    project.location = req.body.location || project.location;
    
    // Only superadmin can change project admin
    if (req.user.role === 'superadmin' && req.body.admin) {
      const newAdmin = await User.findById(req.body.admin);
      if (!newAdmin) {
        res.status(404);
        throw new Error('New admin user not found');
      }
      
      project.admin = req.body.admin;
      
      // Add new admin to users if not already there
      if (!project.users.includes(req.body.admin)) {
        project.users.push(req.body.admin);
      }
      
      // Add project to new admin's projects
      if (!newAdmin.projects.includes(project._id)) {
        newAdmin.projects.push(project._id);
        await newAdmin.save();
      }
    }

    // Handle users array if provided
    if (req.body.users && Array.isArray(req.body.users)) {
      // Get current users to find users that were removed
      const currentUserIds = project.users.map(u => u.toString());
      const newUserIds = req.body.users.filter(id => id !== '');
      
      // Ensure admin is included in users list
      if (!newUserIds.includes(project.admin.toString())) {
        newUserIds.push(project.admin.toString());
      }

      // Find users to add (not in current users)
      const usersToAdd = newUserIds.filter(userId => !currentUserIds.includes(userId));
      
      // Find users to remove (in current users but not in new users)
      const usersToRemove = currentUserIds.filter(userId => 
        !newUserIds.includes(userId) && userId !== project.admin.toString());
      
      // Add new users to project and add project to their projects array
      for (const userId of usersToAdd) {
        const user = await User.findById(userId);
        if (user) {
          // Add project to user's projects if not already there
          if (!user.projects.includes(project._id)) {
            user.projects.push(project._id);
            await user.save();
          }
        }
      }
      
      // Remove project from removed users' projects array
      for (const userId of usersToRemove) {
        const user = await User.findById(userId);
        if (user) {
          user.projects = user.projects.filter(p => !p.equals(project._id));
          await user.save();
        }
      }
      
      // Update project's users array
      project.users = newUserIds;
    }

    const updatedProject = await project.save();
    
    // Populate users and admin for response
    const populatedProject = await Project.findById(updatedProject._id)
      .populate('admin', 'name email')
      .populate('users', 'name email');

    // Log the update
    await AuditLog.create({
      user: req.user._id,
      action: 'update',
      resourceType: 'project',
      resourceId: project._id,
      details: `Updated project "${project.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json(populatedProject);
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
};

/**
 * @desc    Delete project
 * @route   DELETE /api/projects/:id
 * @access  Private/SuperAdmin
 */
const deleteProject = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (project) {
    // Remove this project from all users' projects arrays
    await User.updateMany(
      { projects: project._id },
      { $pull: { projects: project._id } }
    );

    await project.deleteOne();

    // Log the deletion
    await AuditLog.create({
      user: req.user._id,
      action: 'delete',
      resourceType: 'project',
      resourceId: project._id,
      details: `Deleted project "${project.name}"`,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ message: 'Project removed' });
  } else {
    res.status(404);
    throw new Error('Project not found');
  }
};

/**
 * @desc    Add user to project
 * @route   POST /api/projects/:id/users
 * @access  Private/SuperAdmin or ProjectAdmin
 */
const addUserToProject = async (req, res) => {
  const { userId } = req.body;
  const project = await Project.findById(req.params.id);
  const user = await User.findById(userId);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if user is authorized to add users
  const canAddUser = 
    req.user.role === 'superadmin' || 
    (req.user.role === 'projectadmin' && project.admin.equals(req.user._id));

  if (!canAddUser) {
    res.status(403);
    throw new Error('Not authorized to add users to this project');
  }

  // Check if user is already in the project
  if (project.users.includes(userId)) {
    res.status(400);
    throw new Error('User already in project');
  }

  // Add user to project
  project.users.push(userId);
  await project.save();

  // Add project to user's projects
  user.projects.push(project._id);
  await user.save();

  // Log the action
  await AuditLog.create({
    user: req.user._id,
    action: 'update',
    resourceType: 'project',
    resourceId: project._id,
    details: `Added user ${user.name} to project "${project.name}"`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({
    message: `User ${user.name} added to project`,
    project
  });
};

/**
 * @desc    Remove user from project
 * @route   DELETE /api/projects/:id/users/:userId
 * @access  Private/SuperAdmin or ProjectAdmin
 */
const removeUserFromProject = async (req, res) => {
  const project = await Project.findById(req.params.id);
  const user = await User.findById(req.params.userId);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  // Check if user is authorized to remove users
  const canRemoveUser = 
    req.user.role === 'superadmin' || 
    (req.user.role === 'projectadmin' && project.admin.equals(req.user._id));

  if (!canRemoveUser) {
    res.status(403);
    throw new Error('Not authorized to remove users from this project');
  }

  // Cannot remove the project admin
  if (project.admin.equals(user._id)) {
    res.status(400);
    throw new Error('Cannot remove project admin from project');
  }

  // Remove user from project
  project.users = project.users.filter(
    u => !u.equals(user._id)
  );
  await project.save();

  // Remove project from user's projects
  user.projects = user.projects.filter(
    p => !p.equals(project._id)
  );
  await user.save();

  // Log the action
  await AuditLog.create({
    user: req.user._id,
    action: 'update',
    resourceType: 'project',
    resourceId: project._id,
    details: `Removed user ${user.name} from project "${project.name}"`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({
    message: `User ${user.name} removed from project`,
    project
  });
};

/**
 * @desc    Regenerate project API key
 * @route   POST /api/projects/:id/regenerate-api-key
 * @access  Private/SuperAdmin or ProjectAdmin
 */
const regenerateApiKey = async (req, res) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  // Check if user is authorized
  const canRegenerate = 
    req.user.role === 'superadmin' || 
    (req.user.role === 'projectadmin' && project.admin.equals(req.user._id));

  if (!canRegenerate) {
    res.status(403);
    throw new Error('Not authorized to regenerate API key for this project');
  }

  // Flag apiKey as modified to trigger pre-save hook
  project.apiKey = undefined;
  const updatedProject = await project.save();

  // Log the action
  await AuditLog.create({
    user: req.user._id,
    action: 'update',
    resourceType: 'project',
    resourceId: project._id,
    details: `Regenerated API key for project "${project.name}"`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  res.status(200).json({
    message: 'API key regenerated',
    apiKey: updatedProject.apiKey
  });
};

module.exports = {
  createProject,
  getProjects,
  getUserProjects,
  getProjectById,
  updateProject,
  deleteProject,
  addUserToProject,
  removeUserFromProject,
  regenerateApiKey
}; 