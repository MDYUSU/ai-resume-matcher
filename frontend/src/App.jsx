import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FileUpload from './components/FileUpload'
import JobResults from './components/JobResults'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FileUpload />} />
        <Route path="/jobs" element={<JobResults />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
