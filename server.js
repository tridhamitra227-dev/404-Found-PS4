/**
 * Serenova Backend Server
 * Pure Node.js — no external dependencies required
 * API Key: eca207d89b70b4a5fca6763c59d5577820bc0ec3
 */

const http = require('http');
const crypto = require('crypto');
const { db, initDB } = require('./db');
const { router } = require('./router');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

// Boot database then start server
initDB().then(() => {
  const server = http.createServer((req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // Parse body then route
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {};
      } catch {
        req.body = {};
      }
      router(req, res);
    });
  });

  server.listen(PORT, HOST, () => {
    console.log(`\n🌴  Serenova API running at http://${HOST}:${PORT}`);
    console.log(`📋  Health check: GET http://${HOST}:${PORT}/api/health\n`);
  });
}).catch(err => {
  console.error('Failed to initialise database:', err);
  process.exit(1);
});
