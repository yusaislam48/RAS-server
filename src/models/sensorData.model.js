const mongoose = require('mongoose');

const sensorDataSchema = new mongoose.Schema(
  {
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    sensorType: {
      type: String,
      required: true,
      enum: [
        'temperature', 
        'pH', 
        'dissolvedOxygen', 
        'conductivity', 
        'turbidity',
        'orp',
        'tds'
      ]
    },
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    isAlert: {
      type: Boolean,
      default: false
    },
    alertLevel: {
      type: String,
      enum: ['normal', 'warning', 'critical'],
      default: 'normal'
    },
    alertMessage: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

// Index for efficient queries
sensorDataSchema.index({ device: 1, timestamp: -1, sensorType: 1 });
sensorDataSchema.index({ project: 1, timestamp: -1 });

const SensorData = mongoose.model('SensorData', sensorDataSchema);

module.exports = SensorData; 