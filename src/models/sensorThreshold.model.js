const mongoose = require('mongoose');

const sensorThresholdSchema = new mongoose.Schema(
  {
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
    device: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: false // If null, this is a global default
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: false // If null, this is a global default
    },
    idealMin: {
      type: Number,
      required: true
    },
    idealMax: {
      type: Number,
      required: true
    },
    warningMin: {
      type: Number,
      required: true
    },
    warningMax: {
      type: Number,
      required: true
    },
    criticalMin: {
      type: Number,
      required: true
    },
    criticalMax: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      required: true
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Compound index to ensure unique thresholds per sensor type and device/project
sensorThresholdSchema.index(
  { sensorType: 1, device: 1, project: 1 }, 
  { unique: true, partialFilterExpression: { device: { $ne: null } } }
);

sensorThresholdSchema.index(
  { sensorType: 1, project: 1 }, 
  { unique: true, partialFilterExpression: { device: null, project: { $ne: null } } }
);

sensorThresholdSchema.index(
  { sensorType: 1, isDefault: 1 }, 
  { unique: true, partialFilterExpression: { device: null, project: null, isDefault: true } }
);

const SensorThreshold = mongoose.model('SensorThreshold', sensorThresholdSchema);

module.exports = SensorThreshold; 