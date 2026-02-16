const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  resumeText: {
    type: String,
    required: true,
    trim: true
  },
  jobDescription: {
    type: String,
    required: true,
    trim: true
  },
  matchScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  keywords: {
    type: [String],
    default: []
  },
  suggestions: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Scan', ScanSchema);
