const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Scan = require('../models/Scan');
const router = express.Router();
const { analyzeMatch } = require('../controllers/match.controller');

// Configure multer for file uploads in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: function (req, file, cb) {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// POST /api/match - Analyze resume
// This stays as '/' because it's mounted as /api/match in server.js
router.post('/', upload.single('resume'), analyzeMatch);

// POST /api/match/generate-prep
// CHANGED: Use '/generate-prep' here. 
// If your frontend calls /api/match/generate-prep, this is the correct relative path.
router.post('/generate-prep', async (req, res) => {
  try {
    const { resumeText, jobDescription, batchNumber = 1 } = req.body;
    console.log(`🎯 Interview Prep Request Received - Batch ${batchNumber}`);

    if (!resumeText || !jobDescription) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resume text and job description are required' 
      });
    }

    // STABLE CONFIG: Remove baseUrl and apiVersion if not using a specific proxy
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite" 
    });
    
    const prompt = `You are an expert interview coach. Based on resume and JD, generate a comprehensive batch of interview prep questions.

RESUME: ${resumeText}
JD: ${jobDescription}

Generate exactly this JSON structure:
{
  "technicalQuestions": [
    {
      "question": "Specific technical question",
      "intention": "What is interviewer looking for",
      "modelAnswer": "Detailed model answer"
    }
  ],
  "behavioralQuestions": [
    {
      "question": "Behavioral question",
      "guidance": "How to approach"
    }
  ],
  "roadmap": [
    {
      "title": "Topic",
      "description": "Task"
    }
  ]
}

IMPORTANT: Return ONLY valid JSON. No markdown, no backticks, no text before or after.`;

    // Timeout handled by standard fetch options or Promise.race
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.95,
      }
    });

    const response = await result.response;
    const aiText = response.text();

    // 🧼 Robust Sanitizer: Strips ```json and whitespace
    const cleanJSON = aiText.replace(/^\s*```json?|```\s*$/gm, '').trim();
    
    try {
      const interviewPrep = JSON.parse(cleanJSON);
      console.log('✅ Successfully generated interview prep');
      res.json({ success: true, interviewPrep });
    } catch (parseError) {
      console.error('❌ JSON Parse Error. Raw text:', aiText);
      res.status(500).json({ success: false, message: 'AI returned invalid formatting' });
    }
    
  } catch (error) {
    console.error('❌ Prep Error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/match/history
router.get('/history', async (req, res) => {
  try {
    const scans = await Scan.find().sort({ timestamp: -1 });
    res.json({ success: true, data: scans });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;