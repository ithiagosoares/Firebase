
import express from 'express';
import metaRoutes from './routes/meta.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Servidor do Whatsapp está rodando!');
});

// Alterando a rota para evitar conflitos com o Next.js
app.use('/whatsapp-api', metaRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor escutando na porta ${PORT}`);
});
