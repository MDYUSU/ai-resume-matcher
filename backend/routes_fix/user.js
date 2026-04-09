const express = require('express');
const User = require('../models/User');
const { protect } = require('../middleware/authMiddleware');
const multer = require('multer');
const pdf = require('pdf-parse-fork');
const router = express.Router();

// Multer setup for PDF uploads
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

// GET /api/user/profile - Get user profile
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({ 
      success: true, 
      data: {
        name: user.name,
        email: user.email,
        masterResumeText: user.masterResumeText,
        masterResumeName: user.masterResumeName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/user/profile - Update user profile (master resume)
router.put('/profile', protect, upload.single('resume'), async (req, res) => {
  try {
    let masterResumeText = req.body.masterResumeText;
    let masterResumeName = '';

    // If a file is uploaded, extract text from PDF
    if (req.file) {
      try {
        const pdfData = await pdf(req.file.buffer);
        masterResumeText = pdfData?.text || '';
        masterResumeName = req.file.originalname;
      } catch (error) {
        return res.status(400).json({ success: false, message: 'Could not read PDF text.' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { masterResumeText, masterResumeName },
      { new: true }
    ).select('-password');

    res.json({ 
      success: true, 
      data: {
        name: user.name,
        email: user.email,
        masterResumeText: user.masterResumeText,
        masterResumeName: user.masterResumeName
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
