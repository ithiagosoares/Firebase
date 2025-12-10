
import express from 'express';

const app = express();
app.use(express.json());

// Rota de verificação do Webhook da Meta
app.get('/whatsapp-api/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Rota para receber eventos do Webhook (POST)
app.post('/whatsapp-api/webhook', (req, res) => {
  console.log('Evento do webhook recebido:', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escutando na porta ${PORT}`);
});
