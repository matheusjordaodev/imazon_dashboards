// Importa as bibliotecas necessárias
const express = require('express');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const axios = require('axios').default;
const ee = require('@google/earthengine'); // Importa Earth Engine

// Configurações de porta e diretórios
const PORT = process.env.PORT || 8053;
const ROOT_DIR = __dirname;
const DASHBOARD_DIR = path.join(ROOT_DIR, 'app', 'dashboards');
const DATASET_DIR = path.join(ROOT_DIR, 'dataset');

// Mapeamento de tipos MIME (do primeiro código)
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.geojson': 'application/json',
  '.csv': 'text/csv',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

// Caminho para o arquivo de credenciais do Google Cloud (privatekey.json)
// Certifique-se de que 'privatekey.json' esteja na raiz do seu projeto.
const privateKey = require('./privatekey.json');

// Cria uma aplicação Express
const app = express();

// --- Funções do Earth Engine (do segundo código) ---

// Função para inicializar o Earth Engine com autenticação
async function initializeEE() {
  return new Promise((resolve, reject) => {
    ee.data.authenticateViaPrivateKey(privateKey,
      () => {
        ee.initialize(null, null,
          () => {
            console.log('Earth Engine authenticated successfully!');
            resolve();
          },
          (err) => {
            console.error('Error initializing Earth Engine:', err);
            reject(err);
          });
      },
      (err) => {
        console.error('Error during authentication:', err);
        reject(err);
      });
  });
}

// Função para obter a URL da imagem SRTM
async function getSRTMMapUrl() {
  try {
    await initializeEE();
    const asset_floreser_col9 = 'projects/imazon-simex/FLORESER/floreser-collection-9-22-1-ages-sf/floreser-2023-22-1';
    const sv_col9 = ee.Image(asset_floreser_col9);

    const vis_flor = {
      min: 1,
      max: 38,
      palette: ['#e7f8eb', '#cff2d8', '#b7ecc5', '#a0e6b2', '#88e09f', '#70da8b', '#59d478', '#41ce65', '#29c852', '#12c23f']
    };

    const mapId = sv_col9.getMap(vis_flor);
    return mapId.urlFormat;
  } catch (error) {
    console.error('Failed to get SRTM image URL:', error);
    throw error;
  }
}

// --- Configuração de arquivos estáticos e dashboards (baseado no primeiro código) ---

// 1) Serve arquivos do diretório /dataset/
app.use('/dataset', express.static(DATASET_DIR));

// 2) Serve arquivos estáticos (css, js, assets, img) da raiz do projeto
// Express.static permite servir múltiplos diretórios estáticos. [1, 4, 5]
app.use('/css', express.static(path.join(ROOT_DIR, 'css')));
app.use('/js', express.static(path.join(ROOT_DIR, 'js')));
app.use('/assets', express.static(path.join(ROOT_DIR, 'assets')));
app.use('/img', express.static(path.join(ROOT_DIR, 'img')));

// 3) Lógica para servir Dashboards/HTML (do primeiro código)
// Esta é uma middleware customizada para replicar o comportamento de fallback do primeiro servidor.
app.use((req, res, next) => {
  let originalPath = req.path;
  let pathname = originalPath;

  // Se a URL referencia "/app/dashboards/...", removemos esse prefixo
  if (pathname.startsWith('/app/dashboards')) {
    pathname = pathname.replace(/^\/app\/dashboards/, '') || '/';
  }

  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(DASHBOARD_DIR, 'index.html');
  } else {
    filePath = path.join(DASHBOARD_DIR, pathname);
    // Se não tiver extensão, tenta .html
    if (!path.extname(filePath)) {
      const tryHtml = filePath + '.html';
      if (fs.existsSync(tryHtml)) {
        filePath = tryHtml;
      } else {
        // Fallback para index.html se a versão .html não existir
        filePath = path.join(DASHBOARD_DIR, 'index.html');
      }
    }
  }

  // Verifica se o arquivo existe no DASHBOARD_DIR e o serve
  // A verificação `filePath.startsWith(DASHBOARD_DIR)` é uma medida de segurança
  // para garantir que apenas arquivos dentro do diretório de dashboards sejam servidos por esta lógica.
  if (fs.existsSync(filePath) && filePath.startsWith(DASHBOARD_DIR)) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    return res.sendFile(filePath);
  } else {
    // Se não for um arquivo de dashboard ou não for encontrado, passa para a próxima middleware/rota
    next();
  }
});

// --- Rotas da API (do segundo código) ---

