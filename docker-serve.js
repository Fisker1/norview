const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const API_TARGET = 'http://127.0.0.1:3001';
const DIST = path.join(__dirname, 'dist');

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  // Proxy /api requests to Express backend
  if (req.url.startsWith('/api')) {
    const options = {
      hostname: '127.0.0.1',
      port: 3001,
      path: req.url,
      method: req.method,
      headers: req.headers,
    };
    const proxy = http.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxy.on('error', () => {
      res.writeHead(502);
      res.end('API proxy error');
    });
    req.pipe(proxy);
    return;
  }

  // Serve static files from dist/
  let filePath = path.join(DIST, req.url === '/' ? 'index.html' : req.url);
  const ext = path.extname(filePath);

  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // SPA fallback — serve index.html for client-side routes
      filePath = path.join(DIST, 'index.html');
    }
    const mime = MIME[path.extname(filePath)] || 'application/octet-stream';
    const stream = fs.createReadStream(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    stream.pipe(res);
    stream.on('error', () => { res.writeHead(500); res.end(); });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`norview production server running on http://localhost:${PORT}`);
});
