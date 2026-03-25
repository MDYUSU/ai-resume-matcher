const pdf = require('pdf-parse-fork');

// POST /api/match
async function analyzeMatch(req, res) {
  console.log('📂 File received:', req.file?.originalname);
  console.log('📝 JD received:', req.body.jobDescription?.substring(0, 50));
  const { jobDescription } = req.body;

  if (!req.file || !jobDescription) {
    return res.status(400).json({ message: 'File and Job Description required' });
  }

  let resumeText = '';
  let pdfData;
  try {
    pdfData = await pdf(req.file.buffer);
  } catch (error) {
    console.error('❌ FULL ERROR DETAILS:', error);
    return res.status(400).json({ message: 'Could not read PDF text.' });
  }
  resumeText = pdfData?.text || '';
  console.log('📄 Resume text length:', resumeText?.length);
  if (!resumeText.trim()) {
    return res.status(400).json({ message: 'Could not read PDF text.' });
  }

  try {
    console.log('🔑 API Key present:', !!process.env.GEMINI_API_KEY);
    const prompt = `
  Analyze the following Resume and Job Description. 
  Return ONLY a JSON object with the following keys:
  "role": (The specific job title identified, e.g., "Robotics Engineer"),
  "matchPercentage": (A number 0-100),
  "missingKeywords": (Array of skills missing),
  "feedback": (A brief professional summary)

  Resume: ${resumeText}
  Job Description: ${jobDescription}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    const controller = new AbortController();
    const timeoutMs = 45000;
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            topP: 0.95,
          },
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ Gemini Error:', errorData);
      return res.status(500).json({ success: false, message: `AI Analysis failed (status ${response.status})` });
    }

    const data = await response.json();
    const aiResponseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Strip markdown code fences (```json ... ```) before parsing.
    const cleanJSON = aiResponseText.replace(/^\s*```json?|\s*```\s*$/gim, '').trim();
    const result = JSON.parse(cleanJSON);
    
    return res.json({ success: true, data: result, resumeText }); // Sending resumeText back for frontend persistence
  } catch (error) {
    console.error('❌ AI Analysis Error:', error?.message);
    return res.status(500).json({ success: false, message: error?.message || 'AI Analysis failed' });
  }
}

// NEW: Missing function that was causing your 400 error!
async function generateInterviewPrep(req, res) {
  const { resumeText, jobDescription } = req.body;
  console.log('🎯 Interview Prep Request Received');

  if (!resumeText || !jobDescription) {
    return res.status(400).json({ message: 'Resume text and Job Description are required for prep.' });
  }

  try {
    const prompt = `
      Based on this Resume and Job Description, generate:
      1. 5 Technical Interview Questions with model answers and interviewer intention.
      2. 5 Behavioral Questions with model answers.
      3. A 3-step learning roadmap to bridge skill gaps.

      Return ONLY a JSON object with this exact structure:
      {
        "technicalQuestions": [{"question": "", "modelAnswer": "", "intention": ""}],
        "behavioralQuestions": [{"question": "", "modelAnswer": "", "intention": ""}],
        "roadmap": [{"title": "", "description": ""}]
      }

      Resume: ${resumeText}
      Job Description: ${jobDescription}
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${process.env.GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
        },
      }),
    });

    const data = await response.json();
    const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Sanitize and Parse
    const cleanJSON = aiText.replace(/^\s*```json?|\s*```\s*$/gim, '').trim();
    const interviewPrep = JSON.parse(cleanJSON);

    return res.json({ success: true, interviewPrep });
  } catch (error) {
    console.error('❌ Prep Generation Error:', error.message);
    return res.status(500).json({ success: false, message: 'Failed to generate interview questions' });
  }
}

module.exports = { analyzeMatch, generateInterviewPrep };