const mongoose = require('mongoose');

const InterviewPrepSchema = new mongoose.Schema({
  jobDescription: {
    type: String,
    required: true,
    trim: true
  },
  resumeHash: {
    type: String,
    required: true,
    trim: true
  },
  resumeText: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['technical', 'behavioral', 'roadmap'],
    trim: true
  },
  page: {
    type: Number,
    required: true,
    min: 1
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Create compound index for efficient queries
InterviewPrepSchema.index({ jobDescription: 1, resumeHash: 1, type: 1, page: 1 });

module.exports = mongoose.model('InterviewPrep', InterviewPrepSchema);
