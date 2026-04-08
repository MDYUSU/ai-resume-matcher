import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, BrainCircuit, History, Rocket, Settings, Home, ArrowRight, FileText as MasterResumeIcon } from 'lucide-react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import Header from './Header'
import { useAuth } from '../contexts/AuthContext'

// Sub-component for individual questions
const QuestionCard = ({ q, index }) => {
  const [showAnswer, setShowAnswer] = useState(false);
  return (
    <div className="bg-slate-900/50 border border-purple-500/30 rounded-xl p-6 space-y-4">
      <div className="flex items-start justify-between">
        <h4 className="text-white font-bold text-lg flex-1">
          <span className="text-pink-500">Q{index + 1}:</span> {q.question}
        </h4>
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="px-4 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-all text-sm font-bold ml-4 border border-purple-500/20"
        >
          {showAnswer ? 'Hide Answer' : 'Show Answer'}
        </button>
      </div>

      <AnimatePresence>
        {showAnswer && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 mt-4 ml-4 border-l-2 border-purple-500/20 pl-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <p className="text-blue-400 font-black text-[10px] uppercase tracking-widest mb-2">💡 Interviewer's Intention</p>
                <p className="text-white/90 text-sm leading-relaxed">{q.intention || q.guidance}</p>
              </div>
              {q.modelAnswer && (
                <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                  <p className="text-green-400 font-black text-[10px] uppercase tracking-widest mb-2">✅ Model Answer</p>
                  <p className="text-white/90 text-sm leading-relaxed">{q.modelAnswer}</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FileUpload = () => {
  const navigate = useNavigate()
  const location = useLocation() // Added location to catch Dashboard data
  const { user, isAuthenticated } = useAuth()

  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [searchingJobs, setSearchingJobs] = useState(false)
  const [useMasterResume, setUseMasterResume] = useState(false)
  const [masterResumeText, setMasterResumeText] = useState('')
  const [masterResumeName, setMasterResumeName] = useState('')

  const [persistentResume, setPersistentResume] = useState('')
  const [persistentJobDescription, setPersistentJobDescription] = useState('')

  // --- CRITICAL FIX: CATCH DASHBOARD DATA WITH NEW UI FIELDS ---
  useEffect(() => {
    if (location.state?.scanData) {
      const scan = location.state.scanData;

      // We map the database saved variables back into the UI format
      setResult({
        role: scan.jobRole || scan.role,
        overallMatchScore: scan.matchScore || scan.overallMatchScore,
        aiFeedback: scan.suggestions || scan.aiFeedback,
        resumeText: scan.resumeText,
        // Pulling the newly saved rich data!
        scoreBreakdown: scan.scoreBreakdown || {},
        keywords: {
          missing: scan.missingKeywords || [],
          matched: scan.keywords || []
        },
        improvementTips: scan.improvementTips || []
      });

      setPersistentResume(scan.resumeText || '');
      setPersistentJobDescription(scan.jobDescription || '');
      setJobDescription(scan.jobDescription || '');
    }
  }, [location.state]);

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setResumeFile(file)
      setError('')
    } else {
      setError('Please upload a valid PDF file')
    }
  }

  const handleJobDescriptionChange = (e) => {
    setJobDescription(e.target.value)
    setError('')
  }

  // Fetch master resume on component mount
  useEffect(() => {
    const fetchMasterResume = async () => {
      if (isAuthenticated) {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get('/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data.success) {
            setMasterResumeText(response.data.data.masterResumeText || '');
            setMasterResumeName(response.data.data.masterResumeName || '');
          }
        } catch (error) {
          console.error('Failed to fetch master resume:', error);
        }
      }
    };

    fetchMasterResume();
  }, [isAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setIsProcessing(true);

    try {
      let response;
      const token = localStorage.getItem('token');

      if (useMasterResume) {
        // Use master resume text directly
        response = await axios.post('/api/match', {
          resumeText: masterResumeText,
          jobDescription: jobDescription
        }, {
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      } else {
        // Use uploaded PDF file
        const formData = new FormData();
        formData.append('resume', resumeFile);
        formData.append('jobDescription', jobDescription);
        response = await axios.post('/api/match', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        });
      }

      if (response.data.success) {
        setResult(response.data.data);
        setPersistentResume(response.data.resumeText || '');
        setPersistentJobDescription(jobDescription);
      }
    } catch (err) {
      setError('Analysis failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualJobSearch = async () => {
    setSearchingJobs(true);
    try {
      const role = result?.role || 'Software Engineer';
      const response = await axios.get(`/api/jobs?query=${encodeURIComponent(role)}`);
      if (response.data.success) {
        navigate('/jobs', {
          state: {
            jobs: response.data.jobs,
            role: role,
            resumeText: persistentResume || result?.resumeText,
            jobDescription: persistentJobDescription || jobDescription,
            scanData: result
          }
        });
      }
    } catch (err) {
      setError('Job search failed.');
    } finally {
      setSearchingJobs(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-24 relative">
      <Header />

      <main className="max-w-5xl mx-auto px-5 pt-8 min-h-[calc(100vh-100px)] flex flex-col pb-16">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-32 flex-1">
            <Loader2 className="animate-spin text-emerald-400 w-12 h-12 mb-4" />
            <p className="text-zinc-400 animate-pulse">AI is decoding your profile...</p>
          </div>
        ) : !result ? (
          <div className="flex-1 flex flex-col justify-center">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column - Upload Resume */}
              <div className="rounded-2xl bg-zinc-900/50 border border-white/10 shadow-2xl shadow-black/50 p-6">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all rounded-xl p-8 flex flex-col items-center justify-center h-56">
                  <input type="file" id="resume-upload" accept=".pdf" onChange={handleFileChange} className="hidden" />
                  <label htmlFor="resume-upload" className="cursor-pointer text-center">
                    <div className="size-16 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-4">
                      <Upload className="text-emerald-500 w-8 h-8" />
                    </div>
                    <h3 className="font-bold text-lg mb-2 text-zinc-100">{resumeFile ? resumeFile.name : 'Upload Resume'}</h3>
                    <p className="text-zinc-400 text-sm mb-4">Drag & drop your PDF or click to browse</p>
                  </label>
                  {resumeFile && (
                    <div className="text-center mt-3">
                      <p className="text-emerald-400 text-sm font-medium">× {resumeFile.name}</p>
                    </div>
                  )}
                </div>

                {/* Master Resume Option */}
                {isAuthenticated && masterResumeText && (
                  <div className="mt-4">
                    <button
                      onClick={() => setUseMasterResume(!useMasterResume)}
                      className={`w-full py-3 px-4 rounded-xl border transition-all font-medium flex items-center justify-center gap-3 ${useMasterResume
                          ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                          : 'bg-zinc-800/50 border-white/10 text-white hover:border-emerald-500/30 hover:bg-emerald-500/5'
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <MasterResumeIcon size={20} />
                          <span>Use Master Resume: {masterResumeName}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents the main button from clicking
                            navigate('/profile');
                          }}
                          className="text-xs text-zinc-400 hover:text-emerald-400 underline px-2 py-1"
                        >
                          Change
                        </button>
                      </div>
                    </button>
                    {useMasterResume && (
                      <div className="mt-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                        <p className="text-emerald-400 text-sm">Using your saved master resume for quick analysis</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Job Description */}
              <div className="rounded-2xl bg-zinc-900/50 border border-white/10 shadow-2xl shadow-black/50 h-72">
                <textarea
                  value={jobDescription}
                  onChange={handleJobDescriptionChange}
                  className="w-full h-full bg-transparent border-0 rounded-2xl p-6 text-zinc-100 placeholder:text-zinc-500 focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/50 transition-all resize-none"
                  placeholder="Paste complete job description here..."
                />
              </div>
            </div>

            {/* Analyze Button */}
            <div className="flex justify-center mt-12">
              <button
                onClick={handleSubmit}
                disabled={(!useMasterResume && !resumeFile) || !jobDescription.trim() || isProcessing}
                className="w-full max-w-md px-12 py-4 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold tracking-wide uppercase text-sm rounded-xl shadow-[0_0_20px_rgba(0,230,118,0.3)] hover:shadow-[0_0_30px_rgba(0,230,118,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isProcessing ? <Loader2 className="animate-spin mr-3" size={20} /> : <BrainCircuit className="mr-3" size={20} />}
                Analyze Match
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {/* Top Header Card */}
            <div className="rounded-2xl bg-zinc-900 border border-white/10 p-8 mb-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{result?.role || 'MERN Stack Developer'}</h2>
                  <div className="flex items-center gap-4 text-sm text-zinc-400">
                    <span>Analysed just now</span>
                    {isAuthenticated && user && (
                      <>
                        <span className="text-emerald-500">•</span>
                        <span>{user.name || 'User'}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-4">
                  <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-lg border border-emerald-500/20 font-bold text-sm">
                    {result?.overallMatchScore || 0}% match
                  </div>
                  <div className="flex flex-row gap-3 items-center">
                    <button
                      onClick={() => navigate('/prep', {
                        state: {
                          resumeText: persistentResume || result?.resumeText,
                          jobDescription: persistentJobDescription || jobDescription,
                          scanData: result
                        }
                      })}
                      className="bg-emerald-500 text-black font-bold rounded-full px-6 py-3 hover:bg-emerald-400 transition-all flex items-center gap-2"
                    >
                      <Rocket size={20} />
                      Generate interview prep
                    </button>
                    <button
                      onClick={handleManualJobSearch}
                      disabled={searchingJobs}
                      className="border border-zinc-700 hover:border-zinc-500 hover:bg-white/5 text-white font-medium rounded-full px-6 py-3 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      {searchingJobs ? <Loader2 className="animate-spin" size={20} /> : <Home size={20} />}
                      Find matching jobs
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content Row */}
            <div className="grid lg:grid-cols-3 gap-8 mb-8">
              {/* Left Column - Radial Gauge */}
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center min-h-[300px]">
                <div className="relative size-40 flex items-center justify-center mb-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="#374151" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="40" fill="none" stroke="#10b981" strokeWidth="8"
                      strokeDasharray="251.2"
                      strokeDashoffset={251.2 - (251.2 * (result?.overallMatchScore || 0)) / 100}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center mt-1">
                    <span className="text-5xl font-black text-emerald-500 leading-none">{result?.overallMatchScore || 0}</span>
                  </div>
                </div>
                <div className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-3">/ 100 Match Score</div>
                <div className="bg-emerald-500/10 text-emerald-500 px-4 py-1.5 rounded-full border border-emerald-500/20 font-bold text-sm">
                  {result?.overallMatchScore >= 80 ? 'Strong fit' : result?.overallMatchScore >= 60 ? 'Good fit' : 'Needs work'}
                </div>
              </div>

              {/* Center Column - AI Feedback Extended */}
              <div className="lg:col-span-2">
                <div className="bg-zinc-900 border border-white/10 rounded-2xl p-8 h-full">
                  <h3 className="text-emerald-500 font-bold text-lg mb-4 flex items-center gap-2">
                    <BrainCircuit size={20} className="mr-2" />
                    AI FEEDBACK
                  </h3>
                  <div className="text-zinc-300 leading-relaxed text-[15px]">
                    <div dangerouslySetInnerHTML={{
                      __html: result?.aiFeedback || "Analysis complete. Review the keyword and score breakdown below."
                    }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Grid - Three Columns */}
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Column 1: Score Breakdown */}
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                <h4 className="text-white font-bold text-lg mb-6">Score Breakdown</h4>
                <div className="space-y-5">
                  {Object.entries(result?.scoreBreakdown || {}).map(([category, score]) => (
                    <div key={category} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-400 capitalize text-sm">{category}</span>
                        <span className="text-white font-bold text-sm">{score}%</span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${score >= 80 ? 'bg-emerald-500' : score >= 70 ? 'bg-amber-500' : 'bg-rose-500'}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {(!result?.scoreBreakdown || Object.keys(result.scoreBreakdown).length === 0) && (
                    <span className="text-sm text-zinc-500 italic">No score breakdown available.</span>
                  )}
                </div>
              </div>

              {/* Column 2: Missing Keywords */}
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                <h4 className="text-white font-bold text-lg mb-6">Missing Keywords</h4>
                <div className="flex flex-wrap gap-2">
                  {(result?.keywords?.missing || []).map((keyword, i) => (
                    <span key={i} className="px-3 py-1.5 border border-dashed border-zinc-700 text-zinc-400 rounded-lg text-xs font-medium hover:border-rose-500/50 hover:text-rose-400 hover:bg-rose-500/5 transition-all cursor-default">
                      {keyword}
                    </span>
                  ))}
                  {(!result?.keywords?.missing || result.keywords.missing.length === 0) && (
                    <span className="text-sm text-zinc-500 italic">No critical keywords missing.</span>
                  )}
                </div>
              </div>

              {/* Column 3: Improvement Tips */}
              <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
                <h4 className="text-white font-bold text-lg mb-6">Top Improvement Tips</h4>
                <div className="space-y-4">
                  {(result?.improvementTips || []).slice(0, 3).map((tip, i) => (
                    <div key={i} className={`p-5 rounded-xl border-l-4 bg-gradient-to-r from-zinc-800/80 to-zinc-900/50 ${tip.colorCode === 'rose' ? 'border-rose-500' : 'border-amber-500'}`}>
                      <p className="text-zinc-400 text-sm leading-relaxed font-medium">{tip.text}</p>
                    </div>
                  ))}
                  {(!result?.improvementTips || result.improvementTips.length === 0) && (
                    <span className="text-sm text-zinc-500 italic">No specific improvements suggested.</span>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  )
}

export default FileUpload;