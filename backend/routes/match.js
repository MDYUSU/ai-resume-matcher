const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Scan = require('../models/Scan');
const InterviewPrep = require('../models/InterviewPrep');
const crypto = require('crypto');
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
    const { resumeText, jobDescription, type, page = 1 } = req.body;
    
    if (!resumeText || !jobDescription || !type) {
      return res.status(400).json({ 
        success: false, 
        message: 'Resume text, job description, and type are required' 
      });
    }

    // Create resume hash for caching
    const resumeHash = crypto.createHash('md5').update(resumeText).digest('hex');
    
    console.log(`🔍 Checking cache for: ${type} - Page ${page}`);
    console.log(`📝 Resume Hash: ${resumeHash}`);
    console.log(`📄 JD Hash: ${crypto.createHash('md5').update(jobDescription).digest('hex')}`);

    // Check MongoDB cache FIRST (The Quota Saver)
    const cachedData = await InterviewPrep.findOne({
      jobDescription: jobDescription.trim(),
      resumeHash: resumeHash,
      type: type,
      page: page
    });

    if (cachedData) {
      console.log('📦 Served from MongoDB Cache!');
      console.log(`📊 Cached data keys:`, Object.keys(cachedData.data));
      
      return res.json({
        success: true,
        interviewPrep: cachedData.data,
        fromCache: true
      });
    }

    console.log('📡 Cache miss - Calling Gemini API...');
    
    // STABLE CONFIG: Remove baseUrl and apiVersion if not using a specific proxy
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash-lite" 
    });
    
    const prompt = `Generate 10 unique and highly relevant ${type} interview questions. Output strictly as a JSON array of objects with these keys: 'question', 'intention', 'modelAnswer'.

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

    // 🧼 Enhanced Robust Sanitizer: Strips ```json, markdown, and extra text
    let cleanJSON = aiText
      .replace(/^\s*```json?|```\s*$/gm, '') // Remove code blocks
      .replace(/^[^{]*({.*})[^}]*$/s, '$1') // Extract JSON from surrounding text
      .replace(/\n/g, ' ') // Replace newlines with spaces
      .trim();
    
    // Additional safety: try to find JSON object in the text
    const jsonMatch = cleanJSON.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJSON = jsonMatch[0];
    }
    
    try {
      const interviewPrep = JSON.parse(cleanJSON);
      console.log('✅ Successfully generated interview prep');
      console.log(`📊 Raw AI response keys:`, Object.keys(interviewPrep));
      
      // FORCE KEY NORMALIZATION - The Quota Saver
      // No matter what keys Gemini sends, map them to exact keys
      const normalizedData = {
        // Try multiple possible key variations from Gemini
        technicalQuestions: interviewPrep.technicalQuestions || 
                          interviewPrep.technical || 
                          interviewPrep.tech || 
                          interviewPrep.questions || 
                          interviewPrep.tech_questions || 
                          [],
        
        behavioralQuestions: interviewPrep.behavioralQuestions || 
                           interviewPrep.behavioral || 
                           interviewPrep.behavior || 
                           interviewPrep.behav || 
                           interviewPrep.behavioral_questions || 
                           [],
        
        roadmap: interviewPrep.roadmap || 
                 interviewPrep.plan || 
                 interviewPrep.steps || 
                 []
      };
      
      console.log(`📊 Normalized keys:`, Object.keys(normalizedData));
      console.log(`📊 Final counts:`, {
        technical: normalizedData.technicalQuestions.length,
        behavioral: normalizedData.behavioralQuestions.length,
        roadmap: normalizedData.roadmap.length
      });
      
      // Fix handshake - exact structure
      const finalResponse = {
        success: true,
        interviewPrep: {
          technicalQuestions: normalizedData.technicalQuestions,
          behavioralQuestions: normalizedData.behavioralQuestions,
          roadmap: normalizedData.roadmap
        }
      };
      
      console.log(`📊 Final response structure:`, {
        success: finalResponse.success,
        interviewPrepKeys: Object.keys(finalResponse.interviewPrep),
        technicalCount: finalResponse.interviewPrep.technicalQuestions.length,
        behavioralCount: finalResponse.interviewPrep.behavioralQuestions.length,
        roadmapCount: finalResponse.interviewPrep.roadmap.length
      });
      
      // Return standardized response
      console.log('💾 Saving to MongoDB Cache...');
      
      // Save to database AFTER generating
      await InterviewPrep.create({
        jobDescription: jobDescription.trim(),
        resumeHash: resumeHash,
        resumeText: resumeText,
        type: type,
        page: page,
        data: finalResponse.interviewPrep
      });
      
      console.log('✅ Saved to MongoDB Cache');
      
      res.json({
        ...finalResponse,
        fromCache: false
      });
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