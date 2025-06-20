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
  '.html'   : 'text/html; charset=utf-8',
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
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(parsed.pathname);

  // opcional: se seu HTML referenciar "/app/dashboards/XXX.html", 
  // aqui removemos esse prefixo
  if (pathname.startsWith('/app/dashboards')) {
    pathname = pathname.replace(/^\/app\/dashboards/, '') || '/';
  }

  let filePath;

  // 1) rota /dataset/...
  if (pathname.startsWith('/dataset/')) {
    filePath = path.join(DATASET_DIR, pathname.slice('/dataset/'.length));

  // 2) arquivos estáticos (css, js, img, assets)
  } else if (STATIC_DIRS.has(pathname.split('/')[1])) {
    filePath = path.join(ROOT_DIR, pathname);

  // 3) dashboards
  } else {
    // raiz → index.html
    if (pathname === '/' || pathname === '/index.html') {
      filePath = path.join(DASHBOARD_DIR, 'index.html');
    } else {
      filePath = path.join(DASHBOARD_DIR, pathname);
      // se não vier com extensão, tenta .html
      if (!path.extname(filePath)) {
        const htmlTry = filePath + '.html';
        filePath = fs.existsSync(htmlTry)
          ? htmlTry
          : path.join(DASHBOARD_DIR, 'index.html');
      }
    }
  }

  const ext = path.extname(filePath).toLowerCase();
  console.log(`→ ${pathname} → ${filePath}`);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end(`404 – ${pathname} não encontrado`);
    }
    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });

}).listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
