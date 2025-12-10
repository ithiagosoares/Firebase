
import express from 'express';

// ============================================================================
// INÍCIO DO BLOCO DE DIAGNÓSTICO
// ============================================================================
const SCRIPT_VERSION = 'v1.3-list-routes'; // Mude a cada implantação para verificar

console.log(`--- [${SCRIPT_VERSION}] INICIANDO SCRIPT ---`);
console.log(`--- [${SCRIPT_VERSION}] Token de verificação está configurado: ${!!process.env.META_WEBHOOK_VERIFY_TOKEN} ---`);
// ============================================================================

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  console.log(`--- [${SCRIPT_VERSION}] Requisição recebida em / ---`);
  res.send(`Servidor do Whatsapp está rodando! Versão: ${SCRIPT_VERSION}`);
});

// Rota de verificação do Webhook da Meta
app.get('/whatsapp-api/webhook', (req, res) => {
  console.log(`--- [${SCRIPT_VERSION}] Requisição GET recebida em /whatsapp-api/webhook ---`);

  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    console.log(`--- [${SCRIPT_VERSION}] VERIFICAÇÃO DE WEBHOOK BEM-SUCEDIDA ---`);
    res.status(200).send(challenge);
  } else {
    console.error(`--- [${SCRIPT_VERSION}] FALHA NA VERIFICAÇÃO DO WEBHOOK. Token recebido: '${token}' ---`);
    res.sendStatus(403);
  }
});

// Rota para receber eventos do Webhook (POST)
app.post('/whatsapp-api/webhook', (req, res) => {
  console.log(`--- [${SCRIPT_VERSION}] Evento do webhook recebido:`, JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`--- [${SCRIPT_VERSION}] SERVIDOR ESCUTANDO NA PORTA ${PORT} ---`);
  
  // ============================================================================
  // INÍCIO DA LISTAGEM DE ROTAS
  // ============================================================================
  console.log(`--- [${SCRIPT_VERSION}] ROTAS REGISTRADAS NO EXPRESS ---`);
  try {
    app._router.stack.forEach((middleware) => {
      if (middleware.route) { // Rotas registradas diretamente no app
        const path = middleware.route.path;
        const methods = Object.keys(middleware.route.methods).join(', ').toUpperCase();
        console.log(`--- [${SCRIPT_VERSION}] -> ${methods} ${path}`);
      } else if (middleware.name === 'router') { // Rotas dentro de um router
        middleware.handle.stack.forEach((handler) => {
          if (handler.route) {
            const path = handler.route.path;
            const methods = Object.keys(handler.route.methods).join(', ').toUpperCase();
            console.log(`--- [${SCRIPT_VERSION}] -> ${methods} ${path}`);
          }
        });
      }
    });
    console.log(`--- [${SCRIPT_VERSION}] FIM DA LISTAGEM DE ROTAS ---`);
  } catch (e) {
    console.error(`--- [${SCRIPT_VERSION}] Falha ao listar rotas: `, e);
  }
  // ============================================================================
});

