const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
  try {
    // FIXED: Accept both 'query' and 'role' so it never falls back to Software Engineer by mistake
    const { query, role, page = 1 } = req.query; 
    const actualSearchTerm = query || role;

    const id = process.env.ADZUNA_APP_ID;
    const key = process.env.ADZUNA_APP_KEY;

    if (!id || !key) {
      console.error("❌ API Keys missing in .env");
      return res.status(500).json({ success: false, message: "Server config error" });
    }

    const fetchFromAdzuna = async (searchTerm) => {
      const cleanTerm = searchTerm.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
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

    let rawResults = [];
    
    // 1. IDENTIFY THE SPECIFIC NICHE (Using actualSearchTerm)
    const isRobotics = /robot|ros|embedded|automation/gi.test(actualSearchTerm);
    const isAIML = /ai|ml|machine learning|deep learning|neural/gi.test(actualSearchTerm);
    const isCyber = /cyber|security|pentest|infosec|network security/gi.test(actualSearchTerm);
    
    // 2. BUILD INTELLIGENT PRIMARY KEYWORDS
    let primaryKeywords = (actualSearchTerm || "Software Engineer").replace(/junior|immediate|entry level/gi, '').trim();

    // 3. APPLY DOMAIN-SPECIFIC BROADENING
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

    // 4. SMART FALLBACK
    if (rawResults.length === 0) {
      let fallbackTerm = "";
      if (isRobotics) fallbackTerm = "Robotics";
      else if (isAIML) fallbackTerm = "Machine Learning";
      else if (isCyber) fallbackTerm = "Security";
      else fallbackTerm = "Software Developer"; 
      
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