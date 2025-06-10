const mongoose = require('mongoose');
const crypto = require('crypto');

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    apiKey: {
      type: String,
      unique: true
    },
    location: {
      type: String,
      trim: true
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    users: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

// Generate API key before saving a new project
projectSchema.pre('save', function(next) {
  // Only generate API key if it's a new project or if apiKey field is explicitly modified
  if (this.isNew || this.isModified('apiKey')) {
    this.apiKey = crypto.randomBytes(32).toString('hex');
  }
  next();
});

const Project = mongoose.model('Project', projectSchema);

module.exports = Project; 