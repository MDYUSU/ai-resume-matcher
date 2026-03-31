const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
  try {
    const { query, page = 1 } = req.query; 
    const id = process.env.ADZUNA_APP_ID;
    const key = process.env.ADZUNA_APP_KEY;

    if (!id || !key) {
      console.error("❌ API Keys missing in .env");
      return res.status(500).json({ success: false, message: "Server config error" });
    }

    // --- HELPER: CLEAN AND SEARCH ---
    const fetchFromAdzuna = async (searchTerm) => {
      // Clean query: remove special chars but keep spaces for OR logic
      const cleanTerm = searchTerm
        .replace(/[^a-zA-Z0-9\s]/g, ' ') 
        .replace(/\s+/g, ' ')
        .trim();

      const params = new URLSearchParams({
        app_id: id,
        app_key: key,
        results_per_page: 10,
        what: cleanTerm,
        'content-type': 'application/json'
      });

      const url = `https://api.adzuna.com/v1/api/jobs/in/search/${page}?${params.toString()}`;
      
      console.log(`📡 API Request: ${cleanTerm} (page ${page})`);
      const resp = await axios.get(url);
      return resp.data?.results || [];
    };

    // --- EXECUTION LOGIC ---
    let rawResults = [];
    
    // 1. IDENTIFY THE SPECIFIC NICHE
    const isRobotics = /robot|ros|embedded|automation/gi.test(query);
    const isAIML = /ai|ml|machine learning|deep learning|neural/gi.test(query);
    const isCyber = /cyber|security|pentest|infosec|network security/gi.test(query);
    
    // 2. BUILD INTELLIGENT PRIMARY KEYWORDS
    // We remove "level" words but keep the core role words
    let primaryKeywords = (query || "Software Engineer")
      .replace(/junior|immediate|entry level/gi, '')
      .trim();

    // 3. APPLY DOMAIN-SPECIFIC BROADENING (Prevents "AND" Problem)
    if (isAIML) {
      primaryKeywords = "AI Engineer OR Machine Learning OR Python";
    } else if (isRobotics) {
      primaryKeywords = "Robotics Engineer OR Automation OR Embedded";
    } else if (isCyber) {
      primaryKeywords = "Cyber Security OR Information Security OR Pentester";
    } else if (!primaryKeywords) {
      primaryKeywords = "Full Stack Developer";
    }

    try {
      rawResults = await fetchFromAdzuna(primaryKeywords);
    } catch (err) {
      console.warn("⚠️ Primary search failed. Trying niche fallback...");
    }

    // 4. SMART FALLBACK: Stay in the same family or return 0
    if (rawResults.length === 0) {
      let fallbackTerm = "";
      
      // We only fallback to the broad category of the niche
      if (isRobotics) fallbackTerm = "Robotics";
      else if (isAIML) fallbackTerm = "Machine Learning";
      else if (isCyber) fallbackTerm = "Security";
      else fallbackTerm = "Software Developer"; // General fallback only for web roles
      
      if (fallbackTerm) {
        rawResults = await fetchFromAdzuna(fallbackTerm);
      }
    }

    // 5. MAP DATA FOR FRONTEND
    const jobs = rawResults.map(job => ({
      id: job.id,
      title: job.title.replace(/<\/?[^>]+(>|$)/g, ""),
      company: job.company?.display_name || "Hiring Company",
      location: job.location?.display_name || "India",
      description: job.description.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 150) + "...", 
      url: job.redirect_url,
      salary: job.salary_max 
        ? `₹${Number(job.salary_max).toLocaleString('en-IN')}` 
        : job.salary_min 
          ? `₹${Number(job.salary_min).toLocaleString('en-IN')}+`
          : "Market Standard"
    }));

    console.log(`✅ Final Job Count for [${primaryKeywords}] on Page ${page}: ${jobs.length}`);
    res.json({ success: true, jobs });

  } catch (error) {
    console.error("❌ ADZUNA FATAL ERROR:", error.message);
    res.json({ success: true, jobs: [] });
  }
});

module.exports = router;