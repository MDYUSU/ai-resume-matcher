import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Download } from 'lucide-react';
import axios from '../api/axios';
import { motion, AnimatePresence } from 'framer-motion'

const SkeletonCard = () => (
  <div className="bg-zinc-900 border border-white/5 rounded-xl p-6 mb-4 animate-pulse print:hidden">
    <div className="flex items-start justify-between">
      <div className="h-6 bg-zinc-800/80 rounded w-3/4 mb-3"></div>
      <div className="h-8 bg-zinc-800/50 rounded w-28 ml-4"></div>
    </div>
    <div className="mt-4 pl-8 border-l-2 border-zinc-800/50 space-y-3">
      <div className="h-20 bg-zinc-800/40 rounded-lg w-full"></div>
    </div>
  </div>
);

const QuestionCard = ({ question, index, type }) => {
  const [showAnswer, setShowAnswer] = useState(false);

  return (
    <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 mb-4 print:border-zinc-300 print:bg-white print:shadow-none break-inside-avoid">
      <div className="flex items-start justify-between">
        <h4 className="text-white font-bold text-lg flex-1 mb-3 flex items-start gap-3 print:text-black">
          <span className="text-emerald-500">Q{index + 1}:</span> {question.question}
        </h4>
        <button
          onClick={() => setShowAnswer(!showAnswer)}
          className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all text-sm font-bold ml-4 border border-emerald-500/20 print:hidden"
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
            <div className="mt-4 pl-8 border-l-2 border-emerald-500/30 space-y-3">
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg print:bg-zinc-50 print:border-zinc-200">
                <p className="text-emerald-400 font-black text-[10px] uppercase tracking-widest mb-2 print:text-emerald-600">✅ Model Answer</p>
                <p className="text-zinc-300 mb-2 leading-relaxed print:text-black">{question.modelAnswer}</p>
              </div>
              <div className="bg-zinc-800/50 border border-zinc-700 p-4 rounded-lg print:bg-zinc-50 print:border-zinc-200">
                <p className="text-zinc-300 font-black text-[10px] uppercase tracking-widest mb-2 print:text-zinc-600">💡 Interviewer's Intention</p>
                <p className="text-white/90 text-sm leading-relaxed print:text-black">{question.intention}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const InterviewPrep = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const state = location.state || {};
  const resumeText = state.resumeText || state.scanData?.resumeText || '';
  const jobDescription = state.jobDescription || state.scanData?.jobDescription || '';
  const scanData = state.scanData || state.data || state;

  const [technicalQuestions, setTechnicalQuestions] = useState([]);
  const [behavioralQuestions, setBehavioralQuestions] = useState([]);
  const [roadmapData, setRoadmapData] = useState([]);
  const [activeInterviewTab, setActiveInterviewTab] = useState('technical');
  const [currentPage, setCurrentPage] = useState({ technical: 1, behavioral: 1, roadmap: 1 });
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true); 
  const [error, setError] = useState('');

  const handleInterviewPrep = async (isLoadMore = false) => {
    if (!resumeText || !jobDescription) {
      setError('Missing resume text or job description');
      return;
    }

    if (!isLoadMore) {
      setInitialLoading(true);
      setError('');
    } else {
      setIsGeneratingMore(true);
    }

    try {
      const response = await axios.post('/api/match/generate-prep', {
        resumeText: resumeText,
        jobDescription: jobDescription.trim(),
        type: activeInterviewTab,
        page: isLoadMore ? currentPage[activeInterviewTab] + 1 : 1
      });

      if (response.data.success) {
        const data = response.data.interviewPrep || {};
        
        if (isLoadMore) {
          if (activeInterviewTab === 'technical') {
            const newQuestions = data.technicalQuestions || [];
            if (newQuestions.length > 0) {
              setTechnicalQuestions(prev => [...prev, ...newQuestions]);
              setCurrentPage(prev => ({ ...prev, technical: prev.technical + 1 }));
            } else {
              setError("No more unique questions could be generated.");
            }
          } else if (activeInterviewTab === 'behavioral') {
            const newQuestions = data.behavioralQuestions || [];
            if (newQuestions.length > 0) {
              setBehavioralQuestions(prev => [...prev, ...newQuestions]);
              setCurrentPage(prev => ({ ...prev, behavioral: prev.behavioral + 1 }));
            } else {
              setError("No more unique questions could be generated.");
            }
          } else if (activeInterviewTab === 'roadmap') {
            const newRoadmap = data.roadmap || [];
            if (newRoadmap.length > 0) {
              setRoadmapData(prev => [...prev, ...newRoadmap]);
              setCurrentPage(prev => ({ ...prev, roadmap: prev.roadmap + 1 }));
            } else {
              setError("No further roadmap steps could be generated.");
            }
          }
        } else {
          setTechnicalQuestions(data.technicalQuestions || []);
          setBehavioralQuestions(data.behavioralQuestions || []);
          setRoadmapData(data.roadmap || []);
          setCurrentPage({ technical: 1, behavioral: 1, roadmap: 1 });
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate interview prep');
    } finally {
      setIsGeneratingMore(false);
      setInitialLoading(false); 
    }
  };

  useEffect(() => {
    if (resumeText && jobDescription) {
      handleInterviewPrep(false);
    }
  }, [activeInterviewTab]);

  const handleDownloadPDF = () => {
    window.print();
  };

  if (!resumeText || !jobDescription) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Missing Required Data</h2>
          <p className="text-zinc-400 mb-6">Please upload a resume and job description first.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-emerald-500 text-black font-bold rounded-full hover:bg-emerald-400 transition-all flex items-center gap-2 mx-auto"
          >
            <ArrowLeft size={20} />
            Back to Analysis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        <div className="mb-8 flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/')}
              className="mb-6 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg hover:bg-zinc-700 transition-all flex items-center gap-2 print:hidden"
            >
              <ArrowLeft size={16} />
              Back to Analysis
            </button>
            <h1 className="text-3xl font-bold mb-2 print:text-black">Interview Preparation</h1>
            <p className="text-zinc-400 print:text-zinc-600">Practice questions and learning roadmap tailored to your profile</p>
          </div>

          <button
            onClick={handleDownloadPDF}
            className="px-5 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg hover:bg-emerald-500/20 transition-all flex items-center gap-2 font-bold print:hidden self-start"
          >
            <Download size={18} />
            Export to PDF
          </button>
        </div>

        <div className="flex gap-1 mb-8 bg-zinc-900/50 p-1 rounded-xl border border-white/10 print:hidden">
          {['technical', 'behavioral', 'roadmap'].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveInterviewTab(tab); }} 
              className={`flex-1 px-6 py-4 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg ${activeInterviewTab === tab ? 'bg-emerald-500/20 text-emerald-400 border-b-2 border-emerald-500' : 'text-white/40 hover:text-zinc-300 hover:bg-white/5'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 print:hidden">
              {error}
            </div>
          )}

          {initialLoading ? (
            <div>
              <h2 className="text-xl font-bold mb-4 text-emerald-400 capitalize">{activeInterviewTab} Content</h2>
              {[1, 2, 3].map((n) => <SkeletonCard key={n} />)}
            </div>
          ) : (
            <>
              {activeInterviewTab === 'technical' && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-emerald-400 print:text-emerald-600">Technical Questions</h2>
                  {technicalQuestions.length > 0 ? (
                    <div>
                      {technicalQuestions
                        .slice((currentPage.technical - 1) * 10, currentPage.technical * 10)
                        .map((q, i) => (
                          <QuestionCard key={`tech-${(currentPage.technical - 1) * 10 + i}`} question={q} index={(currentPage.technical - 1) * 10 + i} type="technical" />
                        ))}
                      
                      <div className="flex items-center justify-between mt-8 print:hidden">
                        <button 
                          onClick={() => setCurrentPage(prev => ({ ...prev, technical: Math.max(1, prev.technical - 1) }))} 
                          disabled={currentPage.technical === 1} 
                          className="text-xs uppercase font-bold text-white/40 disabled:opacity-0 pointer-events-auto cursor-pointer hover:text-emerald-400 transition-colors"
                        >
                          ← Previous
                        </button>
                        <span className="text-xs font-bold text-emerald-400">Page {currentPage.technical}</span>
                        <button 
                          onClick={() => {
                            const maxPage = Math.ceil((technicalQuestions || []).length / 10);
                            if (currentPage.technical < maxPage) {
                              setCurrentPage(prev => ({ ...prev, technical: prev.technical + 1 }));
                            } else {
                              handleInterviewPrep(true);
                            }
                          }} 
                          disabled={isGeneratingMore}
                          className="text-xs uppercase font-bold text-white/40 disabled:opacity-0 pointer-events-auto cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-2"
                        >
                          {isGeneratingMore ? <Loader2 className="animate-spin" size={14} /> : 'Next →'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 print:hidden">
                      <p className="text-zinc-400">No technical questions available.</p>
                    </div>
                  )}
                </div>
              )}

              {activeInterviewTab === 'behavioral' && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-emerald-400 print:text-emerald-600">Behavioral Questions</h2>
                  {behavioralQuestions.length > 0 ? (
                    <div>
                      {behavioralQuestions
                        .slice((currentPage.behavioral - 1) * 10, currentPage.behavioral * 10)
                        .map((q, i) => (
                          <QuestionCard key={`behav-${(currentPage.behavioral - 1) * 10 + i}`} question={q} index={(currentPage.behavioral - 1) * 10 + i} type="behavioral" />
                        ))}
                      
                      <div className="flex items-center justify-between mt-8 print:hidden">
                        <button 
                          onClick={() => setCurrentPage(prev => ({ ...prev, behavioral: Math.max(1, prev.behavioral - 1) }))} 
                          disabled={currentPage.behavioral === 1} 
                          className="text-xs uppercase font-bold text-white/40 disabled:opacity-0 pointer-events-auto cursor-pointer hover:text-emerald-400 transition-colors"
                        >
                          ← Previous
                        </button>
                        <span className="text-xs font-bold text-emerald-400">Page {currentPage.behavioral}</span>
                        <button 
                          onClick={() => {
                            const maxPage = Math.ceil((behavioralQuestions || []).length / 10);
                            if (currentPage.behavioral < maxPage) {
                              setCurrentPage(prev => ({ ...prev, behavioral: prev.behavioral + 1 }));
                            } else {
                              handleInterviewPrep(true);
                            }
                          }} 
                          disabled={isGeneratingMore}
                          className="text-xs uppercase font-bold text-white/40 disabled:opacity-0 pointer-events-auto cursor-pointer hover:text-emerald-400 transition-colors flex items-center gap-2"
                        >
                          {isGeneratingMore ? <Loader2 className="animate-spin" size={14} /> : 'Next →'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 print:hidden">
                      <p className="text-zinc-400">No behavioral questions available.</p>
                    </div>
                  )}
                </div>
              )}

              {activeInterviewTab === 'roadmap' && (
                <div>
                  <h2 className="text-xl font-bold mb-4 text-emerald-400 print:text-emerald-600">Learning Roadmap</h2>
                  {roadmapData.length > 0 ? (
                    <div className="space-y-4">
                      {roadmapData.map((step, i) => (
                        <div key={i} className="bg-zinc-900 border border-white/10 rounded-xl p-6 print:bg-white print:border-zinc-300 break-inside-avoid">
                          <h3 className="text-lg font-semibold text-emerald-400 mb-2 print:text-black">
                            <span className="text-emerald-500 mr-2">Step {i + 1}:</span> {step.title}
                          </h3>
                          <p className="text-zinc-300 print:text-zinc-800">{step.description}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 print:hidden">
                      <p className="text-zinc-400">No learning roadmap available.</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;