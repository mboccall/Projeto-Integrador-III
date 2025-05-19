require('dotenv').config();
const API_TOKEN = process.env.API_TOKEN;

function authenticateToken(req, res, next) {
  const token = req.headers['authorization'];
  
  if (!token || token !== `Bearer ${API_TOKEN}`) {
    console.warn('⚠️ Acesso não autorizado de:', req.ip);
    return res.status(401).json({ erro: 'Acesso não autorizado' });
  }
  next();
}

module.exports = { authenticateToken };