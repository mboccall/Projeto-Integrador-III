const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox'] }
});

function initializeWhatsApp() {
  client.on('qr', qr => qrcode.generate(qr, { small: true }));
  client.on('ready', () => console.log('✅ WhatsApp conectado'));
  client.initialize();
  return client;
}

module.exports = { initializeWhatsApp, client };