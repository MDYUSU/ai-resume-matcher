const pdf = require('pdf-parse-fork');
const Scan = require('../models/Scan');

// POST /api/match
async function analyzeMatch(req, res) {
  console.log('📂 File received:', req.file?.originalname);
  console.log('📝 JD received:', req.body.jobDescription?.substring(0, 50));
  
  const { jobDescription, resumeText: masterResumeText } = req.body;

  let resumeText = '';
  
  // Handle master resume text OR file upload
  if (masterResumeText) {
    resumeText = masterResumeText;
    console.log('📄 Using master resume text, length:', resumeText?.length);
  } else {
    if (!req.file || !jobDescription) {
      return res.status(400).json({ message: 'File and Job Description required' });
    }

    let pdfData;
    try {
      pdfData = await pdf(req.file.buffer);
    } catch (error) {
      console.error('❌ FULL ERROR DETAILS:', error);
      return res.status(400).json({ message: 'Could not read PDF text.' });
    }
    resumeText = pdfData?.text || '';
    console.log('📄 Resume text length from PDF:', resumeText?.length);
  }
  
  if (!resumeText.trim()) {
    return res.status(400).json({ message: 'Resume text is required.' });
  }

  if (!jobDescription) {
    return res.status(400).json({ message: 'Job Description is required.' });
  }

  try {
    const prompt = `
Analyze the following Resume and Job Description and generate a comprehensive match analysis.

CRITICAL: You MUST return ONLY a valid JSON object with this exact structure. Replace the text descriptions with the actual calculated data. Do not include any text outside the JSON.

{
  "role": "Extract the specific job title from the job description (e.g. Frontend Engineer, Product Manager)",
  "overallMatchScore": "Calculate a number from 0-100 representing the total match",
  "aiFeedback": "Detailed paragraph analyzing the match. Wrap key technical terms in <strong> tags.",
  "scoreBreakdown": {
    "Skills": "Number 0-100",
    "Experience": "Number 0-100",
    "Keywords": "Number 0-100",
    "Formatting": "Number 0-100",
    "Education": "Number 0-100"
  },
  "keywords": {
    "matched": ["Array of matching technical keywords found in both"],
    "partial": ["Array of partially matching keywords"],
    "missing": ["Array of critical keywords from the JD missing in the resume"]
  },
  "improvementTips": [
    { 
      "title": "Short action title", 
      "text": "Detailed advice", 
      "colorCode": "Use 'rose' for critical missing skills, 'amber' for enhancements"
    }
  ]
}

REQUIREMENTS:
1. Extract the EXACT job title from the job description for the "role" field.
2. Calculate REAL scores based on actual content analysis.
3. Generate REAL keyword arrays based on resume vs job description analysis.
4. Return ONLY the JSON object.

Resume: ${resumeText}
Job Description: ${jobDescription}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3, topP: 0.95 },
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Gemini Error:', errorData);
      return res.status(500).json({ success: false, message: `AI Analysis failed (status ${response.status})` });
    }

    const data = await response.json();
    const aiResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences
    const cleanJSON = aiResponseText.replace(/^\s*```json?|\s*```\s*$/gim, '').trim();
    const analysis = JSON.parse(cleanJSON);
    
    // Normalize data to guarantee safety
    const normalizedData = {
      role: analysis.role && !analysis.role.includes('Extract') ? analysis.role : "Software Engineer",
      overallMatchScore: typeof analysis.overallMatchScore === 'number' ? analysis.overallMatchScore : parseInt(analysis.overallMatchScore) || 0,
      aiFeedback: analysis.aiFeedback || "Analysis completed successfully",
      scoreBreakdown: analysis.scoreBreakdown || { Skills: 0, Experience: 0, Keywords: 0, Formatting: 0, Education: 0 },
      keywords: analysis.keywords || { matched: [], partial: [], missing: [] },
      improvementTips: analysis.improvementTips || []
    };
    
    // 🔥 THE FIX: Save scan to database securely with ALL missing fields included
    if (req.user && req.user._id) {
      try {
        await Scan.create({
          jobRole: normalizedData.role,
          resumeText: resumeText,
          jobDescription: jobDescription,
          matchScore: normalizedData.overallMatchScore,
          keywords: normalizedData.keywords.matched || [],
          suggestions: normalizedData.aiFeedback,
          // Added UI data fields
          scoreBreakdown: normalizedData.scoreBreakdown,
          missingKeywords: normalizedData.keywords.missing || [],
          improvementTips: normalizedData.improvementTips,
          userId: req.user._id
        });
        console.log("✅ Scan successfully saved to User Dashboard!");
      } catch (dbError) {
        console.error("⚠️ Failed to save scan to MongoDB:", dbError.message);
      }
    }
    
    return res.json({ success: true, data: normalizedData, resumeText });
  } catch (error) {
    console.error('❌ AI Analysis Error:', error?.message);
    return res.status(500).json({ success: false, message: error?.message || 'AI Analysis failed' });
  }
}

async function generateInterviewPrep(req, res) {
  const { resumeText, jobDescription, type, page = 1 } = req.body;

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ message: 'Resume text and Job Description are required for prep.' });
  }

  try {
    const prompt = `
      Based on this Resume and Job Description, generate interview preparation content.
      
      CRITICAL REQUIREMENT: You are generating questions for PAGE ${page}. 
      You MUST generate completely new, fresh questions that were not asked on previous pages.
      Ensure these questions dive deeper into the required skills.

      Generate:
      1. 10 Technical Interview Questions with model answers and interviewer intention.
      2. 10 Behavioral Questions with model answers.
      3. A 3-step learning roadmap to bridge skill gaps.

      Return ONLY a JSON object with this exact structure:
      {
        "technicalQuestions": [{"question": "", "modelAnswer": "", "intention": ""}],
        "behavioralQuestions": [{"question": "", "modelAnswer": "", "intention": ""}],
        "roadmap": [{"title": "", "description": ""}]
      }

      Resume: ${resumeText}
      Job Description: ${jobDescription}
      Requested Page: ${page}
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, topP: 0.95 },
      }),
    });

    const data = await response.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const cleanJSON = aiText.replace(/^\s*```json?|\s*```\s*$/gim, '').trim();
    const interviewPrep = JSON.parse(cleanJSON);

    const normalizedPrep = {
        technicalQuestions: interviewPrep.technicalQuestions || interviewPrep.technical || [],
        behavioralQuestions: interviewPrep.behavioralQuestions || interviewPrep.behavioral || [],
        roadmap: interviewPrep.roadmap || []
    }

    return res.json({ success: true, interviewPrep: normalizedPrep });
  } catch (error) {
    console.error('❌ Prep Generation Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to generate interview questions' });
  }
}

module.exports = { analyzeMatch, generateInterviewPrep };