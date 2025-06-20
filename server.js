const http = require('http');
const fs   = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT          = process.env.PORT || 8053;
const PUBLIC        = path.resolve(__dirname);
const DASHBOARD_DIR = path.join(__dirname, 'app', 'dashboards');
const DATASET_DIR   = path.join(__dirname, 'dataset');

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
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsedUrl.pathname);
  let filePath;
  let ext;

  if (pathname.startsWith('/dataset/')) {
    filePath = path.join(DATASET_DIR, pathname.substring('/dataset/'.length));
    ext = path.extname(filePath).toLowerCase();
  } else {
    filePath = path.join(DASHBOARD_DIR, pathname === '/' ? 'index.html' : pathname);
    ext = path.extname(filePath).toLowerCase();

    if (!ext) {
      const tryHtml = filePath + '.html';
      if (fs.existsSync(tryHtml)) {
        filePath = tryHtml;
        ext = '.html';
      } else {
        // SPA fallback para index.html
        filePath = path.join(DASHBOARD_DIR, 'index.html');
        ext = '.html';
      }
    }
  }

  console.log(`Pedido: ${pathname} → Arquivo: ${filePath}`);

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
