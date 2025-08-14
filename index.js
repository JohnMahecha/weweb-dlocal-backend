import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import axios from "axios";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Ruta de prueba para saber si el backend está vivo
app.get("/", (req, res) => {
  res.json({ status: "Backend funcionando" });
});

// Ruta para crear el link de pago
app.post("/api/add-payment", async (req, res) => {
  try {
    const { amount, currency, description } = req.body;

    // Fecha en UTC para X-Date
    const date = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

    // Datos para DLocal
    const payload = {
      amount: amount || "10.00",
      currency: currency || "USD",
      country: "BR", // Cambia según el país de prueba
      payment_method_id: "CARD",
      description: description || "Test Payment",
      callback_url: process.env.BASE_URL + "/callback",
      success_url: process.env.SUCCESS_REDIRECT,
      failure_url: process.env.SUCCESS_REDIRECT, // puedes cambiar si quieres un failure aparte
    };

    // Generar firma
    const secret = process.env.DLOCAL_SECRET_KEY;
    const requestBody = JSON.stringify(payload);
    const signatureRaw = `${date}${requestBody}`;
    const signature = crypto
      .createHmac("sha256", secret)
      .update(signatureRaw)
      .digest("hex");

    // Petición a DLocal
    const response = await axios.post(
      `${process.env.DLOCAL_HOST}/payments`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Date": date,
          "X-Login": process.env.DLOCAL_API_KEY,
          "X-Trans-Key": process.env.DLOCAL_X_TRANS_KEY, // corregido aquí
          "X-Version": "1.2",
          "X-Signature": signature,
        },
      }
    );

    res.json({
      message: "Link de pago generado correctamente",
      data: response.data,
    });
  } catch (error) {
    console.error(error?.response?.data || error.message);
    res.status(500).json({
      message: "Error al generar el link de pago en DLocal",
      dlocalData: error?.response?.data || error.message,
    });
  }
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor escuchando en puerto ${PORT}`);
});
