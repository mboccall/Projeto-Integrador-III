const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Configurações
const dbPath = path.join(__dirname, 'dados_sensores.db');
const db = new sqlite3.Database(dbPath);

// Função para ajustar para o fuso de Brasília (UTC-3)
function ajustarParaBrasilia(data) {
  const offset = -3 * 60 * 60 * 1000; // UTC-3 em milissegundos
  return new Date(data.getTime() + offset);
}

async function popularBancoDeDados() {
  try {
    await criarTabela();
    
    const dataInicio = new Date('2025-04-14T07:00:00-03:00'); // Já define como Brasília
    const dataFim = new Date('2025-05-02T18:00:00-03:00');
    const numeroTeste = '5511987654321';
    let totalInserido = 0;

    // Loop por cada dia
    for (let dataAtual = new Date(dataInicio); dataAtual <= dataFim; dataAtual.setDate(dataAtual.getDate() + 1)) {
      // Loop das 07:00 às 18:00 a cada 5 minutos
      for (let hora = 7; hora <= 18; hora++) {
        for (let minuto = 0; minuto < 60; minuto += 5) {
          if (hora === 18 && minuto > 0) continue;
          
          const timestamp = new Date(dataAtual);
          timestamp.setHours(hora, minuto, 0, 0);
          
          // Ajusta para UTC-3 (Brasília)
          const timestampBrasilia = ajustarParaBrasilia(timestamp);
          
          // Gera valores
          const temperaturaBase = 23 + (Math.sin(hora - 12) * 3);
          const temperatura = (temperaturaBase + (Math.random() * 2 - 1)).toFixed(1);
          
          const umidadeBase = 80 + (Math.sin(hora - 6) * 10);
          const umidade = Math.round(umidadeBase + (Math.random() * 10 - 5));
          
          // Calcula alerta
          const alerta = (
            temperatura > 26.0 || 
            temperatura < 20.0 || 
            umidade > 95.0 || 
            umidade < 40.0
          ) ? 1 : 0;

          // Formata timestamp (Brasília)
          const timestampFormatado = timestampBrasilia.toISOString()
            .replace('T', ' ')
            .replace(/\..+/, '');

          await inserirLeitura({
            temperatura: parseFloat(temperatura),
            umidade,
            alerta,
            numero: numeroTeste,
            timestamp: timestampFormatado
          });
          
          totalInserido++;
          if (totalInserido % 100 === 0) {
            console.log(`Inseridos ${totalInserido} registros... Último: ${timestampFormatado}`);
          }
        }
      }
    }

    console.log(`✅ Banco populado! Total: ${totalInserido} leituras (07:00-18:00 BRT)`);
  } catch (err) {
    console.error('❌ Erro:', err);
  } finally {
    db.close();
  }
}

// Funções auxiliares (manter as mesmas do script anterior)
function criarTabela() {
  return new Promise((resolve, reject) => {
    db.run(`
      CREATE TABLE IF NOT EXISTS leituras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        temperatura REAL NOT NULL,
        umidade INTEGER,
        alerta BOOLEAN DEFAULT 0,
        numero TEXT NOT NULL,
        timestamp TEXT NOT NULL
      )
    `, (err) => err ? reject(err) : resolve());
  });
}

function inserirLeitura(dados) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO leituras (temperatura, umidade, alerta, numero, timestamp)
       VALUES (?, ?, ?, ?, ?)`,
      [dados.temperatura, dados.umidade, dados.alerta, dados.numero, dados.timestamp],
      (err) => err ? reject(err) : resolve()
    );
  });
}

// Executa
popularBancoDeDados();