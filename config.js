const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// If local, use the full localhost URL. 
// If on Vercel, use an empty string so it calls the same domain (relative path)
export const BACKEND_URL = isLocal ? 'http://localhost:3000' : '';