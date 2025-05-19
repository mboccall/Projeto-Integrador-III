const { client } = require('../config/whatsapp');

async function enviarMensagem(numero, mensagem, timeout = 10000) {
  const chatId = `${numero}@c.us`;
  await client.sendMessage(chatId, mensagem);
}

function isClientReady() {
  return client.info !== undefined;
}

module.exports = { enviarMensagem, isClientReady };