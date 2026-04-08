import React from 'react';
import { LogOut, User, BrainCircuit } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="bg-zinc-900 border-b border-white/10 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Left Side: Branding */}
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center font-bold text-emerald-500">
            <BrainCircuit size={20} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Resume <span className="text-emerald-500">Intelligence</span>
          </h1>
        </div>
        
        {/* Right Side: Auth Buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <button
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all border border-emerald-500/20 font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="px-4 py-2 bg-white/5 text-white rounded-lg hover:bg-white/10 transition-all border border-white/10 font-medium"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 bg-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/30 transition-all border border-rose-500/20"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-all border border-emerald-500/20 font-medium"
              >
                Login
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 bg-emerald-500 text-black rounded-lg hover:bg-emerald-400 transition-all font-bold"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;