// Rota para retornar a URL da imagem SRTM
app.get('/srtm-url', async (req, res) => {
  try {
    const url = await getSRTMMapUrl();
    res.json({ url });
  } catch (error) {
    res.status(500).send('Error retrieving SRTM image URL');
  }
});

// Rota para servir o GeoJSON baixando diretamente do GitHub
app.get('/municipios-amazonia', async (req, res) => {
  try {
    const geojsonUrl = 'https://github.com/imazon-cgi/simex/raw/refs/heads/main/datasets/geojson/limite_municipios_amz_legal.geojson';
    const response = await axios.get(geojsonUrl );

    if (response.status === 200) {
      res.json(response.data);
    } else {
      throw new Error('Erro ao obter GeoJSON');
    }
  } catch (error) {
    console.error('Erro ao obter os municípios da Amazônia Legal:', error);
    res.status(500).send('Erro ao obter os municípios da Amazônia Legal.');
  }
});

// Rota para obter a lista de estados únicos do arquivo CSV
app.get('/lista-estados', (req, res) => {
  let estados = new Set();
  fs.createReadStream(path.join(DATASET_DIR, 'floreser-9-22-1-ages-sf.csv'))
    .pipe(csv())
    .on('data', (row) => {
      if (row.state) estados.add(row.state.trim());
    })
    .on('end', () => {
      res.json([...estados]);
    })
    .on('error', (error) => {
      console.error('Erro ao carregar estados:', error);
      res.status(500).send('Erro ao carregar estados');
    });
});

// Rota para obter a lista de municípios por estado
app.get('/lista-municipios/:estado', (req, res) => {
  const estado = req.params.estado.trim();
  let municipios = new Set();
  fs.createReadStream(path.join(DATASET_DIR, 'floreser-9-22-1-ages-sf.csv'))
    .pipe(csv())
    .on('data', (row) => {
      if (row.state && row.name && row.state.trim() === estado) {
        municipios.add(row.name.trim());
      }
    })
    .on('end', () => {
      res.json([...municipios]);
    })
    .on('error', (error) => {
      console.error('Erro ao carregar municípios:', error);
      res.status(500).send('Erro ao carregar municípios');
    });
});

// Rota para retornar os dados processados para o gráfico
app.get('/area-data', (req, res) => {
  let data = [];
  fs.createReadStream(path.join(DATASET_DIR, 'floreser-9-22-1-ages-sf.csv'))
    .pipe(csv())
    .on('data', (row) => {
      data.push({
        state: row.state,
        name: row.name, // Incluindo o nome do município
        year: parseInt(row.year),
        area: parseFloat(row.area)
      });
    })
    .on('end', () => {
      res.json(data);
    })
    .on('error', (error) => {
      console.error('Erro ao carregar dados para gráfico:', error);
      res.status(500).send('Erro ao carregar dados');
    });
});

// Rota para retornar os dados agregados dos municípios com filtro de ano
app.get('/municipios-area-data', (req, res) => {
  const startYear = parseInt(req.query.startYear) || 2008;
  const endYear = parseInt(req.query.endYear) || 2023;

  let data = [];
  fs.createReadStream(path.join(DATASET_DIR, 'floreser-9-22-1-ages-sf.csv'))
    .pipe(csv())
    .on('data', (row) => {
      if (row.name && row.area && row.state) {
        const year = parseInt(row.year);
        if (year >= startYear && year <= endYear) {
          data.push({
            municipio: row.name.trim(),
            state: row.state.trim(),
            year: year,
            area: parseFloat(row.area)
          });
        }
      }
    })
    .on('end', () => {
      // Agrupar por município e somar a área total
      const municipiosMap = data.reduce((acc, item) => {
        const key = `${item.state}_${item.municipio}`;
        if (!acc[key]) {
          acc[key] = { municipio: item.municipio, state: item.state, area: 0 };
        }
        acc[key].area += item.area;
        return acc;
      }, {});

      // Converter para array e ordenar por área
      const municipiosArray = Object.values(municipiosMap)
        .sort((a, b) => b.area - a.area); // Ordenar por área acumulada

      res.json(municipiosArray);
    })
    .on('error', (error) => {
      console.error('Erro ao processar o CSV:', error);
      res.status(500).send('Erro ao processar o arquivo CSV.');
    });
});

// Middleware para lidar com 404 - deve ser a última middleware
app.use((req, res) => {
  res.status(404).send(`404 – ${req.path} não encontrado.`);
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}` );
});
