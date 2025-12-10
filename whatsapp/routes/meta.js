
import express from 'express';
const router = express.Router();

// Endpoint para a Meta verificar seu webhook (Passo CRUCIAL)
router.get('/webhook', (req, res) => {
  // Log para verificar se a rota está sendo chamada
  console.log("Recebida requisição de verificação de webhook.");

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  // --- DEBUGGING ---
  console.log("Token recebido da Meta:", token);
  console.log("Token esperado do ambiente (process.env):", process.env.META_WEBHOOK_VERIFY_TOKEN);
  // --- FIM DO DEBUGGING ---

  // Verifique se o token de verificação enviado pela Meta é o mesmo que você configurou
  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log('WEBHOOK_VERIFIED');
    res.status(200).send(challenge);
  } else {
    console.error('Falha na verificação do webhook. Verifique os tokens acima.');
    res.sendStatus(403);
  }
});

// Endpoint para RECEBER eventos da Meta (status de msg, novas msgs, etc.)
router.post('/webhook', (req, res) => {
  console.log('Recebido evento do webhook da Meta:', JSON.stringify(req.body, null, 2));
  
  // A lógica para processar o evento (salvar no banco, responder, etc.) virá aqui.
  
  // Responda 200 OK imediatamente para a Meta saber que você recebeu o evento.
  res.sendStatus(200); 
});

export default router;
