const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
};

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  // Lidar com CORS para desenvolvimento
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  // Normalizar URL
  let url = req.url;

  // Redirecionar / para index.html
  if (url === '/' || url === '') {
    url = '/index.html';
  }

  // Resolver caminho do arquivo
  const filePath = path.join(__dirname, url);
  const extname = path.extname(filePath);

  // Verificar se o arquivo existe
  fs.access(filePath, fs.constants.F_OK, err => {
    if (err) {
      console.error(`Arquivo não encontrado: ${filePath}`);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html');
      res.end('<h1>404 - Arquivo não encontrado</h1>');
      return;
    }

    // Definir tipo MIME
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    // Ler e enviar o arquivo
    fs.readFile(filePath, (err, content) => {
      if (err) {
        console.error(`Erro ao ler arquivo: ${err}`);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'text/html');
        res.end('<h1>500 - Erro interno do servidor</h1>');
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', contentType);
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
  console.log(`Pressione Ctrl+C para encerrar`);
});
