import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Loader2, Briefcase, MapPin, DollarSign, Calendar, ExternalLink, Filter, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'

const JobResults = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchRole, setSearchRole] = useState('')
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
    setLoading(true)
  }, [location.key])

  useEffect(() => {
    console.log('🔍 JobResults - location.state:', location.state)
    
    if (location.state?.jobs) {
      console.log('✅ Jobs found in state:', location.state.jobs.length)
      console.log('📊 Jobs data sample:', location.state.jobs[0])
      
      // Clean logging for first 3 jobs
      location.state.jobs.slice(0, 3).forEach((job, index) => {
        console.log(`🔍 Job ${index + 1} raw data:`, {
          title: job.title,
          salary: job.salary,
          salary_max: job.salary_max,
          created: job.created,
          date: job.date,
          location: job.location,
          company: job.company
        })
      })
      
      setJobs(location.state.jobs)
      setSearchRole(location.state.role || 'opportunities')
      setLoading(false)
    } else if (location.state?.role) {
      console.log('🔄 No jobs in state, fetching fresh with role:', location.state.role)
      // Fallback fetch if user refreshed page
      fetchJobsForRole(location.state.role)
    } else {
      console.log('❌ No state provided, redirecting to analysis')
      // No state provided, redirect back to analysis
      navigate('/')
    }
  }, [location.state, navigate])

  // Add debug logging for jobs state
  useEffect(() => {
    console.log('📊 Jobs in UI state:', jobs.length)
    console.log('📊 First job in UI:', jobs[0])
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
    
    console.log('💰 Raw salary string:', salaryString)
    
    // Extract numbers from salary string
    const numbers = salaryString.match(/[\d,]+/g)
    if (!numbers) return 0
    
    // Get the first number (lower bound of range)
    const rawSalary = parseInt(numbers[0].replace(/,/g, ''))
    console.log('💰 Extracted raw salary:', rawSalary)
    
    // Detection logic: if salary > 100,000, assume it's already in INR
    if (rawSalary > 100000) {
      console.log('💰 Salary detected as INR (>', 100000, '), no conversion needed')
      return rawSalary
    }
    
    // Otherwise, assume it's USD and convert to INR
    const convertedSalary = Math.round(rawSalary * 83)
    console.log('💰 Salary converted from USD to INR:', rawSalary, 'USD ->', convertedSalary, 'INR')
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
      console.log('❌ Date parsing error for:', jobDate)
      return true // Don't filter out if date parsing fails
    }
    
    if (isNaN(dateObj.getTime())) {
      console.log('❌ Invalid date format:', jobDate)
      return true // Don't filter out if date is invalid
    }
    
    // Use timezone-aware comparison for March 1, 2026
    const today = new Date()
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0)
    const jobDateTime = dateObj.getTime()
    const dayInMs = 24 * 60 * 60 * 1000
    
    if (filter === '24h') {
      const yesterdayStart = todayStart.getTime() - dayInMs
      const within24h = jobDateTime >= yesterdayStart
      console.log(`📅 24h check: ${jobDate} -> ${within24h ? 'PASS' : 'FAIL'} (after ${new Date(yesterdayStart).toLocaleString()})`)
      return within24h
    } else if (filter === '7d') {
      const weekAgoStart = todayStart.getTime() - (7 * dayInMs)
      const within7d = jobDateTime >= weekAgoStart
      console.log(`📅 7d check: ${jobDate} -> ${within7d ? 'PASS' : 'FAIL'} (after ${new Date(weekAgoStart).toLocaleString()})`)
      return within7d
    }
    return true
  }

  // Filter jobs based on active filters
  const filteredJobs = useMemo(() => {
    console.log('🔍 Starting filter with active filters:', activeFilters)
    console.log('📊 Total jobs to filter:', jobs.length)
    
    const filtered = jobs.filter((job, index) => {
      // Date filter - 'any' should return true
      if (!isWithinDateRange(job.date, activeFilters.datePosted)) {
        console.log(`❌ Job ${index} failed date filter: ${job.date}`)
        return false
      }
      
      // Location filter - empty string should return true, exclude 'India'
      if (activeFilters.locationSearch && activeFilters.locationSearch.trim() !== '') {
        const searchTerm = activeFilters.locationSearch.toLowerCase().trim()
        const jobLocation = job.location.toLowerCase()
        
        // Skip if location is 'India' (too broad)
        if (jobLocation === 'india') {
          console.log(`❌ Job ${index} skipped - location too broad: "${job.location}"`)
          return false
        }
        
        if (!jobLocation.includes(searchTerm)) {
          console.log(`❌ Job ${index} failed location filter: "${job.location}" doesn't include "${activeFilters.locationSearch}"`)
          return false
        }
      }
      
      // Experience filter - 'any' should return true
      const jobExperience = extractExperience(job.description)
      if (activeFilters.experience !== 'any' && jobExperience !== activeFilters.experience) {
        console.log(`❌ Job ${index} failed experience filter: detected "${jobExperience}" != selected "${activeFilters.experience}"`)
        return false
      }
      
      console.log(`✅ Job ${index} passed all filters: ${job.title}`)
      return true
    })
    
    console.log('🎯 Filter result:', filtered.length, 'jobs passed filters')
    console.log('📈 Filter ratio:', filtered.length, '/', jobs.length, '=', Math.round((filtered.length / jobs.length) * 100) + '%')
    
    return filtered
  }, [jobs, activeFilters])

  // Get unique locations from jobs for dropdown (removed since using input field)
  // const uniqueLocations = useMemo(() => {
  //   const locations = [...new Set(jobs.map(job => job.location.split(',')[0]))].filter(Boolean)
  //   return locations.sort()
  // }, [jobs])

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

  const openJobLink = (url) => {
    window.open(url, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1e293b,_#0f172a,_#020617)] text-white font-display flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-primary w-12 h-12 mb-4 mx-auto" />
          <p className="text-white/60">Loading job opportunities...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1e293b,_#0f172a,_#020617)] text-white font-display">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between p-6 glass-panel border-b border-primary/10 bg-slate-900/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button
            onClick={handleBackToAnalysis}
            className="p-2 rounded-lg glass-panel hover:border-primary/40 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline">Back to Analysis</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full border border-primary/50 p-0.5 overflow-hidden flex items-center justify-center bg-primary/20 font-bold text-primary">YC</div>
            <h2 className="text-2xl font-bold tracking-tight">Job Opportunities</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs text-white/40">
              {filteredJobs.length !== jobs.length ? 'Showing' : 'Found'}
            </p>
            <p className="text-lg font-bold text-primary">{filteredJobs.length} matching roles</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="relative p-2 rounded-lg glass-panel hover:border-primary/40 transition-all flex items-center gap-2"
          >
            <span className="text-sm">🔍 Filter Results</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 size-5 bg-primary text-slate-900 rounded-full text-xs font-bold flex items-center justify-center">
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
            Scanning for <span className="text-primary">{searchRole}</span> roles
          </h1>
          <p className="text-white/60">Discover opportunities that match your profile</p>
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
              <div className="glass-panel rounded-2xl p-6 border border-white/10">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-bold text-white">Refine your search</h3>
                  <button
                    onClick={clearFilters}
                    className="text-xs text-white/40 hover:text-white/60 transition-colors flex items-center gap-1"
                  >
                    <X size={14} />
                    Clear All
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date Posted Filter */}
                  <div>
                    <label className="block text-sm font-bold text-white/80 mb-2">Date Posted</label>
                    <select
                      value={activeFilters.datePosted}
                      onChange={(e) => updateFilter('datePosted', e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
                    >
                      <option value="any">Any Time</option>
                      <option value="24h">Last 24 Hours</option>
                      <option value="7d">Last 7 Days</option>
                    </select>
                  </div>

                  {/* Location Filter */}
                  <div>
                    <label className="block text-sm font-bold text-white/80 mb-2">Location</label>
                    <input
                      type="text"
                      value={activeFilters.locationSearch}
                      onChange={(e) => updateFilter('locationSearch', e.target.value)}
                      placeholder="e.g., Bangalore, Mumbai"
                      className="w-full bg-slate-800/50 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-primary/40 focus:outline-none placeholder-white/40"
                    />
                  </div>

                  {/* Experience Filter */}
                  <div>
                    <label className="block text-sm font-bold text-white/80 mb-2">Experience</label>
                    <select
                      value={activeFilters.experience}
                      onChange={(e) => updateFilter('experience', e.target.value)}
                      className="w-full bg-slate-800/50 border border-white/10 text-white rounded-lg px-3 py-2 text-sm focus:border-primary/40 focus:outline-none"
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
              <Briefcase className="w-16 h-16 text-primary/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No opportunities found</h3>
              <p className="text-white/60 mb-6">Try adjusting your search criteria or check back later</p>
              <button
                onClick={handleBackToAnalysis}
                className="px-6 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:shadow-lg transition-all"
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
              <Filter className="w-16 h-16 text-primary/20 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">No jobs match these filters</h3>
              <p className="text-white/60 mb-6">Try broadening your search criteria</p>
              <button
                onClick={clearFilters}
                className="px-6 py-3 bg-primary text-slate-900 font-bold rounded-lg hover:shadow-lg transition-all mr-4"
              >
                Clear Filters
              </button>
              <button
                onClick={handleBackToAnalysis}
                className="px-6 py-3 glass-panel border border-primary/30 text-primary font-bold rounded-lg hover:border-primary/60 transition-all"
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
                  className="glass-panel rounded-2xl p-6 border border-white/10 hover:border-primary/40 transition-all group hover:shadow-lg hover:shadow-primary/10 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-lg mb-2 group-hover:text-primary transition-colors line-clamp-2">
                        {job.title}
                      </h3>
                      <ExternalLink className="text-primary/40 group-hover:text-primary" size={20} />
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <Briefcase size={14} /> <span>{job.company}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-white/60">
                        <MapPin size={16} /> <span>{job.location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-primary/80">
                        <span className="text-primary">₹</span> <span>{job.salary}</span>
                      </div>
                    </div>
                  </div>

                  {/* --- CRITICAL CHANGE HERE --- */}
                  <div className="mt-6">
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block w-full py-3 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary text-center hover:text-slate-900 transition-all"
                    >
                      Apply Now
                    </a>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        {filteredJobs.length > 0 && (
          <div className="mt-12 text-center">
            <p className="text-xs text-white/40 mb-4">
              {filteredJobs.length !== jobs.length 
                ? `Showing ${filteredJobs.length} of ${jobs.length} opportunities` 
                : `Showing ${filteredJobs.length} opportunities`
              } • Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            <button
              onClick={handleBackToAnalysis}
              className="px-6 py-3 glass-panel border border-primary/30 text-primary font-bold rounded-lg hover:border-primary/60 transition-all"
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
