import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import FileUpload from './components/FileUpload'
import JobResults from './components/JobResults'
import InterviewPrep from './pages/InterviewPrep'
import AuthPage from './pages/AuthPage'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'

import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    // 2. WRAP YOUR ROUTER WITH THE AUTH PROVIDER
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<FileUpload />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/jobs" element={<JobResults />} />
          <Route path="/prep" element={<InterviewPrep />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
export default App
