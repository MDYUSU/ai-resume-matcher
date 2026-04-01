import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, BrainCircuit, History, Rocket, Settings, Home } from 'lucide-react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'

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
  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [searchingJobs, setSearchingJobs] = useState(false)
  
  // SEPARATE PERSISTENT STATES
  const [technicalQuestions, setTechnicalQuestions] = useState([])
  const [behavioralQuestions, setBehavioralQuestions] = useState([])
  const [roadmapData, setRoadmapData] = useState([])
  
  const [activeInterviewTab, setActiveInterviewTab] = useState('technical')
  const [currentPage, setCurrentPage] = useState({ technical: 1, behavioral: 1, roadmap: 1 })
  const [isGeneratingMore, setIsGeneratingMore] = useState(false)
  
  const [persistentResume, setPersistentResume] = useState('')
  const [persistentJobDescription, setPersistentJobDescription] = useState('')

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

  const handleInterviewPrep = async (isLoadMore = false) => {
    const finalResume = persistentResume || result?.resumeText || '';
    const finalJD = persistentJobDescription || jobDescription || '';
    
    if (!finalResume || !finalJD) {
      setError('Data missing. Please re-analyze.');
      return;
    }

    setIsGeneratingMore(true);
    setError('');

    try {
      console.log(`📡 Requesting ${activeInterviewTab} - Page ${isLoadMore ? currentPage[activeInterviewTab] + 1 : 1}`);
      
      const response = await axios.post('/api/match/generate-prep', {
        resumeText: finalResume,
        jobDescription: finalJD.trim(),
        type: activeInterviewTab,
        page: isLoadMore ? currentPage[activeInterviewTab] + 1 : 1
      });

      console.log('📥 API Response Received:', response.data);
      console.log("📥 Raw Data from Backend:", response.data);

      if (response.data.success) {
        const data = response.data.interviewPrep || {};
        
        // Debug: Log full response structure
        console.log('🔍 Full response data:', response.data);
        console.log('🔍 Interview prep data:', data);
        console.log('🔍 Available keys in data:', Object.keys(data));
        
        // This is the CRITICAL fix: Ensure frontend reads from correct path
        const newTech = data.technicalQuestions || data.technical || [];
        const newBehav = data.behavioralQuestions || data.behavioral || [];
        const newRoadmap = data.roadmap || [];

        console.log('🔍 Extracted data:', {
          newTech: newTech.length,
          newBehav: newBehav.length,
          newRoadmap: newRoadmap.length
        });

        if (activeInterviewTab === 'technical') {
          const newTech = data.technicalQuestions || data.technical || [];
          setTechnicalQuestions(prev => isLoadMore ? [...prev, ...newTech] : newTech);
        } else if (activeInterviewTab === 'behavioral') {
          const newBehav = data.behavioralQuestions || data.behavioral || [];
          setBehavioralQuestions(prev => isLoadMore ? [...prev, ...newBehav] : newBehav);
        }

        if (newRoadmap.length > 0) setRoadmapData(newRoadmap);

        if (isLoadMore) {
          setCurrentPage(prev => ({ ...prev, [activeInterviewTab]: prev[activeInterviewTab] + 1 }));
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    } catch (err) {
      console.error("❌ API Error:", err.response?.data || err.message);
      setError('API Error. Check console for details.');
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setTechnicalQuestions([]);
    setBehavioralQuestions([]);
    setRoadmapData([]);
    setIsProcessing(true);

    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await axios.post('/api/match', formData);
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
        navigate('/jobs', { state: { jobs: response.data.jobs, role: role } });
      }
    } catch (err) {
      setError('Job search failed.');
    } finally {
      setSearchingJobs(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 pb-24 relative">
      <header className="sticky top-0 z-50 flex items-center justify-between p-6 bg-black/40 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-bold text-emerald-500">YC</div>
          <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
            <h2 className="text-2xl font-bold tracking-tight">Resume <span className="text-green-500">Intelligence</span></h2>
          </Link>
        </div>
        <div className="flex items-center gap-6">
          <nav className="flex items-center gap-6">
            <a href="#" className="bg-white/5 text-white px-3 py-1.5 rounded-md border border-white/10 font-medium transition-colors">Dashboard</a>
            <a href="#" className="text-zinc-400 font-medium hover:text-white transition-colors">History</a>
            <a href="#" className="text-zinc-400 font-medium hover:text-white transition-colors">Settings</a>
          </nav>
          <div className="flex items-center gap-4">
            <div className="size-8 rounded-full bg-zinc-700 border border-zinc-600 flex items-center justify-center text-xs font-bold text-zinc-300">JD</div>
            <button className="px-4 py-2 border border-zinc-700 hover:border-zinc-500 hover:bg-white/5 text-white transition-all text-sm font-medium">
              Sign In
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 pt-8 min-h-[calc(100vh-100px)] flex flex-col justify-center pb-16">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-emerald-400 w-12 h-12 mb-4" />
            <p className="text-zinc-400 animate-pulse">AI is decoding your profile...</p>
          </div>
        ) : !result ? (
          <>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Left Column - Upload Resume */}
              <div className="rounded-2xl p-12 border-2 border-dashed border-white/10 hover:border-green-500/50 hover:bg-green-500/5 transition-all bg-zinc-900/50 shadow-2xl shadow-black/50 flex flex-col items-center justify-center h-72">
                <input type="file" id="resume-upload" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <label htmlFor="resume-upload" className="cursor-pointer text-center">
                  <div className="size-20 rounded-2xl bg-emerald-500/10 flex items-center justify-center mx-auto mb-6">
                    <Upload className="text-green-500 w-10 h-10" />
                  </div>
                  <h3 className="font-bold text-xl mb-2 text-zinc-100">{resumeFile ? resumeFile.name : 'Upload Resume'}</h3>
                  <p className="text-zinc-400 text-sm mb-6">Drag & drop your PDF or click to browse</p>
                </label>
                {resumeFile && (
                  <div className="text-center mt-4">
                    <p className="text-emerald-400 text-sm font-medium">✓ {resumeFile.name}</p>
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
            
            {/* Analyze Button - Centered Below Both Columns */}
            <div className="flex justify-center mt-8">
              <button
                onClick={handleSubmit}
                disabled={!resumeFile || !jobDescription.trim() || isProcessing}
                className="w-full max-w-md px-12 py-4 bg-[#00E676] hover:bg-[#00C853] text-black font-extrabold tracking-wide uppercase text-sm rounded-xl shadow-[0_0_20px_rgba(0,230,118,0.3)] hover:shadow-[0_0_30px_rgba(0,230,118,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
              >
                {isProcessing ? <Loader2 className="animate-spin mr-3" size={20} /> : <BrainCircuit className="mr-3" size={20} />}
                Analyze Match
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-8">
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-3xl p-8 flex flex-col items-center justify-center bg-zinc-900/60 border border-zinc-800">
                <span className="text-4xl font-black text-emerald-400">{result?.matchPercentage}%</span>
                <span className="text-[10px] font-black uppercase text-zinc-400">Match Score</span>
              </div>
              <div className="md:col-span-2 rounded-3xl p-8 border border-zinc-800 bg-zinc-900/40">
                <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2"><BrainCircuit size={18}/> Feedback</h3>
                <p className="text-sm text-white/80 leading-relaxed">{result?.feedback}</p>
              </div>
            </div>

            {/* ACTION BUTTONS WITH HOVER/SPINNER */}
            <div className="flex flex-wrap justify-center gap-6 py-4">
              <button
                onClick={() => handleInterviewPrep(false)}
                disabled={isGeneratingMore}
                className={`px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold uppercase tracking-widest rounded-2xl flex items-center gap-3 transition-all shadow-lg 
                  ${isGeneratingMore ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 active:scale-95 hover:shadow-[0_0_25px_rgba(219,39,119,0.6)]'}`}
              >
                {isGeneratingMore ? <Loader2 className="animate-spin" size={20} /> : <Rocket size={20} />}
                Generate Interview Prep
              </button>
              
              <button
                onClick={handleManualJobSearch}
                disabled={searchingJobs}
                className="px-10 py-5 bg-slate-900 border-2 border-cyan-500/30 text-cyan-400 font-bold uppercase tracking-widest rounded-2xl flex items-center gap-3 transition-all hover:scale-105"
              >
                {searchingJobs ? <Loader2 className="animate-spin" size={20} /> : <Home size={20} />}
                Find Matching Jobs
              </button>
            </div>

            {/* INTERVIEW PREP TABS */}
            {(technicalQuestions.length > 0 || behavioralQuestions.length > 0 || roadmapData.length > 0) && (
              <div className="rounded-3xl border border-white/10 bg-slate-900/40 overflow-hidden">
                <div className="flex bg-white/5">
                  {['technical', 'behavioral', 'roadmap'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveInterviewTab(tab); }} 
                      className={`flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeInterviewTab === tab ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500' : 'text-white/40'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="p-8">
                  {activeInterviewTab !== 'roadmap' ? (
                    <div className="space-y-6 relative z-50">
                      {activeInterviewTab === 'technical' && (technicalQuestions || []).length > 0 ? (
                        <>
                          {technicalQuestions
  .slice((currentPage.technical - 1) * 10, currentPage.technical * 10)
  .map((q, i) => (
    <QuestionCard 
      key={`tech-${(currentPage.technical - 1) * 10 + i}`} 
      q={q} 
      index={(currentPage.technical - 1) * 10 + i} 
    />
  ))}
                          
                          <div className="relative z-50 pointer-events-auto flex items-center justify-between pt-8 pb-24 border-t border-white/10 mt-10">
                            <button 
                              onClick={() => setCurrentPage(prev => ({ ...prev, technical: Math.max(1, prev.technical - 1) }))} 
                              disabled={currentPage.technical === 1} 
                              className="text-xs uppercase font-bold text-white/40 disabled:opacity-0 pointer-events-auto cursor-pointer hover:text-cyan-400 transition-colors"
                            >
                              ← Previous
                            </button>
                            <span className="text-xs font-bold text-purple-400">Page {currentPage.technical}</span>
                            <button 
                              onClick={() => {
                                const maxPage = Math.ceil((technicalQuestions || []).length / 10);
                                if (currentPage.technical < maxPage) {
                                  // Navigate to existing page
                                  setCurrentPage(prev => ({ ...prev, technical: prev.technical + 1 }));
                                } else {
                                  // Need to fetch new page
                                  setIsGeneratingMore(true);
                                  handleInterviewPrep(true).finally(() => setIsGeneratingMore(false));
                                }
                              }} 
                              disabled={isGeneratingMore}
                              className="text-xs uppercase font-bold text-purple-400 pointer-events-auto cursor-pointer hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isGeneratingMore ? <Loader2 className="animate-spin" size={18} /> : (currentPage.technical * 10 >= (technicalQuestions || []).length ? 'Next →' : 'Next →')}
                            </button>
                          </div>
                        </>
                      ) : activeInterviewTab === 'behavioral' && (behavioralQuestions || []).length > 0 ? (
                        <>
                          {behavioralQuestions
  .slice((currentPage.behavioral - 1) * 10, currentPage.behavioral * 10)
  .map((q, i) => (
    <QuestionCard 
      key={`behav-${(currentPage.behavioral - 1) * 10 + i}`} 
      q={q} 
      index={(currentPage.behavioral - 1) * 10 + i} 
    />
  ))}
                          
                          <div className="relative z-50 pointer-events-auto flex items-center justify-between pt-8 pb-24 border-t border-white/10 mt-10">
                            <button 
                              onClick={() => setCurrentPage(prev => ({ ...prev, behavioral: Math.max(1, prev.behavioral - 1) }))} 
                              disabled={currentPage.behavioral === 1} 
                              className="text-xs uppercase font-bold text-white/40 disabled:opacity-0 pointer-events-auto cursor-pointer hover:text-cyan-400 transition-colors"
                            >
                              ← Previous
                            </button>
                            <span className="text-xs font-bold text-purple-400">Page {currentPage.behavioral}</span>
                            <button 
                              onClick={() => {
                                const maxPage = Math.ceil((behavioralQuestions || []).length / 10);
                                if (currentPage.behavioral < maxPage) {
                                  // Navigate to existing page
                                  setCurrentPage(prev => ({ ...prev, behavioral: prev.behavioral + 1 }));
                                } else {
                                  // Need to fetch new page
                                  setIsGeneratingMore(true);
                                  handleInterviewPrep(true).finally(() => setIsGeneratingMore(false));
                                }
                              }} 
                              disabled={isGeneratingMore}
                              className="text-xs uppercase font-bold text-purple-400 pointer-events-auto cursor-pointer hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {isGeneratingMore ? <Loader2 className="animate-spin" size={18} /> : (currentPage.behavioral * 10 >= (behavioralQuestions || []).length ? 'Next →' : 'Next →')}
                            </button>
                          </div>
                        </>
                      ) : activeInterviewTab === 'roadmap' && (roadmapData || []).length > 0 ? (
                        <div className="space-y-8 pl-6 border-l-2 border-purple-500/30">
                          {(roadmapData || []).map((step, i) => (
                            <div key={i} className="relative bg-slate-800/40 p-6 rounded-2xl border border-white/5">
                              <div className="absolute -left-[33px] top-6 size-4 bg-purple-500 rounded-full border-4 border-slate-900" />
                              <h4 className="text-purple-400 font-bold text-xs uppercase mb-1">Step {i + 1}: {step.title}</h4>
                              <p className="text-white/70 text-sm leading-relaxed">{step.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <p className="text-white/60">No questions available. Generate some to get started!</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-8 pl-6 border-l-2 border-purple-500/30">
                      {roadmapData?.map((step, i) => (
                        <div key={i} className="relative bg-slate-800/40 p-6 rounded-2xl border border-white/5">
                          <div className="absolute -left-[33px] top-6 size-4 bg-purple-500 rounded-full border-4 border-slate-900" />
                          <h4 className="text-purple-400 font-bold text-xs uppercase mb-1">Step {i + 1}: {step.title}</h4>
                          <p className="text-white/70 text-sm leading-relaxed">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default FileUpload;