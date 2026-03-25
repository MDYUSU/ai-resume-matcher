const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
  try {
    const { query } = req.query;
    const id = process.env.ADZUNA_APP_ID;
    const key = process.env.ADZUNA_APP_KEY;

    if (!id || !key) {
      console.error("❌ API Keys missing in .env");
      return res.status(500).json({ success: false, message: "Server config error" });
    }

    // --- HELPER: CLEAN AND SEARCH ---
    const fetchFromAdzuna = async (searchTerm) => {
      // 1. Clean query: Remove special chars and extra spaces
      const cleanTerm = searchTerm
        .replace(/[^a-zA-Z0-9\s]/g, ' ') 
        .replace(/\s+/g, ' ')
        .trim();

      // 2. Build URL using URLSearchParams (safest way to avoid 400 errors)
      const params = new URLSearchParams({
        app_id: id,
        app_key: key,
        results_per_page: 10,
        what: cleanTerm,
        'content-type': 'application/json'
      });

      const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?${params.toString()}`;
      
      console.log(`📡 API Request: ${cleanTerm}`);
      const resp = await axios.get(url);
      return resp.data?.results || [];
    };

    // --- EXECUTION LOGIC ---
    let rawResults = [];
    
    // 1. Determine if the search is for Robotics or Web
    const isRobotics = /robot|ros|embedded|automation/gi.test(query);
    
    // 2. Build Intelligent Primary Keywords
    let primaryKeywords = (query || "Software Engineer")
      .replace(/junior|mern|express|js|mongodb|node/gi, '') // Remove limiting web words
      .trim();

    // If string is empty after cleaning, give it a smart default based on niche
    if (!primaryKeywords) {
      primaryKeywords = isRobotics ? "Robotics Engineer" : "Full Stack Developer";
    }

    try {
      rawResults = await fetchFromAdzuna(primaryKeywords);
    } catch (err) {
      console.warn("⚠️ Primary search failed with 400. Trying minimal fallback...");
    }

    // 3. ATTEMPT FALLBACK (Only if 0 results found)
    if (rawResults.length === 0) {
      // If we were looking for robotics, don't fallback to Full Stack! Fallback to Robotics.
      const fallbackTerm = isRobotics ? "Robotics" : "Software Developer";
      rawResults = await fetchFromAdzuna(fallbackTerm);
    }

    // 4. MAP DATA FOR FRONTEND
    const jobs = rawResults.map(job => ({
      id: job.id,
      title: job.title.replace(/<\/?[^>]+(>|$)/g, ""),
      company: job.company?.display_name || "Hiring Company",
      location: job.location?.display_name || "India",
      description: job.description.replace(/<\/?[^>]+(>|$)/g, "").substring(0, 150) + "...", 
      url: job.redirect_url,
      salary: job.salary_min ? `₹${job.salary_min.toLocaleString()}` : "Market Standard"
    }));

    console.log(`✅ Final Job Count for [${primaryKeywords}]: ${jobs.length}`);
    res.json({ success: true, jobs });

  } catch (error) {
    console.error("❌ ADZUNA FATAL ERROR:", error.message);
    res.json({ success: true, jobs: [] });
  }
});

module.exports = router;