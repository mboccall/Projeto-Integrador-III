const { db } = require('../config/database');

async function salvarLeitura(dados) {
  return new Promise((resolve, reject) => {
    // Gera o timestamp no formato simplificado
    const now = new Date();
    const brasiliaOffset = -3 * 60 * 60 * 1000; // UTC-3
    const brasiliaTimestamp = new Date(now.getTime() + brasiliaOffset);
    
    // Formato: YYYY-MM-DD HH:MM:SS
    const timestampFormatado = brasiliaTimestamp.toISOString()
      .replace('T', ' ')
      .substring(0, 19);

    db.run(
      'INSERT INTO leituras (temperatura, umidade, alerta, numero, timestamp) VALUES (?, ?, ?, ?, ?)',
      [
        dados.temperatura,
        dados.umidade || null,
        dados.alerta ? 1 : 0,
        dados.numero,
        timestampFormatado
      ],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

async function obterLeituras(limite = 100) {
  return new Promise((resolve, reject) => {
    db.all(
      'SELECT * FROM leituras ORDER BY timestamp DESC LIMIT ?',
      [limite],
      (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      }
    );
  });
}

module.exports = { salvarLeitura, obterLeituras };