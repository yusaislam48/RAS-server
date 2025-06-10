const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Device name is required'],
      trim: true
    },
    deviceId: {
      type: String,
      required: [true, 'Device ID is required'],
      unique: true,
      trim: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    description: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    sensorTypes: [{
      type: String,
      enum: [
        'temperature', 
        'pH', 
        'dissolvedOxygen', 
        'conductivity', 
        'turbidity',
        'orp',
        'tds'
      ]
    }],
    lastSeen: {
      type: Date
    },
    status: {
      type: String,
      enum: ['online', 'offline', 'maintenance'],
      default: 'offline'
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device; 