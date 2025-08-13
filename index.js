import express from 'express';
import { createClient } from '@supabase/supabase-js';

const app = express();
app.use(express.json());

// Conexión a Supabase con variables de entorno de Render
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Ruta de prueba para confirmar que el backend funciona
app.get('/', (req, res) => {
  res.send('Backend funcionando correctamente 🚀');
});

// Ruta para insertar un nuevo pago en la base de datos
app.post('/add-payment', async (req, res) => {
  const { user_id, amount, status } = req.body;

  try {
    const { data, error } = await supabase
      .from('payments')
      .insert([{ user_id, amount, status }]);

    if (error) throw error;

    res.json({ message: 'Pago guardado en Supabase', data });
  } catch (err) {
    console.error('Error insertando pago:', err);
    res.status(500).json({ error: err.message });
  }
});

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
