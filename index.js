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

// Ruta para crear el link de pago en DLocal
app.post("/api/add-payment", async (req, res) => {
  try {
    const { user_id, amount, currency, description } = req.body;

    // X-Date en formato RFC 1123
    const xDate = new Date().toUTCString();

    // Datos para DLocal
    const payload = {
      amount: amount || "10.00",
      currency: currency || "USD",
      country: "BR", // País de prueba
      payment_method_id: "CARD",
      description: description || "Test Payment",
      callback_url: "https://tusitio.com/callback",
      success_url: "https://tusitio.com/success",
      failure_url: "https://tusitio.com/failure",
    };

    // Generar firma
    const requestBody = JSON.stringify(payload);
    const signatureRaw = `${xDate}${requestBody}`;
    const signature = crypto
      .createHmac("sha256", process.env.DLOCAL_SECRET_KEY)
      .update(signatureRaw)
      .digest("hex");

    // Petición a DLocal
    const response = await axios.post(
      "https://sandbox.dlocal.com/payments",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Date": xDate,
          "X-Login": process.env.DLOCAL_API_KEY,
          "X-Trans-Key": process.env.DLOCAL_TRAN_KEY,
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
