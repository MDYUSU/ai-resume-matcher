const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse-fork');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Scan = require('../models/Scan');
const router = express.Router();

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

// Initialize Gemini AI with stable v1 endpoint
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY, {
  apiVersion: 'v1',
  baseUrl: 'https://generativelanguage.googleapis.com'
});

// POST /api/match - Analyze resume against job description
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    const { jobDescription } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ message: 'Resume PDF file is required' });
    }
    
    if (!jobDescription) {
      return res.status(400).json({ message: 'Job description is required' });
    }

    let resumeText = '';

    try {
      // Extract text from PDF using memory buffer
      console.log('📄 Processing PDF:', req.file.originalname);
      console.log('📊 File size:', req.file.size, 'bytes');
      console.log('🔍 Step 1: Starting PDF text extraction...');
      
      if (!req.file.buffer) {
        throw new Error('PDF file buffer is empty');
      }
      
      try {
        console.log('🔍 Step 2: Parsing PDF with pdf-parse-fork...');
        
        // Parse PDF using pdf-parse-fork with specific async/await block
        const pdfData = await pdf(req.file.buffer);
        resumeText = pdfData.text;
        
        console.log('✅ Step 3: PDF text extracted successfully');
        console.log('📝 Extracted text length:', resumeText.length, 'characters');
        console.log('📄 Total pages:', pdfData.numpages || 'Unknown');
        
        // Check if PDF might be an image
        if (resumeText.length < 100) {
          console.warn('⚠️ Warning: Extracted text is very short. The PDF might be a scanned image or contain no readable text.');
        }
        
        if (!resumeText || resumeText.trim().length === 0) {
          throw new Error('PDF appears to be empty or contains no readable text');
        }
      } catch (parseError) {
        console.error('❌ Error parsing PDF:', parseError);
        console.error('❌ Error details:', parseError.message);
        console.error('❌ Stack trace:', parseError.stack);
        
        return res.status(400).json({ 
          message: 'Error parsing PDF file',
          error: parseError.message,
          details: 'The PDF file may be corrupted, password-protected, or empty. Please try a different file.'
        });
      }
      
    } catch (pdfError) {
      console.error('❌ Error parsing PDF:', pdfError);
      console.error('❌ Error details:', pdfError.message);
      console.error('❌ Stack trace:', pdfError.stack);
      
      return res.status(400).json({ 
        message: 'Error parsing PDF file',
        error: pdfError.message,
        details: 'The PDF file may be corrupted, password-protected, or empty. Please try a different file.'
      });
    }

    try {
      console.log('🔍 Step 6: Starting Gemini AI analysis...');
      
      // Log API key to ensure we're using the new one
      console.log('Using Key ending in:', process.env.GEMINI_API_KEY.slice(-4));
      
      // Use REST API directly to avoid SDK v1beta issues
      const prompt = `
You are a Senior Technical Recruiter with 15+ years of experience in evaluating resumes against job descriptions. 

Analyze the following resume and job description to provide a comprehensive match analysis.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Please provide your analysis in the following JSON format only:
{
  "matchPercentage": 85,
  "missingKeywords": ["React", "TypeScript", "AWS"],
  "feedback": "Consider adding specific projects that demonstrate your experience with cloud technologies and modern frontend frameworks. Quantify your achievements with metrics where possible."
}

Guidelines:
- matchPercentage: Calculate based on skills, experience, qualifications alignment (0-100)
- missingKeywords: Identify key technical skills/tools mentioned in JD but not found in resume
- feedback: Provide 2-3 specific, actionable improvement suggestions
- Be objective and professional in your assessment
- Return ONLY the JSON, no additional text
`;

      console.log('🔍 Step 7: Calling Gemini API via REST...');
      
      // Add timeout to REST API call
      const geminiPromise = fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }]
        })
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Gemini API timeout after 30 seconds')), 30000)
      );
      
      const response = await Promise.race([geminiPromise, timeoutPromise]);
      
      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text;
      
      console.log('✅ Step 8: Gemini responded successfully');
      
      // Parse the JSON response
      let analysisResult;
      try {
        // Clean the response to ensure it's valid JSON
        const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
        analysisResult = JSON.parse(cleanText);
      } catch (parseError) {
        console.error('❌ Error parsing Gemini response:', parseError);
        console.error('❌ Raw response:', text);
        return res.status(500).json({ message: 'Error processing AI analysis' });
      }

      // Validate the response structure
      if (!analysisResult.matchPercentage || !analysisResult.missingKeywords || !analysisResult.feedback) {
        return res.status(500).json({ message: 'Invalid AI analysis response format' });
      }

      console.log('✅ Step 9: Analysis validated, saving to database...');

      // Save to database
      const scan = new Scan({
        resumeText,
        jobDescription,
        matchScore: analysisResult.matchPercentage,
        keywords: analysisResult.missingKeywords,
        suggestions: analysisResult.feedback
      });

      await scan.save();

      console.log('✅ Step 10: Analysis complete, sending response...');

      res.json({
        success: true,
        data: {
          matchPercentage: analysisResult.matchPercentage,
          missingKeywords: analysisResult.missingKeywords,
          feedback: analysisResult.feedback,
          scanId: scan._id
        }
      });

    } catch (geminiError) {
      console.error('❌ Error calling Gemini:', geminiError);
      return res.status(500).json({ 
        message: 'Error performing AI analysis',
        error: geminiError.message 
      });
    }

  } catch (error) {
    console.error('Error in match analysis:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/match/history - Get all scan history
router.get('/history', async (req, res) => {
  try {
    const scans = await Scan.find().sort({ timestamp: -1 });
    res.json({
      success: true,
      data: scans
    });
  } catch (error) {
    console.error('Error fetching scan history:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/match/:id - Get specific scan by ID
router.get('/:id', async (req, res) => {
  try {
    const scan = await Scan.findById(req.params.id);
    
    if (!scan) {
      return res.status(404).json({ message: 'Scan not found' });
    }

    res.json({
      success: true,
      data: scan
    });
  } catch (error) {
    console.error('Error fetching scan:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
