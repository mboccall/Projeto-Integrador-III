# 🌡️ Projeto de Monitoramento com ESP32 + WhatsApp + Dashboard

## 🔧 Requisitos

Antes de executar o projeto, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/) (v18.x ou superior)  
- npm ou yarn  
- Git (opcional)

---

## 🚀 Como Rodar o Projeto

### 1. Clone o repositório

```bash
git clone https://github.com/mboccall/Projeto-Integrador-III.git
cd seu-projeto
```

### 2. Instale as dependências

```bash
npm install
```

Ou, se preferir usar Yarn:

```bash
yarn install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
PORT=3000
JWT_SECRET=SUA_CHAVE_SECRETA_PARA_JWT
NODE_ENV=development
```

### 4. Inicie o servidor

```bash
npm run dev
```

Se não existir o script `dev`, execute:

```bash
node server.js
```

> O servidor será iniciado na porta definida (3000 por padrão).

---

## 🌐 Rotas da API

### 🟢 Rotas Públicas

| Método | Rota            | Descrição                                                        |
|--------|------------------|------------------------------------------------------------------|
| GET    | `/`              | Exibe mensagem de boas-vindas                                   |
| GET    | `/health`        | Verifica status do servidor e banco                             |
| GET    | `/sensor-data`   | Retorna até 50 últimas leituras ou filtradas por data           |
| POST   | `/leitura`       | Registra nova leitura de sensor                                 |

#### 🔁 Exemplo de envio POST para `/leitura`

```json
{
  "temperatura": 27.5,
  "umidade": 60.0,
  "numero": "ESP32_001"
}
```

---

### 🔒 Rotas Protegidas (requer token JWT)

| Método | Rota        | Descrição                             |
|--------|-------------|---------------------------------------|
| GET    | `/dados`    | Retorna todas as leituras             |
| POST   | `/alerta`   | Envia alerta via WhatsApp             |

---

## 📊 Funcionalidades

### ✅ Registro de Leituras

- Recebe os dados dos sensores ESP32  
- Salva automaticamente no banco SQLite  
- Detecta alertas com base em valores predefinidos  

### 💬 Notificação via WhatsApp

- Integração usando `whatsapp-web.js`  
- Alertas são enviados automaticamente quando a temperatura ou umidade saem da faixa ideal  

### 📈 Gráficos em Tempo Real

- Comunicação via WebSocket  
- Atualização automática no dashboard  
- Visualização histórica por data  

---

## 🗃️ Banco de Dados

O projeto utiliza SQLite para armazenar as leituras dos sensores.

### Tabela: `leituras`

| Campo        | Tipo     | Descrição                                   |
|--------------|----------|---------------------------------------------|
| `id`         | INTEGER  | Chave primária                              |
| `temperatura`| REAL     | Valor lido do sensor                        |
| `umidade`    | REAL     | Valor opcional                              |
| `alerta`     | BOOLEAN  | 1 se estiver fora da faixa normal           |
| `numero`     | TEXT     | Identificador do sensor                     |
| `timestamp`  | TEXT     | Data e hora da leitura                      |

---

## 📱 Dashboard Frontend

O frontend é feito com **React + Chart.js** e consome a API.

Funcionalidades:

- Gráficos interativos de temperatura e umidade  
- Estatísticas diárias (mínimo, média, máximo)  
- Tabela com as últimas leituras  
- Sistema de alerta visual e sonoro  

---

## 📞 Integração com WhatsApp

- Usa a biblioteca [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js)  
- QR Code aparecerá no terminal ao iniciar o servidor  
- Escaneie com o WhatsApp Web para conectar  
- Mensagens são enviadas automaticamente para o número cadastrado  

---

## 📄 Scripts Úteis

### Popular o banco manualmente (opcional):

```bash
node populateDB.js
```

### Backup do banco:

- Basta copiar o arquivo `dados_sensores.db`.

---

## 🛡️ Autenticação JWT

Para acessar rotas protegidas como `/dados` ou `/alerta`, envie o token no cabeçalho da requisição:

```http
Authorization: Bearer <seu-token-aqui>
```

---

## 📦 Dependências Utilizadas

```json
"dependencies": {
  "body-parser": "^2.2.0",
  "cors": "^2.8.5",
  "dotenv": "^16.4.7",
  "express": "^5.1.0",
  "jsonwebtoken": "^9.0.2",
  "qrcode-terminal": "^0.12.0",
  "sqlite3": "^5.1.7",
  "whatsapp-web.js": "^1.27.0"
}
```

---

## 🧪 Logs de Saúde

Use a rota `/health` para verificar o estado do servidor e do banco:

```bash
GET http://localhost:3000/health
```

Resposta esperada:

```json
{
  "status": "online",
  "serverTime": "2025-04-05 14:30:00",
  "dbTime": "2025-04-05 14:30:00",
  "timezone": "America/Sao_Paulo",
  "dbFormat": "YYYY-MM-DD HH:MM:SS (localtime)"
}
```

---

## 🧪 Testando a API

Ferramentas sugeridas:

- Postman  
- Thunder Client (VSCode)  
- Insomnia ou `curl`  

### Exemplo com `curl`:

```bash
curl -X POST http://localhost:3000/leitura   -H "Content-Type: application/json"   -d '{
    "temperatura": 27.5,
    "umidade": 60.0,
    "numero": "ESP32_001"
  }'
```

---

## 📌 Observações

- O horário é salvo no formato local usando:  
  `strftime('%Y-%m-%dT%H:%M:%S', 'now', 'localtime')`
- A comunicação entre backend e frontend é via **WebSocket**
- O banco de dados é persistido no arquivo `dados_sensores.db`

---
