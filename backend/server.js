const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// --- Middleware ---
// Optimized CORS to allow your Vite frontend specifically
app.use(cors({
    origin: 'http://localhost:5173', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' })); // Increased limit for long resumes/JDs
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from the uploads folder
app.use('/uploads', express.static(uploadDir));

// --- MongoDB Connection ---
console.log('🔍 Checking environment variables...');
if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is missing from .env file!');
}

mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas'))
    .catch((err) => console.error('❌ MongoDB connection error:', err));

// --- Routes ---
// This mounts your match routes at http://localhost:5000/api/match
// So /generate-prep becomes http://localhost:5000/api/match/generate-prep
app.use('/api/match', require('./routes/match'));
app.use('/api/jobs', require('./routes/jobs'));

// Health Check
app.get('/', (req, res) => {
    res.json({ status: 'Online', message: 'AI Resume Matcher API is running' });
});

// --- 404 Handler ---
app.use((req, res) => {
    res.status(404).json({ message: `Route ${req.originalUrl} not found` });
});

// --- Global Error Handler ---
app.use((err, req, res, next) => {
    console.error('🔥 Server Error:', err.stack);
    res.status(err.status || 500).json({ 
        success: false,
        message: err.message || 'Internal Server Error' 
    });
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`);
    console.log(`📡 API Endpoints: http://localhost:${PORT}/api/match`);
});