// simple-server.js
const http = require('http');
const fs   = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT   = process.env.PORT || 8053;
// onde está seu index.html
const DASHBOARD_DIR = path.join(__dirname, 'app', 'dashboards');
// onde estão geojsons e csvs
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
  const parsed   = new URL(req.url, `http://${req.headers.host}`);
  let pathname   = decodeURIComponent(parsed.pathname);
  let filePath;
  let ext;

  if (pathname.startsWith('/dataset/')) {
    // serve direto da pasta dataset
    filePath = path.join(DATASET_DIR, pathname.substring('/dataset/'.length));
    ext      = path.extname(filePath).toLowerCase();
  } else {
    // serve dashboards + SPA fallback
    // roteia "/" para index.html
    filePath = path.join(
      DASHBOARD_DIR,
      pathname === '/' ? 'index.html' : pathname
    );
    ext = path.extname(filePath).toLowerCase();

    // rota sem extensão? tenta .html dentro de dashboards
    if (!ext) {
      const tryHtml = filePath + '.html';
      if (fs.existsSync(tryHtml)) {
        filePath = tryHtml;
        ext      = '.html';
      }
    }
  }

  console.log('→ Pedido:', pathname, '→ Arquivo:', filePath);
  const contentType = MIME[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // 404 para arquivos com extensão
      if (ext) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 – Arquivo não encontrado');
      } else {
        // SPA fallback se for rota sem ext
        fs.readFile(
          path.join(DASHBOARD_DIR, 'index.html'),
          (e, d) => {
            if (e) res.writeHead(500).end('Erro interno');
            else   res.writeHead(200, { 'Content-Type':'text/html; charset=utf-8' }).end(d);
          }
        );
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });

}).listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});

