import app from '../server/src/server.js';

export default function handler(req, res) {
  // Ensure the request path has /api prefix for Express router matching
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
