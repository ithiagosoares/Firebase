
import express from 'express';
import cors from 'cors';
import metaRoutes from './routes/meta.js'; // Importando nossa futura rota

const app = express();

// Middlewares essenciais
app.use(cors()); // Permite requisições de outros domínios
app.use(express.json()); // Habilita o parsing de JSON no corpo das requisições

// Rota principal da API
app.use('/api/meta', metaRoutes);

// Rota de "saúde" para verificar se o serviço está no ar
app.get('/', (req, res) => {
  res.send('Servidor do WhatsApp está rodando!');
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escutando na porta ${PORT}`);
});
