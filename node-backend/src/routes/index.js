const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { authenticateToken } = require('../middlewares/authMiddleware');
const router = express.Router();

const { handleAlerta } = require('../controllers/alertaController');
const { getDados } = require('../controllers/dadosController');

// Conexão com o banco de dados
const dbPath = path.join(__dirname, '../../dados_sensores.db');
const db = new sqlite3.Database(dbPath);

// Configuração inicial do banco
db.serialize(() => {

  db.run(`
    CREATE TABLE IF NOT EXISTS leituras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      temperatura REAL NOT NULL,
      umidade REAL,
      alerta BOOLEAN DEFAULT 0,
      numero TEXT NOT NULL,
      timestamp TEXT DEFAULT (strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime'))
    )
  `, (err) => {
    if (err) {
      console.error('❌ Erro ao criar tabela:', err);
    } else {
      console.log(`✅ Tabela 'leituras' pronta`);
      
      // Verificação do formato de data
      db.get("SELECT strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime') as agora", (err, row) => {
        if (!err) console.log('⏱️  Horário atual no SQLite:', row.agora);
      });
    }
  });
});

// Middleware para erros do banco
const handleDbError = (err, res) => {
  console.error('Erro no banco de dados:', err);
  res.status(500).json({ 
    error: 'Erro no banco de dados',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// ================== ROTAS PÚBLICAS ================== //

router.get('/', (req, res) => res.send('API de Monitoramento ESP32'));

router.get('/health', (req, res) => {
  db.get("SELECT strftime('%Y-%m-%d %H:%M:%S', 'now', 'localtime') as dbTime", (err, row) => {
    res.json({
      status: 'online',
      serverTime: new Date().toLocaleString('sv-SE').replace(' ', ' '), // Formato igual ao banco
      dbTime: row?.dbTime || 'N/A',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dbFormat: 'YYYY-MM-DD HH:MM:SS (localtime)'
    });
  });
});

// Obter dados do sensor (últimas 50 leituras)
// Obter dados do sensor (últimas 50 leituras ou de uma data específica)
router.get('/sensor-data', (req, res) => {
  const { date } = req.query;

  let query = `
    SELECT id, temperatura, umidade, alerta, numero,
    strftime('%Y-%m-%d %H:%M:%S', timestamp) as formattedTime
    FROM leituras
  `;

  if (date) {
    // Filtra pela data especificada
    query += ` WHERE DATE(timestamp) = DATE('${date}') `;
  }

  query += ` ORDER BY timestamp DESC`;

  db.all(query, [], (err, rows) => {
    if (err) return handleDbError(err, res);
    res.json(rows.reverse());
  });
});

// Registrar nova leitura
router.post('/leitura', (req, res) => {
  const { temperatura, umidade, numero } = req.body;
  
  if (typeof temperatura !== 'number' || !numero) {
    return res.status(400).json({ error: 'Dados inválidos' });
  }

  const alerta = temperatura > 26.0 || temperatura < 20.0 || umidade > 80.0 || umidade < 20.0;

  db.run(
    `INSERT INTO leituras (temperatura, umidade, alerta, numero) 
     VALUES (?, ?, ?, ?)`,  // O timestamp será preenchido automaticamente no formato ISO
    [temperatura, umidade || null, alerta ? 1 : 0, numero],
    function(err) {
      if (err) return handleDbError(err, res);
      
      // Obter a leitura recém-inserida
      db.get(
        `SELECT *, 
         strftime('%Y-%m-%d %H:%M:%S', timestamp) as formattedTime 
         FROM leituras WHERE id = ?`,
        [this.lastID],
        (err, row) => {
          if (err) return handleDbError(err, res);
          
         
          // Enviar para WebSocket COM O MESMO FORMATO
          if (req.app.locals.broadcastData) {
            req.app.locals.broadcastData({
              type: 'ATUALIZAR_DASHBOARD',
              data: {
                ...row,
                localTime: row.formattedTime // Usa o mesmo formato que o banco
              }
            });
          }

          res.status(201).json({ 
            success: true,
            alerta: alerta,
            message: alerta ? 'ALERTA ATIVADO' : 'Leitura normal',
            timestamp: row.formattedTime
          });
        }
      );
    }
  );
});

// ================== ROTAS PROTEGIDAS ================== //
router.get('/dados', authenticateToken, getDados);
router.post('/alerta', authenticateToken, handleAlerta);

// Gerenciamento de conexão
process.on('SIGINT', () => {
  db.close(() => {
    console.log('🔴 Banco de dados fechado');
    process.exit(0);
  });
});

module.exports = router;