import axios from 'axios';

const instance = axios.create({
  // This uses the environment variable you set in Vercel
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  withCredentials: true
});

export default instance;