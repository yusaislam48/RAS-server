// Update a project
exports.updateProject = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, location, admin, users } = req.body;

    // Validate project ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid project ID' });
    }

    // Find the project
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Build update object
    const updateData = {
      name,
      description,
      location,
    };

    // Add admin if provided and valid
    if (admin && mongoose.Types.ObjectId.isValid(admin)) {
      updateData.admin = admin;
    }

    // Add users if provided
    if (users && Array.isArray(users)) {
      // Filter out invalid IDs and duplicates
      const validUserIds = users
        .filter(userId => mongoose.Types.ObjectId.isValid(userId))
        .filter((userId, index, self) => self.indexOf(userId) === index);
      
      updateData.users = validUserIds;
    }

    // Update the project
    const updatedProject = await Project.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    ).populate('admin').populate('users');

    res.status(200).json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Server error while updating project' });
  }
}; 