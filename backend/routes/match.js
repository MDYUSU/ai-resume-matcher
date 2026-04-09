const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Scan = require('../models/Scan');
const InterviewPrep = require('../models/InterviewPrep');
const crypto = require('crypto');
const { protect, optionalAuth } = require('../middleware/authMiddleware');
const router = express.Router();
const { analyzeMatch } = require('../controllers/match.controller');

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/', optionalAuth, (req, res, next) => {
  console.log(`➡️ Incoming Scan Request. Authenticated as: ${req.user ? req.user.email : 'Guest'}`);
  
  upload.single('resume')(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("❌ MULTER ERROR:", err.message);
      return res.status(500).json({ success: false, message: `File upload error: ${err.message}` });
    } else if (err) {
      console.error("❌ FILE REJECTION ERROR:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    
    next();
  });
}, analyzeMatch);

router.post('/generate-prep', async (req, res) => {
  try {
    const { resumeText, jobDescription, type, page = 1 } = req.body;
    
    if (!resumeText || !jobDescription || !type) {
      return res.status(400).json({ success: false, message: 'Resume text, job description, and type are required' });
    }

    const resumeHash = crypto.createHash('md5').update(resumeText).digest('hex');
    
    console.log(`🔍 Checking cache for: ${type} - Page ${page}`);

    const cachedData = await InterviewPrep.findOne({
      jobDescription: jobDescription.trim(),
      resumeHash: resumeHash,
      type: type,
      page: page
    });

    if (cachedData) {
      console.log('📦 Served from MongoDB Cache!');
      return res.json({ success: true, interviewPrep: cachedData.data, fromCache: true });
    }

    console.log('📡 Cache miss - Calling Gemini API...');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    
    const prompt = `Generate comprehensive interview preparation content based on the resume and job description.

CRITICAL REQUIREMENT: You are generating questions for PAGE ${page}. 
- You MUST generate EXACTLY 10 technical questions and EXACTLY 10 behavioral questions.
- You MUST generate completely new, fresh questions that were not asked on previous pages.
- If page=1, generate foundational technical/behavioral questions.
- If page=2, generate advanced/deeper scenario questions.
- If page=3 or higher, generate expert-level edge cases.

Return ONLY a valid JSON object with this exact structure:
{
  "technicalQuestions": [
    { "question": "Question here", "modelAnswer": "Answer here", "intention": "Intention here" }
  ],
  "behavioralQuestions": [
    { "question": "Question here", "modelAnswer": "Answer here", "intention": "Intention here" }
  ],
  "roadmap": [
    { "title": "Title here", "description": "Description here" }
  ]
}

Resume: ${resumeText}
Job Description: ${jobDescription}
Type: ${type}
Requested Page Number: ${page}`;

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.8, topP: 0.95 }
    });

    const response = await result.response;
    const aiText = response.text();

    let cleanJSON = aiText.replace(/^\s*```json?|```\s*$/gm, '').replace(/^[^{]*({.*})[^}]*$/s, '$1').replace(/\n/g, ' ').trim();
    const jsonMatch = cleanJSON.match(/\{[\s\S]*\}/);
    if (jsonMatch) cleanJSON = jsonMatch[0];
    
    try {
      const interviewPrep = JSON.parse(cleanJSON);
      
      const normalizedData = {
        technicalQuestions: interviewPrep.technicalQuestions || interviewPrep.technical || [],
        behavioralQuestions: interviewPrep.behavioralQuestions || interviewPrep.behavioral || [],
        roadmap: interviewPrep.roadmap || []
      };
      
      console.log('💾 Saving to MongoDB Cache...');
      try {
        await InterviewPrep.create({
          jobDescription: jobDescription.trim(),
          resumeText: resumeText,
          resumeHash: resumeHash,
          type: type,
          page: page,
          data: normalizedData,
          userId: req.user?._id || null
        });
        console.log('✅ Successfully saved to cache!');
      } catch (dbError) {
        console.error('⚠️ Failed to save to MongoDB:', dbError.message);
      }
      
      res.json({ success: true, interviewPrep: normalizedData });
    } catch (parseError) {
      res.status(500).json({ success: false, message: 'AI returned invalid formatting' });
    }
    
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/history', protect, async (req, res) => {
  try {
    const scans = await Scan.find({ userId: req.user._id }).sort({ timestamp: -1 });
    res.json({ success: true, data: scans });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/history/all', protect, async (req, res) => {
  try {
    await Scan.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: 'All scans cleared successfully' });
  } catch (error) {
    console.error("❌ CLEAR ALL ERROR:", error);
    res.status(500).json({ success: false, message: 'Server error deleting all scans' });
  }
});

router.delete('/history/:id', protect, async (req, res) => {
  try {
    const scan = await Scan.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!scan) return res.status(404).json({ success: false, message: 'Scan not found' });
    res.json({ success: true, message: 'Scan deleted successfully' });
  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ success: false, message: 'Server error deleting scan' });
  }
});

module.exports = router;