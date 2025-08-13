import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import 'dotenv/config';

const app = express();

// Middleware
app.use(cors()); // Habilitar CORS para cualquier dominio (solo pruebas)
app.use(express.json());

// Variables de entorno
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('Backend de pagos funcionando ✅');
});

// Endpoint para agregar pago
app.post('/add-payment', async (req, res) => {
  try {
    const { user_id, amount, status } = req.body;

    if (!user_id || !amount || !status) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ user_id, amount, status })
    });

    if (!response.ok) {
      const errorData = await response.text();
      return res.status(500).json({ error: errorData });
    }

    const data = await response.json();
    res.status(200).json({ message: 'Payment added successfully', data });

  } catch (error) {
    console.error('Error adding payment:', error);
    res.status(500).json({ error: error.toString() });
  }
});

// Puerto Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
