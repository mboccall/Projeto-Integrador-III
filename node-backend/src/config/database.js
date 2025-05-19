const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../dados_sensores.db');
const db = new sqlite3.Database(dbPath);

// Função para criar tabelas
function criarTabelas() {
  return new Promise((resolve, reject) => {
    // Query corrigida - sintaxe simplificada
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS leituras (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          temperatura REAL NOT NULL,
          umidade REAL,
          alerta BOOLEAN DEFAULT 0,
          numero TEXT NOT NULL,
          timestamp TEXT DEFAULT (strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime'))
        )
      `;

    db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Erro ao criar tabela:', err.message);
        reject(err);
      } else {
        console.log('✅ Tabela "leituras" criada/verificada com sucesso');
        resolve();
      }
    });
  });
}

// Verificação e criação da tabela
(async () => {
  try {
    await criarTabelas();
    
    // Verificação adicional
    db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='leituras'", 
      (err, row) => {
        if (err) console.error('Erro na verificação:', err.message);
        else if (row) console.log('✔ Tabela existe no banco de dados');
        else console.warn('⚠ Tabela não encontrada após criação');
      }
    );
  } catch (err) {
    console.error('Falha na inicialização do banco:', err.message);
    process.exit(1);
  }
})();

// Fechamento seguro
process.on('SIGINT', () => {
  db.close(() => {
    console.log('🔴 Conexão com o banco fechada');
    process.exit(0);
  });
});

module.exports = {
  db,
  criarTabelas
};