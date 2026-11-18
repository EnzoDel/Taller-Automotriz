import axios from 'axios';

const apiHostname = typeof window === 'undefined' ? 'localhost' : window.location.hostname;

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : `http://${apiHostname}:3000/api`),
  withCredentials: true,
  timeout: import.meta.env.PROD ? 60000 : 10000,
});

export default api;
