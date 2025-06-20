// server.js
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Define a pasta onde estão seu index.html e assets (css, js, libs, img etc.)
app.use(express.static(path.join(__dirname, '/')));

// Para todas as rotas que não baterem em um arquivo estático, retorne o index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
