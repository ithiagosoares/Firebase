
import express from 'express';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor do Whatsapp está rodando!');
});

// Rota de verificação do Webhook (GET)
app.get('/whatsapp-api/webhook', (req, res) => {
  console.log("Recebida requisição de verificação de webhook (rota direta).");

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED (rota direta)');
    res.status(200).send(challenge);
  } else {
    console.error('Falha na verificação do webhook (rota direta).');
    res.sendStatus(403);
  }
});

// Rota para receber eventos do Webhook (POST)
app.post('/whatsapp-api/webhook', (req, res) => {
  console.log('Recebido evento do webhook da Meta (rota direta):', JSON.stringify(req.body, null, 2));
  res.sendStatus(200); 
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escutando na porta ${PORT}`);
});
