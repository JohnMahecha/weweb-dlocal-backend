import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(bodyParser.json());

// Ruta raíz para evitar "Cannot GET /"
app.get('/', (req, res) => {
  res.send('Servidor de WeWeb-dLocal listo para recibir peticiones 🚀');
});

// Endpoint para crear pagos
app.post('/create-payment', (req, res) => {
  // Simulación de creación de pago dLocal
  res.json({ message: 'Pago de prueba creado', data: req.body });
});

// Webhook para recibir notificaciones de dLocal
app.post('/webhook', (req, res) => {
  console.log('Webhook recibido:', req.body);
  res.sendStatus(200);
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend funcionando correctamente 🎉' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
