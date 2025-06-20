const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const { URL } = require('url');

const PORT          = process.env.PORT || 8053;
const ROOT_DIR      = __dirname;
const DASHBOARD_DIR = path.join(ROOT_DIR, 'app', 'dashboards');
const DATASET_DIR   = path.join(ROOT_DIR, 'dataset');

const STATIC_DIRS = new Set([ 'css', 'js', 'assets', 'img' ]);

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
  let   pathname = decodeURIComponent(parsed.pathname);

  // Se suas dashboards referenciam "/app/dashboards/...", removemos esse prefixo
  if (pathname.startsWith('/app/dashboards')) {
    pathname = pathname.replace(/^\/app\/dashboards/, '') || '/';
  }

  let filePath;

  // 1) /dataset/... → busca em DATASET_DIR
  if (pathname.startsWith('/dataset/')) {
    const relPath = pathname.slice('/dataset/'.length);
    filePath = path.join(DATASET_DIR, relPath);
    console.log('[DATASET]', pathname, '→', filePath);

  // 2) estáticos (css, js, img, assets) → busca em ROOT_DIR
  } else if (STATIC_DIRS.has(pathname.split('/')[1])) {
    filePath = path.join(ROOT_DIR, pathname);
    console.log('[STATIC]', pathname, '→', filePath);

  // 3) Dashboards/HTML → busca em DASHBOARD_DIR
  } else {
    if (pathname === '/' || pathname === '/index.html') {
      filePath = path.join(DASHBOARD_DIR, 'index.html');
    } else {
      filePath = path.join(DASHBOARD_DIR, pathname);
      // se não tiver extensão, tenta .html
      if (!path.extname(filePath)) {
        const tryHtml = filePath + '.html';
        if (fs.existsSync(tryHtml)) {
          filePath = tryHtml;
        } else {
          // fallback para index.html
          filePath = path.join(DASHBOARD_DIR, 'index.html');
        }
      }
    }
    console.log('[DASH]', pathname, '→', filePath);
  }

  const ext = path.extname(filePath).toLowerCase();

  // Verifica existência antes de ler
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(`404 – ${pathname} não encontrado em ${filePath}`);
  }

  // Lê e devolve
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`500 – Erro ao ler ${filePath}`);
    }
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
