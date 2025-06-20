// simple-server.js
const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT   = process.env.PORT || 8501;
const PUBLIC = path.resolve(__dirname);

const MIME = {
  '.html': 'text/html',
  '.js'  : 'application/javascript',
  '.css' : 'text/css',
  '.json': 'application/json',
  '.geojson': 'application/json',
  '.csv' : 'text/csv',
  '.png' : 'image/png',
  '.jpg' : 'image/jpeg',
  '.svg' : 'image/svg+xml',
  // ...
};

http
  .createServer((req, res) => {
    // monta o caminho do arquivo requisitado
    let filePath = path.join(PUBLIC, req.url === '/' ? 'index.html' : req.url);
    let ext      = path.extname(filePath).toLowerCase();
    let contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // não encontrou: devolve index.html (SPA fallback)
        fs.readFile(path.join(PUBLIC, 'index.html'), (e, d) => {
          if (e) {
            res.writeHead(500).end('Erro interno');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(d);
          }
        });
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  })
  .listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
