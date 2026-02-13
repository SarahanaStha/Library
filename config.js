const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

// On Vercel, we use relative paths. 
// This means the browser calls "https://your-site.vercel.app/api/books"
export const BACKEND_URL = isLocal ? 'http://localhost:3000' : '';