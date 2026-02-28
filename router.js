/**
 * Serenova — API Router
 * Handles all route matching and dispatches to handlers
 */

const { handlers } = require('./handlers');

// Simple pattern matcher: /api/resorts/:id -> { id: 'actual-id' }
function matchRoute(pattern, urlPath) {
  const patternParts = pattern.split('/');
  const urlParts = urlPath.split('/');
  if (patternParts.length !== urlParts.length) return null;
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = decodeURIComponent(urlParts[i]);
    } else if (patternParts[i] !== urlParts[i]) {
      return null;
    }
  }
  return params;
}

// Route table: [method, pattern, handler, requiresAuth?, requiresApiKey?]
const ROUTES = [
  ['GET',    '/api/health',                          'health',          false, false],
  // Auth
  ['POST',   '/api/auth/register',                   'register',        false, false],
  ['POST',   '/api/auth/login',                      'login',           false, false],
  ['POST',   '/api/auth/logout',                     'logoutUser',      true,  false],
  ['GET',    '/api/auth/me',                         'me',              true,  false],
  // Resorts
  ['GET',    '/api/resorts',                         'listResorts',     false, false],
  ['GET',    '/api/resorts/:id',                     'getResort',       false, false],
  // Reviews — protected by API key
  ['GET',    '/api/resorts/:id/reviews',             'listReviews',     false, true],
  ['GET',    '/api/resorts/:id/reviews/:category',   'listReviewsByCat',false, true],
  ['POST',   '/api/resorts/:id/reviews',             'createReview',    true,  true],
  ['DELETE', '/api/reviews/:reviewId',               'deleteReview',    true,  true],
  // Stats
  ['GET',    '/api/resorts/:id/stats',               'resortStats',     false, true],
];

const API_KEY = 'eca207d89b70b4a5fca6763c59d5577820bc0ec3';

function send(res, status, data) {
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

function router(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const urlPath = url.pathname.replace(/\/$/, '') || '/';
  req.query = Object.fromEntries(url.searchParams);

  for (const [method, pattern, handlerName, requiresAuth, requiresApiKey] of ROUTES) {
    if (req.method !== method) continue;
    const params = matchRoute(pattern, urlPath);
    if (params === null) continue;

    req.params = params;

    // API key check
    if (requiresApiKey) {
      const key = req.headers['x-api-key'] || req.query.api_key;
      if (key !== API_KEY) {
        return send(res, 401, { error: 'Invalid or missing API key. Pass X-API-Key header.' });
      }
    }

    // Auth check
    if (requiresAuth) {
      const authHeader = req.headers['authorization'] || '';
      const token = authHeader.replace('Bearer ', '').trim();
      const { db } = require('./db');
      const userId = db.sessions[token];
      if (!userId) {
        return send(res, 401, { error: 'Unauthorized. Please sign in.' });
      }
      req.userId = userId;
      req.user = db.users.find(u => u.id === userId);
    }

    // Dispatch
    const handler = handlers[handlerName];
    if (!handler) return send(res, 500, { error: `Handler "${handlerName}" not implemented` });
    return handler(req, res, send);
  }

  send(res, 404, { error: `No route found for ${req.method} ${urlPath}` });
}

module.exports = { router };
