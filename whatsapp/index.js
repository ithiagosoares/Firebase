
import express from 'express';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor do Whatsapp está rodando!');
});

// --- ROTA DE DIAGNÓSTICO (CURTA) ---
// Rota que suspeitamos que o Firebase Hosting está chamando
app.get('/webhook', (req, res) => {
  console.log("Recebida requisição de verificação de webhook (ROTA CURTA /webhook).");

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED (ROTA CURTA /webhook)');
    res.status(200).send(challenge);
  } else {
    console.error('Falha na verificação do webhook (ROTA CURTA /webhook).');
    res.sendStatus(403);
  }
});

// Rota para receber eventos do Webhook (POST)
app.post('/webhook', (req, res) => {
  console.log('Recebido evento do webhook da Meta (ROTA CURTA /webhook):', JSON.stringify(req.body, null, 2));
  res.sendStatus(200); 
});


// --- ROTAS ANTIGAS (COMPLETAS) ---
// Mantidas por segurança durante o diagnóstico
app.get('/whatsapp-api/webhook', (req, res) => {
  console.log("Recebida requisição de verificação de webhook (ROTA LONGA /whatsapp-api/webhook).");

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED (ROTA LONGA)');
    res.status(200).send(challenge);
  } else {
    console.error('Falha na verificação do webhook (ROTA LONGA).');
    res.sendStatus(403);
  }
});

app.post('/whatsapp-api/webhook', (req, res) => {
  console.log('Recebido evento do webhook da Meta (ROTA LONGA):', JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escutando na porta ${PORT}`);
});
