const { enviarMensagem, isClientReady } = require('../services/whatsappService');
const { salvarLeitura } = require('../services/databaseService');

// Configura o fuso horário para Brasília
process.env.TZ = 'America/Sao_Paulo';

async function handleAlerta(req, res) {
  const { temperatura, umidade, numero } = req.body;

  // Validação dos dados
  if (typeof temperatura !== 'number' || typeof umidade !== 'number' || !numero) {
    return res.status(400).json({ 
      erro: 'Dados inválidos',
      detalhes: 'Temperatura e umidade devem ser números e número é obrigatório'
    });
  }

  // Calcula o alerta com os mesmos critérios do ESP32
  const alerta = temperatura > 26.0 || temperatura < 20.0 || umidade > 95.0 || umidade < 40.0;

  if (!isClientReady()) {
    return res.status(503).json({ 
      erro: 'WhatsApp não conectado',
      solucao: 'Escanear o QR Code'
    });
  }

  try {
    // Prepara a mensagem
    const mensagem = alerta
      ? `🚨 *ALERTA CRÍTICO!*\nTemperatura: ${temperatura}°C\nUmidade: ${umidade}%`
      : `📡 Leitura normal\nTemperatura: ${temperatura}°C\nUmidade: ${umidade}%`;

    // Envia para WhatsApp
    await enviarMensagem(numero, mensagem);
    
    // Obtém a data/hora atual no fuso de Brasília
    const now = new Date();
    // Ajusta para o horário de Brasília (UTC-3)
    const offset = -3 * 60; // Brasília é UTC-3 (em minutos)
    const brasiliaTimestamp = new Date(now.getTime() + offset * 60 * 1000);
    
    // Formata para o padrão ISO sem o 'Z' no final (para indicar que é local)
    const timestampISO = brasiliaTimestamp.toISOString().replace('Z', '');

    // Salva no banco de dados
    const id = await salvarLeitura({ 
      temperatura, 
      umidade, 
      alerta, 
      numero,
      timestamp: timestampISO
    });

    // Formata a data para exibição no formato brasileiro
    const formattedTimestamp = now.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo'
    });

    // Broadcast via WebSocket para atualizar o dashboard
    req.app.locals.broadcastData({
      type: 'ATUALIZAR_DASHBOARD',
      data: {
        id,
        temperatura,
        umidade,
        alerta,
        numero,
        timestamp: formattedTimestamp
      }
    });

    // Se for alerta, envia uma mensagem específica
    if (alerta) {
      req.app.locals.broadcastData({
        type: 'ALERTA',
        data: {
          temperatura,
          umidade,
          numero,
          mensagem: `Valores críticos detectados! Temp: ${temperatura}°C, Umidade: ${umidade}%`,
          timestamp: formattedTimestamp
        }
      });
    }

    res.status(200).json({ 
      sucesso: true,
      alerta,
      idRegistro: id,
      timestamp: formattedTimestamp
    });

  } catch (err) {
    console.error('Erro no processamento do alerta:', err);
    res.status(500).json({ 
      erro: 'Falha no processamento',
      detalhes: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
}

module.exports = { handleAlerta };