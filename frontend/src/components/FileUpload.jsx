import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Upload, CheckCircle, AlertCircle, Loader2, BrainCircuit, History, Rocket, Settings, Home } from 'lucide-react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'

// Sub-component for individual questions to manage show/hide state safely
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
  const [interviewPrep, setInterviewPrep] = useState(null)
  const [loadingInterview, setLoadingInterview] = useState(false)
  const [activeInterviewTab, setActiveInterviewTab] = useState('technical')
  const [allQuestions, setAllQuestions] = useState({ technical: [], behavioral: [] })
  const [currentPage, setCurrentPage] = useState(1)
  const [loadingMoreQuestions, setLoadingMoreQuestions] = useState(false)
  
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

  const handleManualJobSearch = async () => {
    console.log('🚀 Manual Job Search Clicked');
    const identifiedRole = result?.role || 'Professional';
    
    if (!result) {
      setError('Analysis incomplete.');
      return;
    }

    const searchQueryBase = identifiedRole;
    const topSkill = (result?.missingKeywords || [])[0] || '';
    const dynamicQuery = `${searchQueryBase} ${topSkill}`.trim();

    try {
      setSearchingJobs(true);
      const url = `/api/jobs?query=${encodeURIComponent(dynamicQuery)}`;
      const response = await axios.get(url);
      
      if (response.data.success) {
        navigate('/jobs', { 
          state: { 
            jobs: response.data.jobs, 
            role: dynamicQuery 
          } 
        });
      }
    } catch (err) {
      setError('Job search failed.');
    } finally {
      setSearchingJobs(false);
    }
  };

  const handleInterviewPrep = async (isLoadMore = false) => {
    console.log('🚀 Prep Button Clicked!');
    
    if (!result) {
      setError('Wait for analysis to finish.');
      return;
    }

    const finalResume = persistentResume || '';
    const finalJD = persistentJobDescription || jobDescription || '';
    
    if (isLoadMore) {
      setLoadingMoreQuestions(true)
    } else {
      setLoadingInterview(true)
      setAllQuestions({ technical: [], behavioral: [] })
      setCurrentPage(1)
    }
    
    setError('')
    
    try {
      const batchNumber = isLoadMore ? Math.floor(allQuestions.technical.length / 10) + 1 : 1;
      const response = await axios.post('http://localhost:5000/api/match/generate-prep', {
        resumeText: finalResume,
        jobDescription: finalJD,
        batchNumber: batchNumber
      });
      
      if (response.data.success) {
        const newBatch = response.data.interviewPrep;
        setAllQuestions(prev => ({
          technical: [...prev.technical, ...(newBatch.technicalQuestions || [])],
          behavioral: [...prev.behavioral, ...(newBatch.behavioralQuestions || [])]
        }));
        setInterviewPrep(newBatch);
        console.log('✅ Prep Data Loaded');
      }
    } catch (err) {
      setError('AI is busy. Please try again.');
    } finally {
      setLoadingInterview(false)
      setLoadingMoreQuestions(false)
      setIsProcessing(false) // CRITICAL: Unlock the UI
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    setInterviewPrep(null);
    setError('');

    if (!resumeFile || !jobDescription.trim()) {
      setError('Please upload a resume and provide a job description');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('resume', resumeFile);
    formData.append('jobDescription', jobDescription);

    try {
      const response = await axios.post('/api/match', formData);
      if (response.data.success) {
        const extractedText = response.data.resumeText || '';
        setResult(response.data.data); 
        setPersistentResume(extractedText);
        setPersistentJobDescription(jobDescription);
        console.log('✅ Analysis Complete. UI Unlocking...');
      }
    } catch (err) {
      setError('Server Error. Check your backend console.');
    } finally {
      setIsProcessing(false); // CRITICAL: Reset processing state
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1e293b,_#0f172a,_#020617)] text-white pb-24 relative">
      <header className="sticky top-0 z-50 flex items-center justify-between p-6 bg-slate-900/50 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-cyan-500/20 border border-cyan-500/50 flex items-center justify-center font-bold text-cyan-400">YC</div>
          <h2 className="text-2xl font-bold tracking-tight">Resume Intelligence</h2>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 pt-8 space-y-8">
        {isProcessing ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-cyan-400 w-12 h-12 mb-4" />
            <p className="text-white/60 animate-pulse">AI is decoding your profile...</p>
          </div>
        ) : !result ? (
          <div className="space-y-6">
            <div className="rounded-2xl p-12 border-dashed border-2 border-white/10 flex flex-col items-center justify-center bg-slate-900/20 hover:border-cyan-500/30 transition-all">
              <input type="file" id="resume-upload" accept=".pdf" onChange={handleFileChange} className="hidden" />
              <label htmlFor="resume-upload" className="cursor-pointer text-center">
                <div className="size-20 rounded-2xl bg-cyan-500/10 flex items-center justify-center mx-auto mb-6">
                  <Upload className="text-cyan-400 w-10 h-10" />
                </div>
                <h3 className="font-bold text-xl mb-2">{resumeFile ? resumeFile.name : 'Upload Resume'}</h3>
                <p className="text-white/40 text-sm">PDF format only</p>
              </label>
              {resumeFile && (
                <button onClick={handleSubmit} className="w-full max-w-xs mt-6 py-4 bg-cyan-500 text-slate-900 font-bold uppercase rounded-xl hover:bg-cyan-400 transition-all">
                  Analyze Profile
                </button>
              )}
            </div>

            <div className="rounded-3xl p-8 border border-white/10 bg-slate-900/40">
              <label className="block text-[10px] font-black uppercase text-cyan-400/80 mb-4">Job Requirements</label>
              <textarea
                value={jobDescription}
                onChange={handleJobDescriptionChange}
                className="w-full bg-slate-950/40 border border-white/5 text-slate-200 rounded-2xl p-6 text-sm outline-none min-h-[150px] focus:border-cyan-500/40 transition-all"
                placeholder="Paste the Job Description here..."
              />
            </div>
            {error && <p className="text-red-400 text-sm text-center font-bold bg-red-400/10 py-3 rounded-xl border border-red-400/20">{error}</p>}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Analysis Result Card */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="rounded-3xl p-8 flex flex-col items-center justify-center bg-slate-900/60 border border-white/10">
                <div className="relative w-32 h-32 flex items-center justify-center mb-4">
                   <span className="text-4xl font-black text-cyan-400">{result?.matchPercentage}%</span>
                </div>
                <span className="text-[10px] font-black uppercase text-white/40">Match Score</span>
                <button onClick={() => setResult(null)} className="mt-4 text-[10px] text-cyan-400 uppercase font-bold border-b border-cyan-400/30">Reset</button>
              </div>

              <div className="md:col-span-2 rounded-3xl p-8 border border-white/10 bg-slate-900/40">
                <h3 className="text-cyan-400 font-bold mb-4 flex items-center gap-2"><BrainCircuit size={18}/> AI Feedback</h3>
                <p className="text-sm text-white/80 leading-relaxed">{result?.feedback}</p>
              </div>
            </div>

            {/* Missing Skills */}
            <div className="rounded-3xl p-8 border border-white/10 bg-slate-900/40">
              <h3 className="text-red-400 font-bold mb-6 flex items-center gap-2"><AlertCircle size={18}/> Missing Keywords</h3>
              <div className="flex flex-wrap gap-3">
                {result?.missingKeywords?.map((skill, i) => (
                  <span key={i} className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 uppercase">{skill}</span>
                ))}
              </div>
            </div>

            {/* Action Buttons - These are the ones we fixed */}
            <div className="flex flex-wrap justify-center gap-6 py-4">
              <button
                type="button"
                onClick={() => handleInterviewPrep(false)}
                disabled={isProcessing || loadingInterview}
                className={`px-10 py-5 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold uppercase tracking-widest rounded-2xl flex items-center gap-3 transition-all shadow-lg ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
              >
                {loadingInterview ? <Loader2 className="animate-spin" size={20} /> : <Rocket size={20} />}
                Generate Interview Prep
              </button>
              
              <button
                type="button"
                onClick={handleManualJobSearch}
                disabled={searchingJobs}
                className={`px-10 py-5 bg-slate-900 border-2 border-cyan-500/30 text-cyan-400 font-bold uppercase tracking-widest rounded-2xl flex items-center gap-3 transition-all ${searchingJobs ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
              >
                {searchingJobs ? <Loader2 className="animate-spin" size={20} /> : <Home size={20} />}
                Find Matching Jobs
              </button>
            </div>

            {/* Interview Prep Display */}
            {allQuestions.technical.length > 0 && (
              <div className="rounded-3xl border border-white/10 bg-slate-900/40 overflow-hidden">
                <div className="flex bg-white/5">
                  {['technical', 'behavioral', 'roadmap'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveInterviewTab(tab); setCurrentPage(1); }}
                      className={`flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeInterviewTab === tab ? 'bg-purple-500/20 text-purple-400 border-b-2 border-purple-500' : 'text-white/40'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="p-8">
                  {activeInterviewTab !== 'roadmap' ? (
                    <div className="space-y-6">
                      {allQuestions[activeInterviewTab]
                        .slice((currentPage - 1) * 10, currentPage * 10)
                        .map((q, i) => (
                          <QuestionCard key={i} q={q} index={(currentPage - 1) * 10 + i} />
                        ))}
                      
                      <div className="flex items-center justify-between pt-8 border-t border-white/10 mt-10">
                        <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="text-xs uppercase font-bold text-white/40 disabled:opacity-0">← Previous</button>
                        <span className="text-xs font-bold text-purple-400">Page {currentPage}</span>
                        <button onClick={() => {
                          const maxPage = Math.ceil(allQuestions[activeInterviewTab].length / 10);
                          if (currentPage < maxPage) setCurrentPage(p => p + 1);
                          else handleInterviewPrep(true);
                        }} className="text-xs uppercase font-bold text-purple-400">{currentPage * 10 >= allQuestions[activeInterviewTab].length ? 'Generate More' : 'Next →'}</button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8 pl-6 border-l-2 border-purple-500/30">
                      {interviewPrep?.roadmap?.map((step, i) => (
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