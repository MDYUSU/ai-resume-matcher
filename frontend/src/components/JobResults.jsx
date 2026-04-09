import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, Briefcase, MapPin, DollarSign, Calendar, ExternalLink, Filter, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
// Necessary change: Using your custom axios bridge
import axios from '../api/axios'

const JobResults = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchRole, setSearchRole] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState({
    datePosted: 'any', // '24h', '7d', 'any'
    locationSearch: '', // Input field for location
    experience: 'any' // 'junior', 'senior', 'mid', 'any'
  })
  const [showFilters, setShowFilters] = useState(true) // Expanded by default

  // Navigation Reset: whenever navigation key changes, wipe local job state
  // so we never render results from a previous navigation.
  useEffect(() => {
    setJobs([])
    setSearchRole('')
    setCurrentPage(1)
    setLoadingMore(false)
    setHasMore(true)
    setSearchQuery('')
    setLoading(true)
  }, [location.key])

  // --- CRITICAL FIX: ROBUST STATE EXTRACTION ---
  useEffect(() => {
    console.log('🔍 JobResults - location.state:', location.state)
    
    // Safely unwrap data whether it comes from a fresh scan OR the new Dashboard
    const state = location.state || {};
    const scanData = state.scanData || state.data || state;
    
    // Extract the exact role and jobs regardless of the container they arrived in
    const targetRole = scanData?.role || scanData?.jobRole || state.role;
    const passedJobs = scanData?.jobs || state.jobs;

    if (passedJobs && passedJobs.length > 0) {
      console.log('✅ Jobs found in state:', passedJobs.length)
      setJobs(passedJobs)
      setSearchRole(targetRole || 'opportunities')
      setSearchQuery(state.searchQuery || targetRole || 'Software Engineer')
      setCurrentPage(1)
      setHasMore(passedJobs.length === 10) // Assume initial page had 10 jobs
      setLoading(false)
    } else if (targetRole) {
      console.log('🔄 No jobs in state, fetching fresh with role:', targetRole)
      // Fallback fetch if user refreshed page OR navigated from Dashboard
      fetchJobsForRole(targetRole)
    } else {
      console.log('❌ No state provided, redirecting to analysis')
      // No state provided, redirect back to analysis
      navigate('/')
    }
  }, [location.state, navigate])

  // Add debug logging for jobs state
  useEffect(() => {
    console.log('📊 Jobs in UI state:', jobs.length)
    if(jobs.length > 0) console.log('📊 First job in UI:', jobs[0])
  }, [jobs])

  const fetchJobsForRole = async (role) => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/jobs?role=${encodeURIComponent(role)}&location=India&t=${Date.now()}`)
      
      if (response.data.success) {
        setJobs(response.data.jobs)
        setSearchRole(role)
        console.log('✅ Fresh jobs fetched:', response.data.jobs.length)
      }
    } catch (error) {
      console.error('❌ Error fetching fresh jobs:', error)
      setJobs([])
    } finally {
      setLoading(false)
    }
  }

  // Helper function to extract salary from salary string and handle currency
  const extractSalary = (salaryString) => {
    if (!salaryString || salaryString === 'Salary not disclosed') return 0
    
    // Extract numbers from salary string
    const numbers = salaryString.match(/[\d,]+/g)
    if (!numbers) return 0
    
    // Get the first number (lower bound of range)
    const rawSalary = parseInt(numbers[0].replace(/,/g, ''))
    
    // Detection logic: if salary > 100,000, assume it's already in INR
    if (rawSalary > 100000) {
      return rawSalary
    }
    
    // Otherwise, assume it's USD and convert to INR
    const convertedSalary = Math.round(rawSalary * 83)
    return convertedSalary
  }

  // Helper function to extract experience level from description
  const extractExperience = (description) => {
    if (!description) return 'any'
    const desc = description.toLowerCase()
    
    // Check for specific year ranges first (more specific patterns)
    if (desc.includes('0-1 years') || desc.includes('0 to 1 years') || desc.includes('less than 1 year') || desc.includes('< 1 year') || desc.includes('0-1 yr')) {
      return 'junior'
    } else if (desc.includes('2-4 years') || desc.includes('2 to 4 years') || desc.includes('3-5 years') || desc.includes('2 to 5 years') || desc.includes('2-4 yr')) {
      return 'mid'
    } else if (desc.includes('5+ years') || desc.includes('5 plus years') || desc.includes('7+ years') || desc.includes('8+ years') || desc.includes('10+ years') || desc.includes('5+ yr')) {
      return 'senior'
    }
    
    // Then check for keywords
    if (desc.includes('junior') || desc.includes('entry') || desc.includes('intern') || desc.includes('trainee') || desc.includes('fresher') || desc.includes('entry level')) {
      return 'junior'
    } else if (desc.includes('senior') || desc.includes('lead') || desc.includes('principal') || desc.includes('architect') || desc.includes('head of') || desc.includes('sr.')) {
      return 'senior'
    } else if (desc.includes('mid') || desc.includes('middle') || desc.includes('intermediate') || desc.includes('experienced') || desc.includes('mid-level')) {
      return 'mid'
    }
    return 'any'
  }

  // Helper function to extract experience text for display
  const extractExperienceText = (description) => {
    if (!description) return null
    
    const desc = description.toLowerCase()
    
    // Look for specific year patterns
    const yearPattern = desc.match(/(\d+[-+]\d*\s*years?|\d+\s*years?\s*(?:plus|\+)?)/i)
    if (yearPattern) {
      return yearPattern[0]
    }
    
    // Look for level keywords
    if (desc.includes('junior') || desc.includes('entry')) return 'Junior Level'
    if (desc.includes('senior') || desc.includes('lead')) return 'Senior Level'
    if (desc.includes('mid') || desc.includes('middle')) return 'Mid Level'
    
    return null
  }

  // Page change function
  const handlePageChange = async (newPage) => {
    if (newPage < 1 || loadingMore || !searchQuery) return
    
    setLoadingMore(true)
    try {
      console.log(`📡 Loading page ${newPage} for query: ${searchQuery}`)
      
      const response = await axios.get(`/api/jobs?query=${encodeURIComponent(searchQuery)}&page=${newPage}`)
      
      if (response.data.success) {
        setJobs(response.data.jobs) // Replace current jobs, don't append
        setCurrentPage(newPage)
        setHasMore(response.data.jobs.length === 10) // Assume 10 is page size
        console.log(`✅ Loaded ${response.data.jobs.length} jobs for page ${newPage}`)
        
        // Scroll to top smoothly
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        console.log('❌ Failed to load page')
      }
    } catch (error) {
      console.error('❌ Error loading page:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  // Helper function to check if job is within date range
  const isWithinDateRange = (jobDate, filter) => {
    if (filter === 'any') return true
    
    // Handle various date formats from Adzuna
    let dateObj
    try {
      dateObj = new Date(jobDate)
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        // Try parsing as string format
        dateObj = new Date(jobDate.replace(/(\d{1,2})\/(\d{1,2})\/(\d{4})/, '$3-$2-$1'))
      }
    } catch (error) {
      return true // Don't filter out if date parsing fails
    }
    
    if (isNaN(dateObj.getTime())) {
      return true // Don't filter out if date is invalid
    }
    
    // Use timezone-aware comparison
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
    const jobDateTime = dateObj.getTime()
    const dayInMs = 24 * 60 * 60 * 1000
    
    if (filter === '24h') {
      const yesterdayStart = todayStart.getTime() - dayInMs
      return jobDateTime >= yesterdayStart
    } else if (filter === '7d') {
      const weekAgoStart = todayStart.getTime() - (7 * dayInMs)
      return jobDateTime >= weekAgoStart
    }
    return true
  }

  // Filter jobs based on active filters
  const filteredJobs = useMemo(() => {
    const filtered = jobs.filter((job, index) => {
      // Date filter - 'any' should return true
      if (!isWithinDateRange(job.date, activeFilters.datePosted)) {
        return false
      }
      
      // Location filter - empty string should return true, exclude 'India'
      if (activeFilters.locationSearch && activeFilters.locationSearch.trim() !== '') {
        const searchTerm = activeFilters.locationSearch.toLowerCase().trim()
        const jobLocation = job.location.toLowerCase()
        
        // Skip if location is 'India' (too broad)
        if (jobLocation === 'india') {
          return false
        }
        
        if (!jobLocation.includes(searchTerm)) {
          return false
        }
      }
      
      // Experience filter - 'any' should return true
      const jobExperience = extractExperience(job.description)
      if (activeFilters.experience !== 'any' && jobExperience !== activeFilters.experience) {
        return false
      }
      
      return true
    })
    
    return filtered
  }, [jobs, activeFilters])

  // Update filter state
  const updateFilter = (filterType, value) => {
    setActiveFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  // Clear all filters
  const clearFilters = () => {
    setActiveFilters({
      datePosted: 'any',
      locationSearch: '',
      experience: 'any'
    })
  }

  // Count active filters
  const activeFilterCount = Object.values(activeFilters).filter((value, key) => {
    const keys = Object.keys(activeFilters)
    const currentKey = keys[key]
    
    if (currentKey === 'datePosted') return value !== 'any'
    if (currentKey === 'locationSearch') return value !== ''
    if (currentKey === 'experience') return value !== 'any'
    return false
  }).length

  const handleBackToAnalysis = () => {
    navigate('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-emerald-500 w-12 h-12 mb-4 mx-auto" />
          <p className="text-zinc-400 font-medium">Loading job opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-6 bg-zinc-900/50 border-b border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToAnalysis}
            className="p-2 rounded-lg bg-zinc-800 border border-white/10 hover:border-emerald-500/40 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline font-bold">Back</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full border border-emerald-500/50 flex items-center justify-center bg-emerald-500/20 font-bold text-emerald-500">YC</div>
            <h2 className="text-2xl font-bold tracking-tight">Job Opportunities</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-wider">
              {filteredJobs.length !== jobs.length ? 'Showing' : 'Found'}
            </p>
            <p className="text-lg font-bold text-emerald-500">{filteredJobs.length} roles</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative p-2 rounded-lg bg-zinc-800 border border-white/10 hover:border-emerald-500/40 transition-all flex items-center gap-2"
          >
            <span className="text-sm font-bold">🔍 Filter Results</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 bg-emerald-500 text-black rounded-full text-xs font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Search Status */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">
            Scanning for <span className="text-emerald-500">{searchRole}</span> roles
          </h1>
          <p className="text-zinc-400 font-medium">Discover opportunities that match your profile</p>
        </div>

        {/* Filter Bar */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6"
            >
              <div className="bg-zinc-900/50 rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Refine your search</h3>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-zinc-500 hover:text-emerald-500 transition-colors font-bold uppercase tracking-widest flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear All
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date Posted Filter */}
                  <div>
                    <label className="block text-sm font-bold text-zinc-400 mb-2">Date Posted</label>
                    <select
                      value={activeFilters.datePosted}
                      onChange={(e) => updateFilter('datePosted', e.target.value)}
                      className="w-full bg-black border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-emerald-500/40 focus:outline-none"
                    >
                      <option value="any">Any Time</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-bold text-zinc-400 mb-2">Location</label>
                    <input
                      type="text"
                      value={activeFilters.locationSearch}
                      onChange={(e) => updateFilter('locationSearch', e.target.value)}
                      placeholder="e.g., Bangalore, Mumbai"
                      className="w-full bg-black border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-emerald-500/40 focus:outline-none placeholder-zinc-700"
                    />
                  </div>

                  {/* Experience Filter */}
                  <div>
                    <label className="block text-sm font-bold text-zinc-400 mb-2">Experience</label>
                    <select
                      value={activeFilters.experience}
                      onChange={(e) => updateFilter('experience', e.target.value)}
                      className="w-full bg-black border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-emerald-500/40 focus:outline-none"
                    >
                      <option value="any">Any Level</option>
                      <option value="junior">Junior / Entry</option>
                      <option value="mid">Mid-Level</option>
                      <option value="senior">Senior / Lead</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Jobs Grid */}
        <AnimatePresence>
          {jobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Briefcase className="w-16 h-16 text-emerald-500/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No opportunities found</h3>
              <p className="text-zinc-400 mb-6">Try adjusting your search criteria or check back later</p>
              <button
                onClick={handleBackToAnalysis}
                className="px-6 py-3 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition-all"
              >
                Back to Analysis
              </button>
            </motion.div>
          ) : filteredJobs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Filter className="w-16 h-16 text-emerald-500/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No jobs match these filters</h3>
              <p className="text-zinc-400 mb-6">Try broadening your search criteria</p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition-all mr-4"
              >
                Clear Filters
              </button>
              <button
                onClick={handleBackToAnalysis}
                className="px-6 py-3 bg-zinc-900 border border-emerald-500/30 text-emerald-500 font-bold rounded-lg hover:border-emerald-500/60 transition-all"
              >
                Back to Analysis
              </button>
            </motion.div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map((job, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-zinc-900 border border-white/10 hover:border-emerald-500/40 transition-all group hover:shadow-lg hover:shadow-emerald-500/10 flex flex-col justify-between rounded-2xl p-6"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-emerald-500 transition-colors line-clamp-2">
                        {job.title}
                      </h3>
                      <ExternalLink className="text-emerald-500/40 group-hover:text-emerald-500" size={20} />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-zinc-400 font-medium">
                        <Briefcase size={14} /> <span>{job.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-400">
                        <MapPin size={16} /> <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-emerald-500 font-bold">
                        <span>₹</span> <span>{job.salary}</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 border border-emerald-500/50 bg-emerald-500/10 text-emerald-500 font-bold rounded-lg hover:bg-emerald-500 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:text-black"
                    >
                      <ExternalLink size={16} />
                      Apply Now
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Pagination Controller */}
        {filteredJobs.length > 0 && (
          <div className="mt-12 flex justify-center">
            <div className="flex items-center gap-4 px-6 py-4 bg-zinc-900 border border-white/10 rounded-2xl shadow-xl">
              {/* Previous Button */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1 || loadingMore}
                className="px-4 py-2 bg-black border border-emerald-500/50 text-emerald-500 font-bold rounded-lg hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ArrowLeft size={16} />
                Previous
              </button>

              {/* Page Indicator */}
              <div className="px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                <span className="text-emerald-500 font-bold">Page {currentPage}</span>
              </div>

              {/* Next Button */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={loadingMore || (!hasMore && jobs.length < 10)}
                className="px-4 py-2 bg-black border border-emerald-500/50 text-emerald-500 font-bold rounded-lg hover:bg-emerald-500 hover:text-black hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ArrowLeft size={16} className="rotate-180" />
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {filteredJobs.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-xs text-zinc-500 mb-4 font-bold uppercase tracking-widest">
              {filteredJobs.length !== jobs.length 
                ? `Showing ${filteredJobs.length} of ${jobs.length} roles on Page ${currentPage}` 
                : `Showing ${filteredJobs.length} roles on Page ${currentPage}`
              }
            </p>
            <button
              onClick={handleBackToAnalysis}
              className="px-6 py-3 bg-zinc-900 border border-zinc-700 text-zinc-400 font-bold rounded-lg hover:text-emerald-500 hover:border-emerald-500/50 transition-all uppercase tracking-widest text-sm"
            >
              Analyze Another Resume
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

export default JobResults