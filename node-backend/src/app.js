const express = require('express');
const http = require('http'); 
const WebSocket = require('ws'); 
const bodyParser = require('body-parser');
const path = require('path');
const { criarTabelas } = require('./config/database');
const { initializeWhatsApp } = require('./config/whatsapp');
const router = require('./routes');

// Configurações iniciais
criarTabelas();
initializeWhatsApp();

const app = express();
const server = http.createServer(app); // Modificado

// 1. Configuração do WebSocket 
const wss = new WebSocket.Server({ server });
const activeClients = new Set();

wss.on('connection', (ws) => {
  activeClients.add(ws);
  console.log(`Novo cliente conectado (Total: ${activeClients.size})`);

  ws.on('close', () => {
    activeClients.delete(ws);
    console.log(`Cliente desconectado (Total: ${activeClients.size})`);
  });
});

// Middlewares 
app.use(bodyParser.json());

// 2. Servir arquivos estáticos 
const staticFilesPath = path.join(__dirname, '../../dashboard-page/dashboard-temp/dist');
app.use(express.static(staticFilesPath));

// 3. Rotas da API 
app.use('/api', router);

// 4. Função de broadcast 
app.locals.broadcastData = (data) => {
  activeClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

// 5. Rota de fallback
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(staticFilesPath, 'index.html'));
});

// 6. Tratamento de erros 
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ erro: 'Falha interna' });
});

// 7. Exporta o SERVER 
module.exports = server;