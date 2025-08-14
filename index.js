// index.js
import express from "express";
import axios from "axios";

const app = express();
app.use(express.json());

// Variables de entorno (las configuras en Render)
const DLOCAL_API_KEY = process.env.DLOCAL_API_KEY;
const DLOCAL_API_SECRET = process.env.DLOCAL_API_SECRET;
const DLOCAL_URL = "https://sandbox.dlocal.com"; // Cambia a producción cuando toque

// Ruta para generar link de pago
app.post("/crear-pago", async (req, res) => {
  try {
    const { amount, currency, orderId, description } = req.body;

    // Fecha en formato UTC RFC 7231
    const xDate = new Date().toUTCString();

    // Parámetros del pago
    const body = {
      amount,
      currency,
      country: "CO",
      payment_method_id: "CARD",
      order_id: orderId,
      description,
      callback_url: "https://tuweb.com/callback", // Cambia por tu callback real
      success_url: "https://tuweb.com/success",   // Cambia por tu página de éxito
      failure_url: "https://tuweb.com/failure"    // Cambia por tu página de fallo
    };

    // Generar firma (según docs de DLocal)
    const crypto = await import("crypto");
    const rawSignature = `${DLOCAL_API_KEY}${xDate}${JSON.stringify(body)}`;
    const signature = crypto
      .createHmac("sha256", DLOCAL_API_SECRET)
      .update(rawSignature)
      .digest("hex");

    // Llamada a DLocal
    const response = await axios.post(
      `${DLOCAL_URL}/payments`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Date": xDate,
          "X-Login": DLOCAL_API_KEY,
          "X-Trans-Key": signature
        }
      }
    );

    res.status(200).json({
      message: "Pago creado correctamente",
      dlocalResponse: response.data
    });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({
      message: "Error al generar el link de pago en DLocal",
      dlocalData: error.response?.data || error.message
    });
  }
});

// Puerto para Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
