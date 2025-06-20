// simple-server.js
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT   = process.env.PORT || 8053;
const PUBLIC = path.resolve(__dirname);

const MIME = {
  '.html'   : 'text/html',
  '.js'     : 'application/javascript',
  '.css'    : 'text/css',
  '.json'   : 'application/json',
  '.geojson': 'application/json',
  '.csv'    : 'text/csv',
  '.png'    : 'image/png',
  '.jpg'    : 'image/jpeg',
  '.svg'    : 'image/svg+xml',
};

http
  .createServer((req, res) => {
    // 1) Extrai só o caminho, sem query string
    const parsed = new URL(req.url, `http://${req.headers.host}`);
    let pathname = decodeURIComponent(parsed.pathname);

    // 2) Mapeia "/" para index.html
    let filePath = path.join(
      PUBLIC,
      pathname === '/' ? 'index.html' : pathname
    );

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (ext) {
          // 3a) Se tinha extensão e não encontrou → 404 normal
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('404 – Arquivo não encontrado');
        } else {
          // 3b) Se não tinha extensão, então tratamos como rota de SPA (fallback)
          fs.readFile(
            path.join(PUBLIC, 'index.html'),
            (e, d) => {
              if (e) {
                res.writeHead(500).end('Erro interno');
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(d);
              }
            }
          );
        }
      } else {
        // 4) Arquivo encontrado: devolve normalmente
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  })
  .listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
