import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);


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

app.post('/add-payment', async (req, res) => {
  const { user_id, amount, status } = req.body;

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert([{ user_id, amount, status }]);

    if (error) throw error;

    res.json({ message: 'Pago guardado en Supabase', data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
