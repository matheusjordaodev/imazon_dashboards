// simple-server.js
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { URL } = require('url');

// AQUI: publico é a pasta que contém o index.html
const PUBLIC = path.join(__dirname, 'app', 'dashboards');
const PORT   = process.env.PORT || 8053;

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
    const parsed  = new URL(req.url, `http://${req.headers.host}`);
    let pathname  = decodeURIComponent(parsed.pathname);
    // se vier "/" pega index.html
    let filePath = path.join(
      PUBLIC,
      pathname === '/' ? 'index.html' : pathname
    );
    let ext = path.extname(filePath).toLowerCase();

    // se a rota veio sem extensão, tenta .html
    if (!ext) {
      const tryHtml = filePath + '.html';
      if (fs.existsSync(tryHtml)) {
        filePath = tryHtml;
        ext      = '.html';
      }
    }

    console.log('→ Pedido:', parsed.pathname, '→ Lendo:', filePath);

    const contentType = MIME[ext] || 'application/octet-stream';
    fs.readFile(filePath, (err, data) => {
      if (err) {
        if (ext) {
          res.writeHead(404).end('404 – Arquivo não encontrado');
        } else {
          // SPA fallback, se for rota sem ext
          fs.readFile(
            path.join(PUBLIC, 'index.html'),
            (e, d) => {
              if (e) res.writeHead(500).end('Erro interno');
              else   res.writeHead(200, { 'Content-Type':'text/html' }).end(d);
            }
          );
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  })
  .listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });

