
import { useState } from 'react'
import { FileText, Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import axios from 'axios'

const FileUpload = () => {
  const [resumeFile, setResumeFile] = useState(null)
  const [jobDescription, setJobDescription] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/pdf') {
      setResumeFile(file)
      setError('')
    } else {
      setError('Please upload a valid PDF file')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!resumeFile || !jobDescription.trim()) {
      setError('Please upload a resume and provide a job description')
      return
    }

    setIsProcessing(true)
    setError('')
    setResult(null)

    const formData = new FormData()
    formData.append('resume', resumeFile)
    formData.append('jobDescription', jobDescription)

    try {
      const response = await axios.post('/api/match', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setResult(response.data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred during analysis')
    } finally {
      setIsProcessing(false)
    }
  }

  const getMatchBgColor = (percentage) => {
    if (percentage >= 80) return 'border-green-500'
    if (percentage >= 60) return 'border-yellow-500'
    return 'border-red-500'
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex justify-center items-center mb-6">
            <FileText className="w-12 h-12 text-blue-400 mr-4" />
            <h1 className="text-4xl font-bold">AI Resume Matcher</h1>
            <FileText className="w-12 h-12 text-indigo-400 ml-4" />
          </div>
          <p className="text-xl text-gray-400">Advanced AI-powered resume analysis</p>
        </div>

        {!result ? (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <Upload className="w-6 h-6 mr-3 text-blue-400" /> Upload Resume
              </h2>
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
                <input type="file" id="resume-upload" accept=".pdf" onChange={handleFileChange} className="hidden" />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <p className="text-gray-300">{resumeFile ? resumeFile.name : 'Click to upload PDF'}</p>
                </label>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
              <h2 className="text-2xl font-semibold mb-6 flex items-center">
                <FileText className="w-6 h-6 mr-3 text-indigo-400" /> Job Description
              </h2>
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full h-48 bg-gray-700 border border-gray-600 rounded-lg p-4 text-white"
              />
            </div>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-xl p-8 border border-gray-700">
            <h2 className="text-2xl font-semibold mb-8 text-center">Analysis Results</h2>
            <div className="flex justify-center mb-12">
              <div className="relative w-56 h-56 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-8 border-gray-700"></div>
                <div className={`absolute inset-0 rounded-full border-8 ${getMatchBgColor(result.matchPercentage)} border-t-transparent border-r-transparent transform rotate-45`}></div>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-extrabold text-white leading-none">{result.matchPercentage}%</span>
                  <span className="text-sm font-bold text-gray-400 mt-2 uppercase">Match Score</span>
                </div>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center text-yellow-400"><AlertCircle className="mr-2" /> Missing Keywords</h3>
                <div className="flex flex-wrap gap-2">
                  {result.missingKeywords.map((k, i) => (
                    <span key={i} className="px-3 py-1 bg-red-900 bg-opacity-50 border border-red-600 rounded-full text-sm">{k}</span>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center text-green-400"><CheckCircle className="mr-2" /> AI Feedback</h3>
                <p className="bg-gray-700 p-4 rounded-lg text-gray-300">{result.feedback}</p>
              </div>
            </div>
          </div>
        )}

        {error && <div className="mt-6 bg-red-900 p-4 rounded-lg text-red-300">{error}</div>}

        <div className="text-center mt-8">
          {!result ? (
            <button onClick={handleSubmit} disabled={isProcessing} className="bg-blue-600 px-8 py-4 rounded-lg font-bold">
              {isProcessing ? <Loader2 className="animate-spin" /> : 'Analyze Resume'}
            </button>
          ) : (
            <button onClick={() => {setResult(null); setResumeFile(null); setJobDescription('')}} className="bg-gray-700 px-8 py-4 rounded-lg font-bold">
              Analyze Another
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default FileUpload
