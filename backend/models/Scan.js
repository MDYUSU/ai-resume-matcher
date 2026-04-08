const mongoose = require('mongoose');

const ScanSchema = new mongoose.Schema({
  jobRole: {
    type: String,
    required: true,
    default: 'Software Engineer'
  },
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
  // 🔥 NEW FIELDS: Saving the rich UI data
  scoreBreakdown: {
    type: Object,
    default: {}
  },
  missingKeywords: {
    type: [String],
    default: []
  },
  improvementTips: {
    type: Array,
    default: []
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Scan', ScanSchema);