import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrainCircuit, Calendar, Target, TrendingUp, Eye, FileText, Trash2 } from 'lucide-react';
// This now uses your custom bridge with the Interceptor
import axios from '../api/axios'; 
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const fetchScans = async () => {
      try {
        // CLEANUP: We no longer need to manually pass headers. 
        // Our axios interceptor handles the token automatically!
        const response = await axios.get('/api/match/history');
        
        if (response.data.success) {
          setScans(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch scans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [isAuthenticated, navigate]);

  const handleDelete = async (id) => {
    try {
      // CLEANUP: Manual headers removed
      await axios.delete('/api/match/history/' + id);
      setScans(scans.filter(s => s._id !== id));
    } catch (error) {
      console.error('Failed to delete scan:', error);
      alert('Failed to delete scan. Please try again.');
    }
  };

  const handleClearAll = async () => {
    if (window.confirm("Are you sure you want to delete ALL your scan history? This cannot be undone.")) {
      try {
        // CLEANUP: Manual headers removed
        await axios.delete('/api/match/history/all');
        setScans([]); 
      } catch (error) {
        console.error("Failed to clear all scans", error);
        alert("Failed to clear history.");
      }
    }
  };

  const getScoreColor = (score) => {
    if (score > 80) return 'text-emerald-400';
    if (score > 60) return 'text-yellow-400';
    return 'text-rose-400';
  };

  const getScoreBgColor = (score) => {
    if (score > 80) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score > 60) return 'bg-yellow-500/20 border-yellow-500/30';
    return 'bg-rose-500/20 border-rose-500/30';
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-zinc-400">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">
            Welcome back, <span className="text-emerald-500">{user?.name}</span>
          </h1>
          <p className="text-zinc-400 text-lg">Your resume analysis history and insights</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <FileText className="text-emerald-500" size={24} />
              <span className="text-2xl font-bold text-white">{scans.length}</span>
            </div>
            <p className="text-zinc-400">Total Scans</p>
          </div>
          
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingUp className="text-emerald-500" size={24} />
              <span className="text-2xl font-bold text-white">
                {scans.length > 0 ? Math.round(scans.reduce((acc, scan) => acc + (scan.matchScore || 0), 0) / scans.length) : 0}%
              </span>
            </div>
            <p className="text-zinc-400">Average Match Score</p>
          </div>
          
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Target className="text-emerald-500" size={24} />
              <span className="text-2xl font-bold text-white">
                {scans.filter(scan => scan.matchScore > 80).length}
              </span>
            </div>
            <p className="text-zinc-400">Strong Matches</p>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Recent Resume Scans</h2>
            
            {scans.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg hover:bg-rose-500/20 transition-all font-bold text-sm flex items-center gap-2"
              >
                <Trash2 size={16} />
                Clear All History
              </button>
            )}
          </div>
          
          {scans.length === 0 ? (
            <div className="bg-zinc-900 border border-white/10 rounded-xl p-12 text-center">
              <BrainCircuit className="text-emerald-500 mx-auto mb-4" size={48} />
              <h3 className="text-xl font-semibold text-white mb-2">No scans yet</h3>
              <p className="text-zinc-400 mb-6">Upload your resume and start analyzing job matches</p>
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-emerald-500 text-black font-bold rounded-lg hover:bg-emerald-400 transition-all"
              >
                Start Your First Scan
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {scans.map((scan, index) => (
                <div key={scan._id || index} className="bg-zinc-900 border border-white/10 rounded-xl p-6 hover:border-emerald-500/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`px-3 py-1 rounded-lg border ${getScoreBgColor(scan.matchScore)}`}>
                      <span className={`font-bold ${getScoreColor(scan.matchScore)}`}>
                        {scan.matchScore}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="text-zinc-500" size={16} />
                      <button
                        onClick={() => handleDelete(scan._id)}
                        className="text-rose-400 hover:text-rose-300 transition-colors"
                        title="Delete scan"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-white font-semibold mb-2 line-clamp-2">
                    {scan.jobRole || scan.role || "Software Engineer"}
                  </h3>
                  
                  <p className="text-zinc-400 text-sm mb-4">
                    {formatDate(scan.timestamp)}
                  </p>
                  
                  <button
                    onClick={() => navigate('/', { state: { scanData: scan } })}
                    className="w-full py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all border border-emerald-500/20 font-medium"
                  >
                    <Eye size={16} className="inline mr-2" />
                    View Details
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;