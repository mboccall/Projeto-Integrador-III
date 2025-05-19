require('dotenv').config();
const server = require('./src/app'); // Importa o server (não mais o app)
const PORT = process.env.PORT || 3000;

// Inicia o servidor
server.listen(PORT, () => {
  console.log(`🚀 Servidor HTTP rodando na porta ${PORT}`);
  console.log(`📡 WebSocket disponível em ws://localhost:${PORT}`);
  console.log(`🔑 Token de API: ${process.env.API_TOKEN || 'Não configurado'}`);
  
  // Verifica se o WhatsApp está conectado
  const { isClientReady } = require('./src/services/whatsappService');
  console.log(`📱 WhatsApp ${isClientReady() ? 'conectado' : 'não conectado'}`);
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (err) => {
  console.error('Erro não tratado:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Exceção não capturada:', err);
});