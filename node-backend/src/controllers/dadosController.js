const { obterLeituras } = require('../services/databaseService');

async function getDados(req, res) {
  try {
    const dados = await obterLeituras();
    res.status(200).json(dados);
  } catch (err) {
    console.error('Erro ao buscar dados:', err);
    res.status(500).json({ erro: 'Falha na consulta' });
  }
}

module.exports = { getDados };