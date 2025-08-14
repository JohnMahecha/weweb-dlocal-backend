// index.js
import express from "express";
import fetch from "node-fetch";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// Crear un pago en DLocal
app.post("/api/add-payment", async (req, res) => {
  try {
    const {
      amount,
      currency,
      country,
      payment_method_id,
      payer,
      order_id
    } = req.body;

    // Validar datos
    if (!amount || !currency || !country || !payment_method_id || !payer || !order_id) {
      return res.status(400).json({ message: "Faltan parámetros obligatorios" });
    }

    const apiKey = process.env.DLOCAL_API_KEY;
    const secretKey = process.env.DLOCAL_SECRET_KEY;
    const host = process.env.DLOCAL_HOST || "https://sandbox.dlocal.com";
    const successRedirect = process.env.SUCCESS_REDIRECT;

    // Timestamp para la firma
    const timestamp = Math.floor(Date.now() / 1000);

    // Cuerpo para DLocal
    const paymentData = {
      amount,
      currency,
      country,
      payment_method_id,
      payment_method_flow: "REDIRECT",
      payer,
      order_id,
      callback_url: `${process.env.BASE_URL}/api/payment-callback`,
      success_url: successRedirect
    };

    // Generar firma HMAC SHA256
    const requestBodyString = JSON.stringify(paymentData);
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(`${timestamp}${requestBodyString}`)
      .digest("hex");

    // Hacer request a DLocal
    const response = await fetch(`${host}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `${apiKey}:${signature}`,
        "X-Date": timestamp
      },
      body: requestBodyString
    });

    const dlocalData = await response.json();

    if (!response.ok) {
      return res.status(400).json({
        message: "Error al generar el link de pago en DLocal",
        dlocalData
      });
    }

    return res.json({
      message: "Link de pago generado correctamente",
      link: dlocalData.redirect_url,
      dlocalResponse: dlocalData
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
