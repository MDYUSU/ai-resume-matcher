import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, FileText, CheckCircle, Upload, LogOut } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [masterResumeName, setMasterResumeName] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('/api/user/profile', {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.data.success) {
          setMasterResumeName(response.data.data.masterResumeName || '');
        }
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isAuthenticated, navigate]);

  const handleFileChange = (file) => {
    if (file && file.type === 'application/pdf') {
      setResumeFile(file);
      setShowSuccess(false);
    } else {
      alert('Please upload a valid PDF file');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSaveResume = async () => {
    if (!resumeFile) {
      alert('Please select a PDF file');
      return;
    }

    setSaving(true);
    setShowSuccess(false);
    
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('resume', resumeFile);
      
      const response = await axios.put('/api/user/profile', formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      
      if (response.data.success) {
        setMasterResumeName(response.data.data.masterResumeName);
        setResumeFile(null);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      }
    } catch (error) {
      console.error('Failed to save resume:', error);
      alert('Failed to save resume. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    window.location.href = '/auth';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2">Profile</h1>
            <p className="text-zinc-400 text-lg">Manage your account and master resume</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-all border border-rose-500/20"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>

        {/* User Info */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <div className="size-16 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-bold text-emerald-500 text-xl">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{user?.name}</h2>
              <div className="flex items-center gap-2 text-zinc-400">
                <Mail size={16} />
                <span>{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Master Resume Section */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-emerald-500" size={24} />
            <h3 className="text-xl font-bold text-white">Master Resume</h3>
          </div>
          
          <p className="text-zinc-400 mb-6">
            Upload your master resume PDF for quick analyses without uploading files every time.
          </p>

          {/* Currently Saved Resume */}
          {masterResumeName && (
            <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-3">
              <CheckCircle className="text-emerald-400" size={20} />
              <div>
                <p className="text-emerald-400 font-medium">Currently Saved:</p>
                <p className="text-white">{masterResumeName}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {showSuccess && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl flex items-center gap-3">
              <CheckCircle size={20} />
              <span>Master resume updated successfully!</span>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <div 
            className={`relative border-2 border-dashed rounded-xl p-12 text-center transition-all ${
              dragActive 
                ? 'border-emerald-500 bg-emerald-500/5' 
                : 'border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              id="resume-upload" 
              accept=".pdf" 
              onChange={(e) => e.target.files[0] && handleFileChange(e.target.files[0])}
              className="hidden" 
            />
            <label htmlFor="resume-upload" className="cursor-pointer">
              <Upload className="text-emerald-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-bold text-white mb-2">
                {resumeFile ? resumeFile.name : 'Drop your PDF here or click to browse'}
              </h3>
              <p className="text-zinc-400 text-sm">
                Upload your master resume PDF (max 5MB)
              </p>
            </label>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSaveResume}
            disabled={!resumeFile || saving}
            className="mt-6 w-full py-3 bg-emerald-500 text-black font-bold rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
                Uploading...
              </>
            ) : (
              <>
                <Upload size={20} />
                Upload Master Resume
              </>
            )}
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-zinc-900/50 border border-white/5 rounded-xl p-6">
          <h4 className="text-lg font-semibold text-white mb-3">How to use your Master Resume:</h4>
          <ol className="space-y-2 text-zinc-400">
            <li className="flex gap-3">
              <span className="text-emerald-500 font-bold">1.</span>
              Upload your complete resume PDF using the drag & drop zone above
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-500 font-bold">2.</span>
              The system will automatically extract and save the text content
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-500 font-bold">3.</span>
              On the main page, choose "Use Saved Master Resume" for quick analyses
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default Profile;
