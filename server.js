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

http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(PUBLIC, pathname);
  let ext      = path.extname(filePath).toLowerCase();

  // 1) "/" ou "" → index.html na raiz
  if (pathname === '/' || pathname === '') {
    filePath = path.join(PUBLIC, 'index.html');
    ext      = '.html';
  }
  // 2) rota sem extensão e existe .html correspondente? usa-o
  else if (!ext) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
      ext      = '.html';
    }
  }

  console.log('→ Pedido:', pathname, '→ Lendo:', filePath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`404 – ${pathname} não encontrado`);
    } else {
      const contentType = MIME[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });

}).listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
