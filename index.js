
import express from 'express';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(bodyParser.json());

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
